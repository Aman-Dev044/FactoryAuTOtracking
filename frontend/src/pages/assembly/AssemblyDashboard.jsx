import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dispatchAPI, salesPipelineAPI, operationsAPI, uploadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LuWrench, LuPackage, LuTruck, LuWorkflow, LuRefreshCw, LuPlus,
  LuPencil, LuTrash2, LuImage, LuSave, LuArrowLeft,
  LuCircleCheck, LuUpload, LuReceipt, LuPhone, LuMapPin,
} from 'react-icons/lu';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import OrderWorkflowBanner, { OrderStepBadge, determineOrderStep, WORKFLOW_9_STEPS } from '../../components/common/OrderWorkflowBanner';
import {
  Page, PageHeader, Section, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Dialog, ConfirmDialog,
  Field, Input, Textarea, Select,
  Button, Badge, Tabs, EmptyState,
} from '../../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

const getMediaFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);
  const cleanBase = base.replace(/\/api\/?$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanUrl}`;
};

const emptyPipelineForm = {
  customerName: '',
  customerContact: '',
  customerEmail: '',
  shippingAddress: '',
  customerGST: '',
  stage: 'sales_order', // Default to sales_order so it directly becomes an active Assembly job
  dragChainConfig: {
    modelNumber: '',
    series: '',
    width: '',
    radius: '',
    pitch: 46,
    numberOfLinks: 22,
    mountingBrackets: 'Standard',
    quantity: 1,
    length: '1000 MM',
    ratePerMeter: 1200
  },
  grandTotal: 1200,
  remarks: ''
};

/* Two-line cell: a strong lead value with a muted caption underneath. */
const Stack = ({ children }) => (
  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>{children}</span>
);

const Lead = ({ children, tone }) => (
  <span style={{ fontWeight: 600, color: tone || 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {children}
  </span>
);

const Meta = ({ children, tone, icon }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: tone || 'var(--text-muted)', minWidth: 0 }}>
    {icon}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </span>
);

/** Link to an uploaded proof file, or a muted "missing" note. */
const ProofLink = ({ url, label, missing }) => (
  url ? (
    <a
      className="btn btn-xs btn-secondary"
      href={getMediaFullUrl(url)}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'none', color: 'var(--success)', borderColor: 'color-mix(in srgb, var(--success) 32%, transparent)' }}
    >
      <LuImage /> {label}
    </a>
  ) : (
    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>{missing}</span>
  )
);

/** Dashed drop zone around the native file input so uploads look deliberate. */
const UploadBox = ({ label, hint, accept, onChange, disabled, fileUrl, viewLabel = 'View uploaded file' }) => (
  <div
    style={{
      padding: 'var(--sp-4)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-subtle)',
      border: '1px dashed var(--border-strong)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>
      <LuUpload /> {label}
    </div>
    <input
      type="file"
      accept={accept}
      onChange={onChange}
      disabled={disabled}
      style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', maxWidth: '100%' }}
    />
    {hint && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)', marginTop: 6 }}>{hint}</div>}
    {fileUrl && (
      <a
        href={getMediaFullUrl(fileUrl)}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--success)', textDecoration: 'none' }}
      >
        <LuCircleCheck /> {viewLabel}
      </a>
    )}
  </div>
);

export default function AssemblyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assemble'); // 'assemble', 'packing', 'dispatched', 'pipeline_overview'
  const [dispatches, setDispatches] = useState([]);
  const [pipelineOrders, setPipelineOrders] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [stats, setStats] = useState({ assemble: 0, hold: 0, packing: 0, dispatched: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pipelineStageFilter, setPipelineStageFilter] = useState('all');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(7); // Default step 7 Assembly

  // Process Assembly / Packing Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalStep, setModalStep] = useState(1); // 1: Assembly, 2: Packing, 3: Billing, 4: Logistics/Dispatch
  const [savingDraft, setSavingDraft] = useState(false);

  // New Order / Pipeline Deal Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPipelineId, setEditingPipelineId] = useState(null);
  const [pipelineForm, setPipelineForm] = useState(emptyPipelineForm);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Destructive confirmation target (presentation only)
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State for Assembly / Packing Process
  const [formData, setFormData] = useState({
    status: 'assemble',
    salesOrderRef: '',
    customerName: '',
    customerContact: '',
    customerEmail: '',
    customerAddress: '',
    assemblyNotes: '',
    assemblyMediaUrl: '',
    assemblyVideoUrl: '',
    linksAssembled: '',
    bracketsFitted: 'yes',
    totalBoxes: 1,
    totalWeight: '',
    packingNotes: '',
    packingMediaUrl: '',
    invoiceNo: '',
    billingInvoiceUrl: '',
    courier: '',
    lrNumber: '',
    trackingNumber: '',
    dispatchMediaUrl: '',
    dispatchNotes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dispRes, statsRes, pipeRes, tmplRes] = await Promise.all([
        dispatchAPI.getAll({ limit: 100, search }),
        dispatchAPI.getStats().catch(() => ({ data: { data: {} } })),
        salesPipelineAPI.getAll({ limit: 100, search }).catch(() => ({ data: { data: [] } })),
        operationsAPI.getProductTemplates().catch(() => ({ data: { data: [] } }))
      ]);

      setDispatches(dispRes.data.data || []);
      setStats(statsRes.data.data || {});
      setPipelineOrders(pipeRes.data.data || []);
      setProductTemplates(tmplRes.data.data || []);
    } catch (err) {
      console.error('Failed to load Assembly data:', err);
      toast.error('Failed to load Assembly orders');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('dispatch_updated', fetchData);
      socket.on('sales_updated', fetchData);
      socket.on('build_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // Open Process Modal
  const handleOpenProcessModal = (order, targetModalStep = 1) => {
    setSelectedOrder(order);
    setModalStep(targetModalStep);
    setFormData({
      status: order.status || 'assemble',
      salesOrderRef: order.salesOrderRef || order.salesOrderNumber || '',
      customerName: order.customerName || '',
      customerContact: order.customerContact || '',
      customerEmail: order.customerEmail || '',
      customerAddress: order.customerAddress || order.shippingAddress || '',
      assemblyNotes: order.assemblyNotes || '',
      assemblyMediaUrl: order.assemblyMediaUrl || '',
      assemblyVideoUrl: order.assemblyVideoUrl || '',
      linksAssembled: order.linksAssembled || (order.items?.[0]?.dragChainConfig?.numberOfLinks) || (order.dragChainConfig?.numberOfLinks) || '',
      bracketsFitted: order.bracketsFitted || 'yes',
      totalBoxes: order.totalBoxes || 1,
      totalWeight: order.totalWeight || '',
      packingNotes: order.packingNotes || '',
      packingMediaUrl: order.packingMediaUrl || '',
      invoiceNo: order.invoiceNo || order.invoiceNumber || '',
      billingInvoiceUrl: order.billingInvoiceUrl || '',
      courier: order.courier || '',
      lrNumber: order.lrNumber || '',
      trackingNumber: order.trackingNumber || '',
      dispatchMediaUrl: order.dispatchMediaUrl || '',
      dispatchNotes: order.dispatchNotes || ''
    });
    setShowModal(true);
  };

  const handleMediaUpload = async (file, fieldKey) => {
    if (!file) return;
    try {
      setUploadingMedia(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadAPI.upload(fd);
      if (res.data?.url || res.data?.fileUrl) {
        const uploadedPath = res.data.url || res.data.fileUrl;
        setFormData(prev => ({ ...prev, [fieldKey]: uploadedPath }));
        toast.success('📷 Photo/Video uploaded successfully!');
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedOrder) return;
    try {
      setSavingDraft(true);
      if (selectedOrder._id) {
        await dispatchAPI.update(selectedOrder._id, {
          ...formData,
          isDraft: true
        });
      }
      toast.success('💾 Step Progress Saved as Draft!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAdvanceStep = async (nextStatus) => {
    if (!selectedOrder) return;
    try {
      setSavingDraft(true);
      const payload = {
        ...formData,
        status: nextStatus || formData.status
      };
      await dispatchAPI.update(selectedOrder._id, payload);
      toast.success(`✅ Order updated to ${nextStatus.toUpperCase()}!`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    } finally {
      setSavingDraft(false);
    }
  };

  // Quick 1-Click Pipeline Stage Advancement
  const handleAdvancePipelineStage = async (order, targetStage) => {
    try {
      await salesPipelineAPI.update(order._id, {
        stage: targetStage,
        auditNote: `Stage advanced to ${targetStage.toUpperCase()} from Assembly Workspace`
      });
      toast.success(`✅ Order moved to Step ${targetStage.toUpperCase()}!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to advance stage');
    }
  };

  // Delete Pipeline Order
  const handleDeletePipelineOrder = async (id) => {
    try {
      await salesPipelineAPI.delete(id);
      toast.success('Order deleted successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    }
  };

  // Handle Create / Edit Pipeline Order
  const handleOpenCreateModal = (orderToEdit = null) => {
    if (orderToEdit) {
      setEditingPipelineId(orderToEdit._id);
      const cfg = orderToEdit.items?.[0]?.dragChainConfig || orderToEdit.dragChainConfig || {};
      setPipelineForm({
        customerName: orderToEdit.customerName || '',
        customerContact: orderToEdit.customerContact || '',
        customerEmail: orderToEdit.customerEmail || '',
        shippingAddress: orderToEdit.shippingAddress || orderToEdit.customerAddress || '',
        customerGST: orderToEdit.customerGST || '',
        stage: orderToEdit.stage || 'sales_order',
        dragChainConfig: {
          modelNumber: cfg.modelNumber || orderToEdit.modelNumber || '',
          series: cfg.series || '',
          width: cfg.width || '',
          radius: cfg.radius || '',
          pitch: cfg.pitch || 46,
          numberOfLinks: cfg.numberOfLinks || 22,
          mountingBrackets: cfg.mountingBrackets || 'Standard',
          quantity: cfg.quantity || orderToEdit.quantity || 1,
          length: cfg.length || '1000 MM',
          ratePerMeter: cfg.ratePerMeter || orderToEdit.unitPrice || 1200
        },
        grandTotal: orderToEdit.grandTotal || orderToEdit.totalAmount || 1200,
        remarks: orderToEdit.remarks || ''
      });
    } else {
      setEditingPipelineId(null);
      setPipelineForm(emptyPipelineForm);
    }
    setShowCreateModal(true);
  };

  const handleSavePipelineOrder = async (e) => {
    e.preventDefault();
    if (!pipelineForm.customerName.trim()) {
      toast.error('Please provide Customer Name');
      return;
    }

    try {
      setCreatingOrder(true);
      const payload = {
        ...pipelineForm,
        items: [{
          modelNumber: pipelineForm.dragChainConfig.modelNumber || 'Standard Drag Chain',
          quantity: pipelineForm.dragChainConfig.quantity || 1,
          unit: 'meter',
          unitPrice: pipelineForm.dragChainConfig.ratePerMeter || 1200,
          totalPrice: pipelineForm.grandTotal,
          dragChainConfig: pipelineForm.dragChainConfig
        }]
      };

      if (editingPipelineId) {
        await salesPipelineAPI.update(editingPipelineId, payload);
        toast.success('✅ Pipeline Order Updated Successfully!');
      } else {
        await salesPipelineAPI.create(payload);
        toast.success('✅ New Pipeline & Assembly Order Created Successfully!');
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save order');
    } finally {
      setCreatingOrder(false);
    }
  };

  // Filtered lists for each tab
  const assembleOrders = useMemo(() => {
    return dispatches.filter(d => d.status === 'assemble' || (!d.status && !d.packedAt && !d.dispatchedAt));
  }, [dispatches]);

  const packingOrders = useMemo(() => {
    return dispatches.filter(d => d.status === 'packing');
  }, [dispatches]);

  const dispatchedOrders = useMemo(() => {
    return dispatches.filter(d => d.status === 'dispatched');
  }, [dispatches]);

  const filteredPipelineOrders = useMemo(() => {
    if (pipelineStageFilter === 'all') return pipelineOrders;
    return pipelineOrders.filter(order => {
      const step = determineOrderStep(order);
      if (pipelineStageFilter === 'lead') return step === 1;
      if (pipelineStageFilter === 'quotation') return step === 2;
      if (pipelineStageFilter === 'customer_po') return step === 3;
      if (pipelineStageFilter === 'pi') return step === 4;
      if (pipelineStageFilter === 'invoice') return step === 5;
      if (pipelineStageFilter === 'payment') return step === 6;
      if (pipelineStageFilter === 'assemble') return step === 7;
      if (pipelineStageFilter === 'packing') return step === 8;
      if (pipelineStageFilter === 'dispatched') return step === 9;
      return true;
    });
  }, [pipelineOrders, pipelineStageFilter]);

  /* ------------------------------------------------------ grid definitions */

  const assembleColumns = [
    {
      key: 'ref',
      header: 'SO Reference & Customer',
      primary: true,
      sortValue: (o) => o.customerName || '',
      render: (o) => (
        <Stack>
          <Meta tone="var(--primary)">{o.salesOrderRef || o.dispatchNo || 'SO-PENDING'}</Meta>
          <Lead>{o.customerName}</Lead>
          {o.customerContact && <Meta icon={<LuPhone />}>{o.customerContact}</Meta>}
        </Stack>
      ),
    },
    {
      key: 'step',
      header: 'Step Status',
      sortable: false,
      render: (o) => (
        <Stack>
          <span><OrderStepBadge record={o} /></span>
          {o.assemblyNotes && <Meta tone="var(--warning)">{o.assemblyNotes}</Meta>}
        </Stack>
      ),
    },
    {
      key: 'model',
      header: 'Model & Specs',
      clamp: true,
      hideBelow: 1180,
      sortValue: (o) => o.items?.[0]?.dragChainConfig?.modelNumber || '',
      render: (o) => {
        const item = o.items?.[0] || {};
        const cfg = item.dragChainConfig || {};
        return (
          <Stack>
            <Lead>{cfg.modelNumber || item.productName || 'Drag Chain Item'}</Lead>
            <Meta>
              {[cfg.width && `W: ${cfg.width}`, cfg.radius && `R: ${cfg.radius}`, cfg.pitch && `Pitch: ${cfg.pitch}`].filter(Boolean).join(' · ') || '--'}
            </Meta>
            <Meta tone="var(--primary)">Qty: {item.quantity || 1} {item.unit || 'm'}</Meta>
          </Stack>
        );
      },
    },
    {
      key: 'links',
      header: 'Links & Brackets',
      hideBelow: 980,
      sortValue: (o) => Number(o.linksAssembled) || 0,
      render: (o) => {
        const cfg = o.items?.[0]?.dragChainConfig || {};
        return (
          <Stack>
            <Lead>{o.linksAssembled || cfg.numberOfLinks || '--'} links</Lead>
            <Meta>Brackets: {cfg.mountingBrackets || o.bracketsFitted || 'Standard'}</Meta>
          </Stack>
        );
      },
    },
    {
      key: 'proof',
      header: 'Proof Media',
      sortable: false,
      hideBelow: 820,
      render: (o) => <ProofLink url={o.assemblyMediaUrl} label="View proof" missing="No photo proof" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (o) => (
        <Button variant="primary" size="xs" icon={<LuWrench />} onClick={() => handleOpenProcessModal(o, 1)}>
          Process
        </Button>
      ),
    },
  ];

  const packingColumns = [
    {
      key: 'ref',
      header: 'SO Ref & Customer',
      primary: true,
      sortValue: (o) => o.customerName || '',
      render: (o) => (
        <Stack>
          <Meta tone="var(--primary)">{o.salesOrderRef || o.dispatchNo}</Meta>
          <Lead>{o.customerName}</Lead>
          <Meta icon={<LuMapPin />}>{o.customerAddress || 'Customer Address'}</Meta>
        </Stack>
      ),
    },
    {
      key: 'step',
      header: 'Step Status',
      sortable: false,
      render: (o) => (
        <Stack>
          <span><OrderStepBadge record={o} /></span>
          <Meta tone="var(--success)">Assembly complete</Meta>
        </Stack>
      ),
    },
    {
      key: 'carton',
      header: 'Cartons & Weight',
      hideBelow: 900,
      sortValue: (o) => Number(o.totalBoxes) || 0,
      render: (o) => (
        <Stack>
          <Lead>{o.totalBoxes || 1} box(es)</Lead>
          <Meta>Weight: {o.totalWeight ? `${o.totalWeight} kg` : 'Not recorded'}</Meta>
        </Stack>
      ),
    },
    {
      key: 'proof',
      header: 'Packing Proof',
      sortable: false,
      hideBelow: 780,
      render: (o) => <ProofLink url={o.packingMediaUrl} label="Carton proof" missing="No box photo" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (o) => (
        <Button variant="primary" size="xs" icon={<LuPackage />} onClick={() => handleOpenProcessModal(o, 2)}>
          Box details
        </Button>
      ),
    },
  ];

  const dispatchedColumns = [
    {
      key: 'ref',
      header: 'SO Ref & Customer',
      primary: true,
      sortValue: (o) => o.customerName || '',
      render: (o) => (
        <Stack>
          <Meta tone="var(--primary)">{o.salesOrderRef || o.dispatchNo}</Meta>
          <Lead>{o.customerName}</Lead>
        </Stack>
      ),
    },
    {
      key: 'step',
      header: 'Step Status',
      sortable: false,
      render: (o) => <OrderStepBadge record={o} />,
    },
    {
      key: 'courier',
      header: 'Courier & LR',
      hideBelow: 900,
      sortValue: (o) => o.courier || '',
      render: (o) => (
        <Stack>
          <Lead>{o.courier || 'Logistics Transport'}</Lead>
          <Meta>LR / Tracking: {o.lrNumber || o.trackingNumber || '--'}</Meta>
        </Stack>
      ),
    },
    {
      key: 'dispatchedAt',
      header: 'Dispatched On',
      hideBelow: 1080,
      sortValue: (o) => (o.dispatchedAt ? new Date(o.dispatchedAt).getTime() : 0),
      render: (o) => (
        <Meta>{o.dispatchedAt ? new Date(o.dispatchedAt).toLocaleString() : '--'}</Meta>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (o) => (
        <Button size="xs" onClick={() => handleOpenProcessModal(o, 4)}>View details</Button>
      ),
    },
  ];

  const pipelineColumns = [
    {
      key: 'customer',
      header: 'Customer & Reference',
      primary: true,
      sortValue: (o) => o.customerName || '',
      render: (o) => (
        <Stack>
          <Lead>{o.customerName}</Lead>
          <Meta tone="var(--primary)">
            {o.salesOrderNumber || o.quotationNumber || o.customerPoNumber || o.leadNumber || 'REF-N/A'}
          </Meta>
          {o.customerContact && <Meta icon={<LuPhone />}>{o.customerContact}</Meta>}
        </Stack>
      ),
    },
    {
      key: 'stage',
      header: 'Current Stage',
      sortValue: (o) => determineOrderStep(o),
      render: (o) => <OrderStepBadge record={o} />,
    },
    {
      key: 'item',
      header: 'Item Specifications',
      clamp: true,
      hideBelow: 1180,
      sortable: false,
      render: (o) => {
        const cfg = o.items?.[0]?.dragChainConfig || o.dragChainConfig || {};
        return (
          <Stack>
            <Lead>{cfg.modelNumber || cfg.series || o.modelNumber || 'Standard Drag Chain'}</Lead>
            <Meta>
              {[cfg.width && `W: ${cfg.width}`, cfg.radius && `R: ${cfg.radius}`, cfg.numberOfLinks && `${cfg.numberOfLinks} links`].filter(Boolean).join(' · ') || '--'}
            </Meta>
          </Stack>
        );
      },
    },
    {
      key: 'amount',
      header: 'Value',
      align: 'right',
      hideBelow: 760,
      sortValue: (o) => Number(o.grandTotal || o.totalAmount || 0),
      render: (o) => (
        <Stack>
          <Lead>₹{(o.grandTotal || o.totalAmount || 0).toLocaleString('en-IN')}</Lead>
          <span style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
            <Badge tone={o.approvalStatus === 'approved' ? 'success' : 'warning'}>
              {o.approvalStatus || 'pending'}
            </Badge>
          </span>
        </Stack>
      ),
    },
    {
      key: 'advance',
      header: 'Quick Stage Advance',
      sortable: false,
      hideBelow: 1024,
      render: (o) => {
        const step = determineOrderStep(o);
        return (
          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {step === 1 && (
              <Button size="xs" title="Advance to Quotation" onClick={() => handleAdvancePipelineStage(o, 'quotation')}>
                Quote
              </Button>
            )}
            {step <= 2 && (
              <Button size="xs" title="Advance to PO" onClick={() => handleAdvancePipelineStage(o, 'customer_po')}>
                PO
              </Button>
            )}
            {step <= 3 && (
              <Button size="xs" title="Advance to PI" onClick={() => handleAdvancePipelineStage(o, 'pi')}>
                PI
              </Button>
            )}
            {step <= 4 && (
              <Button size="xs" title="Advance to Sales Order / Invoice" onClick={() => handleAdvancePipelineStage(o, 'sales_order')}>
                Order
              </Button>
            )}
            {step >= 5 && (
              <Button variant="primary" size="xs" icon={<LuWrench />} onClick={() => handleOpenProcessModal(o, step >= 8 ? 2 : 1)}>
                Process job
              </Button>
            )}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (o) => (
        <span style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}>
          <button className="icon-btn" title="Edit Order" aria-label="Edit order"
            style={{ color: 'var(--c-blue)' }} onClick={() => handleOpenCreateModal(o)}>
            <LuPencil />
          </button>
          <button className="icon-btn" title="Delete Order" aria-label="Delete order"
            style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(o)}>
            <LuTrash2 />
          </button>
        </span>
      ),
    },
  ];

  const stageChips = [
    { key: 'all', label: 'All stages', count: pipelineOrders.length },
    ...WORKFLOW_9_STEPS.map(s => ({ key: s.key, label: s.label })),
  ];

  const modalSteps = [
    { key: 1, label: 'Assembly', icon: <LuWrench /> },
    { key: 2, label: 'Packing', icon: <LuPackage /> },
    { key: 3, label: 'Billing', icon: <LuReceipt /> },
    { key: 4, label: 'Dispatch', icon: <LuTruck /> },
  ];

  const newOrderButton = (
    <Button variant="primary" icon={<LuPlus />} onClick={() => handleOpenCreateModal(null)}>
      New Order / Job
    </Button>
  );

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Assembly & Packaging Line"
          subtitle="Step 7 physical assembly and QC proofs → Step 8 box packaging and weights → Step 9 logistics dispatch."
          actions={
            <>
              <Button icon={<LuRefreshCw />} onClick={fetchData} title="Reload Data">Reload</Button>
              {newOrderButton}
            </>
          }
        />

        {/* 🔄 End-to-End 9-Step Lifecycle Banner */}
        <OrderWorkflowBanner
          activeStep={selectedWorkflowStep}
          onStepClick={(stepObj) => {
            setSelectedWorkflowStep(stepObj.step);
            if (stepObj.step === 7) setActiveTab('assemble');
            else if (stepObj.step === 8) setActiveTab('packing');
            else if (stepObj.step === 9) setActiveTab('dispatched');
            else {
              setActiveTab('pipeline_overview');
              setPipelineStageFilter(stepObj.key);
            }
          }}
        />

        <StatRow>
          <StatTile
            label="Step 7 · In Assembly"
            value={stats.assemble || assembleOrders.length || 0}
            icon={<LuWrench />}
            tone="amber"
            hint="Orders ready for physical assembly"
            onClick={() => { setActiveTab('assemble'); setSelectedWorkflowStep(7); }}
          />
          <StatTile
            label="Step 8 · Box Packaging"
            value={stats.packing || packingOrders.length || 0}
            icon={<LuPackage />}
            tone="primary"
            hint="Assembled items waiting for cartons"
            onClick={() => { setActiveTab('packing'); setSelectedWorkflowStep(8); }}
          />
          <StatTile
            label="Step 9 · Dispatched"
            value={stats.dispatched || dispatchedOrders.length || 0}
            icon={<LuTruck />}
            tone="green"
            hint="Outward shipped & completed"
            onClick={() => { setActiveTab('dispatched'); setSelectedWorkflowStep(9); }}
          />
          <StatTile
            label="Total Pipeline"
            value={pipelineOrders.length || dispatches.length || 0}
            icon={<LuWorkflow />}
            tone="cyan"
            hint="9-step end-to-end order tracking"
            onClick={() => { setActiveTab('pipeline_overview'); }}
          />
        </StatRow>

        <Tabs
          value={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'assemble') setSelectedWorkflowStep(7);
            else if (key === 'packing') setSelectedWorkflowStep(8);
            else if (key === 'dispatched') setSelectedWorkflowStep(9);
          }}
          items={[
            { key: 'assemble', label: 'Assembly queue', icon: <LuWrench />, count: assembleOrders.length },
            { key: 'packing', label: 'Box packing', icon: <LuPackage />, count: packingOrders.length },
            { key: 'dispatched', label: 'Dispatched', icon: <LuTruck />, count: dispatchedOrders.length },
            { key: 'pipeline_overview', label: '9-step pipeline', icon: <LuWorkflow />, count: pipelineOrders.length },
          ]}
        />

        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search by SO#, customer, model…"
            onChange={setSearch}
          />
          {activeTab === 'pipeline_overview' && (
            <ChipGroup items={stageChips} value={pipelineStageFilter} onChange={setPipelineStageFilter} />
          )}
          <ToolbarSpacer />
          <Button size="sm" icon={<LuPlus />} onClick={() => handleOpenCreateModal(null)}>
            Add work order
          </Button>
          <DensitySwitch />
        </Toolbar>

        {/* TAB 1: ASSEMBLY QUEUE (STEP 7) */}
        {activeTab === 'assemble' && (
          <Section
            title="Step 7 · Drag Chain Assembly Work Orders"
            actions={<Badge tone="warning">{assembleOrders.length} pending</Badge>}
          >
            <DataTable
              columns={assembleColumns}
              rows={assembleOrders}
              loading={loading}
              empty={
                <EmptyState
                  icon={<LuCircleCheck />}
                  title="Assembly queue clear"
                  text="No pending orders require physical drag chain assembly right now."
                  action={newOrderButton}
                />
              }
            />
          </Section>
        )}

        {/* TAB 2: BOX PACKING QUEUE (STEP 8) */}
        {activeTab === 'packing' && (
          <Section
            title="Step 8 · Box Packaging & Weight Verification"
            actions={<Badge tone="info">{packingOrders.length} ready</Badge>}
          >
            <DataTable
              columns={packingColumns}
              rows={packingOrders}
              loading={loading}
              empty={
                <EmptyState
                  icon={<LuPackage />}
                  title="No orders awaiting packing"
                  text="As soon as assembly is finished, orders appear here automatically."
                />
              }
            />
          </Section>
        )}

        {/* TAB 3: DISPATCHED ORDERS (STEP 9) */}
        {activeTab === 'dispatched' && (
          <Section
            title="Step 9 · Dispatched & Logistics Archive"
            actions={<Badge tone="success">{dispatchedOrders.length} dispatched</Badge>}
          >
            <DataTable
              columns={dispatchedColumns}
              rows={dispatchedOrders}
              loading={loading}
              empty={<EmptyState icon={<LuTruck />} title="No dispatched orders found" />}
            />
          </Section>
        )}

        {/* TAB 4: FULL 9-STEP PIPELINE TRACKER */}
        {activeTab === 'pipeline_overview' && (
          <Section
            title="End-to-end 9-Step Order Funnel"
            actions={
              <Button variant="primary" size="sm" icon={<LuPlus />} onClick={() => handleOpenCreateModal(null)}>
                Create pipeline deal
              </Button>
            }
          >
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: '0 0 var(--sp-3)' }}>
              Lead (1) → Quotation (2) → PO (3) → PI (4) → Invoice (5) → Payment (6) → Assembly (7) → Packing (8) → Dispatch (9)
            </p>
            <DataTable
              columns={pipelineColumns}
              rows={filteredPipelineOrders}
              loading={loading}
              empty={
                <EmptyState
                  icon={<LuWorkflow />}
                  title="No orders match this filter"
                  text="Create a pipeline deal to start tracking an order through all nine steps."
                  action={
                    <Button variant="primary" icon={<LuPlus />} onClick={() => handleOpenCreateModal(null)}>
                      Create pipeline deal
                    </Button>
                  }
                />
              }
            />
          </Section>
        )}

        {/* ===================================================================== */}
        {/* ➕ CREATE / EDIT PIPELINE & ASSEMBLY WORK ORDER                        */}
        {/* ===================================================================== */}
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          size="lg"
          title={editingPipelineId ? 'Edit pipeline & assembly work order' : 'Create new assembly work order'}
          subtitle="Standardized assembly line work order synced with Sales Pipeline and Store Inventory."
          footer={
            <>
              <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button
                type="submit"
                form="assembly-pipeline-form"
                variant="primary"
                loading={creatingOrder}
                icon={<LuSave />}
              >
                {creatingOrder ? 'Saving…' : editingPipelineId ? 'Update order' : 'Create order'}
              </Button>
            </>
          }
        >
          <form id="assembly-pipeline-form" onSubmit={handleSavePipelineOrder}>
            <Section title="1. Customer Details">
              <FormGrid>
                <Field label="Customer / Company Name" required>
                  <Input
                    type="text"
                    placeholder="e.g. Tata Motors / BlueStar Ltd"
                    value={pipelineForm.customerName}
                    onChange={e => setPipelineForm({ ...pipelineForm, customerName: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Phone / WhatsApp Number">
                  <Input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={pipelineForm.customerContact}
                    onChange={e => setPipelineForm({ ...pipelineForm, customerContact: e.target.value })}
                  />
                </Field>

                <Field label="Email Address">
                  <Input
                    type="email"
                    placeholder="e.g. purchase@tatamotors.com"
                    value={pipelineForm.customerEmail}
                    onChange={e => setPipelineForm({ ...pipelineForm, customerEmail: e.target.value })}
                  />
                </Field>

                <Field label="GST Number" hint="Optional">
                  <Input
                    type="text"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={pipelineForm.customerGST}
                    onChange={e => setPipelineForm({ ...pipelineForm, customerGST: e.target.value })}
                  />
                </Field>
              </FormGrid>
            </Section>

            <Section title="2. Drag Chain Specifications">
              <FormGrid>
                <Field label="Model Series" required>
                  <Input
                    type="text"
                    placeholder="e.g. C.36 / S24.25.1"
                    value={pipelineForm.dragChainConfig.modelNumber}
                    onChange={e => {
                      const val = e.target.value;
                      const match = productTemplates.find(t => t.modelNumber === val);
                      setPipelineForm({
                        ...pipelineForm,
                        dragChainConfig: {
                          ...pipelineForm.dragChainConfig,
                          modelNumber: val,
                          series: val,
                          pitch: match?.pitch || pipelineForm.dragChainConfig.pitch,
                          ratePerMeter: match?.ratePerMeter || match?.unitPrice || pipelineForm.dragChainConfig.ratePerMeter
                        }
                      });
                    }}
                    required
                  />
                </Field>

                <Field label="Inner Width (mm)">
                  <Input
                    type="text"
                    placeholder="e.g. 50"
                    value={pipelineForm.dragChainConfig.width}
                    onChange={e => setPipelineForm({
                      ...pipelineForm,
                      dragChainConfig: { ...pipelineForm.dragChainConfig, width: e.target.value }
                    })}
                  />
                </Field>

                <Field label="Bending Radius (R)">
                  <Input
                    type="text"
                    placeholder="e.g. 125"
                    value={pipelineForm.dragChainConfig.radius}
                    onChange={e => setPipelineForm({
                      ...pipelineForm,
                      dragChainConfig: { ...pipelineForm.dragChainConfig, radius: e.target.value }
                    })}
                  />
                </Field>

                <Field label="Pitch (mm)">
                  <Input
                    type="number"
                    placeholder="e.g. 46"
                    value={pipelineForm.dragChainConfig.pitch}
                    onChange={e => setPipelineForm({
                      ...pipelineForm,
                      dragChainConfig: { ...pipelineForm.dragChainConfig, pitch: parseFloat(e.target.value) || 46 }
                    })}
                  />
                </Field>

                <Field label="Links Count">
                  <Input
                    type="number"
                    placeholder="e.g. 22"
                    value={pipelineForm.dragChainConfig.numberOfLinks}
                    onChange={e => setPipelineForm({
                      ...pipelineForm,
                      dragChainConfig: { ...pipelineForm.dragChainConfig, numberOfLinks: parseInt(e.target.value, 10) || 22 }
                    })}
                  />
                </Field>

                <Field label="Mounting Brackets">
                  <Select
                    value={pipelineForm.dragChainConfig.mountingBrackets}
                    onChange={e => setPipelineForm({
                      ...pipelineForm,
                      dragChainConfig: { ...pipelineForm.dragChainConfig, mountingBrackets: e.target.value }
                    })}
                  >
                    <option value="Standard">Standard Pair</option>
                    <option value="Inner Pair">Inner Pair</option>
                    <option value="Outer Pair">Outer Pair</option>
                    <option value="No Brackets">No Brackets</option>
                  </Select>
                </Field>
              </FormGrid>
            </Section>

            <Section title="3. Stage & Commercial Details">
              <FormGrid>
                <Field label="Initial 9-Step Stage" required>
                  <Select
                    value={pipelineForm.stage}
                    onChange={e => setPipelineForm({ ...pipelineForm, stage: e.target.value })}
                  >
                    <option value="lead">Step 1: Lead Inquiry</option>
                    <option value="quotation">Step 2: Quotation Sent</option>
                    <option value="customer_po">Step 3: Customer PO Received</option>
                    <option value="pi">Step 4: Proforma Invoice (PI)</option>
                    <option value="sales_order">Step 5/7: Sales Order (Direct to Assembly Queue)</option>
                  </Select>
                </Field>

                <Field label="Total Amount (₹)" required>
                  <Input
                    type="number"
                    placeholder="e.g. 15000"
                    value={pipelineForm.grandTotal}
                    onChange={e => setPipelineForm({ ...pipelineForm, grandTotal: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Field>
              </FormGrid>
            </Section>
          </form>
        </Dialog>

        {/* ===================================================================== */}
        {/* MULTI-STEP WORKFLOW MODAL WITH SAVE AS DRAFT ON EVERY SINGLE STEP      */}
        {/* ===================================================================== */}
        <Dialog
          open={showModal && !!selectedOrder}
          onClose={() => setShowModal(false)}
          size="lg"
          title="Assembly & Dispatch Work Order"
          subtitle={selectedOrder ? `${formData.salesOrderRef || selectedOrder.dispatchNo} · ${formData.customerName}` : undefined}
          footer={
            <>
              <Button
                icon={<LuSave />}
                onClick={handleSaveDraft}
                disabled={savingDraft}
                style={{ marginRight: 'auto' }}
              >
                {savingDraft ? 'Saving draft…' : 'Save as draft'}
              </Button>

              {modalStep > 1 && (
                <Button icon={<LuArrowLeft />} onClick={() => setModalStep(modalStep - 1)}>Back</Button>
              )}

              {modalStep === 1 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleAdvanceStep('packing');
                    setModalStep(2);
                  }}
                >
                  Complete assembly → Packing
                </Button>
              )}

              {modalStep === 2 && (
                <Button variant="primary" onClick={() => setModalStep(3)}>Next: Billing & challan</Button>
              )}

              {modalStep === 3 && (
                <Button variant="primary" onClick={() => setModalStep(4)}>Next: Dispatch details</Button>
              )}

              {modalStep === 4 && (
                <Button
                  variant="success"
                  icon={<LuTruck />}
                  onClick={() => handleAdvanceStep('dispatched')}
                  disabled={savingDraft}
                >
                  Final save & mark dispatched
                </Button>
              )}
            </>
          }
        >
          <Tabs
            value={modalStep}
            onChange={setModalStep}
            items={modalSteps}
          />

          {/* STEP 1: ASSEMBLY DETAILS */}
          {modalStep === 1 && (
            <Section title="Drag Chain Assembly & Media Proofs">
              <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                <Field label="Total Links Assembled">
                  <Input
                    type="number"
                    placeholder="e.g. 45"
                    value={formData.linksAssembled}
                    onChange={e => setFormData({ ...formData, linksAssembled: e.target.value })}
                  />
                </Field>

                <Field label="Mounting Brackets Fitted?">
                  <Select
                    value={formData.bracketsFitted}
                    onChange={e => setFormData({ ...formData, bracketsFitted: e.target.value })}
                  >
                    <option value="yes">Yes, end brackets fitted</option>
                    <option value="no">No brackets</option>
                    <option value="loose">Packed separately, loose</option>
                  </Select>
                </Field>

                <Field label="Assembly Notes / Inspection Remarks" span="all">
                  <Textarea
                    rows="2"
                    placeholder="e.g. Assembled 2.5m drag chain, pitch verified, bending radius smooth…"
                    value={formData.assemblyNotes}
                    onChange={e => setFormData({ ...formData, assemblyNotes: e.target.value })}
                  />
                </Field>
              </FormGrid>

              <UploadBox
                label="Assembly photo / video proof"
                accept="image/*,video/*"
                onChange={e => handleMediaUpload(e.target.files[0], 'assemblyMediaUrl')}
                disabled={uploadingMedia}
                hint={uploadingMedia ? 'Uploading media proof…' : 'Image or video of the assembled chain.'}
                fileUrl={formData.assemblyMediaUrl}
                viewLabel="Uploaded proof file — click to view"
              />
            </Section>
          )}

          {/* STEP 2: PACKING DETAILS */}
          {modalStep === 2 && (
            <Section title="Box Packaging & Weight Verification">
              <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                <Field label="Total Carton / Box Count" required>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={formData.totalBoxes}
                    onChange={e => setFormData({ ...formData, totalBoxes: e.target.value })}
                  />
                </Field>

                <Field label="Gross Weight (kg)">
                  <Input
                    type="text"
                    placeholder="e.g. 12.5 kg"
                    value={formData.totalWeight}
                    onChange={e => setFormData({ ...formData, totalWeight: e.target.value })}
                  />
                </Field>

                <Field label="Packaging / Box Labels Note" span="all">
                  <Textarea
                    rows="2"
                    placeholder="e.g. Packed in 7-ply corrugated box with bubble wrap and product label…"
                    value={formData.packingNotes}
                    onChange={e => setFormData({ ...formData, packingNotes: e.target.value })}
                  />
                </Field>
              </FormGrid>

              <UploadBox
                label="Carton & box photo proof"
                accept="image/*"
                onChange={e => handleMediaUpload(e.target.files[0], 'packingMediaUrl')}
                disabled={uploadingMedia}
                hint={uploadingMedia ? 'Uploading media proof…' : 'Photo of the sealed cartons.'}
                fileUrl={formData.packingMediaUrl}
                viewLabel="Uploaded box photo — click to view"
              />
            </Section>
          )}

          {/* STEP 3: BILLING & CHALLAN */}
          {modalStep === 3 && (
            <Section title="Tax Invoice & Delivery Challan Verification">
              <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                <Field label="Tax Invoice / Challan Number">
                  <Input
                    type="text"
                    placeholder="e.g. INV-2026-0042"
                    value={formData.invoiceNo}
                    onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                  />
                </Field>
              </FormGrid>

              <UploadBox
                label="Upload invoice / challan copy"
                accept="image/*,.pdf"
                onChange={e => handleMediaUpload(e.target.files[0], 'billingInvoiceUrl')}
                disabled={uploadingMedia}
                hint="PDF or image of the tax invoice / delivery challan."
                fileUrl={formData.billingInvoiceUrl}
                viewLabel="View uploaded invoice / DC document"
              />
            </Section>
          )}

          {/* STEP 4: DISPATCH & LOGISTICS */}
          {modalStep === 4 && (
            <Section title="Transporter / Courier & Outward Dispatch">
              <FormGrid>
                <Field label="Courier / Transporter Name" required>
                  <Input
                    type="text"
                    placeholder="e.g. VRL Logistics / Blue Dart / Delhivery"
                    value={formData.courier}
                    onChange={e => setFormData({ ...formData, courier: e.target.value })}
                  />
                </Field>

                <Field label="LR Number / Docket Number" required>
                  <Input
                    type="text"
                    placeholder="e.g. LR-984210"
                    value={formData.lrNumber}
                    onChange={e => setFormData({ ...formData, lrNumber: e.target.value })}
                  />
                </Field>

                <Field label="Live Tracking URL / Docket Link">
                  <Input
                    type="text"
                    placeholder="e.g. https://track.vrl.com/12345"
                    value={formData.trackingNumber}
                    onChange={e => setFormData({ ...formData, trackingNumber: e.target.value })}
                  />
                </Field>

                <Field label="Delivery / Shipping Address">
                  <Input
                    type="text"
                    value={formData.customerAddress}
                    onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
                  />
                </Field>
              </FormGrid>
            </Section>
          )}
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDeletePipelineOrder(deleteTarget._id)}
          title="Delete this order?"
          text={`"${deleteTarget?.customerName || 'This order'}" will be removed from the pipeline. This cannot be undone.`}
          confirmLabel="Delete order"
        />
      </Page>
    </DashboardLayout>
  );
}
