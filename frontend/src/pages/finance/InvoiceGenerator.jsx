import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API, { financeAPI } from '../../services/api';
import {
  LuPlus, LuTrash2, LuRefreshCw, LuDownload, LuTruck, LuFileText,
  LuReceipt, LuPackage, LuWallet, LuFileCheck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { useOrg } from '../../context/OrgContext';

import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Dialog, Badge, Button, EmptyState,
  Field, Input, Textarea, Select,
} from '../../components/ui';

const validateGSTIN = (gstin) => {
  if (!gstin) return { isValid: false, message: '' };
  const trimmed = gstin.trim().toUpperCase();
  if (trimmed.length === 0) return { isValid: false, message: '' };

  const stateCodes = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
    '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
    '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
    '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu',
    '36': 'Telangana', '37': 'Andhra Pradesh'
  };

  if (trimmed.length < 15) {
    return { isValid: false, message: `Entering GSTIN (${trimmed.length}/15 chars)` };
  }

  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(trimmed)) {
    return { isValid: false, message: 'Invalid GSTIN structure (format: 07AAAAA1111A1Z1)' };
  }

  const stateCode = trimmed.substring(0, 2);
  const stateName = stateCodes[stateCode] ? ` (${stateCodes[stateCode]})` : '';

  // Official Govt MOD36 Checksum Validation Algorithm
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(trimmed[i]);
    if (codePoint === -1) return { isValid: false, message: 'Invalid GSTIN characters' };

    let addend = factor * codePoint;
    factor = factor === 1 ? 2 : 1;
    sum += Math.floor(addend / 36) + (addend % 36);
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  const expectedCheckChar = chars[checkCodePoint];

  if (trimmed[14] === expectedCheckChar) {
    return { isValid: true, message: `Verified authentic GSTIN${stateName}` };
  } else {
    return { isValid: false, message: `GSTIN checksum failed (expected ending digit '${expectedCheckChar}')` };
  }
};

const CHALLAN_PURPOSES = [
  'Supply of Goods',
  'Job Work / Processing',
  'Line Transfer / Inter-branch',
  'Exhibition / Demonstration',
  'Warranty Replacement',
  'Customer Approval / Trial',
  'Other Transportation'
];

/* Each document mode owns one accent token — nothing hard-coded. */
const DOC_MODES = [
  {
    key: 'non_gst_bill',
    token: 'var(--success)',
    icon: <LuFileText />,
    label: 'Standard bill (Non-GST)',
    shortLabel: 'Standard bill',
    hint: '0% GST · retail & non-GST',
  },
  {
    key: 'delivery_challan',
    token: 'var(--c-violet)',
    icon: <LuTruck />,
    label: 'Delivery challan (DC)',
    shortLabel: 'Delivery challan',
    hint: 'Goods movement · vehicle no',
  },
  {
    key: 'tax_invoice',
    token: 'var(--c-blue)',
    icon: <LuReceipt />,
    label: 'Tax invoice (GST)',
    shortLabel: 'Tax invoice',
    hint: 'GSTIN required · 18% / 28%',
  },
];

const MODE_BANNER = {
  delivery_challan: (
    <>
      <strong>Delivery challan mode:</strong> creates an official goods delivery note. GSTIN is optional. Vehicle number,
      transporter and purpose of transport will appear on the printed document.
    </>
  ),
  non_gst_bill: (
    <>
      <strong>Standard bill mode:</strong> 0% GST applied. Ideal for regular non-GST sales, retail clients, or billing
      without tax liability.
    </>
  ),
  tax_invoice: (
    <>
      <strong>Tax invoice mode:</strong> standard GST rates applied. Client GST number is <strong>required</strong> with
      official checksum validation.
    </>
  ),
};

