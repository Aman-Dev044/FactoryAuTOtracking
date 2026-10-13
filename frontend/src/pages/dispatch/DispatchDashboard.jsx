import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dispatchAPI, uploadAPI, salesPipelineAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import OrderWorkflowBanner, { OrderStepBadge } from '../../components/common/OrderWorkflowBanner';
import {
  LuTruck, LuPlus, LuCircleCheck, LuCircleX, LuClock, LuSave, LuX,
  LuUpload, LuPencil, LuTrash2, LuRefreshCw, LuPackage, LuWrench,
  LuReceipt, LuPause, LuCalendar, LuPhone, LuFileCheck,
} from 'react-icons/lu';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, ConfirmDialog,
  Field, Input, Textarea, Select,
  Button, Badge, Tabs, EmptyState,
} from '../../components/ui';

const formatExternalUrl = (url) => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/uploads/')) {
    const cleanPath = trimmed.startsWith('/api/') ? trimmed : `/api${trimmed}`;
    const apiURL = process.env.REACT_APP_API_URL;
    if (apiURL) {
      const base = apiURL.endsWith('/api') ? apiURL.slice(0, -4) : (apiURL.endsWith('/api/') ? apiURL.slice(0, -5) : apiURL);
      return `${base}${cleanPath}`;
    }
    return window.location.port
      ? `${window.location.protocol}//${window.location.hostname}:9898${cleanPath}`
      : `${window.location.origin}${cleanPath}`;
  }
  return `https://${trimmed}`;
};

const formatDateTime = (dateStr) => {

  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// ── Status config ─────────────────────────────────────────────────
// `tone` / `icon` drive the badge + tile presentation; `label` is still the
// text every toast and <option> reads.

const STATUS_CONFIG = {
  assemble:   { label: 'Assembling',  tone: 'warning', statTone: 'amber',   icon: <LuWrench /> },
  hold:       { label: 'On Hold',     tone: 'danger',  statTone: 'red',     icon: <LuPause /> },
  packing:    { label: 'Packing',     tone: 'info',    statTone: 'blue',    icon: <LuPackage /> },
  dispatched: { label: 'Dispatched',  tone: 'success', statTone: 'green',   icon: <LuTruck /> },
};


const BLANK_FORM = {
  customerName: '', customerContact: '', customerAddress: '', salesOrderRef: '',
  items: [{ modelNumber: '', description: '', quantity: 1, unit: 'pcs' }],
  status: 'assemble', courier: '', trackingNumber: '', lrNumber: '',
  lrCopyUrl: '', podUrl: '', holdReason: '', packingDetails: '',
  totalBoxes: '', totalWeight: '', remarks: ''
};

/* Compact two-line cell helpers so every grid row reads the same way. */
const Stack = ({ children }) => (
  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>{children}</span>
);

/* One editable order line. Flex-wraps instead of overflowing on a phone. */
const ItemRow = ({ children, last }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      padding: 'var(--sp-3)',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
    }}
  >
    {children}
  </div>
);

const Lead = ({ children }) => (
  <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {children}
  </span>
);

const Meta = ({ children, tone, icon }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: tone || 'var(--text-muted)', minWidth: 0 }}>
    {icon}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </span>
);

/** Text field paired with a file-picker button — used for LR copy and POD. */
const UploadField = ({ label, value, onChange, onFile }) => (
  <Field label={label}>
    <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
      <Input style={{ minWidth: 0 }} value={value} onChange={onChange} placeholder="Paste link or upload…" />
      <label
        className="btn btn-sm btn-secondary"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        title="Upload a file"
      >
        <LuUpload />
        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={onFile} />
      </label>
    </div>
  </Field>
);

