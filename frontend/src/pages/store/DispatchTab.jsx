import React, { useState, useEffect, useCallback } from 'react';
import { dispatchAPI, uploadAPI, salesPipelineAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import OrderWorkflowBanner, { OrderStepBadge } from '../../components/common/OrderWorkflowBanner';
import {
  LuTruck, LuPlus, LuX, LuPencil, LuTrash2, LuRefreshCw, LuSave, LuUpload,
  LuFileText, LuImage, LuVideo, LuReceipt, LuChevronRight, LuMail,
  LuPhone, LuClock, LuCircleCheck, LuCircleX, LuPackage, LuWrench,
  LuPause, LuExternalLink, LuFileCheck,
} from 'react-icons/lu';
import {
  Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, ConfirmDialog,
  Field, Input, Textarea, Select, Checkbox,
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

const isVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|mov|webm|mkv|avi|3gp|m4v)(\?.*)?$/i.test(url);
};

const isPdfUrl = (url) => {
  if (!url) return false;
  return /\.(pdf)(\?.*)?$/i.test(url);
};

/* `tone` / `statTone` / `icon` are presentation only; `label` is still the text
   every toast and <option> reads. */
const STATUS_CONFIG = {
  assemble: { label: '1. Assembly', tone: 'warning', statTone: 'amber', icon: <LuWrench />, stepNum: 1 },
  packing: { label: '2. Packing', tone: 'info', statTone: 'blue', icon: <LuPackage />, stepNum: 2 },
  dispatched: { label: '3. Dispatched', tone: 'success', statTone: 'green', icon: <LuTruck />, stepNum: 3 },
  hold: { label: 'On Hold', tone: 'danger', statTone: 'red', icon: <LuPause />, stepNum: 0 },
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

const BLANK_FORM = {
  customerName: '', customerContact: '', customerEmail: '', notifyCustomerEmail: true,
  customerAddress: '', salesOrderRef: '',
  items: [{ modelNumber: '', description: '', quantity: 1, unit: 'meters' }],
  status: 'assemble',
  // Assembly stage
  assemblyMediaUrl: '', assemblyNotes: '',
  // Packing stage
  packingDetails: '', packingMediaUrl: '', packingNotes: '', totalBoxes: '', totalWeight: '',
  // Dispatch & Logistics stage
  dispatchMediaUrl: '', courier: '', trackingNumber: '', lrNumber: '', lrCopyUrl: '',
  // Billing & Invoice stage
  billingInvoiceUrl: '', invoiceNumber: '', invoiceAmount: '', invoiceDate: '',
  // POD & Hold
  podUrl: '', holdReason: '', remarks: ''
};

/* Compact two-line cell helpers so every grid row reads the same way. */
const Stack = ({ children, gap = 2 }) => (
  <span style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0, alignItems: 'flex-start' }}>{children}</span>
);

const Lead = ({ children }) => (
  <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
    {children}
  </span>
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

const Meta = ({ children, tone, icon }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: tone || 'var(--text-muted)', minWidth: 0, maxWidth: '100%' }}>
    {icon}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </span>
);

/** Small pill button that opens a proof attachment in the preview dialog. */
const ProofChip = ({ tone, icon, children, onClick }) => (
  <button
    type="button"
    className="chip"
    onClick={onClick}
    style={{
      height: 24,
      color: `var(--c-${tone})`,
      background: `color-mix(in srgb, var(--c-${tone}) 10%, transparent)`,
      borderColor: `color-mix(in srgb, var(--c-${tone}) 30%, transparent)`,
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      maxWidth: '100%',
      overflow: 'hidden',
    }}
  >
    {icon}
    {children}
  </button>
);