const stack = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
const subLine = { fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' };

export default function InvoiceGenerator({ isEmbedded = false }) {
  const { currencySymbol, formatCurrency } = useOrg();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'non_gst', 'challan', 'tax_invoice'

  // Document Type Mode Switcher: 'non_gst_bill' | 'delivery_challan' | 'tax_invoice'
  const [documentType, setDocumentType] = useState('non_gst_bill');

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGST, setClientGST] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Delivery Challan Specific Fields
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [challanReason, setChallanReason] = useState('Supply of Goods');

  // Items
  const [items, setItems] = useState([
    { description: '', quantity: 1, rate: 0, taxRate: 18 }
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeAPI.getSalesInvoices();
      setInvoices(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load generated invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, taxRate: 18 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity') {
      newItems[index].quantity = Math.max(0, parseInt(value) || 0);
    } else if (field === 'rate') {
      newItems[index].rate = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'taxRate') {
      newItems[index].taxRate = parseInt(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  // Calculations
  const isTaxInvoice = documentType === 'tax_invoice';
  const isChallan = documentType === 'delivery_challan';
  const isNonGST = documentType === 'non_gst_bill' || isChallan;

  const calculateInvoice = () => {
    let subtotal = 0;
    let taxAmount = 0;
    const computedItems = items.map(item => {
      const lineSubtotal = item.quantity * item.rate;
      const lineTax = isTaxInvoice ? lineSubtotal * (item.taxRate / 100) : 0;
      const amount = lineSubtotal;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return { ...item, taxRate: isTaxInvoice ? item.taxRate : 0, amount };
    });
    const discountAmount = Number(discount) || 0;
    const finalTaxAmount = isTaxInvoice ? taxAmount : 0;
    const grandTotal = Math.max(0, subtotal - discountAmount + finalTaxAmount);
    return { items: computedItems, subtotal, discountAmount, taxAmount: finalTaxAmount, grandTotal };
  };

  const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoice();

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Please enter Client / Company Name');
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast.error('Please enter a description for all items');
      return;
    }

    // GST Validation logic
    if (isTaxInvoice) {
      if (!clientGST.trim()) {
        toast.error('Client GSTIN is REQUIRED for Tax Invoices!');
        return;
      }
      const gstStatus = validateGSTIN(clientGST);
      if (!gstStatus.isValid) {
        toast.error(`Invoice Blocked! ${gstStatus.message}. Please enter a valid GSTIN.`);
        return;
      }
    } else if (clientGST.trim()) {
      const gstStatus = validateGSTIN(clientGST);
      if (!gstStatus.isValid) {
        toast.error(`Invalid GSTIN format: ${gstStatus.message}. Please correct or clear the field.`);
        return;
      }
    }

    const { items: computedItems, subtotal: finalSubtotal, discountAmount: finalDiscount, taxAmount: finalTax, grandTotal: finalTotal } = calculateInvoice();

    try {
      await financeAPI.createSalesInvoice({
        documentType,
        invoiceNumber,
        challanNumber: isChallan ? invoiceNumber : undefined,
        vehicleNumber: isChallan ? vehicleNumber : undefined,
        transporter: isChallan ? transporter : undefined,
        dispatchDate: isChallan ? (dispatchDate || new Date()) : undefined,
        challanReason: isChallan ? challanReason : undefined,
        clientName,
        clientAddress,
        clientGST,
        dueDate,
        notes,
        items: computedItems,
        subtotal: finalSubtotal,
        discountAmount: finalDiscount,
        taxAmount: finalTax,
        grandTotal: finalTotal,
        isNonGST
      });

      toast.success(
        isChallan
          ? '📦 Delivery Challan generated successfully!'
          : isTaxInvoice
          ? '🧾 Sales Tax Invoice generated successfully!'
          : '📄 Standard Bill (Non-GST) generated successfully!'
      );
      setShowCreateModal(false);

      // Reset form
      setClientName('');
      setClientAddress('');
      setClientGST('');
      setInvoiceNumber('');
      setDueDate('');
      setDiscount(0);
      setNotes('');
      setVehicleNumber('');
      setTransporter('');
      setDispatchDate('');
      setChallanReason('Supply of Goods');
      setItems([{ description: '', quantity: 1, rate: 0, taxRate: 18 }]);

      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate document');
    }
  };

  const handleDownloadPDF = async (id, invNum) => {
    const toastId = toast.loading('Generating PDF document...');
    try {
      const response = await API.get(`/finance/sales-invoices/${id}/pdf?t=${Date.now()}`, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invNum || 'Document'}.pdf`);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('✅ PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF', { id: toastId });
    }
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete ${invNum}?`)) return;
    try {
      toast.loading('Deleting document...', { id: 'delete-toast' });
      await financeAPI.deleteSalesInvoice(id);
      toast.success('Document deleted successfully', { id: 'delete-toast' });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete document', { id: 'delete-toast' });
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Filter tab check
      if (activeFilterTab === 'challan') {
        if (inv.documentType !== 'delivery_challan' && !inv.challanNumber) return false;
      } else if (activeFilterTab === 'non_gst') {
        if (inv.documentType !== 'non_gst_bill' && !inv.isNonGST) return false;
        if (inv.documentType === 'delivery_challan' || inv.challanNumber) return false;
      } else if (activeFilterTab === 'tax_invoice') {
        if (inv.documentType === 'delivery_challan' || inv.isNonGST || inv.documentType === 'non_gst_bill') return false;
      }

      // Search query
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const invoiceNo = (inv.invoiceNumber || inv.challanNumber || '').toLowerCase();
      const clientName = (inv.clientName || '').toLowerCase();
      const vehicle = (inv.vehicleNumber || '').toLowerCase();
      const transporterName = (inv.transporter || '').toLowerCase();

      return invoiceNo.includes(query) ||
        clientName.includes(query) ||
        vehicle.includes(query) ||
        transporterName.includes(query) ||
        String(inv.grandTotal || '').includes(query);
    });
  }, [invoices, activeFilterTab, searchQuery]);

  /* --------------------------------------------------------- derived summary */
  const challanCount = invoices.filter(i => i.documentType === 'delivery_challan' || i.challanNumber).length;
  const nonGstCount = invoices.filter(
    i => (i.documentType === 'non_gst_bill' || i.isNonGST) && i.documentType !== 'delivery_challan' && !i.challanNumber
  ).length;
  const taxInvoiceCount = invoices.length - challanCount - nonGstCount;
  const totalBilled = invoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);

  const openCreate = (mode) => {
    setDocumentType(mode);
    setShowCreateModal(true);
  };

  /* ------------------------------------------------------------------ columns */
  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Doc # & type',
      primary: true,
      sortValue: (inv) => inv.challanNumber || inv.invoiceNumber || '',
      render: (inv) => {
        const isChallanDoc = inv.documentType === 'delivery_challan' || Boolean(inv.challanNumber);
        const isNonGSTDoc = (inv.documentType === 'non_gst_bill' || inv.isNonGST) && !isChallanDoc;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--primary)' }}>{inv.challanNumber || inv.invoiceNumber}</span>
            {isChallanDoc ? (
              <Badge tone="purple" icon={<LuTruck />}>Delivery challan</Badge>
            ) : isNonGSTDoc ? (
              <Badge tone="success" icon={<LuFileText />}>Non-GST bill</Badge>
            ) : (
              <Badge tone="blue" icon={<LuReceipt />}>Tax invoice</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'clientName',
      header: 'Client / consignee',
      render: (inv) => (
        <div style={stack}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{inv.clientName}</span>
          {inv.clientGST && <span style={subLine}>GST: {inv.clientGST}</span>}
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      hideBelow: 900,
      sortValue: (inv) => new Date(inv.invoiceDate || inv.createdAt).getTime(),
      render: (inv) =>
        new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'transport',
      header: 'Transport / vehicle',
      hideBelow: 1100,
      sortValue: (inv) => inv.vehicleNumber || '',
      render: (inv) => {
        const isChallanDoc = inv.documentType === 'delivery_challan' || Boolean(inv.challanNumber);
        return isChallanDoc ? (
          <div style={stack}>
            <span style={{ color: 'var(--text-primary)' }}>{inv.vehicleNumber || 'Vehicle Assigned'}</span>
            <span style={subLine}>{inv.transporter || inv.challanReason || 'Goods Transfer'}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-ghost)' }}>—</span>
        );
      },
    },
    {
      key: 'taxAmount',
      header: 'Tax amount',
      align: 'right',
      hideBelow: 900,
      sortValue: (inv) => inv.taxAmount || 0,
      render: (inv) => {
        const isChallanDoc = inv.documentType === 'delivery_challan' || Boolean(inv.challanNumber);
        const isNonGSTDoc = (inv.documentType === 'non_gst_bill' || inv.isNonGST) && !isChallanDoc;
        return isChallanDoc || isNonGSTDoc ? (
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹0.00 (Exempt)</span>
        ) : (
          `₹${(inv.taxAmount || 0).toFixed(2)}`
        );
      },
    },
    {
      key: 'grandTotal',
      header: 'Grand total',
      align: 'right',
      sortValue: (inv) => inv.grandTotal || 0,
      render: (inv) => (
        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
          ₹{(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (inv) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button
            size="xs"
            icon={<LuDownload />}
            onClick={() => handleDownloadPDF(inv._id, inv.challanNumber || inv.invoiceNumber)}
            title="Download Official PDF"
          >
            PDF
          </Button>
          <Button
            size="xs"
            variant="danger"
            icon={<LuTrash2 />}
            onClick={() => handleDeleteInvoice(inv._id, inv.challanNumber || inv.invoiceNumber)}
            title="Delete Document"
            aria-label="Delete document"
          />
        </div>
      ),
    },
  ];

  const gstStatus = validateGSTIN(clientGST);
  const activeMode = DOC_MODES.find(m => m.key === documentType) || DOC_MODES[0];

  /* ---------------------------------------------------------------- line items */
  const itemGrid = {
    display: 'grid',
    gridTemplateColumns: isTaxInvoice
      ? 'minmax(150px, 2.4fr) minmax(64px, 0.7fr) minmax(80px, 0.9fr) minmax(76px, 0.8fr) minmax(90px, 1fr) 30px'
      : 'minmax(150px, 2.4fr) minmax(64px, 0.7fr) minmax(80px, 0.9fr) minmax(90px, 1fr) 30px',
    gap: 8,
    alignItems: 'center',
  };

  const itemHeadCell = {
    fontSize: 'var(--fs-2xs)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  const mainContent = (
    <>
      <PageHeader
        title="Bill, Challan & Invoice Generator"
        subtitle="Create standard non-GST bills, official delivery challans (DC) or full tax invoices in one unified workspace."
        actions={
          <>
            <Button icon={<LuRefreshCw />} onClick={fetchData}>Reload</Button>
            {DOC_MODES.map((mode) => (
              <Button
                key={mode.key}
                variant="primary"
                icon={<LuPlus />}
                onClick={() => openCreate(mode.key)}
                style={{ background: mode.token, borderColor: mode.token, color: 'var(--on-primary)' }}
              >
                {mode.shortLabel}
              </Button>
            ))}
          </>
        }
      />

      <StatRow>
        <StatTile label="All documents" value={invoices.length} icon={<LuFileCheck />} tone="primary" hint="Bills, challans & invoices" />
        <StatTile label="Standard bills" value={nonGstCount} icon={<LuFileText />} tone="green" hint="Non-GST / exempt" />
        <StatTile label="Delivery challans" value={challanCount} icon={<LuTruck />} tone="violet" hint="Goods movement notes" />
        <StatTile label="Tax invoices" value={taxInvoiceCount} icon={<LuReceipt />} tone="blue" hint="GST charged" />
        <StatTile
          label="Total billed"
          value={`₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<LuWallet />}
          tone="teal"
          hint="Across all documents"
        />
      </StatRow>

      <Section title="Document Directory">
        <Toolbar>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by client, invoice/DC#, vehicle…"
          />
          <ChipGroup
            value={activeFilterTab}
            onChange={setActiveFilterTab}
            items={[
              { key: 'all', label: 'All documents', count: invoices.length },
              { key: 'non_gst', label: 'Standard bills', count: nonGstCount },
              { key: 'challan', label: 'Delivery challans', count: challanCount },
              { key: 'tax_invoice', label: 'Tax invoices', count: taxInvoiceCount },
            ]}
          />
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filteredInvoices}
          loading={loading}
          pageSize={20}
          empty={
            <EmptyState
              icon={<LuPackage />}
              title={searchQuery ? 'No documents match your search' : 'No documents created yet'}
              text={
                searchQuery
                  ? 'Try a different client, document number or vehicle number.'
                  : 'Generate a standard bill, delivery challan or tax invoice to get started.'
              }
              action={
                searchQuery ? null : (
                  <Button variant="primary" icon={<LuPlus />} onClick={() => openCreate('non_gst_bill')}>
                    Create document
                  </Button>
                )
              }
            />
          }
        />
      </Section>

      {/* ========================================================================= */}
      {/* UNIFIED CREATION DIALOG WITH MODE SWITCHER                                */}
      {/* ========================================================================= */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="xl"
        title={
          documentType === 'delivery_challan'
            ? 'Generate official delivery challan (DC)'
            : documentType === 'non_gst_bill'
            ? 'Generate standard bill (Non-GST)'
            : 'Generate professional tax invoice (GST)'
        }
        subtitle="Select the document format below and fill in the details."
        footer={
          <>
            <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              type="submit"
              form="document-form"
              variant="primary"
              style={{ background: activeMode.token, borderColor: activeMode.token, color: 'var(--on-primary)' }}
            >
              {documentType === 'delivery_challan'
                ? 'Generate delivery challan (DC)'
                : documentType === 'non_gst_bill'
                ? 'Generate standard bill'
                : 'Generate tax invoice'}
            </Button>
          </>
        }
      >
        {/* UNIFIED 3-WAY DOCUMENT TYPE SWITCHER */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 8,
            background: 'var(--bg-subtle)',
            padding: 6,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: 14,
          }}
        >
          {DOC_MODES.map((mode) => {
            const active = documentType === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setDocumentType(mode.key)}
                aria-pressed={active}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: active ? `1px solid ${mode.token}` : '1px solid transparent',
                  background: active ? `color-mix(in srgb, ${mode.token} 12%, transparent)` : 'transparent',
                  color: active ? mode.token : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 'var(--fs-sm)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textAlign: 'center',
                  transition: 'var(--transition-fast)',
                }}
              >
                <span style={{ fontSize: '1.05rem', display: 'inline-flex' }}>{mode.icon}</span>
                <span>{mode.label}</span>
                <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 400, color: 'var(--text-ghost)' }}>{mode.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Banner Description */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: `color-mix(in srgb, ${activeMode.token} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${activeMode.token} 25%, transparent)`,
            fontSize: 'var(--fs-sm)',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            marginBottom: 16,
          }}
        >
          {MODE_BANNER[documentType]}
        </div>

        <form id="document-form" onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1 - Client Info */}
          <FormGrid>
            <Field
              label={documentType === 'delivery_challan' ? 'Consignee / client name' : 'Client / company name'}
              required
            >
              <Input
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. Acme Industries Ltd"
              />
            </Field>

            <Field
              label="Client GSTIN"
              required={isTaxInvoice}
              hint={
                clientGST ? (
                  <span
                    style={{
                      color: gstStatus.isValid
                        ? 'var(--success)'
                        : clientGST.length === 15
                        ? 'var(--danger)'
                        : 'var(--warning)',
                      fontWeight: 600,
                    }}
                  >
                    {gstStatus.message}
                  </span>
                ) : isTaxInvoice ? (
                  'Required for tax invoices'
                ) : (
                  'Optional'
                )
              }
            >
              <Input
                required={isTaxInvoice}
                invalid={Boolean(clientGST.trim()) && !gstStatus.isValid}
                value={clientGST}
                onChange={e => setClientGST(e.target.value.toUpperCase())}
                placeholder={isTaxInvoice ? 'e.g. 09AAACH7409R1ZZ (Required)' : 'e.g. 09AAACH7409R1ZZ (Optional)'}
                maxLength={15}
                style={clientGST.trim() && gstStatus.isValid ? { borderColor: 'var(--success)' } : undefined}
              />
            </Field>
          </FormGrid>

          {/* Delivery Challan Specific Fields (Vehicle, Transporter, Purpose) */}
          {isChallan && (
            <div
              style={{
                padding: 14,
                borderRadius: 'var(--radius-lg)',
                background: 'color-mix(in srgb, var(--c-violet) 7%, transparent)',
                border: '1px dashed color-mix(in srgb, var(--c-violet) 30%, transparent)',
              }}
            >
              <FormGrid>
                <Field label="Vehicle number">
                  <Input
                    placeholder="e.g. MH-12-AB-1234"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Transporter name">
                  <Input
                    placeholder="e.g. VRL Logistics / Own Tempo"
                    value={transporter}
                    onChange={e => setTransporter(e.target.value)}
                  />
                </Field>
                <Field label="Purpose of transport">
                  <Select value={challanReason} onChange={e => setChallanReason(e.target.value)}>
                    {CHALLAN_PURPOSES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </Field>
              </FormGrid>
            </div>
          )}

          {/* Row 2 - Address & Dates */}
          <FormGrid>
            <Field label={isChallan ? 'Delivery / dispatch address' : 'Client billing address'} span={2}>
              <Textarea
                style={{ minHeight: 64, height: 'auto', padding: '8px 11px', resize: 'vertical' }}
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Full Destination Address"
              />
            </Field>

            <Field label={isChallan ? 'Challan number' : 'Invoice number'} hint="Leave blank to auto-generate">
              <Input
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder={isChallan ? 'e.g. DC-2026-0001' : 'e.g. INV-2026-0001'}
              />
            </Field>

            <Field label={isChallan ? 'Dispatch date' : 'Due date'}>
              <Input
                type="date"
                value={isChallan ? dispatchDate : dueDate}
                onChange={e => isChallan ? setDispatchDate(e.target.value) : setDueDate(e.target.value)}
              />
            </Field>
          </FormGrid>

          {/* Line Items */}
          <Section
            title="Ordered Items & Quantities"
            actions={<Button size="xs" icon={<LuPlus />} onClick={handleAddItem}>Add item</Button>}
          >
            <Surface>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: isTaxInvoice ? 620 : 540 }}>
                  <div style={{ ...itemGrid, paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                    <span style={itemHeadCell}>Description *</span>
                    <span style={{ ...itemHeadCell, textAlign: 'right' }}>Qty</span>
                    <span style={{ ...itemHeadCell, textAlign: 'right' }}>Rate (₹)</span>
                    {isTaxInvoice && <span style={{ ...itemHeadCell, textAlign: 'right' }}>GST %</span>}
                    <span style={{ ...itemHeadCell, textAlign: 'right' }}>Total (₹)</span>
                    <span />
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} style={{ ...itemGrid, marginBottom: 8 }}>
                      <Input
                        required
                        value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. C.36 Nylon Drag Chain with End Brackets"
                      />
                      <Input
                        type="number"
                        min="1"
                        style={{ textAlign: 'right' }}
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        style={{ textAlign: 'right' }}
                        value={item.rate}
                        onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                      />
                      {isTaxInvoice && (
                        <Select
                          value={item.taxRate}
                          onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                        >
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                          <option value="12">12%</option>
                          <option value="5">5%</option>
                          <option value="0">0%</option>
                        </Select>
                      )}
                      <div
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 'var(--fs-sm)',
                        }}
                      >
                        ₹{(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveItem(idx)}
                        aria-label="Remove item"
                        style={{ color: 'var(--danger)' }}
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          </Section>

          {/* Summary & Totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <Field label="Notes & instructions">
              <Textarea
                style={{ minHeight: 88, height: 'auto', padding: '8px 11px', resize: 'vertical' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isChallan ? 'e.g. Please verify carton seal on delivery. Handover POD upon receipt.' : 'e.g. Payment due within 30 days. Thank you for your business!'}
              />
            </Field>

            <Surface>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--fs-base)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{subtotal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 'var(--fs-base)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Discount (₹)</span>
                  <Input
                    type="number"
                    min="0"
                    style={{ width: 104, height: 30, textAlign: 'right' }}
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--fs-base)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GST tax</span>
                  <span style={{ fontWeight: 600, color: isTaxInvoice ? 'var(--c-blue)' : 'var(--success)' }}>
                    {isTaxInvoice ? `₹${taxAmount.toFixed(2)}` : '₹0.00 (Exempt)'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 10,
                    marginTop: 2,
                    fontWeight: 700,
                    fontSize: 'var(--fs-lg)',
                    color: 'var(--primary)',
                  }}
                >
                  <span>Total amount</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </Surface>
          </div>
        </form>
      </Dialog>
    </>
  );

  if (isEmbedded) {
    return mainContent;
  }

  return (
    <DashboardLayout pageTitle="Bill & Challan Generator">
      <Page>{mainContent}</Page>
    </DashboardLayout>
  );
}
