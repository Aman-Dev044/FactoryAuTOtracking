import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI, financeAPI } from '../services/api';
import WebcamEBillScanner from '../components/common/WebcamEBillScanner';
import {
  LuPlus, LuPencil, LuTrash2, LuCircleCheck, LuFileText, LuRefreshCw,
  LuTruck, LuBoxes, LuShoppingCart, LuCamera, LuSparkles, LuExternalLink,
  LuImage, LuPackage, LuClipboardCheck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Dialog, ConfirmDialog,
  Field, Input, Select, Textarea,
  Button, Badge, EmptyState, Pager,
} from '../components/ui';

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

const MATERIAL_TYPES = [
  { value: 'nylon', label: 'Nylon' },
  { value: 'pigment', label: 'Pigment' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'kg', label: 'KG' },
  { value: 'pcs', label: 'PCS' },
  { value: 'meters', label: 'Meters' },
  { value: 'liters', label: 'Liters' },
  { value: 'bags', label: 'Bags' },
  { value: 'boxes', label: 'Boxes' },
];

/** Status → badge tone + label. Presentation only. */
const STATUS_META = {
  pending: { tone: 'warning', text: 'Pending' },
  verified: { tone: 'info', text: 'Verified' },
  grn_created: { tone: 'success', text: 'GRN Created' },
  rejected: { tone: 'danger', text: 'Rejected' },
};

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'grn_created', label: 'GRN Created' },
  { key: 'rejected', label: 'Rejected' },
];

const emptyForm = {
  billNumber: '', billDate: new Date().toISOString().split('T')[0],
  poId: '', poNumber: '', poOrderedQuantity: 0,
  vendorName: '', vendorContact: '', materialType: 'nylon',
  materialDescription: '', quantity: '', unit: 'kg',
  vehicleNumber: '', driverName: '', remarks: '', invoiceUrl: ''
};