// Reusable media uploader with direct drag-and-drop & file selection
function MediaUploader({ label, fileUrl, onUploadSuccess, accept = "image/*,video/*,application/pdf", required = false, hint = "Upload Photo, Video or PDF" }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await uploadAPI.uploadFile(formData);
      if (res.data?.fileUrl) {
        onUploadSuccess(res.data.fileUrl);
        toast.success(`${label} uploaded successfully!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isVid = isVideoUrl(fileUrl);
  const isPdf = isPdfUrl(fileUrl);

  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        padding: 'var(--sp-3)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-strong)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-2)' }}>
        <span className="field-label" style={{ margin: 0 }}>
          {label}
          {required && <span className="req">*</span>}
        </span>
        {fileUrl && (
          <Badge tone="success" icon={<LuCircleCheck />}>Attached</Badge>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <label className="btn btn-sm btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? <span className="spinner-sm" /> : <LuUpload />}
          {uploading ? 'Uploading…' : fileUrl ? 'Change file' : 'Choose file'}
          <input type="file" accept={accept} onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
        </label>

        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>
          {hint} (Max 50MB)
        </span>
      </div>

      {fileUrl && (
        <div
          style={{
            marginTop: 'var(--sp-3)',
            padding: 'var(--sp-2)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            minWidth: 0,
          }}
        >
          {isVid ? (
            <video src={formatExternalUrl(fileUrl)} style={{ height: 44, borderRadius: 'var(--radius-xs)', maxWidth: 80 }} controls={false} />
          ) : isPdf ? (
            <span style={{ fontSize: '1.5rem', color: 'var(--danger)', display: 'flex' }}><LuFileText /></span>
          ) : (
            <img src={formatExternalUrl(fileUrl)} alt="Preview" style={{ height: 44, width: 44, objectFit: 'cover', borderRadius: 'var(--radius-xs)' }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {fileUrl.split('/').pop()}
            </div>
            <a
              href={formatExternalUrl(fileUrl)}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
            >
              <LuExternalLink /> Open & view file
            </a>
          </div>
          <button type="button" className="icon-btn" onClick={() => onUploadSuccess('')} style={{ color: 'var(--danger)' }} title="Remove file" aria-label="Remove file">
            <LuX />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DispatchTab({ readOnly = false }) {
  const { user } = useAuth();
  const canApproveGate = ['super_admin', 'admin', 'gate_guard'].includes(user?.role);
  const canEditDispatch = !readOnly && user?.role !== 'gate_guard';

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

  // Media preview modal state
  const [previewMedia, setPreviewMedia] = useState(null); // { url, title, type }

  // Destructive confirmation target (presentation only)
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Quick Stage Transition Modal State
  const [stageModal, setStageModal] = useState({
    open: false,
    dispatch: null,
    targetStage: '', // 'packing', 'dispatched', 'assemble', 'hold'
    mediaUrl: '',
    notes: '',
    boxes: '',
    weight: '',
    invoiceUrl: '',
    invoiceNo: '',
    invoiceAmt: '',
    lrNo: '',
    lrCopy: '',
    courier: '',
    tracking: '',
    customerEmail: '',
    notifyCustomerEmail: true
  });

  const [salesOrders, setSalesOrders] = useState([]);

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
        customerEmail: selectedSO.customerEmail || p.customerEmail,
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
    } catch {
      toast.error('Failed to update Gate Approval status');
    }
  };

  const openCreate = () => { setForm(BLANK_FORM); setEditingId(null); setModalStep(1); setShowModal(true); };
  const openEdit = (d) => {
    setForm({
      customerName: d.customerName || '', customerContact: d.customerContact || '',
      customerEmail: d.customerEmail || '', notifyCustomerEmail: d.notifyCustomerEmail !== false,
      customerAddress: d.customerAddress || '', salesOrderRef: d.salesOrderRef || '',
      items: d.items?.length ? d.items : BLANK_FORM.items,
      status: d.status || 'assemble',
      assemblyMediaUrl: d.assemblyMediaUrl || '', assemblyNotes: d.assemblyNotes || '',
      packingDetails: d.packingDetails || '', packingMediaUrl: d.packingMediaUrl || '',
      packingNotes: d.packingNotes || '', totalBoxes: d.totalBoxes || '', totalWeight: d.totalWeight || '',
      dispatchMediaUrl: d.dispatchMediaUrl || '', courier: d.courier || '',
      trackingNumber: d.trackingNumber || '', lrNumber: d.lrNumber || '',
      lrCopyUrl: d.lrCopyUrl || '', billingInvoiceUrl: d.billingInvoiceUrl || '',
      invoiceNumber: d.invoiceNumber || '', invoiceAmount: d.invoiceAmount || '',
      invoiceDate: d.invoiceDate ? d.invoiceDate.split('T')[0] : '',
      podUrl: d.podUrl || '', holdReason: d.holdReason || '', remarks: d.remarks || ''
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
        toast.success('Dispatch order updated successfully');
      } else {
        await dispatchAPI.create(form);
        toast.success('Dispatch order created successfully');
      }
      setShowModal(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try { await dispatchAPI.delete(id); toast.success('Deleted'); setDeleteTarget(null); fetchData(); }
    catch { toast.error('Delete failed'); }
  };

  // Trigger manual on-demand email notification
  const handleSendManualEmail = async (d) => {
    const defaultEmail = d.customerEmail || '';
    const email = window.prompt('Enter customer email to send dispatch notification:', defaultEmail);
    if (!email) return;
    try {
      toast.loading('Sending email notification...', { id: 'sendEmail' });
      await dispatchAPI.sendEmail(d._id, { email });
      toast.success(`📧 Email notification sent to ${email}`, { id: 'sendEmail' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email', { id: 'sendEmail' });
    }
  };

  // Open Quick Stage Transition Modal
  const openStageTransition = (d, targetStage) => {
    setStageModal({
      open: true,
      dispatch: d,
      targetStage,
      mediaUrl: targetStage === 'packing' ? (d.packingMediaUrl || '') : targetStage === 'dispatched' ? (d.dispatchMediaUrl || '') : (d.assemblyMediaUrl || ''),
      notes: targetStage === 'packing' ? (d.packingNotes || '') : (d.assemblyNotes || ''),
      boxes: d.totalBoxes || '',
      weight: d.totalWeight || '',
      invoiceUrl: d.billingInvoiceUrl || '',
      invoiceNo: d.invoiceNumber || '',
      invoiceAmt: d.invoiceAmount || '',
      lrNo: d.lrNumber || '',
      lrCopy: d.lrCopyUrl || '',
      courier: d.courier || '',
      tracking: d.trackingNumber || '',
      customerEmail: d.customerEmail || '',
      notifyCustomerEmail: true
    });
  };

  // Submit Quick Stage Transition
  const handleStageTransitionSubmit = async (e) => {
    e.preventDefault();
    if (!stageModal.dispatch) return;
    setSubmitting(true);
    try {
      const updates = {
        status: stageModal.targetStage,
        customerEmail: stageModal.customerEmail,
        notifyCustomerEmail: stageModal.notifyCustomerEmail
      };
      if (stageModal.targetStage === 'packing') {
        updates.assemblyMediaUrl = stageModal.mediaUrl;
        updates.assemblyNotes = stageModal.notes;
        updates.totalBoxes = stageModal.boxes;
        updates.totalWeight = stageModal.weight;
      } else if (stageModal.targetStage === 'dispatched') {
        updates.packingMediaUrl = stageModal.mediaUrl;
        updates.dispatchMediaUrl = stageModal.mediaUrl;
        updates.billingInvoiceUrl = stageModal.invoiceUrl;
        updates.invoiceNumber = stageModal.invoiceNo;
        updates.invoiceAmount = stageModal.invoiceAmt;
        updates.lrNumber = stageModal.lrNo;
        updates.lrCopyUrl = stageModal.lrCopy;
        updates.courier = stageModal.courier;
        updates.trackingNumber = stageModal.tracking;
      }
      await dispatchAPI.update(stageModal.dispatch._id, updates);
      toast.success(`Order successfully moved to ${STATUS_CONFIG[stageModal.targetStage]?.label || stageModal.targetStage}!`);
      if (stageModal.customerEmail && stageModal.notifyCustomerEmail) {
        toast.success(`📧 Notification email sent to ${stageModal.customerEmail}`);
      }
      setStageModal({ open: false, dispatch: null, targetStage: '' });
      fetchData();
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm(p => ({ ...p, items }));
  };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { modelNumber: '', description: '', quantity: 1, unit: 'meters' }] }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const filtered = dispatches.filter(d =>
    d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    d.salesOrderRef?.toLowerCase().includes(search.toLowerCase()) ||
    d.lrNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  /* -------------------------------------------------------- gate pass cell */
  const GateCell = ({ d }) => {
    if (canApproveGate) {
      if (d.gateStatus === 'approved') {
        return (
          <Stack>
            <Badge tone="success" icon={<LuCircleCheck />}>Gate approved</Badge>
            <Button size="xs" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => handleGatePass(d._id, 'declined')}>
              Decline
            </Button>
          </Stack>
        );
      }
      if (d.gateStatus === 'declined') {
        return (
          <Stack>
            <Badge tone="danger" icon={<LuCircleX />}>Gate declined</Badge>
            <Button size="xs" variant="ghost" style={{ color: 'var(--success)' }} onClick={() => handleGatePass(d._id, 'approved')}>
              Re-approve
            </Button>
          </Stack>
        );
      }
      return (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          <Button size="xs" variant="success" onClick={() => handleGatePass(d._id, 'approved')}>Pass</Button>
          <Button size="xs" variant="danger" onClick={() => handleGatePass(d._id, 'declined')}>Stop</Button>
        </span>
      );
    }

    return (
      <Badge tone={d.gateStatus === 'approved' ? 'success' : d.gateStatus === 'declined' ? 'danger' : 'warning'}>
        {d.gateStatus === 'approved' ? 'Gate passed' : d.gateStatus === 'declined' ? 'Stopped' : 'Gate pending'}
      </Badge>
    );
  };

  /* ------------------------------------------------------- grid definition */
  const columns = [
    {
      key: 'customerName',
      header: 'Customer & Contact',
      primary: true,
      sortValue: (d) => d.customerName || '',
      render: (d) => (
        <Stack>
          <Lead>{d.customerName}</Lead>
          {d.salesOrderRef && <Meta tone="var(--primary)">SO: {d.salesOrderRef}</Meta>}
          {d.customerEmail && <Meta tone="var(--c-blue)" icon={<LuMail />}>{d.customerEmail}</Meta>}
          {d.customerContact && <Meta icon={<LuPhone />}>{d.customerContact}</Meta>}
          {d.createdAt && <Meta icon={<LuClock />}>{formatDateTime(d.createdAt)}</Meta>}
        </Stack>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      sortable: false,
      hideBelow: 1180,
      render: (d) => (
        <Stack>
          {d.items?.slice(0, 2).map((it, i) => (
            <Meta key={i} tone="var(--text-secondary)">
              {it.modelNumber || it.description} × {it.quantity} {it.unit || 'meters'}
            </Meta>
          ))}
          {d.items?.length > 2 && <Meta>+{d.items.length - 2} more items</Meta>}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Current Stage',
      sortValue: (d) => STATUS_CONFIG[d.status]?.stepNum ?? 0,
      render: (d) => {
        const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.assemble;
        return (
          <Stack>
            <span><OrderStepBadge record={d} /></span>
            <Badge tone={sc.tone} icon={sc.icon}>{sc.label}</Badge>
            {d.status === 'assemble' && d.assembledAt && <Meta>Assembled {formatDateTime(d.assembledAt)}</Meta>}
            {d.status === 'packing' && d.packedAt && <Meta>Packed {formatDateTime(d.packedAt)}</Meta>}
            {d.status === 'dispatched' && d.dispatchedAt && <Meta>Dispatched {formatDateTime(d.dispatchedAt)}</Meta>}
          </Stack>
        );
      },
    },
    {
      key: 'proofs',
      header: 'Step Proofs',
      sortable: false,
      hideBelow: 1080,
      render: (d) => (
        <Stack gap={4}>
          {d.assemblyMediaUrl ? (
            <ProofChip
              tone="amber"
              icon={isVideoUrl(d.assemblyMediaUrl) ? <LuVideo /> : <LuImage />}
              onClick={() => setPreviewMedia({ url: d.assemblyMediaUrl, title: `Assembly Proof - ${d.customerName}`, type: isVideoUrl(d.assemblyMediaUrl) ? 'video' : 'image' })}
            >
              Assembly {isVideoUrl(d.assemblyMediaUrl) ? 'video' : 'photo'}
            </ProofChip>
          ) : (
            <Meta tone="var(--text-ghost)">Assembly: no media</Meta>
          )}

          {d.packingMediaUrl ? (
            <ProofChip
              tone="blue"
              icon={isVideoUrl(d.packingMediaUrl) ? <LuVideo /> : <LuImage />}
              onClick={() => setPreviewMedia({ url: d.packingMediaUrl, title: `Packing Proof - ${d.customerName}`, type: isVideoUrl(d.packingMediaUrl) ? 'video' : 'image' })}
            >
              Packing {isVideoUrl(d.packingMediaUrl) ? 'video' : 'photo'}{d.totalBoxes ? ` (${d.totalBoxes} bx)` : ''}
            </ProofChip>
          ) : (
            <Meta tone="var(--text-ghost)">Packing: no media</Meta>
          )}

          {d.dispatchMediaUrl && (
            <ProofChip
              tone="green"
              icon={isVideoUrl(d.dispatchMediaUrl) ? <LuVideo /> : <LuImage />}
              onClick={() => setPreviewMedia({ url: d.dispatchMediaUrl, title: `Dispatch Loading Proof - ${d.customerName}`, type: isVideoUrl(d.dispatchMediaUrl) ? 'video' : 'image' })}
            >
              Dispatch {isVideoUrl(d.dispatchMediaUrl) ? 'video' : 'photo'}
            </ProofChip>
          )}
        </Stack>
      ),
    },
    {
      key: 'billing',
      header: 'Billing & Invoice',
      sortable: false,
      hideBelow: 1400,
      render: (d) => (
        (d.billingInvoiceUrl || d.invoiceNumber) ? (
          <Stack>
            {d.invoiceNumber && <Lead>#{d.invoiceNumber}</Lead>}
            {d.invoiceAmount > 0 && <Meta tone="var(--success)">₹{Number(d.invoiceAmount).toLocaleString()}</Meta>}
            {d.billingInvoiceUrl ? (
              <a
                href={formatExternalUrl(d.billingInvoiceUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
              >
                <LuReceipt /> View attached bill
              </a>
            ) : (
              <Meta tone="var(--warning)">Bill file pending</Meta>
            )}
          </Stack>
        ) : <Meta tone="var(--text-ghost)">—</Meta>
      ),
    },
    {
      key: 'logistics',
      header: 'Logistics',
      sortable: false,
      hideBelow: 1540,
      render: (d) => (
        (d.lrNumber || d.courier) ? (
          <Stack>
            {d.lrNumber && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Lead>LR {d.lrNumber}</Lead>
                {d.lrCopyUrl && (
                  <a
                    href={formatExternalUrl(d.lrCopyUrl)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--fs-xs)', color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    <LuFileText /> Copy
                  </a>
                )}
              </span>
            )}
            {d.courier && <Meta icon={<LuTruck />}>{d.courier}</Meta>}
            {d.trackingNumber && <Meta>AWB: {d.trackingNumber}</Meta>}
            {d.podUrl && (
              <a
                href={formatExternalUrl(d.podUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--success)', textDecoration: 'none' }}
              >
                <LuFileCheck /> View POD
              </a>
            )}
          </Stack>
        ) : <Meta tone="var(--text-ghost)">—</Meta>
      ),
    },
    {
      key: 'gateStatus',
      header: 'Gate Pass',
      sortable: false,
      hideBelow: 860,
      render: (d) => <GateCell d={d} />,
    },
    ...(canEditDispatch ? [{
      key: 'actions',
      header: 'Next Step / Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (d) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {d.status === 'assemble' && (
            <Button
              variant="primary"
              size="xs"
              iconRight={<LuChevronRight />}
              icon={<LuPackage />}
              onClick={() => openStageTransition(d, 'packing')}
              title="Complete Assembly & Move to Packing"
            >
              Move to packing
            </Button>
          )}

          {d.status === 'packing' && (
            <Button
              variant="success"
              size="xs"
              iconRight={<LuChevronRight />}
              icon={<LuTruck />}
              onClick={() => openStageTransition(d, 'dispatched')}
              title="Attach Bill, LR & Dispatch"
            >
              Dispatch & bill
            </Button>
          )}

          <button
            className="icon-btn"
            onClick={() => handleSendManualEmail(d)}
            title="Send/Resend Email Notification to Customer"
            aria-label="Send email notification"
            style={{ color: 'var(--c-blue)' }}
          >
            <LuMail />
          </button>

          <button className="icon-btn" onClick={() => openEdit(d)} title="Full Edit" aria-label="Edit order" style={{ color: 'var(--text-muted)' }}>
            <LuPencil />
          </button>

          <button className="icon-btn" onClick={() => setDeleteTarget(d)} title="Delete" aria-label="Delete order" style={{ color: 'var(--danger)' }}>
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
    <Button onClick={handleSaveDraft} disabled={submitting} icon={<LuSave />} style={{ marginRight: 'auto' }}>
      Save as draft
    </Button>
  );

  const emailNotificationBlock = (
    <Surface style={{ padding: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--c-blue)', marginBottom: 'var(--sp-2)' }}>
        <LuMail /> Customer email notification
      </div>
      <Input
        type="email"
        style={{ marginBottom: 'var(--sp-2)' }}
        value={stageModal.customerEmail}
        onChange={e => setStageModal(p => ({ ...p, customerEmail: e.target.value }))}
        placeholder="customer@example.com (Recipient Email)"
      />
      <Checkbox
        label="Automatically send email notification with proof attachments and tracking info"
        checked={stageModal.notifyCustomerEmail}
        onChange={e => setStageModal(p => ({ ...p, notifyCustomerEmail: e.target.checked }))}
      />
    </Surface>
  );

  return (
    <>
      <Section
        title="Assembly → Packing → Dispatch & Billing"
        actions={
          <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" icon={<LuRefreshCw />} onClick={fetchData}>Refresh</Button>
            {!readOnly && canEditDispatch && (
              <Button size="sm" variant="primary" icon={<LuPlus />} onClick={openCreate}>New order</Button>
            )}
          </span>
        }
      >
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: '0 0 var(--sp-4)' }}>
          Attach photo/video proofs at every step, upload the billing invoice, and notify the customer with tracking and attachments.
        </p>

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
        </StatRow>

        <Tabs
          value={filterStatus}
          onChange={setFilterStatus}
          items={[
            { key: '', label: 'All stages', icon: <LuTruck /> },
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
            placeholder="Search customer, email, order ref, LR no, invoice no…"
            onChange={setSearch}
          />
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          pageSize={15}
          empty={
            <EmptyState
              icon={<LuTruck />}
              title="No orders found in this stage"
              text="Nothing matches the current stage filter or search."
              action={!readOnly && canEditDispatch ? (
                <Button variant="primary" icon={<LuPlus />} onClick={openCreate}>New order</Button>
              ) : undefined}
            />
          }
        />
      </Section>

      {/* QUICK STAGE PROGRESSION MODAL */}
      <Dialog
        open={stageModal.open}
        onClose={() => setStageModal({ open: false, dispatch: null, targetStage: '' })}
        size="lg"
        title={stageModal.targetStage === 'packing' ? 'Complete assembly → move to packing' : 'Complete packing → dispatch & attach bill'}
        subtitle={stageModal.dispatch ? [stageModal.dispatch.customerName, stageModal.dispatch.salesOrderRef].filter(Boolean).join(' · ') : undefined}
        footer={
          <>
            <Button onClick={() => setStageModal({ open: false, dispatch: null, targetStage: '' })}>Cancel</Button>
            <Button type="submit" form="stage-transition-form" variant="primary" icon={<LuSave />} disabled={submitting}>
              {submitting ? 'Saving…' : stageModal.targetStage === 'packing' ? 'Confirm & move to packing' : 'Confirm & mark dispatched'}
            </Button>
          </>
        }
      >
        <form id="stage-transition-form" onSubmit={handleStageTransitionSubmit}>
          {/* Transition: Assembly to Packing */}
          {stageModal.targetStage === 'packing' && (
            <Section title="Assembly Proof & Carton Counts">
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <MediaUploader
                  label="Assembly Photo / Video Proof"
                  fileUrl={stageModal.mediaUrl}
                  onUploadSuccess={url => setStageModal(p => ({ ...p, mediaUrl: url }))}
                  hint="Upload photo or video of assembled product"
                />
              </div>

              <FormGrid>
                <Field label="Total Box Count">
                  <Input type="number" min={1} value={stageModal.boxes} onChange={e => setStageModal(p => ({ ...p, boxes: e.target.value }))} placeholder="e.g. 3 Boxes" />
                </Field>
                <Field label="Total Weight">
                  <Input value={stageModal.weight} onChange={e => setStageModal(p => ({ ...p, weight: e.target.value }))} placeholder="e.g. 45 KG" />
                </Field>
                <Field label="Assembly / Packing Remarks" span="all">
                  <Textarea rows={2} value={stageModal.notes} onChange={e => setStageModal(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Assembled with 100 links, packed securely..." />
                </Field>
              </FormGrid>
            </Section>
          )}

          {/* Transition: Packing to Dispatched */}
          {stageModal.targetStage === 'dispatched' && (
            <>
              <Section title="Dispatch Proof">
                <MediaUploader
                  label="Dispatch / Vehicle Loading Photo / Video"
                  fileUrl={stageModal.mediaUrl}
                  onUploadSuccess={url => setStageModal(p => ({ ...p, mediaUrl: url }))}
                  hint="Upload photo/video of vehicle loading or parcel"
                />
              </Section>

              <Section title="Billing & Invoice Details">
                <div style={{ marginBottom: 'var(--sp-4)' }}>
                  <MediaUploader
                    label="Attach Tax Invoice / Bill Document (PDF / Image)"
                    fileUrl={stageModal.invoiceUrl}
                    onUploadSuccess={url => setStageModal(p => ({ ...p, invoiceUrl: url }))}
                    hint="Upload Invoice PDF or Photo"
                  />
                </div>

                <FormGrid>
                  <Field label="Invoice Number">
                    <Input value={stageModal.invoiceNo} onChange={e => setStageModal(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="e.g. INV-2026-908" />
                  </Field>
                  <Field label="Invoice Total Amount (₹)">
                    <Input type="number" value={stageModal.invoiceAmt} onChange={e => setStageModal(p => ({ ...p, invoiceAmt: e.target.value }))} placeholder="e.g. 54000" />
                  </Field>
                </FormGrid>
              </Section>

              <Section title="Logistics & LR Details">
                <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                  <Field label="Courier Name">
                    <Input value={stageModal.courier} onChange={e => setStageModal(p => ({ ...p, courier: e.target.value }))} placeholder="e.g. DTDC / SafeExpress" />
                  </Field>
                  <Field label="Tracking / AWB No.">
                    <Input value={stageModal.tracking} onChange={e => setStageModal(p => ({ ...p, tracking: e.target.value }))} placeholder="AWB Number" />
                  </Field>
                  <Field label="LR Number">
                    <Input value={stageModal.lrNo} onChange={e => setStageModal(p => ({ ...p, lrNo: e.target.value }))} placeholder="Lorry Receipt No." />
                  </Field>
                </FormGrid>

                <MediaUploader
                  label="LR Copy Document"
                  fileUrl={stageModal.lrCopy}
                  onUploadSuccess={url => setStageModal(p => ({ ...p, lrCopy: url }))}
                  hint="Upload LR Copy"
                />
              </Section>
            </>
          )}

          {/* Email Notification options */}
          {emailNotificationBlock}
        </form>
      </Dialog>

      {/* FULL CREATE / EDIT MODAL - MULTI-STEP WIZARD */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        title={editingId ? 'Edit order & attachments' : 'New order for assembly & dispatch'}
        subtitle={`Step ${modalStep} of 4 — ${stepTabs.find(s => s.key === modalStep)?.label}`}
        footer={
          <>
            {draftButton}
            {modalStep > 1 && <Button onClick={() => setModalStep(modalStep - 1)}>Back</Button>}
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            {modalStep < 4 ? (
              <Button variant="primary" onClick={() => goToStep(modalStep + 1)}>
                Next: {stepTabs[modalStep]?.label}
              </Button>
            ) : (
              <Button type="submit" form="dispatch-tab-form" variant="success" icon={<LuSave />} disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Update & save order' : 'Save & complete order'}
              </Button>
            )}
          </>
        }
      >
        <Tabs value={modalStep} onChange={goToStep} items={stepTabs} />

        <form id="dispatch-tab-form" onSubmit={handleSubmit}>
          {/* STEP 1: ASSEMBLY & ORDER DETAILS */}
          {modalStep === 1 && (
            <>
              <Section title="Customer & Order Reference">
                <FormGrid>
                  <Field label="Customer Name" required span="all">
                    <Input required value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="e.g. Acme Automation" />
                  </Field>

                  <Field label="Contact / Phone">
                    <Input value={form.customerContact} onChange={e => setForm(p => ({ ...p, customerContact: e.target.value }))} placeholder="+91..." />
                  </Field>

                  <Field label="Customer Email Address">
                    <Input type="email" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} placeholder="customer@example.com" />
                  </Field>

                  <Field
                    label="Sales Order Ref"
                    required
                    hint={form.salesOrderRef ? `Linked: ${form.salesOrderRef}` : 'Pick a sales order to prepopulate items'}
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

                  <Field label="Email notification">
                    <Checkbox
                      label="Send email notification on save"
                      checked={form.notifyCustomerEmail}
                      onChange={e => setForm(p => ({ ...p, notifyCustomerEmail: e.target.checked }))}
                    />
                  </Field>

                  <Field label="Delivery Address" span="all">
                    <Textarea rows={2} value={form.customerAddress} onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value }))} placeholder="Full shipping address..." />
                  </Field>

                  <Field label="Workflow Stage">
                    <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Field>
                </FormGrid>
              </Section>

              <Section
                title="Dispatch Items"
                actions={<Button size="xs" icon={<LuPlus />} onClick={addItem}>Add item</Button>}
              >
                <Surface>
                  {form.items.map((item, idx) => (
                    <ItemRow key={idx} last={idx === form.items.length - 1}>
                      <Input style={{ flex: '1 1 140px', minWidth: 0 }} value={item.modelNumber} onChange={e => updateItem(idx, 'modelNumber', e.target.value)} placeholder="Model No." />
                      <Input style={{ flex: '1 1 160px', minWidth: 0 }} value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                      <Input style={{ flex: '0 1 78px', minWidth: 0 }} type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                      <Select style={{ flex: '0 1 96px', minWidth: 0 }} value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                        <option value="meters">meters</option>
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="boxes">boxes</option>
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

              <Section title="Step 1 · Assembly Details & Proof">
                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <MediaUploader
                    label="Assembly Photo / Video"
                    fileUrl={form.assemblyMediaUrl}
                    onUploadSuccess={url => setForm(p => ({ ...p, assemblyMediaUrl: url }))}
                    hint="Upload assembly photo or video"
                  />
                </div>
                <FormGrid>
                  <Field label="Assembly Notes" span="all">
                    <Input value={form.assemblyNotes} onChange={e => setForm(p => ({ ...p, assemblyNotes: e.target.value }))} placeholder="e.g. Assembled 20m drag chain with brackets" />
                  </Field>
                </FormGrid>
              </Section>
            </>
          )}

          {/* STEP 2: PACKING DETAILS & PROOF */}
          {modalStep === 2 && (
            <Section title="Step 2 · Packing Details & Photo/Video Proof">
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <MediaUploader
                  label="Packing Photo / Video"
                  fileUrl={form.packingMediaUrl}
                  onUploadSuccess={url => setForm(p => ({ ...p, packingMediaUrl: url }))}
                  hint="Upload photo or video of packed cartons"
                />
              </div>

              <FormGrid>
                <Field label="Total Box Count">
                  <Input type="number" min={1} value={form.totalBoxes} onChange={e => setForm(p => ({ ...p, totalBoxes: e.target.value }))} placeholder="e.g. 3 Boxes" />
                </Field>
                <Field label="Total Weight">
                  <Input value={form.totalWeight} onChange={e => setForm(p => ({ ...p, totalWeight: e.target.value }))} placeholder="e.g. 45 KG" />
                </Field>
                <Field label="Packing Notes" span="all">
                  <Input value={form.packingNotes} onChange={e => setForm(p => ({ ...p, packingNotes: e.target.value }))} placeholder="e.g. Bubble-wrapped, strapped with fragile label" />
                </Field>
              </FormGrid>
            </Section>
          )}

          {/* STEP 3: BILLING & INVOICE DOCUMENTS */}
          {modalStep === 3 && (
            <Section title="Step 3 · Billing & Invoice Documents">
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <MediaUploader
                  label="Tax Invoice / Bill Document (PDF / Image)"
                  fileUrl={form.billingInvoiceUrl}
                  onUploadSuccess={url => setForm(p => ({ ...p, billingInvoiceUrl: url }))}
                  hint="Upload Bill / Invoice PDF or Image"
                />
              </div>

              <FormGrid>
                <Field label="Invoice Number">
                  <Input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="e.g. INV-2026-004" />
                </Field>
                <Field label="Invoice Total Amount (₹)">
                  <Input type="number" value={form.invoiceAmount} onChange={e => setForm(p => ({ ...p, invoiceAmount: e.target.value }))} placeholder="e.g. 54000" />
                </Field>
              </FormGrid>
            </Section>
          )}

          {/* STEP 4: DISPATCH & LOGISTICS DETAILS */}
          {modalStep === 4 && (
            <Section title="Step 4 · Dispatch Logistics, LR & POD">
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <MediaUploader
                  label="Dispatch / Vehicle Loading Photo / Video"
                  fileUrl={form.dispatchMediaUrl}
                  onUploadSuccess={url => setForm(p => ({ ...p, dispatchMediaUrl: url }))}
                  hint="Upload vehicle loading or final dispatch proof"
                />
              </div>

              <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                <Field label="Courier / Transporter Name">
                  <Input value={form.courier} onChange={e => setForm(p => ({ ...p, courier: e.target.value }))} placeholder="e.g. BlueDart / DTDC / V-Trans" />
                </Field>
                <Field label="Tracking / Consignment #">
                  <Input value={form.trackingNumber} onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))} placeholder="e.g. 12345678" />
                </Field>
                <Field label="LR Number">
                  <Input value={form.lrNumber} onChange={e => setForm(p => ({ ...p, lrNumber: e.target.value }))} placeholder="Lorry Receipt No." />
                </Field>

                {form.status === 'hold' && (
                  <Field label="Hold Reason" required span="all">
                    <Input value={form.holdReason} onChange={e => setForm(p => ({ ...p, holdReason: e.target.value }))} placeholder="Reason for placing on hold..." />
                  </Field>
                )}
              </FormGrid>

              <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
                <MediaUploader
                  label="LR Copy File"
                  fileUrl={form.lrCopyUrl}
                  onUploadSuccess={url => setForm(p => ({ ...p, lrCopyUrl: url }))}
                  hint="Upload LR copy PDF/Image"
                />
                <MediaUploader
                  label="Proof of Delivery (POD) Receipt"
                  fileUrl={form.podUrl}
                  onUploadSuccess={url => setForm(p => ({ ...p, podUrl: url }))}
                  hint="Upload signed POD receipt"
                />
              </div>
            </Section>
          )}
        </form>
      </Dialog>

      {/* MEDIA PREVIEW MODAL (LIGHTBOX / VIDEO PLAYER / PDF) */}
      <Dialog
        open={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        size="xl"
        title={previewMedia?.title || 'Attachment Preview'}
        footer={
          <>
            <a
              className="btn btn-sm btn-secondary"
              href={formatExternalUrl(previewMedia?.url)}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', marginRight: 'auto' }}
            >
              <LuExternalLink /> Open original
            </a>
            <Button variant="primary" size="sm" onClick={() => setPreviewMedia(null)}>Close</Button>
          </>
        }
      >
        {previewMedia && (
          <div style={{ textAlign: 'center' }}>
            {previewMedia.type === 'video' ? (
              <video src={formatExternalUrl(previewMedia.url)} controls autoPlay style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 'var(--radius-md)' }} />
            ) : isPdfUrl(previewMedia.url) ? (
              <iframe src={formatExternalUrl(previewMedia.url)} title="PDF Preview" style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 'var(--radius-md)' }} />
            ) : (
              <img src={formatExternalUrl(previewMedia.url)} alt="Proof Preview" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget._id)}
        title="Delete this dispatch order?"
        text={`"${deleteTarget?.customerName || 'This dispatch order'}" will be permanently removed.`}
        confirmLabel="Delete"
      />
    </>
  );
}
