import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api, { gateEntryAPI } from '../../services/api';
import WebcamEBillScanner from '../../components/common/WebcamEBillScanner';
import {
  LuTruck,
  LuSave,
  LuClipboardList,
  LuTrash2,
  LuCircleArrowDown,
  LuCircleArrowUp,
  LuClock,
  LuImage,
  LuFileText,
  LuMail,
  LuEye,
  LuPhone,
  LuUser,
  LuCamera,
  LuSparkles,
  LuPackage,
  LuCircleCheck,
  LuExternalLink,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DynamicFormEngine from '../../components/common/DynamicFormEngine';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, ConfirmDialog, Tabs,
  Field, Input, Select, Checkbox,
  Button, Badge, EmptyState,
} from '../../components/ui';

const formatFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanPath = url.startsWith('/api/') ? url : (url.startsWith('/') ? `/api${url}` : `/api/${url}`);
  const apiURL = process.env.REACT_APP_API_URL;
  if (apiURL) {
    const base = apiURL.endsWith('/api') ? apiURL.slice(0, -4) : (apiURL.endsWith('/api/') ? apiURL.slice(0, -5) : apiURL);
    return `${base}${cleanPath}`;
  }
  return window.location.port
    ? `${window.location.protocol}//${window.location.hostname}:9898${cleanPath}`
    : `${window.location.origin}${cleanPath}`;
};

/** Small inline attachment chip used inside the log grid. */
const AttachmentChip = ({ icon, tone, children, ...rest }) => {
  const Tag = rest.href ? 'a' : 'button';
  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button' } : { target: '_blank', rel: 'noreferrer' })}
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 28,
        padding: '3px 9px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'left',
        color: `var(--${tone})`,
        background: `color-mix(in srgb, var(--${tone}) 10%, transparent)`,
        border: `1px solid color-mix(in srgb, var(--${tone}) 28%, transparent)`,
      }}
    >
      {icon}
      {children}
    </Tag>
  );
};