export default function DispatchDashboard() {
  const { user } = useAuth();
  const canApproveGate = ['super_admin', 'admin', 'gate_guard'].includes(user?.role);
  const canEditDispatch = user?.role !== 'gate_guard';


  const [dispatches, setDispatches] = useState([]);
  const [stats, setStats] = useState({ assemble: 0, hold: 0, packing: 0, dispatched: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [salesOrders, setSalesOrders] = useState([]);

  // Destructive confirmation target (presentation only)
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, sRes, pipelineRes, orderRes] = await Promise.all([
        dispatchAPI.getAll(filterStatus ? { status: filterStatus } : {}).catch(err => {
          console.error('[Dispatch getAll error]:', err);
          return { data: { data: [] } };
        }),
        dispatchAPI.getStats().catch(err => {
          console.error('[Dispatch getStats error]:', err);
          return { data: { data: { assemble: 0, hold: 0, packing: 0, dispatched: 0, today: 0 } } };
        }),
        salesPipelineAPI.getAll().catch(() => ({ data: { data: [] } })),
        orderAPI.getOrders().catch(() => ({ data: { data: [] } }))
      ]);
      setDispatches(Array.isArray(dRes.data?.data) ? dRes.data.data : (Array.isArray(dRes.data) ? dRes.data : []));
      setStats(sRes.data?.data || { assemble: 0, hold: 0, packing: 0, dispatched: 0, today: 0 });

      const pipelineList = pipelineRes.data?.data || [];
      const ordersList = Array.isArray(orderRes.data?.data) ? orderRes.data.data : (Array.isArray(orderRes.data) ? orderRes.data : []);

      const combined = [];

      pipelineList.forEach(p => {
        const refNo = p.salesOrderNumber || p.quotationNumber || p.piNumber || (p._id ? `SO-${p._id.slice(-6).toUpperCase()}` : '');
        if (refNo && !combined.some(c => c.salesOrderRef === refNo)) {
          combined.push({
            source: 'pipeline',
            id: p._id,
            salesOrderRef: refNo,
            customerName: p.customerName || '',
            customerContact: p.customerContact || '',
            customerEmail: p.customerEmail || '',
            customerAddress: p.customerAddress || '',
            stage: p.stage,
            items: (p.items || []).map(it => ({
              modelNumber: it.modelNumber || it.dragChainConfig?.modelNumber || '',
              description: it.description || (it.dragChainConfig ? `${it.dragChainConfig.width || ''} R${it.dragChainConfig.radius || ''} ${it.dragChainConfig.chainType || ''}` : ''),
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'meters'
            }))
          });
        }
      });

      ordersList.forEach(o => {
        const refNo = o.orderNumber || (o._id ? `ORD-${o._id.slice(-6).toUpperCase()}` : '');
        if (refNo && !combined.some(c => c.salesOrderRef === refNo)) {
          combined.push({
            source: 'orders',
            id: o._id,
            salesOrderRef: refNo,
            customerName: o.clientName || '',
            customerContact: '',
            customerEmail: '',
            customerAddress: '',
            stage: o.status,
            items: [{
              modelNumber: o.modelNumber || '',
              description: `Order ${o.orderNumber || ''}`,
              quantity: Number(o.orderQuantity) || 1,
              unit: 'meters'
            }]
          });
        }
      });

      setSalesOrders(combined);
    } catch { toast.error('Failed to load dispatch data'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  const handleSelectSalesOrder = (refNumber) => {
    if (!refNumber) {
      setForm(p => ({ ...p, salesOrderRef: '' }));
      return;
    }
    if (refNumber === '__custom__') {
      setForm(p => ({ ...p, salesOrderRef: '' }));
      return;
    }

    const selectedSO = salesOrders.find(so => so.salesOrderRef === refNumber);
    if (selectedSO) {
      setForm(p => ({
        ...p,
        salesOrderRef: selectedSO.salesOrderRef,
        customerName: selectedSO.customerName || p.customerName,
        customerContact: selectedSO.customerContact || p.customerContact,
        customerAddress: selectedSO.customerAddress || p.customerAddress,
        items: selectedSO.items && selectedSO.items.length > 0
          ? selectedSO.items.map(it => ({
              modelNumber: it.modelNumber || '',
              description: it.description || '',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'meters'
            }))
          : p.items
      }));
      toast.success(`Loaded items & details from Sales Order: ${selectedSO.salesOrderRef}!`);
    } else {
      setForm(p => ({ ...p, salesOrderRef: refNumber }));
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGatePass = async (id, gateStatus) => {
    let gateRemarks = '';
    if (gateStatus === 'declined') {
      gateRemarks = window.prompt('Enter reason for declining/holding vehicle at gate:') || 'Failed Gate Inspection';
      if (!gateRemarks) return;
    }
    try {
      await dispatchAPI.update(id, { gateStatus, gateRemarks });
      toast.success(gateStatus === 'approved' ? '✅ Gate Outbound Pass Approved!' : '❌ Gate Pass Declined / Stopped');
      fetchData();
    } catch (err) {
      toast.error('Failed to update Gate Approval status');
    }
  };


  const openCreate = () => { setForm(BLANK_FORM); setEditingId(null); setModalStep(1); setShowModal(true); };
  const openEdit = (d) => {
    setForm({
      customerName: d.customerName || '', customerContact: d.customerContact || '',
      customerAddress: d.customerAddress || '', salesOrderRef: d.salesOrderRef || '',
      items: d.items?.length ? d.items : BLANK_FORM.items,
      status: d.status || 'assemble', courier: d.courier || '',
      trackingNumber: d.trackingNumber || '', lrNumber: d.lrNumber || '',
      lrCopyUrl: d.lrCopyUrl || '', podUrl: d.podUrl || '',
      holdReason: d.holdReason || '', packingDetails: d.packingDetails || '',
      totalBoxes: d.totalBoxes || '', totalWeight: d.totalWeight || '',
      remarks: d.remarks || ''
    });
    setEditingId(d._id);
    setModalStep(1);
    setShowModal(true);
  };

  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (!form.customerName?.trim()) {
      toast.error('Please enter Customer Name to save draft');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await dispatchAPI.update(editingId, form);
        toast.success('💾 Draft saved successfully!');
      } else {
        const res = await dispatchAPI.create(form);
        const createdId = res.data?.data?._id || res.data?._id;
        if (createdId) setEditingId(createdId);
        toast.success('💾 Saved as draft!');
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await dispatchAPI.update(editingId, form);
        toast.success('Dispatch order updated');
      } else {
        await dispatchAPI.create(form);
        toast.success('Dispatch order created');
      }
      setShowModal(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try { await dispatchAPI.delete(id); toast.success('Deleted'); setDeleteTarget(null); fetchData(); }
    catch { toast.error('Delete failed'); }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      toast.loading('Uploading file...', { id: 'doc-upload' });
      const res = await uploadAPI.uploadFile(formData);
      if (res.data && res.data.fileUrl) {
        setForm(p => ({ ...p, [field]: res.data.fileUrl }));
        toast.success('Document uploaded successfully!', { id: 'doc-upload' });
      } else {
        toast.error('Upload failed', { id: 'doc-upload' });
      }
    } catch (err) {
      toast.error('Failed to upload file', { id: 'doc-upload' });
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await dispatchAPI.update(id, { status });
      toast.success(`Moved to ${STATUS_CONFIG[status].label}`);
      fetchData();
    } catch { toast.error('Update failed'); }
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm(p => ({ ...p, items }));
  };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { modelNumber: '', description: '', quantity: 1, unit: 'pcs' }] }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const filtered = dispatches.filter(d =>
    d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    d.salesOrderRef?.toLowerCase().includes(search.toLowerCase()) ||
    d.lrNumber?.toLowerCase().includes(search.toLowerCase())
  );

  /* -------------------------------------------------------- gate pass cell */
  const GateCell = ({ d }) => {
    const by = d.gateApprovedBy?.name ? <Meta>By {d.gateApprovedBy.name}</Meta> : null;
    const at = d.gateApprovedAt ? <Meta icon={<LuClock />}>{formatDateTime(d.gateApprovedAt)}</Meta> : null;

    if (canApproveGate) {
      if (d.gateStatus === 'approved') {
        return (
          <Stack>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone="success" icon={<LuCircleCheck />}>Approved</Badge>
              <Button size="xs" variant="ghost" onClick={() => handleGatePass(d._id, 'declined')} style={{ color: 'var(--danger)' }}>
                Reject
              </Button>
            </span>
            {by}
            {at}
          </Stack>
        );
      }
      if (d.gateStatus === 'declined') {
        return (
          <Stack>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone="danger" icon={<LuCircleX />}>Declined</Badge>
              <Button size="xs" variant="ghost" onClick={() => handleGatePass(d._id, 'approved')} style={{ color: 'var(--success)' }}>
                Re-approve
              </Button>
            </span>
            {d.gateRemarks && <Meta tone="var(--danger)">Reason: {d.gateRemarks}</Meta>}
            {by}
            {at}
          </Stack>
        );
      }
      return (
        <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          <Button size="xs" variant="success" icon={<LuCircleCheck />} onClick={() => handleGatePass(d._id, 'approved')}>
            Approve
          </Button>
          <Button size="xs" variant="danger" icon={<LuCircleX />} onClick={() => handleGatePass(d._id, 'declined')}>
            Decline
          </Button>
        </span>
      );
    }

    if (d.gateStatus === 'approved') {
      return (
        <Stack>
          <span><Badge tone="success" icon={<LuCircleCheck />}>Gate passed</Badge></span>
          {by}
          {at}
        </Stack>
      );
    }
    if (d.gateStatus === 'declined') {
      return (
        <Stack>
          <span><Badge tone="danger" icon={<LuCircleX />}>Stopped at gate</Badge></span>
          {d.gateRemarks && <Meta tone="var(--danger)">Reason: {d.gateRemarks}</Meta>}
          {by}
          {at}
        </Stack>
      );
    }
    return <Badge tone="warning" icon={<LuClock />}>Gate check pending</Badge>;
  };

  /* ------------------------------------------------------- grid definition */
  const columns = [
    {
      key: 'customerName',
      header: 'Customer',
      primary: true,
      sortValue: (d) => d.customerName || '',
      render: (d) => (
        <Stack>
          <Lead>{d.customerName}</Lead>
          {d.customerContact && <Meta icon={<LuPhone />}>{d.customerContact}</Meta>}
          {d.createdAt && <Meta icon={<LuClock />}>Created {formatDateTime(d.createdAt)}</Meta>}
        </Stack>
      ),
    },
    {
      key: 'salesOrderRef',
      header: 'Sales Order Ref',
      hideBelow: 1180,
      sortValue: (d) => d.salesOrderRef || '',
      render: (d) => <Meta>{d.salesOrderRef || '—'}</Meta>,
    },
    {
      key: 'items',
      header: 'Items',
      sortable: false,
      hideBelow: 1080,
      render: (d) => (
        <Stack>
          {d.items?.slice(0, 2).map((it, i) => (
            <Meta key={i} tone="var(--text-secondary)">{it.modelNumber || it.description} × {it.quantity}</Meta>
          ))}
          {d.items?.length > 2 && <Meta>+{d.items.length - 2} more</Meta>}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (d) => d.status || '',
      render: (d) => {
        const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.assemble;
        return (
          <Stack>
            <span><OrderStepBadge record={d} /></span>
            {user?.role === 'gate_guard' ? (
              <span><Badge tone={sc.tone} icon={sc.icon}>{sc.label}</Badge></span>
            ) : (
              <Select
                value={d.status}
                onChange={e => handleStatusChange(d._id, e.target.value)}
                onClick={e => e.stopPropagation()}
                aria-label="Change dispatch status"
                style={{ height: 28, fontSize: 'var(--fs-xs)', cursor: 'pointer', minWidth: 120 }}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'lrNumber',
      header: 'LR No.',
      hideBelow: 1320,
      sortValue: (d) => d.lrNumber || '',
      render: (d) => <Meta>{d.lrNumber || '—'}</Meta>,
    },
    {
      key: 'courier',
      header: 'Courier',
      hideBelow: 1440,
      sortValue: (d) => d.courier || '',
      render: (d) => <Meta>{d.courier || '—'}</Meta>,
    },
    {
      key: 'trackingNumber',
      header: 'Tracking',
      hideBelow: 1540,
      sortValue: (d) => d.trackingNumber || '',
      render: (d) => <Meta>{d.trackingNumber || '—'}</Meta>,
    },
    {
      key: 'podUrl',
      header: 'POD',
      sortable: false,
      hideBelow: 900,
      render: (d) => (
        d.podUrl ? (
          <a
            className="btn btn-xs btn-secondary"
            href={formatExternalUrl(d.podUrl)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', color: 'var(--success)', borderColor: 'color-mix(in srgb, var(--success) 32%, transparent)' }}
          >
            <LuFileCheck /> View POD
          </a>
        ) : (
          <Meta tone="var(--text-ghost)">Pending</Meta>
        )
      ),
    },
    {
      key: 'gateStatus',
      header: 'Gate Outbound Pass',
      sortable: false,
      hideBelow: 760,
      render: (d) => <GateCell d={d} />,
    },
    ...(canEditDispatch ? [{
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (d) => (
        <span style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}>
          <button className="icon-btn" title="Edit dispatch" aria-label="Edit dispatch"
            style={{ color: 'var(--c-blue)' }} onClick={() => openEdit(d)}>
            <LuPencil />
          </button>
          <button className="icon-btn" title="Delete dispatch" aria-label="Delete dispatch"
            style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(d)}>
            <LuTrash2 />
          </button>
        </span>
      ),
    }] : []),
  ];

  const stepTabs = [
    { key: 1, label: 'Assembly', icon: <LuWrench /> },
    { key: 2, label: 'Packing', icon: <LuPackage /> },
    { key: 3, label: 'Billing', icon: <LuReceipt /> },
    { key: 4, label: 'Dispatch', icon: <LuTruck /> },
  ];

  const goToStep = (step) => {
    if (step > 1 && !form.customerName?.trim()) {
      toast.error('Please enter Customer Name first');
      return;
    }
    setModalStep(step);
  };

  const draftButton = (
    <Button
      onClick={handleSaveDraft}
      disabled={submitting}
      icon={<LuSave />}
      style={{ marginRight: 'auto' }}
    >
      Save as draft
    </Button>
  );

  return (
    <DashboardLayout pageTitle="Dispatch & Shipping Logistics">
      <Page>
        <PageHeader
          title="Dispatch & Fulfillment"
          subtitle="Sales → confirmed order → (store) assembly → box packing → logistics dispatch."
          actions={
            <>
              <Button icon={<LuRefreshCw />} onClick={fetchData}>Refresh</Button>
              {canEditDispatch && (
                <Button variant="primary" icon={<LuPlus />} onClick={openCreate}>New Dispatch</Button>
              )}
            </>
          }
        />

        {/* End-to-End 9-Step Lifecycle Banner */}
        <OrderWorkflowBanner activeStageKey={filterStatus || 'assemble'} />

        <StatRow>
          {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
            <StatTile
              key={key}
              label={sc.label}
              value={stats[key] || 0}
              icon={sc.icon}
              tone={sc.statTone}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            />
          ))}
          <StatTile label="Today's Orders" value={stats.today || 0} icon={<LuCalendar />} tone="primary" />
        </StatRow>

        <Tabs
          value={filterStatus}
          onChange={setFilterStatus}
          items={[
            { key: '', label: 'All', icon: <LuTruck /> },
            ...Object.entries(STATUS_CONFIG).map(([key, sc]) => ({
              key,
              label: sc.label,
              icon: sc.icon,
              count: stats[key] || 0,
            })),
          ]}
        />

        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search customer, order ref, LR no…"
            onChange={setSearch}
          />
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          pageSize={10}
          empty={
            <EmptyState
              icon={<LuTruck />}
              title="No dispatch orders found"
              text="Nothing matches the current stage filter or search."
              action={canEditDispatch ? (
                <Button variant="primary" icon={<LuPlus />} onClick={openCreate}>New Dispatch</Button>
              ) : undefined}
            />
          }
        />

        {/* Create/Edit Modal - Multi-Step Wizard */}
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          size="lg"
          title={editingId ? 'Edit dispatch order' : 'New order for assembly & dispatch'}
          subtitle={`Step ${modalStep} of 4 — ${stepTabs.find(s => s.key === modalStep)?.label}`}
          footer={
            <>
              {draftButton}
              {modalStep > 1 && (
                <Button onClick={() => setModalStep(modalStep - 1)}>Back</Button>
              )}
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              {modalStep < 4 ? (
                <Button variant="primary" onClick={() => goToStep(modalStep + 1)}>
                  Next: {stepTabs[modalStep]?.label}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="dispatch-wizard-form"
                  variant="success"
                  icon={<LuSave />}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : editingId ? 'Update entry' : 'Save & complete order'}
                </Button>
              )}
            </>
          }
        >
          <Tabs value={modalStep} onChange={goToStep} items={stepTabs} />

          <form id="dispatch-wizard-form" onSubmit={handleSubmit}>
            {/* STEP 1: ASSEMBLY & ORDER DETAILS */}
            {modalStep === 1 && (
              <Section title="Order & Customer Details">
                <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                  <Field label="Customer Name" required span="all">
                    <Input required value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="e.g. ABC Industries" />
                  </Field>

                  <Field label="Contact / Phone">
                    <Input value={form.customerContact} onChange={e => setForm(p => ({ ...p, customerContact: e.target.value }))} placeholder="+91 98765..." />
                  </Field>

                  <Field
                    label="Sales Order Ref"
                    required
                    hint={form.salesOrderRef ? `Linked: ${form.salesOrderRef}` : 'Pick a sales order to auto-fill items'}
                  >
                    <Select
                      style={{ cursor: 'pointer', fontWeight: 600 }}
                      value={salesOrders.some(so => so.salesOrderRef === form.salesOrderRef) ? form.salesOrderRef : (form.salesOrderRef ? '__custom__' : '')}
                      onChange={e => handleSelectSalesOrder(e.target.value)}
                    >
                      <option value="">-- Select Sales Order to Auto-fill --</option>
                      {salesOrders.map(so => (
                        <option key={so.salesOrderRef} value={so.salesOrderRef}>
                          {so.salesOrderRef} — {so.customerName} ({so.items?.length || 0} items)
                        </option>
                      ))}
                      <option value="__custom__">-- Manual / Custom SO Reference --</option>
                    </Select>

                    {(!salesOrders.some(so => so.salesOrderRef === form.salesOrderRef) || form.salesOrderRef === '__custom__') && (
                      <Input
                        style={{ marginTop: 8 }}
                        value={form.salesOrderRef === '__custom__' ? '' : form.salesOrderRef}
                        onChange={e => setForm(p => ({ ...p, salesOrderRef: e.target.value }))}
                        placeholder="Type custom SO Ref (e.g. SO-2026-001)"
                      />
                    )}
                  </Field>

                  <Field label="Delivery Address" span="all">
                    <Textarea rows={2} value={form.customerAddress} onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value }))} placeholder="Full delivery address..." />
                  </Field>

                  <Field label="Workflow Stage">
                    <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Field>
                </FormGrid>

                <Section
                  title="Items"
                  actions={<Button size="xs" icon={<LuPlus />} onClick={addItem}>Add item</Button>}
                >
                  <Surface>
                    {form.items.map((item, idx) => (
                      <ItemRow key={idx} last={idx === form.items.length - 1}>
                        <Input style={{ flex: '1 1 140px', minWidth: 0 }} value={item.modelNumber} onChange={e => updateItem(idx, 'modelNumber', e.target.value)} placeholder="Model No." />
                        <Input style={{ flex: '1 1 160px', minWidth: 0 }} value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                        <Input style={{ flex: '0 1 78px', minWidth: 0 }} type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} placeholder="Qty" />
                        <Select style={{ flex: '0 1 96px', minWidth: 0 }} value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                          <option>pcs</option><option>kg</option><option>meters</option><option>boxes</option>
                        </Select>
                        {form.items.length > 1 && (
                          <button className="icon-btn" type="button" onClick={() => removeItem(idx)} title="Remove item" aria-label="Remove item" style={{ color: 'var(--danger)', flexShrink: 0 }}>
                            <LuX />
                          </button>
                        )}
                      </ItemRow>
                    ))}
                  </Surface>
                </Section>
              </Section>
            )}

            {/* STEP 2: PACKING DETAILS */}
            {modalStep === 2 && (
              <Section title="Packing Details & Box Counts">
                <FormGrid>
                  <Field label="Total Box Count">
                    <Input type="number" min={0} value={form.totalBoxes} onChange={e => setForm(p => ({ ...p, totalBoxes: e.target.value }))} placeholder="0" />
                  </Field>
                  <Field label="Total Weight">
                    <Input value={form.totalWeight} onChange={e => setForm(p => ({ ...p, totalWeight: e.target.value }))} placeholder="e.g. 45 KG" />
                  </Field>
                  <Field label="Packing Details / Notes" span="all">
                    <Textarea rows={2} value={form.packingDetails} onChange={e => setForm(p => ({ ...p, packingDetails: e.target.value }))} placeholder="Packaging specifications, labels, strapping..." />
                  </Field>
                </FormGrid>
              </Section>
            )}

            {/* STEP 3: BILLING & REMARKS */}
            {modalStep === 3 && (
              <Section title="Remarks & Documentation">
                <FormGrid>
                  <Field label="Remarks / Order Notes" span="all">
                    <Textarea rows={3} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Any special customer instructions..." />
                  </Field>
                </FormGrid>
              </Section>
            )}

            {/* STEP 4: LOGISTICS & DISPATCH */}
            {modalStep === 4 && (
              <Section title="Courier Logistics, LR & POD">
                <FormGrid>
                  <Field label="Courier / Transporter">
                    <Input value={form.courier} onChange={e => setForm(p => ({ ...p, courier: e.target.value }))} placeholder="DTDC, BlueDart, V-Trans..." />
                  </Field>
                  <Field label="Tracking Number">
                    <Input value={form.trackingNumber} onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))} placeholder="AWB / Tracking ID" />
                  </Field>
                  <Field label="LR Number">
                    <Input value={form.lrNumber} onChange={e => setForm(p => ({ ...p, lrNumber: e.target.value }))} placeholder="Lorry Receipt No." />
                  </Field>

                  <UploadField
                    label="LR Copy (PDF / Scan / Link)"
                    value={form.lrCopyUrl}
                    onChange={e => setForm(p => ({ ...p, lrCopyUrl: e.target.value }))}
                    onFile={e => handleFileUpload(e, 'lrCopyUrl')}
                  />

                  <UploadField
                    label="POD Receipt (PDF / Scan / Link)"
                    value={form.podUrl}
                    onChange={e => setForm(p => ({ ...p, podUrl: e.target.value }))}
                    onFile={e => handleFileUpload(e, 'podUrl')}
                  />

                  {form.status === 'hold' && (
                    <Field label="Hold Reason" required span="all">
                      <Input value={form.holdReason} onChange={e => setForm(p => ({ ...p, holdReason: e.target.value }))} placeholder="Reason for hold..." />
                    </Field>
                  )}
                </FormGrid>
              </Section>
            )}
          </form>
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget._id)}
          title="Delete this dispatch order?"
          text={`"${deleteTarget?.customerName || 'This dispatch order'}" will be permanently removed.`}
          confirmLabel="Delete"
        />
      </Page>
    </DashboardLayout>
  );
}
