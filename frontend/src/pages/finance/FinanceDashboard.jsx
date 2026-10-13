import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { financeAPI, gateEntryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LuRefreshCw, LuZap, LuEye, LuPlus, LuBuilding2, LuFileText, LuShoppingCart,
  LuTruck, LuDownload, LuPencil, LuTrash2, LuArchive, LuArrowDown, LuArrowUp,
  LuClipboardList, LuPackage, LuMapPin, LuWarehouse, LuUser, LuWallet,
  LuTriangleAlert, LuCircleCheck, LuStar, LuFileCheck, LuScanLine,
} from 'react-icons/lu';
import toast from 'react-hot-toast';

import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Drawer, Dialog, Badge, Button, EmptyState, Tabs,
  Field, Input, Select,
} from '../../components/ui';

/* Small inline helpers — layout only, every colour comes from the token layer. */
const stack = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
const subLine = { fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' };
const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' };
const rowActions = { display: 'flex', gap: 6, justifyContent: 'flex-end' };

/** Thin progress meter used for PO inward reconciliation. */
const Meter = ({ percent, label }) => (
  <div style={{ minWidth: 118 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{percent}%</span>
    </div>
    <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${percent}%`,
          background: percent === 100 ? 'var(--success)' : 'var(--primary)',
          borderRadius: 'var(--radius-full)',
        }}
      />
    </div>
  </div>
);

const Stars = ({ value = 5 }) => (
  <span style={{ display: 'inline-flex', gap: 2, color: 'var(--c-amber)' }} aria-label={`${value} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <LuStar key={i} style={{ fill: i < value ? 'currentColor' : 'none', opacity: i < value ? 1 : 0.3 }} />
    ))}
  </span>
);