const GateEntry = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activePOs, setActivePOs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add | edit
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isAutoPrefilled, setIsAutoPrefilled] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // GRN Modal
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnEntry, setGrnEntry] = useState(null);
  const [grnForm, setGrnForm] = useState({ receivedQuantity: '', qualityStatus: 'approved', remarks: '' });

  // Add Items Modal for Supervisor
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedEntryForItems, setSelectedEntryForItems] = useState(null);
  const [itemsForm, setItemsForm] = useState({
    name: '',
    type: 'raw_material',
    quantity: '',
    unit: '',
    location: 'Unassigned',
    size: '',
    description: ''
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await gateEntryAPI.getAll(params);
      setEntries(res.data.data);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      toast.error('Failed to load gate entries');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterStatus]);

  const fetchStats = async () => {
    try {
      const res = await gateEntryAPI.getStats();
      setStats(res.data.data);
    } catch (err) { /* silent */ }
  };

  const fetchActivePOs = async () => {
    try {
      const res = await financeAPI.getPOLookupForGateEntry();
      setActivePOs(res.data.data || []);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
    fetchActivePOs();
  }, [fetchEntries]);

  // Handlers
  const openAddModal = () => {
    setModalMode('add');
    setFormData(emptyForm);
    setEditingId(null);
    setIsAutoPrefilled(false);
    setShowModal(true);
    fetchActivePOs();
  };

  const handleEBillScanComplete = (scanned) => {
    setShowScannerModal(false);
    setModalMode('add');
    setEditingId(null);
    setIsAutoPrefilled(true);

    setFormData({
      billNumber: scanned.billNumber || '',
      billDate: scanned.billDate || new Date().toISOString().split('T')[0],
      poId: scanned.poId || '',
      poNumber: scanned.poNumber || '',
      poOrderedQuantity: scanned.poOrderedQuantity || 0,
      vendorName: scanned.vendorName || '',
      vendorContact: scanned.vendorContact || scanned.vendorGstin || '',
      materialType: scanned.materialType || 'nylon',
      materialDescription: scanned.materialDescription || '',
      quantity: scanned.quantity || '',
      unit: scanned.unit || 'kg',
      vehicleNumber: scanned.vehicleNumber || '',
      driverName: scanned.driverName || '',
      driverPhone: scanned.driverPhone || '',
      remarks: scanned.remarks || `Auto-extracted via AI/OCR (${scanned.billNumber || 'Document'})`,
      invoiceUrl: scanned.invoiceUrl || ''
    });

    setShowModal(true);
    fetchActivePOs();
    toast.success(`✨ Inward Gate Entry prefilled from: ${scanned.billNumber || 'Scanned Document'}`);
  };

  const handleSelectPO = (poId) => {
    if (!poId) {
      setFormData(p => ({
        ...p,
        poId: '',
        poNumber: '',
        poOrderedQuantity: 0
      }));
      return;
    }
    const selected = activePOs.find(p => p._id === poId);
    if (selected) {
      const firstMat = selected.materials?.[0] || {};
      const isNylon = (firstMat.materialType || 'nylon').toLowerCase().includes('nylon');
      setFormData(p => ({
        ...p,
        poId: selected._id,
        poNumber: selected.poNumber,
        poOrderedQuantity: selected.totalOrderedQty,
        vendorName: selected.vendorName || p.vendorName,
        vendorContact: selected.vendorPhone || p.vendorContact,
        materialType: isNylon ? 'nylon' : 'other',
        materialDescription: selected.materialSummary || firstMat.description || p.materialDescription,
        quantity: selected.remainingQty || selected.totalOrderedQty || p.quantity,
        unit: firstMat.unit || 'kg'
      }));
      toast.success(`Linked to PO ${selected.poNumber} (${selected.vendorName})`);
    }
  };

  const openEditModal = (entry) => {
    setModalMode('edit');
    setEditingId(entry._id);
    setIsAutoPrefilled(false);
    setFormData({
      billNumber: entry.billNumber,
      billDate: entry.billDate?.split('T')[0] || '',
      poId: entry.poId || '',
      poNumber: entry.poNumber || '',
      poOrderedQuantity: entry.poOrderedQuantity || 0,
      vendorName: entry.vendorName,
      vendorContact: entry.vendorContact || '',
      materialType: entry.materialType,
      materialDescription: entry.materialDescription || '',
      quantity: entry.quantity,
      unit: entry.unit,
      vehicleNumber: entry.vehicleNumber || '',
      driverName: entry.driverName || '',
      remarks: entry.remarks || '',
      invoiceUrl: entry.invoiceUrl || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.billNumber || !formData.vendorName || !formData.quantity) {
      toast.error('Please fill required fields: Bill Number, Vendor, Quantity');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await gateEntryAPI.create({ ...formData, quantity: Number(formData.quantity) });
        toast.success('Gate entry created successfully!');
      } else {
        await gateEntryAPI.update(editingId, { ...formData, quantity: Number(formData.quantity) });
        toast.success('Gate entry updated successfully!');
      }
      setShowModal(false);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await gateEntryAPI.delete(id);
      toast.success('Entry deleted');
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleVerify = async (id) => {
    try {
      await gateEntryAPI.verify(id);
      toast.success('Entry verified!');
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const openAddItemsModal = (entry) => {
    setSelectedEntryForItems(entry);
    setItemsForm({
      name: entry.materialType ? entry.materialType.charAt(0).toUpperCase() + entry.materialType.slice(1) : '',
      type: 'raw_material',
      quantity: entry.quantity,
      unit: entry.unit || 'kg',
      location: 'Unassigned',
      size: '',
      description: entry.materialDescription || ''
    });
    setShowAddItemsModal(true);
  };

  const handleSaveAndVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await operationsAPI.createInventoryItem({
        name: itemsForm.name,
        type: itemsForm.type,
        quantity: Number(itemsForm.quantity),
        unit: itemsForm.unit,
        location: itemsForm.location,
        size: itemsForm.size,
        description: itemsForm.description
      });

      await gateEntryAPI.verify(selectedEntryForItems._id);

      toast.success('Inventory item created and Gate Entry verified successfully!');
      setShowAddItemsModal(false);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openGRNModal = (entry) => {
    setGrnEntry(entry);
    setGrnForm({ receivedQuantity: entry.quantity, qualityStatus: 'approved', remarks: '' });
    setShowGRNModal(true);
  };

  const handleCreateGRN = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await gateEntryAPI.createGRN(grnEntry._id, {
        ...grnForm,
        receivedQuantity: Number(grnForm.receivedQuantity)
      });
      toast.success(res.data.message || 'GRN Created!');
      setShowGRNModal(false);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'GRN creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const rangeStart = pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  /* --------------------------------------------------------------- columns */
  const columns = [
    {
      key: 'billNumber',
      header: 'Bill No',
      primary: true,
      render: (entry) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{entry.billNumber}</span>
          {entry.invoiceUrl && (
            <a
              href={formatFileUrl(entry.invoiceUrl)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--fs-xs)',
                color: 'var(--c-blue)',
                fontWeight: 600,
              }}
            >
              <LuImage /> View Scan <LuExternalLink />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'poNumber',
      header: 'PO Ref #',
      hideBelow: 1100,
      render: (entry) => (
        entry.poNumber
          ? <Badge tone="info">{entry.poNumber}</Badge>
          : <span style={{ color: 'var(--text-ghost)' }}>--</span>
      ),
    },
    {
      key: 'billDate',
      header: 'Date',
      hideBelow: 900,
      render: (entry) => formatDate(entry.billDate),
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      render: (entry) => (
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{entry.vendorName}</div>
          {entry.vendorContact && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{entry.vendorContact}</div>
          )}
        </div>
      ),
    },
    {
      key: 'materialType',
      header: 'Material',
      hideBelow: 1100,
      render: (entry) => (
        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{entry.materialType}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      sortValue: (entry) => Number(entry.quantity) || 0,
      render: (entry) => (
        <span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.quantity}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{entry.unit}</span>
        </span>
      ),
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle',
      hideBelow: 1280,
      render: (entry) => entry.vehicleNumber || '--',
    },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => {
        const st = STATUS_META[entry.status] || STATUS_META.pending;
        return <Badge tone={st.tone}>{st.text}</Badge>;
      },
    },
    {
      key: 'grnNumber',
      header: 'GRN',
      hideBelow: 1280,
      render: (entry) => (
        entry.grnNumber
          ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{entry.grnNumber}</span>
          : <span style={{ color: 'var(--text-ghost)' }}>--</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (entry) => (
        <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
          {entry.status === 'pending' && (
            <>
              <button
                className="icon-btn" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}
                title="Add Items & Verify" aria-label="Add Items & Verify"
                onClick={() => openAddItemsModal(entry)}
              >
                <LuBoxes />
              </button>
              <button
                className="icon-btn" style={{ width: 36, height: 36, color: 'var(--c-blue)' }}
                title="Verify Only" aria-label="Verify Only"
                onClick={() => handleVerify(entry._id)}
              >
                <LuCircleCheck />
              </button>
              <button
                className="icon-btn" style={{ width: 36, height: 36, color: 'var(--c-orange)' }}
                title="Edit" aria-label="Edit"
                onClick={() => openEditModal(entry)}
              >
                <LuPencil />
              </button>
            </>
          )}
          {entry.status === 'verified' && (
            <button
              className="icon-btn" style={{ width: 36, height: 36, color: 'var(--success)' }}
              title="Create GRN" aria-label="Create GRN"
              onClick={() => openGRNModal(entry)}
            >
              <LuFileText />
            </button>
          )}
          {entry.status !== 'grn_created' && (
            <button
              className="icon-btn" style={{ width: 36, height: 36, color: 'var(--danger)' }}
              title="Delete" aria-label="Delete"
              onClick={() => setDeleteTarget(entry)}
            >
              <LuTrash2 />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Gate Entry">
      <Page>
        <PageHeader
          title="Gate Entry"
          subtitle="Record inward material at the gate, verify it against a PO and raise the GRN."
          actions={
            <>
              <Button icon={<LuCamera />} onClick={() => setShowScannerModal(true)}>
                Scan E-Bill
              </Button>
              <Button variant="primary" icon={<LuPlus />} onClick={openAddModal}>
                New Gate Entry
              </Button>
            </>
          }
        />

        {/* Stats Row */}
        <StatRow>
          <StatTile label="Total Entries" value={stats?.totalEntries ?? '--'} icon={<LuTruck />} tone="blue" />
          <StatTile label="Pending" value={stats?.pendingEntries ?? '--'} icon={<LuClipboardCheck />} tone="amber" />
          <StatTile label="GRN Created" value={stats?.grnCreated ?? '--'} icon={<LuFileText />} tone="green" />
          <StatTile
            label="Today's Material"
            value={stats?.todayMaterialQty ? `${stats.todayMaterialQty} kg` : '--'}
            icon={<LuPackage />}
            tone="violet"
          />
        </StatRow>

        {/* Toolbar */}
        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search bill, vendor, vehicle…"
            onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }}
          />
          <ChipGroup
            items={STATUS_FILTERS}
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPagination(p => ({ ...p, page: 1 })); }}
          />
          <Button
            size="sm"
            icon={<LuRefreshCw />}
            onClick={() => { setSearch(''); setFilterStatus(''); }}
          >
            Reset
          </Button>
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        {/* Table */}
        <DataTable
          columns={columns}
          rows={entries}
          loading={loading}
          paginate={false}
          empty={
            <EmptyState
              icon={<LuTruck />}
              title="No gate entries found"
              text="Nothing matches the current search or status filter."
              action={
                <Button variant="primary" icon={<LuPlus />} onClick={openAddModal}>
                  Create First Entry
                </Button>
              }
            />
          }
        />

        {!loading && pagination.total > 0 && (
          <div
            className="grid-foot"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginTop: 'var(--sp-3)',
            }}
          >
            <span>Showing {rangeStart}–{rangeEnd} of {pagination.total}</span>
            <Pager
              page={pagination.page}
              pageCount={pagination.pages || 1}
              onChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
            />
          </div>
        )}

        {/* ===== ADD/EDIT DIALOG ===== */}
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          title={modalMode === 'add' ? 'New Inward Gate Entry' : 'Edit Gate Entry'}
          subtitle={modalMode === 'add'
            ? 'Capture the bill, vendor and material arriving at the gate.'
            : 'Update the recorded details for this gate entry.'}
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="gate-entry-form" loading={submitting}>
                {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Entry' : 'Update Entry'}
              </Button>
            </>
          }
        >
          <form id="gate-entry-form" onSubmit={handleSubmit}>
            {/* Webcam / Document Quick Scan Header */}
            <Surface
              style={{
                background: isAutoPrefilled
                  ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                  : 'color-mix(in srgb, var(--c-blue) 8%, transparent)',
                borderColor: isAutoPrefilled
                  ? 'color-mix(in srgb, var(--success) 28%, transparent)'
                  : 'color-mix(in srgb, var(--c-blue) 28%, transparent)',
                boxShadow: 'none',
                padding: '12px 14px',
                marginBottom: 'var(--sp-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
              pad={false}
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
                  {isAutoPrefilled ? 'E-Bill data auto-prefilled' : 'Quick scan E-Way bill / invoice'}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  {isAutoPrefilled
                    ? 'Fields pre-populated from the scanned document. Verify and adjust if needed.'
                    : 'Scan via live webcam or upload a PDF/image to auto-fill this form.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {formData.invoiceUrl && (
                  <a
                    href={formatFileUrl(formData.invoiceUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: 36 }}
                  >
                    <LuImage /> View Scan
                  </a>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<LuCamera />}
                  style={{ minHeight: 36 }}
                  onClick={() => setShowScannerModal(true)}
                >
                  {isAutoPrefilled ? 'Re-scan E-Bill' : 'Scan with Webcam'}
                </Button>
              </div>
            </Surface>

            {/* Purchase Order (PO) Quick Linking Section */}
            <Surface
              pad={false}
              style={{
                background: 'color-mix(in srgb, var(--c-blue) 6%, transparent)',
                borderColor: 'color-mix(in srgb, var(--c-blue) 26%, transparent)',
                boxShadow: 'none',
                padding: '14px',
                marginBottom: 'var(--sp-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--c-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LuShoppingCart /> Select Purchase Order (PO #)
                </div>
                <Badge tone="info">Auto-fills details</Badge>
              </div>

              <Select
                value={formData.poId || ''}
                onChange={e => handleSelectPO(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="">-- Select Open Purchase Order (Optional for Direct Inward) --</option>
                {activePOs.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.poNumber} — {p.vendorName} ({p.materialSummary} | Ordered: {p.totalOrderedQty} kg, Remaining: {p.remainingQty} kg)
                  </option>
                ))}
              </Select>

              {formData.poNumber && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: 'color-mix(in srgb, var(--success) 9%, transparent)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                    Linked to {formData.poNumber} (Target: {formData.poOrderedQuantity} kg)
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Inward entry will be approved as per this PO
                  </span>
                </div>
              )}
            </Surface>

            <FormGrid>
              <Field label="Bill Number" required>
                <Input placeholder="e.g., INV-2026-001"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })} />
              </Field>
              <Field label="Bill Date" required>
                <Input type="date" value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })} />
              </Field>
              <Field label="Vendor Name" required>
                <Input placeholder="Supplier company name"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} />
              </Field>
              <Field label="Vendor Contact">
                <Input placeholder="Phone / email"
                  value={formData.vendorContact}
                  onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })} />
              </Field>
              <Field label="Material Type" required>
                <Select value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  options={MATERIAL_TYPES} />
              </Field>
              <Field label="Material Description">
                <Input placeholder="Grade, color, etc."
                  value={formData.materialDescription}
                  onChange={(e) => setFormData({ ...formData, materialDescription: e.target.value })} />
              </Field>
              <Field label="Quantity" required>
                <Input type="number" step="0.01" min="0.01"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
              </Field>
              <Field label="Unit">
                <Select value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  options={UNITS} />
              </Field>
              <Field label="Vehicle Number">
                <Input placeholder="e.g., MH-12-AB-1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })} />
              </Field>
              <Field label="Driver Name">
                <Input placeholder="Driver's name"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} />
              </Field>
              <Field label="Remarks" span="all">
                <Input placeholder="Any notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ===== GRN DIALOG ===== */}
        <Dialog
          open={showGRNModal && !!grnEntry}
          onClose={() => setShowGRNModal(false)}
          title="Create GRN"
          subtitle={grnEntry ? `Goods receipt for ${grnEntry.billNumber}` : undefined}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowGRNModal(false)}>Cancel</Button>
              <Button variant="success" type="submit" form="grn-form" loading={submitting}>
                {submitting ? 'Creating...' : 'Create GRN & Update Inventory'}
              </Button>
            </>
          }
        >
          {grnEntry && (
            <form id="grn-form" onSubmit={handleCreateGRN}>
              <Surface
                pad={false}
                style={{
                  background: 'var(--bg-subtle)',
                  boxShadow: 'none',
                  padding: '14px 16px',
                  marginBottom: 'var(--sp-5)',
                }}
              >
                <DescList
                  items={[
                    { label: 'Bill', value: grnEntry.billNumber },
                    { label: 'Vendor', value: grnEntry.vendorName },
                    { label: 'Material', value: <span style={{ textTransform: 'capitalize' }}>{grnEntry.materialType}</span> },
                    { label: 'Bill Qty', value: `${grnEntry.quantity} ${grnEntry.unit}` },
                  ]}
                />
              </Surface>

              <FormGrid>
                <Field label={`Received Quantity (${grnEntry.unit})`}>
                  <Input type="number" step="0.01" min="0"
                    value={grnForm.receivedQuantity}
                    onChange={(e) => setGrnForm({ ...grnForm, receivedQuantity: e.target.value })} />
                </Field>
                <Field label="Quality Status">
                  <Select value={grnForm.qualityStatus}
                    onChange={(e) => setGrnForm({ ...grnForm, qualityStatus: e.target.value })}>
                    <option value="approved">Approved</option>
                    <option value="partial">Partial</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                </Field>
                <Field label="Remarks" span="all">
                  <Input placeholder="Quality notes, discrepancies..."
                    value={grnForm.remarks}
                    onChange={(e) => setGrnForm({ ...grnForm, remarks: e.target.value })} />
                </Field>
              </FormGrid>
            </form>
          )}
        </Dialog>

        {/* ===== ADD ITEMS & VERIFY DIALOG (SUPERVISOR) ===== */}
        <Dialog
          open={showAddItemsModal && !!selectedEntryForItems}
          onClose={() => setShowAddItemsModal(false)}
          title="Add Items & Verify Gate Entry"
          subtitle="Create the stock record, then mark the gate entry verified."
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowAddItemsModal(false)}>Cancel</Button>
              <Button variant="secondary" type="submit" form="add-items-form" loading={submitting}>
                {submitting ? 'Saving & Verifying...' : 'Save & Verify'}
              </Button>
            </>
          }
        >
          {selectedEntryForItems && (
            <form id="add-items-form" onSubmit={handleSaveAndVerify}>
              <Surface
                pad={false}
                style={{
                  background: 'var(--bg-subtle)',
                  boxShadow: 'none',
                  padding: '14px 16px',
                  marginBottom: 'var(--sp-5)',
                }}
              >
                <DescList
                  items={[
                    { label: 'Bill No', value: selectedEntryForItems.billNumber },
                    { label: 'Vendor', value: selectedEntryForItems.vendorName },
                    { label: 'Original Material', value: <span style={{ textTransform: 'capitalize' }}>{selectedEntryForItems.materialType}</span> },
                    { label: 'Original Qty', value: `${selectedEntryForItems.quantity} ${selectedEntryForItems.unit}` },
                  ]}
                />
              </Surface>

              <FormGrid>
                <Field label="Item / Material Name" required span="all">
                  <Input required value={itemsForm.name}
                    onChange={(e) => setItemsForm({ ...itemsForm, name: e.target.value })}
                    placeholder="e.g., Nylon Drag Chain" />
                </Field>

                <Field label="Item Type" required>
                  <Select value={itemsForm.type}
                    onChange={(e) => {
                      const typeVal = e.target.value;
                      const defaultUnit = typeVal === 'raw_material' ? 'kg' : 'pcs';
                      setItemsForm(prev => ({ ...prev, type: typeVal, unit: defaultUnit }));
                    }}>
                    <option value="raw_material">Raw Material</option>
                    <option value="finished_good">Finished Good</option>
                    <option value="hardware">Hardware / Tools</option>
                    <option value="custom">Custom Tooling</option>
                  </Select>
                </Field>

                <Field label="Stock Unit" required>
                  <Select required value={itemsForm.unit}
                    onChange={(e) => setItemsForm({ ...itemsForm, unit: e.target.value })}>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="meters">meters (Meters)</option>
                    <option value="boxes">boxes (Boxes)</option>
                    <option value="pkt">pkt (Packets)</option>
                    <option value="liters">liters (Liters)</option>
                    <option value="bags">bags (Bags)</option>
                    <option value="rolls">rolls (Rolls)</option>
                    <option value="sets">sets (Sets)</option>
                    <option value="tons">tons (Tons)</option>
                  </Select>
                </Field>

                <Field label="Stock Quantity" required>
                  <Input type="number" step="0.01" min="0.01" required value={itemsForm.quantity}
                    onChange={(e) => setItemsForm({ ...itemsForm, quantity: e.target.value })} />
                </Field>

                <Field label="Warehouse Location">
                  <Input value={itemsForm.location}
                    onChange={(e) => setItemsForm({ ...itemsForm, location: e.target.value })}
                    placeholder="e.g., Row A - Rack 2" />
                </Field>

                <Field label="Size / Gauge Specifications" span="all">
                  <Input value={itemsForm.size}
                    onChange={(e) => setItemsForm({ ...itemsForm, size: e.target.value })}
                    placeholder="e.g., 35mm x 100mm" />
                </Field>

                <Field label="Item Specs / Description" span="all">
                  <Textarea rows="2" value={itemsForm.description}
                    onChange={(e) => setItemsForm({ ...itemsForm, description: e.target.value })}
                    placeholder="Specifications..." />
                </Field>
              </FormGrid>
            </form>
          )}
        </Dialog>

        {/* ===== DELETE CONFIRMATION ===== */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            if (target) handleDelete(target._id);
          }}
          title="Delete this gate entry?"
          text={deleteTarget
            ? `Gate entry ${deleteTarget.billNumber || ''} will be permanently removed.`
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

export default GateEntry;