const GateGuardDashboard = ({ defaultType = 'inward' }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active entry type from URL or prop
  const currentEntryType = location.pathname.includes('outward') ? 'outward' : (location.pathname.includes('inward') ? 'inward' : defaultType);
  const [activeTab, setActiveTab] = useState(currentEntryType);

  useEffect(() => {
    if (location.pathname.includes('outward')) {
      setActiveTab('outward');
    } else if (location.pathname.includes('inward') || location.pathname.includes('gate-guard')) {
      setActiveTab('inward');
    }
  }, [location.pathname]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // File uploads
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [materialPhotoFile, setMaterialPhotoFile] = useState(null);
  const [thirdBillPhotoFile, setThirdBillPhotoFile] = useState(null);

  // File input refs
  const invoiceFileRef = useRef(null);
  const materialPhotoRef = useRef(null);
  const thirdBillPhotoRef = useRef(null);

  // Media preview modal state
  const [previewMedia, setPreviewMedia] = useState(null); // { url, title }

  // Delete confirmation target
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Webcam E-Bill Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isAutoPrefilled, setIsAutoPrefilled] = useState(false);

  // Helper for current time (HH:MM)
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  // Form State
  const [form, setForm] = useState({
    billNumber: '',
    vendorName: '',
    vendorContact: '',
    materialType: 'nylon',
    materialDescription: '',
    quantity: '',
    unit: 'kg',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    accountsEmail: '',
    notifyAccounts: true,
    entryTiming: getCurrentTime(),
    exitTiming: getCurrentTime(),
    remarks: '',
    invoiceUrl: ''
  });

  const handleEBillScanComplete = (scanned) => {
    setShowScannerModal(false);
    setIsAutoPrefilled(true);

    setForm(prev => ({
      ...prev,
      billNumber: scanned.billNumber || prev.billNumber,
      billDate: scanned.billDate || prev.billDate || new Date().toISOString().split('T')[0],
      poNumber: scanned.poNumber || prev.poNumber || '',
      poId: scanned.poId || prev.poId || '',
      poOrderedQuantity: scanned.poOrderedQuantity || prev.poOrderedQuantity || '',
      vendorName: scanned.vendorName || prev.vendorName,
      vendorContact: scanned.vendorContact || scanned.vendorGstin || prev.vendorContact,
      materialType: scanned.materialType || prev.materialType,
      materialDescription: scanned.materialDescription || prev.materialDescription,
      quantity: scanned.quantity || prev.quantity,
      unit: scanned.unit || prev.unit,
      vehicleNumber: scanned.vehicleNumber || prev.vehicleNumber,
      driverName: scanned.driverName || prev.driverName,
      driverPhone: scanned.driverPhone || prev.driverPhone,
      remarks: scanned.remarks || `Auto-extracted via AI/OCR (${scanned.billNumber || 'Document'})`,
      invoiceUrl: scanned.invoiceUrl || prev.invoiceUrl
    }));

    toast.success(`✨ Inward details auto-prefilled from: ${scanned.billNumber || 'Scanned Document'}`);
  };

  // Reset form timing when active tab changes
  useEffect(() => {
    setIsAutoPrefilled(false);
    setForm(prev => ({
      ...prev,
      materialType: activeTab === 'outward' ? 'Finished Drag Chain' : 'nylon',
      unit: activeTab === 'outward' ? 'meters' : 'kg',
      entryTiming: getCurrentTime(),
      exitTiming: getCurrentTime()
    }));
  }, [activeTab]);

  // Dynamic Schema
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const [dynamicGateFields, setDynamicGateFields] = useState([]);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await api.get(`/domain/schema/${subIndustryId}`);
        const moduleKey = activeTab === 'outward' ? 'gateGuardOutwardFields' : 'gateGuardFields';
        let moduleSchema = res.data.find(s => s.moduleKey === moduleKey);

        // Fallback to gateGuardFields if outward specific schema not yet defined
        if (!moduleSchema && activeTab === 'outward') {
          moduleSchema = res.data.find(s => s.moduleKey === 'gateGuardFields');
        }

        if (moduleSchema && moduleSchema.fields && moduleSchema.fields.length > 0) {
          // Adjust timing field according to tab
          const adjustedFields = moduleSchema.fields.map(f => {
            if (activeTab === 'outward' && (f.key === 'entryTiming' || f.key === 'entryTime')) {
              return { ...f, key: 'exitTiming', label: 'Exit Timing' };
            }
            if (activeTab === 'inward' && (f.key === 'exitTiming' || f.key === 'exitTime')) {
              return { ...f, key: 'entryTiming', label: 'Entry Timing' };
            }
            return f;
          });

          // Ensure timing field exists in schema
          const timingKey = activeTab === 'outward' ? 'exitTiming' : 'entryTiming';
          const hasTiming = adjustedFields.some(f => f.key === timingKey);
          if (!hasTiming) {
            adjustedFields.splice(2, 0, {
              key: timingKey,
              label: activeTab === 'outward' ? 'Exit Timing' : 'Entry Timing',
              type: 'time',
              required: true,
              placeholder: 'HH:MM'
            });
          }

          setDynamicGateFields(adjustedFields);
        } else {
          setDynamicGateFields([]);
        }
      } catch (err) {
        console.error('Failed to load dynamic domain schema', err);
      }
    };

    if (subIndustryId) {
      fetchSchema();
    }
  }, [subIndustryId, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await gateEntryAPI.getAll({
        search,
        entryType: activeTab
      });
      setEntries(res.data.data || []);
    } catch (err) {
      toast.error(`Failed to load ${activeTab} gate entry logs`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab]);

  const handleTabChange = (type) => {
    setActiveTab(type);
    navigate(type === 'outward' ? '/gate-outward' : '/gate-inward');
  };

  const handleDelete = async (id) => {
    try {
      await gateEntryAPI.delete(id);
      toast.success('Gate entry deleted successfully');
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete gate entry');
    }
  };

  // Send / Resend email to Accounts Team
  const handleNotifyAccounts = async (entry) => {
    const defaultEmail = entry.accountsEmail || form.accountsEmail || '';
    const email = window.prompt('Enter Accounts Team email address:', defaultEmail);
    if (!email) return;

    try {
      toast.loading('Sending outward details & photos to Accounts Team...', { id: 'notifyAcc' });
      await gateEntryAPI.notifyAccounts(entry._id, { email });
      toast.success(`📧 Outward details sent to Accounts (${email})`, { id: 'notifyAcc' });
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification to accounts', { id: 'notifyAcc' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('entryType', activeTab);

      Object.keys(form).forEach(key => {
        if (form[key] !== undefined && form[key] !== null && form[key] !== '') {
          formData.append(key, form[key]);
        }
      });

      // Append files
      if (invoiceFile) {
        formData.append('invoice', invoiceFile);
      }
      if (materialPhotoFile) {
        formData.append('materialPhoto', materialPhotoFile);
      }
      if (thirdBillPhotoFile) {
        formData.append('thirdBillPhoto', thirdBillPhotoFile);
      }

      await gateEntryAPI.create(formData);
      toast.success(`${activeTab === 'outward' ? 'Outward finished goods entry saved & notified to accounts!' : 'Inward entry saved!'}`);

      // Reset form
      setForm({
        billNumber: '',
        vendorName: '',
        vendorContact: '',
        materialType: activeTab === 'outward' ? 'Finished Drag Chain' : 'nylon',
        materialDescription: '',
        quantity: '',
        unit: activeTab === 'outward' ? 'meters' : 'kg',
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        accountsEmail: '',
        notifyAccounts: true,
        entryTiming: getCurrentTime(),
        exitTiming: getCurrentTime(),
        remarks: ''
      });
      setInvoiceFile(null);
      setMaterialPhotoFile(null);
      setThirdBillPhotoFile(null);
      if (invoiceFileRef.current) invoiceFileRef.current.value = '';
      if (materialPhotoRef.current) materialPhotoRef.current.value = '';
      if (thirdBillPhotoRef.current) thirdBillPhotoRef.current.value = '';

      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gate entry');
    } finally {
      setSubmitting(false);
    }
  };

  const isInward = activeTab === 'inward';
  const canManage = ['super_admin', 'admin', 'gate_guard'].includes(user?.role);

  /* ------------------------------------------------------- derived counters */
  const todayKey = new Date().toDateString();
  const todayCount = entries.filter(e => e.createdAt && new Date(e.createdAt).toDateString() === todayKey).length;
  const clearedCount = entries.filter(e => e.status === 'pending').length;
  const closedCount = entries.filter(e => e.status && e.status !== 'pending').length;
  const notifiedCount = entries.filter(e => e.accountsEmailSentAt).length;

  const statusBadge = (entry) => {
    if (entry.status === 'pending') return <Badge tone="warning">Cleared Gate</Badge>;
    if (entry.status === 'verified') return <Badge tone="info">Verified</Badge>;
    return <Badge tone="success">GRN Created</Badge>;
  };

  /* --------------------------------------------------------------- columns */
  const columns = [
    {
      key: 'billNumber',
      header: isInward ? 'Bill No & Time' : 'Challan/Bill & Exit Time',
      primary: true,
      render: (entry) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.billNumber || 'N/A'}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--primary)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LuClock />
            {isInward
              ? (entry.entryTiming || new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              : (entry.exitTiming || new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-ghost)', marginTop: 2 }}>
            {new Date(entry.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'vendorName',
      header: isInward ? 'Vendor' : 'Customer',
      render: (entry) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.vendorName || 'N/A'}</div>
          {entry.vendorContact && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LuPhone /> {entry.vendorContact}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'materialType',
      header: 'Material & Qty',
      render: (entry) => (
        <div>
          <div style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
            {entry.materialType || 'N/A'}
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--primary)', fontWeight: 700 }}>
            {entry.quantity || 0} {entry.unit || (isInward ? 'kg' : 'meters')}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle & Driver',
      render: (entry) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.vehicleNumber || 'N/A'}</div>
          {entry.driverName && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LuUser /> {entry.driverName}
            </div>
          )}
          {entry.driverPhone && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LuPhone /> {entry.driverPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'attachments',
      header: isInward ? 'Document' : 'Photo Proofs',
      sortable: false,
      hideBelow: 1024,
      render: (entry) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          {entry.materialPhotoUrl && (
            <AttachmentChip
              icon={<LuImage />}
              tone="c-blue"
              onClick={() => setPreviewMedia({ url: entry.materialPhotoUrl, title: `Material / Vehicle Photo - ${entry.billNumber}` })}
            >
              Material Photo
            </AttachmentChip>
          )}

          {entry.thirdBillPhotoUrl && (
            <AttachmentChip
              icon={<LuFileText />}
              tone="success"
              onClick={() => setPreviewMedia({ url: entry.thirdBillPhotoUrl, title: `3rd Bill Copy Photo - ${entry.billNumber}` })}
            >
              3rd Bill Copy
            </AttachmentChip>
          )}

          {entry.invoiceUrl && (
            <AttachmentChip icon={<LuEye />} tone="warning" href={formatFileUrl(entry.invoiceUrl)}>
              Invoice Doc
            </AttachmentChip>
          )}

          {!entry.materialPhotoUrl && !entry.thirdBillPhotoUrl && !entry.invoiceUrl && (
            <span style={{ color: 'var(--text-ghost)', fontSize: 'var(--fs-xs)' }}>No Attachments</span>
          )}
        </div>
      ),
    },
    ...(!isInward
      ? [{
        key: 'accountsEmailSentAt',
        header: 'Accounts Team',
        hideBelow: 1024,
        render: (entry) => (
          entry.accountsEmailSentAt ? (
            <div>
              <Badge tone="success" icon={<LuCircleCheck />}>Notified</Badge>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-ghost)', marginTop: 2 }}>
                {entry.accountsEmail || 'Accounts'}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              icon={<LuMail />}
              title="Send Details to Accounts Team"
              onClick={() => handleNotifyAccounts(entry)}
              style={{ minHeight: 36, color: 'var(--c-blue)', borderColor: 'color-mix(in srgb, var(--c-blue) 35%, transparent)' }}
            >
              Send to Accounts
            </Button>
          )
        ),
      }]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: statusBadge,
    },
    ...(canManage
      ? [{
        key: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'right',
        render: (entry) => (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {!isInward && (
              <button
                className="icon-btn"
                style={{ color: 'var(--c-blue)', width: 36, height: 36 }}
                onClick={(e) => { e.stopPropagation(); handleNotifyAccounts(entry); }}
                title="Resend to Accounts Team"
                aria-label="Resend to Accounts Team"
              >
                <LuMail />
              </button>
            )}
            <button
              className="icon-btn"
              style={{ color: 'var(--danger)', width: 36, height: 36 }}
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry); }}
              title="Delete Gate Entry"
              aria-label="Delete Gate Entry"
            >
              <LuTrash2 />
            </button>
          </div>
        ),
      }]
      : []),
  ];

  return (
    <DashboardLayout pageTitle={isInward ? "Gate Inward Operations" : "Gate Outward Operations (Finished Goods)"}>
      <Page>
        <PageHeader
          title={isInward ? 'Gate Inward Operations' : 'Gate Outward Operations'}
          subtitle={isInward
            ? 'Log arriving raw material, capture the invoice and clear the vehicle.'
            : 'Log finished goods leaving the plant and notify the accounts team.'}
        />

        {/* Inward / Outward screen selector */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'inward', label: 'Inward (Raw Material)', icon: <LuCircleArrowDown /> },
            { key: 'outward', label: 'Outward (Finished Goods)', icon: <LuCircleArrowUp /> },
          ]}
        />

        <StatRow>
          <StatTile
            label={isInward ? 'Inward Entries' : 'Outward Entries'}
            value={entries.length}
            icon={isInward ? <LuCircleArrowDown /> : <LuCircleArrowUp />}
            tone="primary"
          />
          <StatTile label="Logged Today" value={todayCount} icon={<LuClock />} tone="blue" />
          <StatTile label="Cleared Gate" value={clearedCount} icon={<LuTruck />} tone="amber" />
          {isInward ? (
            <StatTile label="Verified / GRN" value={closedCount} icon={<LuPackage />} tone="green" />
          ) : (
            <StatTile label="Accounts Notified" value={notifiedCount} icon={<LuMail />} tone="green" />
          )}
        </StatRow>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.55fr)',
            gap: 'var(--sp-5)',
            alignItems: 'start',
          }}
        >
          {/* ================================================== Entry form */}
          <Section
            title={isInward ? 'Log Inward Raw Material' : 'Log Outward Finished Goods'}
            actions={
              <Badge tone={isInward ? 'success' : 'info'}>
                {isInward ? 'Inward Gate' : 'Outward Gate Pass'}
              </Badge>
            }
          >
            <Surface>
              {/* Live Webcam E-Bill Scanner Widget for Inward Screen */}
              {isInward && (
                <div
                  style={{
                    background: isAutoPrefilled
                      ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                      : 'color-mix(in srgb, var(--c-blue) 8%, transparent)',
                    border: `1px solid ${isAutoPrefilled
                      ? 'color-mix(in srgb, var(--success) 28%, transparent)'
                      : 'color-mix(in srgb, var(--c-blue) 28%, transparent)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 'var(--sp-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--fs-base)',
                        fontWeight: 700,
                        color: isAutoPrefilled ? 'var(--success)' : 'var(--c-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isAutoPrefilled ? <LuSparkles /> : <LuCamera />}
                      {isAutoPrefilled ? 'Inward form auto-prefilled from scan' : 'Live webcam E-Bill scanner'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {isAutoPrefilled
                        ? 'Bill No, Vehicle, Vendor & Quantities extracted.'
                        : 'Hold the paper E-Way bill or invoice in front of the gate camera to auto-fill.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {form.invoiceUrl && (
                      <Button
                        size="sm"
                        icon={<LuImage />}
                        style={{ minHeight: 36 }}
                        onClick={() => setPreviewMedia({ url: form.invoiceUrl, title: `Scanned E-Bill (${form.billNumber})` })}
                      >
                        View Scan
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<LuCamera />}
                      style={{ minHeight: 36 }}
                      onClick={() => setShowScannerModal(true)}
                    >
                      {isAutoPrefilled ? 'Re-scan E-Bill' : 'Scan E-Bill (Webcam)'}
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {dynamicGateFields.length > 0 ? (
                  <DynamicFormEngine
                    fields={dynamicGateFields}
                    data={form}
                    onChange={(key, value) => setForm(prev => ({ ...prev, [key]: value }))}
                  />
                ) : (
                  <FormGrid>
                    {/* Bill / Invoice / Challan Number */}
                    <Field label={isInward ? 'Bill / Invoice No' : 'Tax Invoice / Challan No'} required>
                      <Input
                        type="text"
                        placeholder={isInward ? 'e.g. INV-2026-001' : 'e.g. INV-2026-089 / DC-001'}
                        value={form.billNumber || ''}
                        onChange={e => setForm({ ...form, billNumber: e.target.value })}
                        required
                      />
                    </Field>

                    {/* Timing */}
                    <Field label={isInward ? 'Entry Timing' : 'Exit Timing'} required>
                      <Input
                        type="time"
                        value={isInward ? (form.entryTiming || getCurrentTime()) : (form.exitTiming || getCurrentTime())}
                        onChange={e => setForm({
                          ...form,
                          [isInward ? 'entryTiming' : 'exitTiming']: e.target.value
                        })}
                        required
                        style={{ borderColor: 'var(--border-primary)' }}
                      />
                    </Field>

                    {/* Vendor / Customer Name */}
                    <Field label={isInward ? 'Vendor / Supplier Name' : 'Customer / Destination'} required>
                      <Input
                        type="text"
                        placeholder={isInward ? 'e.g. Apex Polymers Ltd' : 'e.g. Acme Industrial Ltd'}
                        value={form.vendorName || ''}
                        onChange={e => setForm({ ...form, vendorName: e.target.value })}
                        required
                      />
                    </Field>

                    {/* Contact */}
                    <Field label="Customer Contact Phone">
                      <Input
                        type="text"
                        placeholder="e.g. 9876543210"
                        value={form.vendorContact || ''}
                        onChange={e => setForm({ ...form, vendorContact: e.target.value })}
                      />
                    </Field>

                    {/* Material Type */}
                    <Field label={isInward ? 'Material / Raw Material' : 'Finished Goods Description'} required span="all">
                      <Input
                        type="text"
                        placeholder={isInward ? 'e.g. Nylon 66 / Steel Rod' : 'e.g. Finished Drag Chain 45x100'}
                        value={form.materialType || ''}
                        onChange={e => setForm({ ...form, materialType: e.target.value })}
                        required
                      />
                    </Field>

                    {/* Quantity */}
                    <Field label="Quantity" required>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={form.quantity || ''}
                        onChange={e => setForm({ ...form, quantity: e.target.value })}
                        required
                      />
                    </Field>

                    {/* Unit */}
                    <Field label="Unit">
                      <Select
                        value={form.unit || (isInward ? 'kg' : 'meters')}
                        onChange={e => setForm({ ...form, unit: e.target.value })}
                      >
                        <option value="meters">meters</option>
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                        <option value="kg">kg</option>
                        <option value="ton">ton</option>
                      </Select>
                    </Field>

                    {/* Vehicle Number */}
                    <Field label="Vehicle Number" required>
                      <Input
                        type="text"
                        placeholder="e.g. DL 01 AB 1234"
                        value={form.vehicleNumber || ''}
                        onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                        required
                      />
                    </Field>

                    {/* Driver Name */}
                    <Field label="Driver Name" required={!isInward}>
                      <Input
                        type="text"
                        placeholder="Driver's Full Name"
                        value={form.driverName || ''}
                        onChange={e => setForm({ ...form, driverName: e.target.value })}
                        required={!isInward}
                      />
                    </Field>

                    {/* Driver Phone Number (Outward specific) */}
                    {!isInward && (
                      <Field label="Driver Phone Number" required span="all">
                        <Input
                          type="text"
                          placeholder="e.g. +91 98765 43210"
                          value={form.driverPhone || ''}
                          onChange={e => setForm({ ...form, driverPhone: e.target.value })}
                          required
                        />
                      </Field>
                    )}

                    {/* Photo of Material & Photo of 3rd Bill Copy (Outward Specific) */}
                    {!isInward ? (
                      <>
                        <Field label="Material / Vehicle Photo" hint="Photo of loaded vehicle/material">
                          <Input
                            type="file"
                            ref={materialPhotoRef}
                            style={{ paddingTop: 6, paddingBottom: 6, height: 'auto', minHeight: 36 }}
                            onChange={e => setMaterialPhotoFile(e.target.files?.[0] || null)}
                            accept="image/*,video/*"
                          />
                        </Field>

                        <Field label="Photo of 3rd Copy of Bill" hint="Signed 3rd gate/transporter copy">
                          <Input
                            type="file"
                            ref={thirdBillPhotoRef}
                            style={{ paddingTop: 6, paddingBottom: 6, height: 'auto', minHeight: 36 }}
                            onChange={e => setThirdBillPhotoFile(e.target.files?.[0] || null)}
                            accept="image/*,application/pdf"
                          />
                        </Field>

                        {/* Accounts Team Email Notification */}
                        <Field
                          label="Send Details to Accounts Team"
                          span="all"
                        >
                          <Input
                            type="email"
                            placeholder="accounts@example.com (Accounts Email)"
                            value={form.accountsEmail || ''}
                            onChange={e => setForm({ ...form, accountsEmail: e.target.value })}
                          />
                          <div style={{ marginTop: 8 }}>
                            <Checkbox
                              checked={form.notifyAccounts}
                              onChange={e => setForm({ ...form, notifyAccounts: e.target.checked })}
                              label="Send Driver, Vehicle & 3rd Bill/Material photo proofs to Accounts Team"
                            />
                          </div>
                        </Field>
                      </>
                    ) : (
                      /* Invoice Upload for Inward */
                      <Field label="Upload Invoice / Challan Copy" span="all">
                        <Input
                          type="file"
                          ref={invoiceFileRef}
                          style={{ paddingTop: 6, paddingBottom: 6, height: 'auto', minHeight: 36 }}
                          onChange={e => setInvoiceFile(e.target.files?.[0] || null)}
                          accept=".pdf,.png,.jpg,.jpeg"
                        />
                      </Field>
                    )}

                    {/* Remarks */}
                    <Field label="Remarks / Gate Notes" span="all">
                      <Input
                        type="text"
                        placeholder="Comments, seal number, condition of goods..."
                        value={form.remarks || ''}
                        onChange={e => setForm({ ...form, remarks: e.target.value })}
                      />
                    </Field>
                  </FormGrid>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  block
                  icon={<LuSave />}
                  loading={submitting}
                  style={{ marginTop: 'var(--sp-5)', minHeight: 42 }}
                >
                  {submitting ? 'Saving...' : (isInward ? 'Save & Dispatch Inward' : 'Save Outward Pass & Notify Accounts')}
                </Button>
              </form>
            </Surface>
          </Section>

          {/* =============================================== History / Logs */}
          <Section
            title={isInward ? 'Inward Gate Entries' : 'Outward Finished Goods Entries'}
            actions={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                <LuClipboardList /> {entries.length} logged
              </span>
            }
          >
            <Toolbar>
              <SearchInput
                value={search}
                placeholder="Search bill / driver / vehicle…"
                onChange={setSearch}
              />
              <ToolbarSpacer />
              <DensitySwitch />
            </Toolbar>

            <DataTable
              columns={columns}
              rows={entries}
              loading={loading}
              pageSize={12}
              empty={
                <EmptyState
                  icon={<LuTruck />}
                  title={`No ${activeTab} gate entries found`}
                  text={isInward
                    ? 'Inward vehicles you clear will be listed here.'
                    : 'Outward gate passes you issue will be listed here.'}
                />
              }
            />
          </Section>
        </div>

        {/* MEDIA PREVIEW DIALOG */}
        <Dialog
          open={!!previewMedia}
          onClose={() => setPreviewMedia(null)}
          title={previewMedia?.title || 'Attachment Preview'}
          size="lg"
          footer={
            <>
              <a
                href={previewMedia ? formatFileUrl(previewMedia.url) : undefined}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <LuExternalLink /> Open Original in New Tab
              </a>
              <Button variant="primary" size="sm" onClick={() => setPreviewMedia(null)}>Close</Button>
            </>
          }
        >
          {previewMedia && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={formatFileUrl(previewMedia.url)}
                alt="Proof Preview"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', margin: '0 auto' }}
              />
            </div>
          )}
        </Dialog>

        {/* DELETE CONFIRMATION */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            if (target) handleDelete(target._id);
          }}
          title={`Delete this ${activeTab} entry?`}
          text={deleteTarget
            ? `Gate entry ${deleteTarget.billNumber || ''} will be permanently removed from the log.`
            : ''}
          confirmLabel="Delete Entry"
        />

        {/* WEBCAM & FILE E-BILL SCANNER MODAL */}
        <WebcamEBillScanner
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScanComplete={handleEBillScanComplete}
        />
      </Page>
    </DashboardLayout>
  );
};

export default GateGuardDashboard;