const FinanceDashboard = () => {
  const { user } = useAuth();

  // Active Tab: 'vendors' | 'quotations' | 'pos' | 'purchase_store' | 'gate_inward' | 'ocr'
  const [activeTab, setActiveTab] = useState('purchase_store');

  // Data States
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [pos, setPos] = useState([]);
  const [gateEntries, setGateEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [storeInventory, setStoreInventory] = useState([]);
  const [storeLedger, setStoreLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'

  // Modals State
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendorCode: '', vendorName: '', contactPerson: '', phone: '', email: '',
    address: '', city: '', state: '', gstNumber: '', panNumber: '',
    materialSupplied: 'Nylon Granules', paymentTerms: '30 Days Net', rating: 5, notes: ''
  });
  const [editingVendorId, setEditingVendorId] = useState(null);

  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    quotationNumber: '', vendorId: '', quotationDate: new Date().toISOString().slice(0, 10),
    validUntil: '', paymentTerms: '30 Days Net', deliveryLeadTime: '7 Days', remarks: '',
    items: [{ materialType: 'Nylon Granules', description: 'Raw Material', quantity: 500, unit: 'kg', unitRate: 180, discountPercent: 0, taxRate: 18 }]
  });

  const [showPOModal, setShowPOModal] = useState(false);
  const [poForm, setPoForm] = useState({
    poNumber: '', vendorId: '', quotationId: '', orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: '', paymentTerms: '30 Days Net', deliveryTerms: 'Door Delivery Factory Gate', notes: '',
    items: [{ materialType: 'Nylon Granules', description: 'Raw Material', quantity: 500, unit: 'kg', rate: 180, discountPercent: 0, gstRate: 18 }]
  });

  // Purchase Store Inward Modal State
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardForm, setInwardForm] = useState({
    materialName: 'Nylon 66 Granules', materialType: 'nylon', quantity: 500, unit: 'kg',
    storeLocation: 'Purchase Store - Main Bay', rackBin: 'Rack A-1',
    referenceType: 'PO_INWARD', poNumber: '', vendorName: '', billNumber: '', remarks: ''
  });

  // Purchase Store Outward / Issue Modal State
  const [showOutwardModal, setShowOutwardModal] = useState(false);
  const [outwardForm, setOutwardForm] = useState({
    materialId: '', materialName: '', quantity: 100, unit: 'kg',
    destinationDepartment: 'Molding Line 1', machineNumber: 'M-01',
    issuedToPerson: '', issueSlipNumber: '', remarks: ''
  });

  // Upload/Scan State
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);

  // Fetch all procurement data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, quotesRes, posRes, gateRes, invRes, storeInvRes, storeLedgerRes] = await Promise.all([
        financeAPI.getVendors().catch(() => ({ data: { data: [] } })),
        financeAPI.getQuotations().catch(() => ({ data: { data: [] } })),
        financeAPI.getPOs().catch(() => ({ data: { data: [] } })),
        gateEntryAPI.getAll({ entryType: 'inward', limit: 50 }).catch(() => ({ data: { data: [] } })),
        financeAPI.getInvoices().catch(() => ({ data: { data: [] } })),
        financeAPI.getStoreInventory().catch(() => ({ data: { data: [] } })),
        financeAPI.getStoreLedger().catch(() => ({ data: { data: [] } }))
      ]);

      setVendors(vendorsRes.data.data || []);
      setQuotations(quotesRes.data.data || []);
      setPos(posRes.data.data || []);
      setGateEntries(gateRes.data.data || []);
      setInvoices(invRes.data.data || []);
      setStoreInventory(storeInvRes.data.data || []);
      setStoreLedger(storeLedgerRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load procurement and store data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================
  // VENDOR ACTIONS
  // ==========================================
  const handleOpenVendorModal = (vendor = null) => {
    if (vendor) {
      setEditingVendorId(vendor._id);
      setVendorForm({
        vendorCode: vendor.vendorCode || '',
        vendorName: vendor.vendorName || '',
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        gstNumber: vendor.gstNumber || '',
        panNumber: vendor.panNumber || '',
        materialSupplied: vendor.materialSupplied || 'Nylon Granules',
        paymentTerms: vendor.paymentTerms || '30 Days Net',
        rating: vendor.rating || 5,
        notes: vendor.notes || ''
      });
    } else {
      setEditingVendorId(null);
      setVendorForm({
        vendorCode: '', vendorName: '', contactPerson: '', phone: '', email: '',
        address: '', city: '', state: '', gstNumber: '', panNumber: '',
        materialSupplied: 'Nylon Granules', paymentTerms: '30 Days Net', rating: 5, notes: ''
      });
    }
    setShowVendorModal(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      if (editingVendorId) {
        await financeAPI.updateVendor(editingVendorId, vendorForm);
        toast.success('Vendor updated successfully');
      } else {
        const res = await financeAPI.addVendor(vendorForm);
        toast.success(res.data.message || 'Vendor created successfully');
      }
      setShowVendorModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await financeAPI.deleteVendor(id);
      toast.success('Vendor removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete vendor');
    }
  };

  // ==========================================
  // QUOTATION ACTIONS
  // ==========================================
  const handleOpenQuotationModal = () => {
    setQuotationForm({
      quotationNumber: '',
      vendorId: vendors[0]?._id || '',
      quotationDate: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentTerms: '30 Days Net',
      deliveryLeadTime: '7 Days',
      remarks: '',
      items: [{ materialType: 'Nylon Granules', description: 'Raw Material Grade A', quantity: 500, unit: 'kg', unitRate: 180, discountPercent: 0, taxRate: 18 }]
    });
    setShowQuotationModal(true);
  };

  const handleQuotationItemChange = (idx, field, val) => {
    const updated = [...quotationForm.items];
    updated[idx][field] = val;
    setQuotationForm(p => ({ ...p, items: updated }));
  };

  const handleAddQuotationItem = () => {
    setQuotationForm(p => ({
      ...p,
      items: [...p.items, { materialType: 'Nylon Granules', description: '', quantity: 100, unit: 'kg', unitRate: 150, discountPercent: 0, taxRate: 18 }]
    }));
  };

  const handleRemoveQuotationItem = (idx) => {
    if (quotationForm.items.length === 1) return;
    setQuotationForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    try {
      const res = await financeAPI.createQuotation(quotationForm);
      toast.success(res.data.message || 'Quotation saved');
      setShowQuotationModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleConvertToPO = async (quote) => {
    if (!window.confirm(`Generate official Purchase Order (PO) from Quotation ${quote.quotationNumber}?`)) return;
    try {
      const res = await financeAPI.convertQuotationToPO(quote._id);
      toast.success(res.data.message || 'PO generated successfully!');
      fetchData();
      setActiveTab('pos');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert quotation to PO');
    }
  };

  // ==========================================
  // PURCHASE ORDER (PO) ACTIONS
  // ==========================================
  const handleOpenPOModal = () => {
    setPoForm({
      poNumber: '',
      vendorId: vendors[0]?._id || '',
      quotationId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentTerms: '30 Days Net',
      deliveryTerms: 'Door Delivery Factory Gate',
      notes: 'Material subject to inspection and quality testing at factory gate.',
      items: [{ materialType: 'Nylon Granules', description: 'Raw Material Grade A', quantity: 500, unit: 'kg', rate: 180, discountPercent: 0, gstRate: 18 }]
    });
    setShowPOModal(true);
  };

  const handlePOItemChange = (idx, field, val) => {
    const updated = [...poForm.items];
    updated[idx][field] = val;
    setPoForm(p => ({ ...p, items: updated }));
  };

  const handleAddPOItem = () => {
    setPoForm(p => ({
      ...p,
      items: [...p.items, { materialType: 'Nylon Granules', description: '', quantity: 100, unit: 'kg', rate: 150, discountPercent: 0, gstRate: 18 }]
    }));
  };

  const handleRemovePOItem = (idx) => {
    if (poForm.items.length === 1) return;
    setPoForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const handleSavePO = async (e) => {
    e.preventDefault();
    try {
      const res = await financeAPI.createPO(poForm);
      toast.success(res.data.message || 'Purchase Order issued');
      setShowPOModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue PO');
    }
  };

  const handleDownloadPOPDF = (po) => {
    const token = localStorage.getItem('token');
    const url = `/api/finance/pos/${po._id}/pdf?token=${token}`;
    window.open(url, '_blank');
  };

  // ==========================================
  // PURCHASE STORE INWARD / OUTWARD ACTIONS
  // ==========================================
  const handleOpenInwardModal = (prefill = null) => {
    if (prefill) {
      setInwardForm({
        materialName: prefill.materialName || prefill.name || 'Nylon 66 Granules',
        materialType: prefill.materialType || prefill.type || 'nylon',
        quantity: prefill.quantity || 100,
        unit: prefill.unit || 'kg',
        storeLocation: prefill.storeLocation || 'Purchase Store - Main Bay',
        rackBin: prefill.rackBin || prefill.rackNumber || 'Rack A-1',
        referenceType: prefill.poNumber ? 'PO_INWARD' : 'DIRECT_PURCHASE_INWARD',
        poNumber: prefill.poNumber || '',
        vendorName: prefill.vendorName || '',
        billNumber: prefill.billNumber || '',
        remarks: prefill.remarks || 'Inward placed by Purchase user'
      });
    } else {
      setInwardForm({
        materialName: 'Nylon 66 Granules',
        materialType: 'nylon',
        quantity: 500,
        unit: 'kg',
        storeLocation: 'Purchase Store - Main Bay',
        rackBin: 'Rack A-1',
        referenceType: 'PO_INWARD',
        poNumber: pos[0]?.poNumber || '',
        vendorName: pos[0]?.vendorName || '',
        billNumber: '',
        remarks: 'Direct Inward into Purchase Store'
      });
    }
    setShowInwardModal(true);
  };

  const handleSaveInward = async (e) => {
    e.preventDefault();
    try {
      const res = await financeAPI.placeStoreInward(inwardForm);
      toast.success(res.data.message || 'Inward stock added to Purchase Store!');
      setShowInwardModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place inward entry');
    }
  };

  const handleOpenOutwardModal = (mat = null) => {
    if (mat) {
      setOutwardForm({
        materialId: mat._id,
        materialName: mat.name,
        quantity: Math.min(100, mat.currentStock || 10),
        unit: mat.unit || 'kg',
        destinationDepartment: 'Molding Line 1',
        machineNumber: 'M-01',
        issuedToPerson: '',
        issueSlipNumber: `ISSUE-${Date.now().toString().slice(-4)}`,
        remarks: 'Issued for production run'
      });
    } else {
      const first = storeInventory[0];
      setOutwardForm({
        materialId: first?._id || '',
        materialName: first?.name || '',
        quantity: 50,
        unit: first?.unit || 'kg',
        destinationDepartment: 'Molding Line 1',
        machineNumber: 'M-01',
        issuedToPerson: '',
        issueSlipNumber: `ISSUE-${Date.now().toString().slice(-4)}`,
        remarks: 'Issued for production run'
      });
    }
    setShowOutwardModal(true);
  };

  const handleSaveOutward = async (e) => {
    e.preventDefault();
    try {
      const res = await financeAPI.placeStoreOutward(outwardForm);
      toast.success(res.data.message || 'Stock issued successfully!');
      setShowOutwardModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue stock');
    }
  };

  // ==========================================
  // AI OCR INVOICE SCANNER
  // ==========================================
  const handleScanInvoice = async () => {
    if (!selectedFile) return toast.error('Please select an image or PDF bill');
    setScanning(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await financeAPI.scanInvoice(formData);
      toast.success(`OCR Success: Bill from ${res.data.aiExtracted.vendor_name}`);
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      toast.error('AI Scan failed');
    } finally {
      setScanning(false);
    }
  };

  // Metrics Calculation
  const totalPOVolume = pos.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const totalStoreStockKg = storeInventory.reduce((acc, it) => acc + (it.currentStock || 0), 0);
  const totalInwardKg = storeInventory.reduce((acc, it) => acc + (it.totalInward || 0), 0);
  const totalIssuedKg = storeInventory.reduce((acc, it) => acc + (it.totalIssued || 0), 0);

  /* ------------------------------------------------------------- derived rows */
  const ledgerRows = storeLedger
    .filter(l => (ledgerFilter === 'ALL' || l.entryType === ledgerFilter))
    .filter(l => !searchQuery || (l.materialName?.toLowerCase().includes(searchQuery.toLowerCase()) || l.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || l.destinationDepartment?.toLowerCase().includes(searchQuery.toLowerCase()) || l.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())));

  const vendorRows = vendors
    .filter(v => !searchQuery || (v.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || v.vendorCode?.toLowerCase().includes(searchQuery.toLowerCase()) || v.gstNumber?.toLowerCase().includes(searchQuery.toLowerCase())));

  /* ------------------------------------------------------------------ columns */
  const inventoryColumns = [
    {
      key: 'name',
      header: 'Material',
      primary: true,
      render: (mat) => (
        <div style={stack}>
          <span>{mat.name}</span>
          {mat.lastPOReference && <span style={subLine}>Last PO: {mat.lastPOReference}</span>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      hideBelow: 1100,
      render: (mat) => <span style={{ textTransform: 'capitalize' }}>{mat.type || 'Nylon'}</span>,
    },
    {
      key: 'storeLocation',
      header: 'Location / Rack',
      hideBelow: 1280,
      render: (mat) => (
        <Badge tone="blue" icon={<LuMapPin />}>
          {mat.storeLocation || 'Purchase Store'} {mat.rackNumber ? `(${mat.rackNumber})` : ''}
        </Badge>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      align: 'right',
      render: (mat) => {
        const isLow = mat.currentStock <= (mat.minimumStock || 10);
        return (
          <span style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
            {mat.currentStock} {mat.unit}
          </span>
        );
      },
    },
    {
      key: 'totalInward',
      header: 'Total Inward',
      align: 'right',
      hideBelow: 900,
      render: (mat) => <span style={{ color: 'var(--success)' }}>{mat.totalInward || 0} {mat.unit}</span>,
    },
    {
      key: 'totalIssued',
      header: 'Total Issued',
      align: 'right',
      hideBelow: 900,
      render: (mat) => <span style={{ color: 'var(--c-orange)' }}>{mat.totalIssued || 0} {mat.unit}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (mat) => (mat.currentStock <= (mat.minimumStock || 10) ? 0 : 1),
      render: (mat) => {
        const isLow = mat.currentStock <= (mat.minimumStock || 10);
        return isLow
          ? <Badge tone="danger" icon={<LuTriangleAlert />}>Low buffer</Badge>
          : <Badge tone="success" icon={<LuCircleCheck />}>Adequate</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Quick actions',
      align: 'right',
      sortable: false,
      render: (mat) => (
        <div style={rowActions}>
          <Button size="xs" icon={<LuArrowDown />} onClick={() => handleOpenInwardModal(mat)} title="Inward More Stock">
            Inward
          </Button>
          <Button size="xs" icon={<LuArrowUp />} onClick={() => handleOpenOutwardModal(mat)} title="Issue to Production">
            Issue
          </Button>
        </div>
      ),
    },
  ];

  const ledgerColumns = [
    {
      key: 'transactionDate',
      header: 'Date & time',
      sortValue: (e) => new Date(e.transactionDate || e.createdAt).getTime(),
      render: (entry) => (
        <div style={stack}>
          <span>{new Date(entry.transactionDate || entry.createdAt).toLocaleDateString()}</span>
          <span style={subLine}>
            {new Date(entry.transactionDate || entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'entryType',
      header: 'Movement',
      render: (entry) => (
        entry.entryType === 'IN'
          ? <Badge tone="success" icon={<LuArrowDown />}>In (receipt)</Badge>
          : <Badge tone="danger" icon={<LuArrowUp />}>Out (issue)</Badge>
      ),
    },
    {
      key: 'materialName',
      header: 'Material',
      primary: true,
      render: (entry) => (
        <div style={stack}>
          <span>{entry.materialName}</span>
          {entry.remarks && <span style={subLine}>{entry.remarks}</span>}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      render: (entry) => {
        const isIN = entry.entryType === 'IN';
        return (
          <span style={{ fontWeight: 700, color: isIN ? 'var(--success)' : 'var(--danger)' }}>
            {isIN ? '+' : '-'}{entry.quantity} {entry.unit}
          </span>
        );
      },
    },
    {
      key: 'referenceNumber',
      header: 'Ref / PO #',
      hideBelow: 1100,
      render: (entry) => (
        <span style={{ ...mono, color: 'var(--c-blue)', fontWeight: 600 }}>
          {entry.referenceNumber || entry.poNumber || 'N/A'}
        </span>
      ),
    },
    {
      key: 'counterparty',
      header: 'Vendor / destination',
      hideBelow: 900,
      sortValue: (e) => (e.entryType === 'IN' ? e.vendorName : e.destinationDepartment) || '',
      render: (entry) => (
        entry.entryType === 'IN' ? (
          <div style={stack}>
            <span style={{ color: 'var(--text-primary)' }}>{entry.vendorName || 'Supplier'}</span>
            {entry.vendorCode && <span style={subLine}>{entry.vendorCode}</span>}
          </div>
        ) : (
          <div style={stack}>
            <span style={{ color: 'var(--text-primary)' }}>{entry.destinationDepartment || 'Production Line'}</span>
            {entry.machineNumber && <span style={subLine}>{entry.machineNumber}</span>}
          </div>
        )
      ),
    },
    {
      key: 'storeLocation',
      header: 'Store location',
      hideBelow: 1280,
      render: (entry) => (
        <span style={subLine}>{entry.storeLocation} {entry.rackBin ? `(${entry.rackBin})` : ''}</span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Balance after',
      align: 'right',
      render: (entry) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.balanceAfter} {entry.unit}</span>
      ),
    },
    {
      key: 'performedByName',
      header: 'Logged by',
      hideBelow: 1280,
      render: (entry) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LuUser style={{ color: 'var(--text-ghost)' }} />
          {entry.performedByName || 'Purchase User'}
        </span>
      ),
    },
  ];

  const poColumns = [
    {
      key: 'poNumber',
      header: 'PO number',
      primary: true,
      render: (po) => (
        <div style={stack}>
          <span style={{ color: 'var(--c-blue)' }}>{po.poNumber}</span>
          {po.quotationNumber && <span style={subLine}>Ref: {po.quotationNumber}</span>}
        </div>
      ),
    },
    {
      key: 'vendorName',
      header: 'Vendor / supplier',
      sortValue: (po) => po.vendorName || po.vendorId?.vendorName || '',
      render: (po) => (
        <div style={stack}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{po.vendorName || po.vendorId?.vendorName}</span>
          <span style={subLine}>{po.vendorCode || po.vendorId?.vendorCode}</span>
        </div>
      ),
    },
    {
      key: 'orderDate',
      header: 'Order date',
      hideBelow: 900,
      sortValue: (po) => new Date(po.orderDate || po.createdAt).getTime(),
      render: (po) => (
        <div style={stack}>
          <span>{new Date(po.orderDate || po.createdAt).toLocaleDateString()}</span>
          {po.expectedDeliveryDate && <span style={subLine}>Due: {new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Materials & quantities',
      hideBelow: 1280,
      sortable: false,
      render: (po) => (
        <div style={{ ...stack, fontSize: 'var(--fs-sm)' }}>
          {(po.items || []).map((it, idx) => (
            <span key={idx}>{it.materialType}: {it.quantity} {it.unit} @ ₹{it.rate}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Inward progress',
      hideBelow: 1100,
      sortValue: (po) => {
        const totalOrdered = (po.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
        const received = po.totalReceivedQty || 0;
        return totalOrdered > 0 ? Math.min(100, Math.round((received / totalOrdered) * 100)) : 0;
      },
      render: (po) => {
        const totalOrdered = (po.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
        const received = po.totalReceivedQty || 0;
        const percent = totalOrdered > 0 ? Math.min(100, Math.round((received / totalOrdered) * 100)) : 0;
        return <Meter percent={percent} label={`${received} / ${totalOrdered} kg`} />;
      },
    },
    {
      key: 'grandTotal',
      header: 'Grand total',
      align: 'right',
      sortValue: (po) => po.grandTotal || po.totalAmount || 0,
      render: (po) => (
        <span style={{ fontWeight: 700, color: 'var(--success)' }}>
          ₹{(po.grandTotal || po.totalAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => (
        <Badge tone={po.status === 'received' ? 'success' : po.status === 'partially_received' ? 'warning' : 'blue'}>
          {po.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (po) => {
        const totalOrdered = (po.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
        const received = po.totalReceivedQty || 0;
        return (
          <div style={rowActions}>
            <Button size="xs" icon={<LuDownload />} onClick={() => handleDownloadPOPDF(po)} title="Download PO PDF">
              PDF
            </Button>
            <Button
              size="xs"
              variant="primary"
              icon={<LuArrowDown />}
              title="Inward directly to Purchase Store"
              onClick={() => handleOpenInwardModal({
                materialName: po.items?.[0]?.materialType || 'Nylon Granules',
                quantity: totalOrdered - received > 0 ? totalOrdered - received : totalOrdered,
                poNumber: po.poNumber,
                vendorName: po.vendorName
              })}
            >
              Inward
            </Button>
          </div>
        );
      },
    },
  ];

  const quotationColumns = [
    {
      key: 'quotationNumber',
      header: 'Quotation #',
      primary: true,
      render: (q) => <span style={{ color: 'var(--primary)' }}>{q.quotationNumber}</span>,
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      sortValue: (q) => q.vendorName || q.vendorId?.vendorName || '',
      render: (q) => (
        <div style={stack}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{q.vendorName || q.vendorId?.vendorName}</span>
          <span style={subLine}>{q.vendorCode || q.vendorId?.vendorCode}</span>
        </div>
      ),
    },
    {
      key: 'quotationDate',
      header: 'Date / valid until',
      hideBelow: 900,
      sortValue: (q) => new Date(q.quotationDate).getTime(),
      render: (q) => (
        <div style={stack}>
          <span>{new Date(q.quotationDate).toLocaleDateString()}</span>
          {q.validUntil && <span style={subLine}>Valid till {new Date(q.validUntil).toLocaleDateString()}</span>}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items & materials',
      hideBelow: 1280,
      sortable: false,
      render: (q) => (
        <div style={{ ...stack, fontSize: 'var(--fs-sm)' }}>
          {(q.items || []).map((it, idx) => (
            <span key={idx}>{it.materialType}: {it.quantity} {it.unit} @ ₹{it.unitRate}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'subTotal',
      header: 'Subtotal',
      align: 'right',
      hideBelow: 1100,
      render: (q) => `₹${(q.subTotal || 0).toLocaleString()}`,
    },
    {
      key: 'taxAmount',
      header: 'GST',
      align: 'right',
      hideBelow: 1100,
      render: (q) => `₹${(q.taxAmount || 0).toLocaleString()}`,
    },
    {
      key: 'grandTotal',
      header: 'Grand total',
      align: 'right',
      render: (q) => (
        <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{(q.grandTotal || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (q) => {
        const isConverted = q.status === 'converted_to_po';
        return (
          <Badge tone={isConverted ? 'success' : 'warning'}>
            {isConverted ? `Converted${q.poNumber ? ` · ${q.poNumber}` : ''}` : q.status?.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (q) => {
        const isConverted = q.status === 'converted_to_po';
        return isConverted ? (
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--success)', fontWeight: 600 }}>PO active</span>
        ) : (
          <Button size="xs" variant="primary" icon={<LuZap />} onClick={() => handleConvertToPO(q)}>
            Generate PO
          </Button>
        );
      },
    },
  ];

  const vendorColumns = [
    {
      key: 'vendorCode',
      header: 'Code',
      render: (v) => <Badge tone="blue">{v.vendorCode || 'VEN-NEW'}</Badge>,
    },
    {
      key: 'vendorName',
      header: 'Vendor name',
      primary: true,
      render: (v) => (
        <div style={stack}>
          <span>{v.vendorName}</span>
          {v.city && <span style={subLine}>{v.city}, {v.state}</span>}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact & phone',
      hideBelow: 900,
      render: (v) => (
        <div style={stack}>
          <span>{v.contactPerson || 'N/A'}</span>
          {v.phone && <span style={subLine}>{v.phone}</span>}
        </div>
      ),
    },
    {
      key: 'gstNumber',
      header: 'GSTIN',
      hideBelow: 1100,
      render: (v) => <span style={mono}>{v.gstNumber || 'N/A'}</span>,
    },
    {
      key: 'materialSupplied',
      header: 'Materials supplied',
      hideBelow: 1280,
      render: (v) => v.materialSupplied || 'Nylon Granules',
    },
    {
      key: 'paymentTerms',
      header: 'Payment terms',
      hideBelow: 1280,
      render: (v) => <span style={{ fontSize: 'var(--fs-sm)' }}>{v.paymentTerms || '30 Days Net'}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      sortValue: (v) => v.rating || 5,
      render: (v) => <Stars value={v.rating || 5} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (v) => (
        <div style={rowActions}>
          <Button size="xs" icon={<LuPencil />} onClick={() => handleOpenVendorModal(v)} title="Edit Vendor" aria-label="Edit vendor" />
          <Button size="xs" icon={<LuTrash2 />} onClick={() => handleDeleteVendor(v._id)} title="Delete Vendor" aria-label="Delete vendor" style={{ color: 'var(--danger)' }} />
        </div>
      ),
    },
  ];

  const gateColumns = [
    {
      key: 'createdAt',
      header: 'Entry date',
      sortValue: (ge) => new Date(ge.createdAt || ge.billDate).getTime(),
      render: (ge) => new Date(ge.createdAt || ge.billDate).toLocaleDateString(),
    },
    {
      key: 'poNumber',
      header: 'Linked PO #',
      primary: true,
      render: (ge) => (
        ge.poNumber
          ? <Badge tone="blue">{ge.poNumber}</Badge>
          : <span style={subLine}>Direct inward</span>
      ),
    },
    {
      key: 'vendorName',
      header: 'Vendor name',
      render: (ge) => (
        <div style={stack}>
          <span>{ge.vendorName}</span>
          {ge.vendorCode && <span style={subLine}>{ge.vendorCode}</span>}
        </div>
      ),
    },
    { key: 'billNumber', header: 'Bill / challan #', hideBelow: 1100, render: (ge) => ge.billNumber || 'N/A' },
    { key: 'vehicleNumber', header: 'Vehicle #', hideBelow: 1100, render: (ge) => ge.vehicleNumber || 'N/A' },
    {
      key: 'quantity',
      header: 'Inward quantity',
      align: 'right',
      render: (ge) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ge.quantity} {ge.unit || 'kg'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Gate status',
      render: (ge) => (
        <Badge tone={ge.status === 'grn_created' ? 'success' : ge.status === 'verified' ? 'blue' : 'warning'}>
          {ge.status === 'grn_created' ? 'Approved & GRN' : ge.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'grnNumber',
      header: 'GRN #',
      hideBelow: 1280,
      render: (ge) => <span style={{ ...mono, color: 'var(--success)' }}>{ge.grnNumber || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      sortable: false,
      render: (ge) => (
        <Button
          size="xs"
          variant="primary"
          icon={<LuArrowDown />}
          title="Inward to Purchase Store"
          onClick={() => handleOpenInwardModal({
            materialName: ge.materialType || 'Nylon Granules',
            quantity: ge.quantity,
            unit: ge.unit,
            poNumber: ge.poNumber,
            vendorName: ge.vendorName,
            billNumber: ge.billNumber
          })}
        >
          Inward to store
        </Button>
      ),
    },
  ];

  const ocrColumns = [
    { key: 'invoiceNumber', header: 'Invoice no', primary: true },
    { key: 'vendorName', header: 'Vendor name' },
    {
      key: 'totalAmount',
      header: 'Total amount',
      align: 'right',
      render: (inv) => <span style={{ fontWeight: 700, color: 'var(--c-blue)' }}>₹{inv.totalAmount}</span>,
    },
    { key: 'taxAmount', header: 'Tax', align: 'right', hideBelow: 900, render: (inv) => `₹${inv.taxAmount}` },
    {
      key: 'engine',
      header: 'Extracted via',
      hideBelow: 1100,
      sortable: false,
      render: (inv) => (
        <Badge tone="purple">
          {inv.rawOcrText && (inv.rawOcrText.includes('OpenAI') || inv.rawOcrText.includes('GPT')) ? 'OpenAI GPT' : 'Fallback Engine'}
        </Badge>
      ),
    },
    { key: 'status', header: 'Status', render: (inv) => <Badge tone="success">{inv.status}</Badge> },
    {
      key: 'view',
      header: 'View',
      align: 'right',
      sortable: false,
      render: (inv) => (
        <Button size="xs" icon={<LuEye />} onClick={() => setSelectedInvoiceForView(inv)}>View</Button>
      ),
    },
  ];

  /* ------------------------------------------------------------- header actions */
  const headerActions = (
    <>
      {activeTab === 'purchase_store' && (
        <>
          <Button variant="success" icon={<LuArrowDown />} onClick={() => handleOpenInwardModal()}>
            Inward stock
          </Button>
          <Button icon={<LuArrowUp />} onClick={() => handleOpenOutwardModal()}>
            Issue stock
          </Button>
        </>
      )}
      {activeTab === 'vendors' && (
        <Button variant="primary" icon={<LuPlus />} onClick={() => handleOpenVendorModal()}>Add vendor</Button>
      )}
      {activeTab === 'quotations' && (
        <Button variant="primary" icon={<LuPlus />} onClick={handleOpenQuotationModal}>Enter quotation</Button>
      )}
      {activeTab === 'pos' && (
        <Button variant="primary" icon={<LuPlus />} onClick={handleOpenPOModal}>Issue PO</Button>
      )}
      <Button icon={<LuRefreshCw />} onClick={fetchData} title="Refresh Data">Refresh</Button>
    </>
  );

  return (
    <DashboardLayout pageTitle="Procurement & Purchase Hub">
      <Page>
        <PageHeader
          title="Procurement & Purchase Hub"
          subtitle="Vendors, quotations, purchase orders and the purchase-store IN/OUT ledger in one workspace."
          actions={headerActions}
        />

        {/* TOP KPI STATS SUMMARY BAR */}
        <StatRow>
          <StatTile
            label="Total vendors"
            value={vendors.length}
            icon={<LuBuilding2 />}
            tone="blue"
            hint="Registered suppliers"
          />
          <StatTile
            label="Store raw materials"
            value={`${storeInventory.length} types`}
            icon={<LuWarehouse />}
            tone="green"
            hint={`${totalStoreStockKg.toLocaleString()} kg in stock`}
          />
          <StatTile
            label="Total inward received"
            value={`${totalInwardKg.toLocaleString()} kg`}
            icon={<LuArrowDown />}
            tone="teal"
            hint="Inward into purchase store"
          />
          <StatTile
            label="Total issued outward"
            value={`${totalIssuedKg.toLocaleString()} kg`}
            icon={<LuArrowUp />}
            tone="orange"
            hint="Issued to production"
          />
          <StatTile
            label="Procurement PO value"
            value={`₹${totalPOVolume.toLocaleString()}`}
            icon={<LuWallet />}
            tone="violet"
            hint={`${pos.length} purchase orders`}
          />
        </StatRow>

        {/* WORKSPACE NAVIGATION TABS */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'purchase_store', label: 'Purchase store & ledger', icon: <LuArchive />, count: storeInventory.length },
            { key: 'pos', label: 'Purchase orders', icon: <LuShoppingCart />, count: pos.length },
            { key: 'quotations', label: 'Vendor quotations', icon: <LuFileText />, count: quotations.length },
            { key: 'vendors', label: 'Vendors directory', icon: <LuBuilding2 />, count: vendors.length },
            { key: 'gate_inward', label: 'Gate inward & PO tracking', icon: <LuTruck />, count: gateEntries.length },
            { key: 'ocr', label: 'AI bill scanner', icon: <LuZap />, count: invoices.length },
          ]}
        />

        <div style={{ marginTop: 18 }}>

          {/* ======================================================== */}
          {/* TAB: PURCHASE STORE & IN/OUT TRANSACTION LEDGER           */}
          {/* ======================================================== */}
          {activeTab === 'purchase_store' && (
            <>
              <Section title="Purchase Store Raw Material Inventory">
                <DataTable
                  columns={inventoryColumns}
                  rows={storeInventory}
                  loading={loading}
                  pageSize={15}
                  footNote={`${storeInventory.length} material${storeInventory.length === 1 ? '' : 's'} · live stock in the purchase-store warehouse`}
                  empty={
                    <EmptyState
                      icon={<LuPackage />}
                      title="No materials in purchase store yet"
                      text='Use "Inward stock" to add your first batch.'
                      action={<Button variant="primary" icon={<LuArrowDown />} onClick={() => handleOpenInwardModal()}>Inward stock</Button>}
                    />
                  }
                />
              </Section>

              <Section title="Purchase Store IN / OUT Stock Movement Ledger">
                <Toolbar>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search ref, PO, dept…"
                  />
                  <ChipGroup
                    value={ledgerFilter}
                    onChange={setLedgerFilter}
                    items={[
                      { key: 'ALL', label: 'All entries', count: storeLedger.length },
                      { key: 'IN', label: 'In only', count: storeLedger.filter(l => l.entryType === 'IN').length },
                      { key: 'OUT', label: 'Out only', count: storeLedger.filter(l => l.entryType === 'OUT').length },
                    ]}
                  />
                  <ToolbarSpacer />
                  <DensitySwitch />
                </Toolbar>

                <DataTable
                  columns={ledgerColumns}
                  rows={ledgerRows}
                  loading={loading}
                  pageSize={25}
                  empty={
                    <EmptyState
                      icon={<LuClipboardList />}
                      title="No store transactions matching criteria"
                      text="Clear the search or switch the IN/OUT filter."
                    />
                  }
                />
              </Section>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PURCHASE ORDERS (PO)                              */}
          {/* ======================================================== */}
          {activeTab === 'pos' && (
            <Section title="Official Purchase Orders">
              <DataTable
                columns={poColumns}
                rows={pos}
                loading={loading}
                pageSize={20}
                footNote={`${pos.length} PO${pos.length === 1 ? '' : 's'} · auto-numbered PO-YYYY-XXXX, linked to gate entry & store inward`}
                empty={
                  <EmptyState
                    icon={<LuShoppingCart />}
                    title="No purchase orders issued yet"
                    text="Issue your first PO to start tracking inward reconciliation."
                    action={<Button variant="primary" icon={<LuPlus />} onClick={handleOpenPOModal}>Issue PO</Button>}
                  />
                }
              />
            </Section>
          )}

          {/* ======================================================== */}
          {/* TAB 3: VENDOR QUOTATIONS                                 */}
          {/* ======================================================== */}
          {activeTab === 'quotations' && (
            <Section title="Vendor Quotation Management & Comparison">
              <DataTable
                columns={quotationColumns}
                rows={quotations}
                loading={loading}
                pageSize={20}
                footNote={`${quotations.length} quotation${quotations.length === 1 ? '' : 's'} · approve to convert directly into an official PO`}
                empty={
                  <EmptyState
                    icon={<LuFileText />}
                    title="No quotations entered yet"
                    text="Capture a vendor quotation to compare rates before raising a PO."
                    action={<Button variant="primary" icon={<LuPlus />} onClick={handleOpenQuotationModal}>Enter quotation</Button>}
                  />
                }
              />
            </Section>
          )}

          {/* ======================================================== */}
          {/* TAB 4: VENDORS MASTER & DIRECTORY                        */}
          {/* ======================================================== */}
          {activeTab === 'vendors' && (
            <Section title="Registered Vendors & Suppliers Master">
              <Toolbar>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by code, name, GST…"
                />
                <ToolbarSpacer />
                <DensitySwitch />
              </Toolbar>

              <DataTable
                columns={vendorColumns}
                rows={vendorRows}
                loading={loading}
                pageSize={20}
                empty={
                  <EmptyState
                    icon={<LuBuilding2 />}
                    title="No vendors found"
                    text="Add a supplier to start raising quotations and purchase orders."
                    action={<Button variant="primary" icon={<LuPlus />} onClick={() => handleOpenVendorModal()}>Add vendor</Button>}
                  />
                }
              />
            </Section>
          )}

          {/* ======================================================== */}
          {/* TAB 5: GATE INWARD & PO RECONCILIATION                   */}
          {/* ======================================================== */}
          {activeTab === 'gate_inward' && (
            <Section title="Inward Gate Entries & PO Approval Reconciliation">
              <DataTable
                columns={gateColumns}
                rows={gateEntries}
                loading={loading}
                pageSize={20}
                footNote="Gate guards match material arrivals against open POs before entry approval."
                empty={
                  <EmptyState
                    icon={<LuTruck />}
                    title="No inward gate entries recorded yet"
                    text="Arrivals logged at the factory gate will appear here for reconciliation."
                  />
                }
              />
            </Section>
          )}

          {/* ======================================================== */}
          {/* TAB 6: AI INVOICE SCANNER (OCR)                          */}
          {/* ======================================================== */}
          {activeTab === 'ocr' && (
            <>
              <Section title="AI Auto-invoice Entry (OCR)">
                <Surface>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-base)', lineHeight: 1.6, marginBottom: 14 }}>
                    Upload a scanned vendor bill. Our AI will automatically extract the vendor name, invoice number and total
                    amount to create an ERP entry.
                  </p>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Field label="Vendor bill (image or PDF)">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => setSelectedFile(e.target.files[0])}
                        style={{ minWidth: 'min(300px, 100%)', height: 'auto', padding: '6px 10px' }}
                      />
                    </Field>
                    <Button
                      variant="primary"
                      icon={<LuScanLine />}
                      loading={scanning}
                      disabled={!selectedFile || scanning}
                      onClick={handleScanInvoice}
                    >
                      {scanning ? 'Scanning via AI…' : 'Extract data & save'}
                    </Button>
                  </div>
                </Surface>
              </Section>

              <Section title="Scanned Vendor Bills">
                <DataTable
                  columns={ocrColumns}
                  rows={invoices}
                  loading={loading}
                  pageSize={20}
                  empty={
                    <EmptyState
                      icon={<LuFileCheck />}
                      title="No invoices scanned yet"
                      text="Upload a vendor bill above to extract its details automatically."
                    />
                  }
                />
              </Section>
            </>
          )}

        </div>

        {/* ======================================================== */}
        {/* MODAL: PLACE INWARD ENTRY INTO PURCHASE STORE            */}
        {/* ======================================================== */}
        <Dialog
          open={showInwardModal}
          onClose={() => setShowInwardModal(false)}
          title="Place Inward Entry"
          subtitle="Purchase Store"
          size="lg"
          footer={
            <>
              <Button onClick={() => setShowInwardModal(false)}>Cancel</Button>
              <Button type="submit" form="inward-form" variant="success" icon={<LuArrowDown />}>
                Record inward & update store
              </Button>
            </>
          }
        >
          <div
            style={{
              background: 'var(--success-soft)',
              border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Deposits raw material into <strong>purchase store inventory</strong> and creates a permanent{' '}
            <strong>IN ledger record</strong> with running balance.
          </div>

          <form id="inward-form" onSubmit={handleSaveInward}>
            <FormGrid>
              <Field label="Material name" required span={2}>
                <Input
                  required
                  placeholder="e.g. Nylon 66 Granules"
                  value={inwardForm.materialName}
                  onChange={e => setInwardForm(p => ({ ...p, materialName: e.target.value }))}
                />
              </Field>
              <Field label="Material type">
                <Select value={inwardForm.materialType} onChange={e => setInwardForm(p => ({ ...p, materialType: e.target.value }))}>
                  <option value="nylon">Nylon</option>
                  <option value="pigment">Pigment</option>
                  <option value="hardware">Hardware / Pins</option>
                  <option value="packaging">Packaging</option>
                  <option value="other">Other</option>
                </Select>
              </Field>

              <Field label="Inward quantity" required>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={inwardForm.quantity}
                  onChange={e => setInwardForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </Field>
              <Field label="Unit">
                <Select value={inwardForm.unit} onChange={e => setInwardForm(p => ({ ...p, unit: e.target.value }))}>
                  <option value="kg">KG</option>
                  <option value="pcs">PCS</option>
                  <option value="bags">Bags</option>
                  <option value="meters">Meters</option>
                  <option value="liters">Liters</option>
                </Select>
              </Field>

              <Field label="Purchase store location">
                <Input
                  value={inwardForm.storeLocation}
                  onChange={e => setInwardForm(p => ({ ...p, storeLocation: e.target.value }))}
                  placeholder="Purchase Store - Bay A1"
                />
              </Field>
              <Field label="Rack / bin number">
                <Input
                  value={inwardForm.rackBin}
                  onChange={e => setInwardForm(p => ({ ...p, rackBin: e.target.value }))}
                  placeholder="Rack A-1 / Bin 02"
                />
              </Field>

              <Field label="PO number" hint="Optional">
                <Input
                  placeholder="PO-2026-0001"
                  value={inwardForm.poNumber}
                  onChange={e => setInwardForm(p => ({ ...p, poNumber: e.target.value }))}
                />
              </Field>
              <Field label="Vendor name" hint="Optional">
                <Input
                  placeholder="Supplier Name"
                  value={inwardForm.vendorName}
                  onChange={e => setInwardForm(p => ({ ...p, vendorName: e.target.value }))}
                />
              </Field>

              <Field label="Bill / delivery challan ref #" span="all">
                <Input
                  placeholder="INV-8890 / DC-101"
                  value={inwardForm.billNumber}
                  onChange={e => setInwardForm(p => ({ ...p, billNumber: e.target.value }))}
                />
              </Field>

              <Field label="Remarks / storage notes" span="all">
                <Input
                  placeholder="e.g. Batch #NY-88, inspected and verified"
                  value={inwardForm.remarks}
                  onChange={e => setInwardForm(p => ({ ...p, remarks: e.target.value }))}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL: PLACE OUTWARD / ISSUE STOCK ENTRY                 */}
        {/* ======================================================== */}
        <Dialog
          open={showOutwardModal}
          onClose={() => setShowOutwardModal(false)}
          title="Issue Stock Outward"
          subtitle="To Production"
          size="lg"
          footer={
            <>
              <Button onClick={() => setShowOutwardModal(false)}>Cancel</Button>
              <Button type="submit" form="outward-form" variant="danger" icon={<LuArrowUp />}>
                Issue stock & update ledger
              </Button>
            </>
          }
        >
          <div
            style={{
              background: 'var(--danger-soft)',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Deducts raw material from the <strong>purchase store</strong> for production and creates a permanent{' '}
            <strong>OUT ledger record</strong> with remaining balance.
          </div>

          <form id="outward-form" onSubmit={handleSaveOutward}>
            <FormGrid>
              <Field label="Raw material to issue" required span="all">
                <Select
                  required
                  value={outwardForm.materialId}
                  onChange={e => {
                    const id = e.target.value;
                    const selected = storeInventory.find(m => m._id === id);
                    if (selected) {
                      setOutwardForm(p => ({
                        ...p,
                        materialId: selected._id,
                        materialName: selected.name,
                        unit: selected.unit,
                        quantity: Math.min(p.quantity || 10, selected.currentStock)
                      }));
                    }
                  }}
                >
                  <option value="">-- Choose Material from Store --</option>
                  {storeInventory.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} — Available: {m.currentStock} {m.unit} ({m.storeLocation || 'Main Bay'})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Issue quantity" required>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={outwardForm.quantity}
                  onChange={e => setOutwardForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </Field>
              <Field label="Unit">
                <Input readOnly disabled value={outwardForm.unit} />
              </Field>

              <Field label="Destination department" required>
                <Select value={outwardForm.destinationDepartment} onChange={e => setOutwardForm(p => ({ ...p, destinationDepartment: e.target.value }))}>
                  <option value="Molding Line 1">Molding Line 1</option>
                  <option value="Molding Line 2">Molding Line 2</option>
                  <option value="Extrusion Dept">Extrusion Dept</option>
                  <option value="Assembly Line">Assembly Line</option>
                  <option value="Testing & Quality Lab">Testing &amp; Quality Lab</option>
                  <option value="Job Work Contractor">Job Work Contractor</option>
                  <option value="Vendor Return (Damaged)">Vendor Return (Damaged)</option>
                </Select>
              </Field>
              <Field label="Machine / workstation no">
                <Input
                  placeholder="e.g. M-01, M-02"
                  value={outwardForm.machineNumber}
                  onChange={e => setOutwardForm(p => ({ ...p, machineNumber: e.target.value }))}
                />
              </Field>

              <Field label="Issued to person">
                <Input
                  placeholder="Operator / Supervisor Name"
                  value={outwardForm.issuedToPerson}
                  onChange={e => setOutwardForm(p => ({ ...p, issuedToPerson: e.target.value }))}
                />
              </Field>
              <Field label="Issue slip #" hint="Optional">
                <Input
                  placeholder="ISSUE-001"
                  value={outwardForm.issueSlipNumber}
                  onChange={e => setOutwardForm(p => ({ ...p, issueSlipNumber: e.target.value }))}
                />
              </Field>

              <Field label="Remarks / job order reference" span="all">
                <Input
                  placeholder="e.g. Issued for Drag Chain Model 35.1 batch"
                  value={outwardForm.remarks}
                  onChange={e => setOutwardForm(p => ({ ...p, remarks: e.target.value }))}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 1: ADD / EDIT VENDOR                               */}
        {/* ======================================================== */}
        <Dialog
          open={showVendorModal}
          onClose={() => setShowVendorModal(false)}
          title={editingVendorId ? 'Edit vendor details' : 'Add new supplier / vendor'}
          size="lg"
          footer={
            <>
              <Button onClick={() => setShowVendorModal(false)}>Cancel</Button>
              <Button type="submit" form="vendor-form" variant="primary">
                {editingVendorId ? 'Update vendor' : 'Save vendor'}
              </Button>
            </>
          }
        >
          <form id="vendor-form" onSubmit={handleSaveVendor}>
            <FormGrid>
              <Field label="Vendor code" hint="Leave blank for VEN-XXXX">
                <Input
                  placeholder="Auto (VEN-XXXX)"
                  value={vendorForm.vendorCode}
                  onChange={e => setVendorForm(p => ({ ...p, vendorCode: e.target.value }))}
                />
              </Field>
              <Field label="Vendor / company name" required span={2}>
                <Input
                  required
                  placeholder="e.g. Apex Polymer Industries"
                  value={vendorForm.vendorName}
                  onChange={e => setVendorForm(p => ({ ...p, vendorName: e.target.value }))}
                />
              </Field>

              <Field label="Contact person">
                <Input
                  placeholder="Mr. Rajesh Kumar"
                  value={vendorForm.contactPerson}
                  onChange={e => setVendorForm(p => ({ ...p, contactPerson: e.target.value }))}
                />
              </Field>
              <Field label="Phone / mobile" required>
                <Input
                  placeholder="+91 9876543210"
                  value={vendorForm.phone}
                  onChange={e => setVendorForm(p => ({ ...p, phone: e.target.value }))}
                />
              </Field>

              <Field label="Email address">
                <Input
                  type="email"
                  placeholder="sales@vendor.com"
                  value={vendorForm.email}
                  onChange={e => setVendorForm(p => ({ ...p, email: e.target.value }))}
                />
              </Field>
              <Field label="GSTIN number">
                <Input
                  placeholder="27AAPCA1234F1Z5"
                  value={vendorForm.gstNumber}
                  onChange={e => setVendorForm(p => ({ ...p, gstNumber: e.target.value }))}
                />
              </Field>

              <Field label="Material supplied" span={2}>
                <Input
                  placeholder="e.g. Nylon 66 Granules, Metal Pins"
                  value={vendorForm.materialSupplied}
                  onChange={e => setVendorForm(p => ({ ...p, materialSupplied: e.target.value }))}
                />
              </Field>
              <Field label="Payment terms">
                <Select value={vendorForm.paymentTerms} onChange={e => setVendorForm(p => ({ ...p, paymentTerms: e.target.value }))}>
                  <option value="Immediate">Immediate / Advance</option>
                  <option value="15 Days Net">15 Days Net</option>
                  <option value="30 Days Net">30 Days Net</option>
                  <option value="45 Days Net">45 Days Net</option>
                  <option value="60 Days Net">60 Days Net</option>
                </Select>
              </Field>

              <Field label="Address & city" span="all">
                <Input
                  placeholder="Factory / Office Street Address, City, State"
                  value={vendorForm.address}
                  onChange={e => setVendorForm(p => ({ ...p, address: e.target.value }))}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 2: ENTER VENDOR QUOTATION                          */}
        {/* ======================================================== */}
        <Dialog
          open={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          title="Enter Vendor Quotation"
          size="lg"
          footer={
            <>
              <Button onClick={() => setShowQuotationModal(false)}>Cancel</Button>
              <Button type="submit" form="quotation-form" variant="primary">Save quotation</Button>
            </>
          }
        >
          <form id="quotation-form" onSubmit={handleSaveQuotation}>
            <FormGrid>
              <Field label="Quotation ref #" required>
                <Input
                  required
                  placeholder="e.g. VQ-2026-001"
                  value={quotationForm.quotationNumber}
                  onChange={e => setQuotationForm(p => ({ ...p, quotationNumber: e.target.value }))}
                />
              </Field>
              <Field label="Vendor" required>
                <Select required value={quotationForm.vendorId} onChange={e => setQuotationForm(p => ({ ...p, vendorId: e.target.value }))}>
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.vendorName} ({v.vendorCode})</option>)}
                </Select>
              </Field>

              <Field label="Quotation date">
                <Input
                  type="date"
                  value={quotationForm.quotationDate}
                  onChange={e => setQuotationForm(p => ({ ...p, quotationDate: e.target.value }))}
                />
              </Field>
              <Field label="Valid until">
                <Input
                  type="date"
                  value={quotationForm.validUntil}
                  onChange={e => setQuotationForm(p => ({ ...p, validUntil: e.target.value }))}
                />
              </Field>
            </FormGrid>

            {/* Itemized Materials Table */}
            <Section
              title="Quoted Materials & Unit Rates"
              actions={<Button size="xs" icon={<LuPlus />} onClick={handleAddQuotationItem}>Add item</Button>}
            >
              <Surface>
                <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 420 }}>
                {quotationForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 2fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(90px, 1fr) 26px',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Input
                      placeholder="Material Type / Name"
                      value={item.materialType}
                      onChange={e => handleQuotationItemChange(idx, 'materialType', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handleQuotationItemChange(idx, 'quantity', Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Rate (₹)"
                      value={item.unitRate}
                      onChange={e => handleQuotationItemChange(idx, 'unitRate', Number(e.target.value))}
                    />
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--success)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{((item.quantity || 0) * (item.unitRate || 0)).toLocaleString()}
                    </div>
                    {quotationForm.items.length > 1 ? (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveQuotationItem(idx)}
                        aria-label="Remove item"
                        style={{ color: 'var(--danger)' }}
                      >
                        <LuTrash2 />
                      </button>
                    ) : <span />}
                  </div>
                ))}
                </div>
                </div>
              </Surface>
            </Section>
          </form>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 3: CREATE PURCHASE ORDER (PO)                      */}
        {/* ======================================================== */}
        <Dialog
          open={showPOModal}
          onClose={() => setShowPOModal(false)}
          title="Issue Official Purchase Order"
          size="lg"
          footer={
            <>
              <Button onClick={() => setShowPOModal(false)}>Cancel</Button>
              <Button type="submit" form="po-form" variant="primary">Generate & issue PO</Button>
            </>
          }
        >
          <form id="po-form" onSubmit={handleSavePO}>
            <FormGrid>
              <Field label="PO number" hint="Auto-generated when blank">
                <Input
                  placeholder="PO-2026-XXXX"
                  value={poForm.poNumber}
                  onChange={e => setPoForm(p => ({ ...p, poNumber: e.target.value }))}
                />
              </Field>
              <Field label="Vendor / supplier" required>
                <Select required value={poForm.vendorId} onChange={e => setPoForm(p => ({ ...p, vendorId: e.target.value }))}>
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.vendorName} ({v.vendorCode})</option>)}
                </Select>
              </Field>

              <Field label="PO order date">
                <Input
                  type="date"
                  value={poForm.orderDate}
                  onChange={e => setPoForm(p => ({ ...p, orderDate: e.target.value }))}
                />
              </Field>
              <Field label="Expected delivery date">
                <Input
                  type="date"
                  value={poForm.expectedDeliveryDate}
                  onChange={e => setPoForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                />
              </Field>
            </FormGrid>

            {/* PO Line Items */}
            <Section
              title="PO Line Items"
              actions={<Button size="xs" icon={<LuPlus />} onClick={handleAddPOItem}>Add item</Button>}
            >
              <Surface>
                <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 420 }}>
                {poForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 2fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(90px, 1fr) 26px',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Input
                      placeholder="Material Type"
                      value={item.materialType}
                      onChange={e => handlePOItemChange(idx, 'materialType', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handlePOItemChange(idx, 'quantity', Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Rate (₹)"
                      value={item.rate}
                      onChange={e => handlePOItemChange(idx, 'rate', Number(e.target.value))}
                    />
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--c-blue)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString()}
                    </div>
                    {poForm.items.length > 1 ? (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemovePOItem(idx)}
                        aria-label="Remove item"
                        style={{ color: 'var(--danger)' }}
                      >
                        <LuTrash2 />
                      </button>
                    ) : <span />}
                  </div>
                ))}
                </div>
                </div>
              </Surface>
            </Section>
          </form>
        </Dialog>

        {/* VIEW SCAN DRAWER */}
        <Drawer
          open={Boolean(selectedInvoiceForView)}
          onClose={() => setSelectedInvoiceForView(null)}
          title={selectedInvoiceForView ? `Invoice ${selectedInvoiceForView.invoiceNumber}` : 'Invoice details'}
          subtitle="Extracted by the AI Bill Scanner"
          footer={<Button onClick={() => setSelectedInvoiceForView(null)}>Close</Button>}
        >
          {selectedInvoiceForView && (
            <DescList
              items={[
                { label: 'Vendor', value: selectedInvoiceForView.vendorName },
                { label: 'Invoice #', value: selectedInvoiceForView.invoiceNumber },
                {
                  label: 'Total amount',
                  value: (
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{selectedInvoiceForView.totalAmount}
                    </span>
                  ),
                },
                { label: 'Tax amount', value: selectedInvoiceForView.taxAmount !== undefined ? `₹${selectedInvoiceForView.taxAmount}` : '' },
                { label: 'Status', value: selectedInvoiceForView.status ? <Badge tone="success">{selectedInvoiceForView.status}</Badge> : '' },
              ]}
            />
          )}
        </Drawer>

      </Page>
    </DashboardLayout>
  );
};

export default FinanceDashboard;
