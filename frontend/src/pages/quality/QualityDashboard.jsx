import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import {
  LuClipboardCheck, LuFileText, LuTriangleAlert,
  LuPlus, LuUpload, LuSave, LuTrash2, LuSearch,
  LuCircleCheck, LuCircleX, LuPause, LuRotateCcw, LuSettings2, LuExternalLink,
  LuEye,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { formatMountingBracketCode } from '../../utils/productNameHelper';
import { useAuth } from '../../context/AuthContext';
import {
  Page, PageHeader, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, Drawer, ConfirmDialog, Tabs,
  Field, Input, Select, Textarea,
  Button, Badge, EmptyState,
} from '../../components/ui';

/* ------------------------------------------------- small cell presenters */

/** `pending_verification` reads badly in a detail pane — show "Pending verification". */
const humanStatus = (v) => {
  if (!v || v === 'none') return '';
  const s = String(v).replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * A free-text note, rendered as readable prose. Renders nothing when empty, so
 * the detail view never shows a row of blank labels.
 */
const NoteBlock = ({ label, text }) => {
  if (!text || !String(text).trim()) return null;
  return (
    <div style={{ marginTop: 'var(--sp-5)' }}>
      <div
        style={{
          fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-ghost)', marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontSize: 'var(--fs-base)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Clean incremental radii list in steps of 5: 5, 10, 15, 20 ... up to 700
const BENDING_RADII_OPTIONS = Array.from({ length: 140 }, (_, i) => String((i + 1) * 5));

/** Inspection outcome → badge tone + label. Presentation only. */
const OUTCOME_META = {
  pass: { tone: 'success', label: 'PASS', color: 'var(--success)', icon: <LuCircleCheck /> },
  hold: { tone: 'warning', label: 'HOLD', color: 'var(--warning)', icon: <LuPause /> },
  reject: { tone: 'danger', label: 'REJECT', color: 'var(--danger)', icon: <LuCircleX /> },
  rework: { tone: 'purple', label: 'REWORK', color: 'var(--c-violet)', icon: <LuRotateCcw /> },
};

const SECTION_TABS = [
  { key: 'qc_inspections', label: 'Goods QC Inspections', icon: <LuClipboardCheck /> },
  { key: 'damaged_log', label: 'Damaged Materials', icon: <LuTriangleAlert /> },
  { key: 'missed_log', label: 'Missed / Short Items', icon: <LuTriangleAlert /> },
  { key: 'invoice_portal', label: 'OCR Invoice Upload', icon: <LuFileText /> },
];

const QualityDashboard = () => {
  const { user } = useAuth();
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const isDragChain = subIndustryId === 'drag_chain';

  const [activeTab, setActiveTab] = useState('qc_inspections'); // 'qc_inspections', 'damaged_log', 'missed_log', 'invoice_portal'

  const [qualityLogs, setQualityLogs] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Form States
  const [qcForm, setQcForm] = useState({
    materialName: '',
    quantity: 1,
    unit: 'pcs',
    remarks: '',
    qcType: 'inspected',
    modelNumber: '',
    width: '',
    size: '',
    description: '',
    radius: '',
    chainType: 'OP',
    numberOfLinks: '',
    length: '',
    mountingBracketType: '',
    accessories: '',
    inspectionType: 'first_inspection',
    outcome: 'pass',
    dimensions: '',
    conduitClamp: '',
    reworkReason: ''
  });
  const [invoiceForm, setInvoiceForm] = useState({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
  const [showQcModal, setShowQcModal] = useState(false);

  // Delete confirmation target
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Presentation-only: record detail overlay (prose lives here, not in a column)
  const [detailLog, setDetailLog] = useState(null);

  const catalogModelNumbers = useMemo(() => {
    return Array.from(new Set(productTemplates.map(t => t.modelNumber).filter(Boolean)));
  }, [productTemplates]);

  // Widths & Links derived from catalog
  const availableWidths = useMemo(() => {
    if (!qcForm.modelNumber) {
      return Array.from(new Set(productTemplates.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
    }
    const matches = productTemplates.filter(t => t.modelNumber === qcForm.modelNumber);
    const widths = Array.from(new Set(matches.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
    return widths.length > 0 ? widths : Array.from(new Set(productTemplates.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
  }, [productTemplates, qcForm.modelNumber]);

  const availableLinks = useMemo(() => {
    if (!qcForm.modelNumber) {
      return Array.from(new Set(productTemplates.map(t => t.numberOfLinks).filter(Boolean)));
    }
    const matches = productTemplates.filter(t => t.modelNumber === qcForm.modelNumber);
    const links = Array.from(new Set(matches.map(t => t.numberOfLinks).filter(Boolean)));
    return links.length > 0 ? links : Array.from(new Set(productTemplates.map(t => t.numberOfLinks).filter(Boolean)));
  }, [productTemplates, qcForm.modelNumber]);

  // Auto-compose spec string
  useEffect(() => {
    if (qcForm.modelNumber) {
      const parts = [
        qcForm.modelNumber,
        qcForm.width,
        qcForm.radius ? `R${qcForm.radius}` : '',
        qcForm.chainType,
        qcForm.numberOfLinks ? `${qcForm.numberOfLinks} Links` : '',
        qcForm.length,
        qcForm.mountingBracketType,
        qcForm.accessories
      ].filter(Boolean);
      const generatedName = `Drag Chain ${parts.join(' · ')}`;
      setQcForm(prev => ({
        ...prev,
        materialName: generatedName,
        size: prev.width || prev.size
      }));
    }
  }, [
    qcForm.modelNumber, qcForm.width, qcForm.radius,
    qcForm.chainType, qcForm.numberOfLinks, qcForm.length,
    qcForm.mountingBracketType, qcForm.accessories
  ]);

  const handleModelChange = (modelNum) => {
    if (!modelNum) {
      setQcForm(prev => ({
        ...prev,
        modelNumber: '',
        width: '',
        size: '',
        radius: '',
        chainType: 'OP',
        numberOfLinks: '',
        length: '',
        mountingBracketType: '',
        accessories: ''
      }));
      return;
    }
    const match = productTemplates.find(t => t.modelNumber === modelNum);
    const rawR = match?.radius ? String(match.radius).replace(/^R/i, '') : '';
    setQcForm(prev => ({
      ...prev,
      modelNumber: modelNum,
      width: match?.width || match?.innerSize || prev.width || '',
      size: match?.width || match?.innerSize || prev.size || '',
      radius: rawR || prev.radius || '',
      chainType: match?.chainType || prev.chainType || 'OP',
      numberOfLinks: match?.numberOfLinks || prev.numberOfLinks || '',
      length: match?.length || prev.length || '',
      mountingBracketType: match?.mountingBracketType || prev.mountingBracketType || '',
      accessories: match?.accessories || prev.accessories || ''
    }));
  };

  const fetchQualityLogs = async () => {
    setLoading(true);
    try {
      const [qcRes, tempRes] = await Promise.all([
        operationsAPI.getQualityLogs(),
        operationsAPI.getProductTemplates()
      ]);
      setQualityLogs(qcRes.data.data);
      setProductTemplates(tempRes.data.data);
    } catch (err) {
      toast.error('Failed to load quality reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityLogs();
  }, []);

  const handleSaveQC = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = activeTab === 'invoice_portal' ? invoiceForm : qcForm;
      // Force qcType based on tab
      if (activeTab === 'damaged_log') payload.qcType = 'damaged';
      if (activeTab === 'missed_log') payload.qcType = 'missed';
      if (activeTab === 'qc_inspections') payload.qcType = 'inspected';

      await operationsAPI.createQualityLog(payload);
      toast.success('Quality check report uploaded and synced to Store Manager & Sales in real-time!');

      // If custom model logged, auto-save to product templates
      if (payload.modelNumber && activeTab !== 'invoice_portal') {
        const exists = productTemplates.some(t => t.modelNumber.toLowerCase() === payload.modelNumber.toLowerCase());
        if (!exists) {
          try {
            await operationsAPI.createProductTemplate({
              modelNumber: payload.modelNumber,
              name: payload.materialName,
              rack: 'Unassigned',
              unit: payload.unit || 'pcs',
              innerSize: 'N/A',
              radius: payload.radius || 'N/A',
              designType: payload.designType || 'N/A',
              vs: payload.vs || 'N/A',
              hs: payload.hs || 'N/A',
              sr: payload.sr || 'N/A',
              series: payload.series || 'QC Custom Additions'
            });
          } catch (tempErr) {
            console.error('Failed to auto-save product template:', tempErr);
          }
        }
      }

      setShowQcModal(false);

      // Reset Forms
      setQcForm({
        materialName: '',
        quantity: 1,
        unit: 'pcs',
        remarks: '',
        qcType: 'inspected',
        modelNumber: '',
        width: '',
        size: '',
        radius: '',
        chainType: 'OP',
        numberOfLinks: '',
        length: '',
        mountingBracketType: '',
        accessories: '',
        inspectionType: 'first_inspection',
        outcome: 'pass',
        dimensions: '',
        conduitClamp: '',
        reworkReason: ''
      });

      setInvoiceForm({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
      fetchQualityLogs();
    } catch (err) {
      toast.error('Failed to submit QC report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Log deleted successfully');
      fetchQualityLogs();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const triggerMockUpload = () => {
    // Generate a mock URL for invoice upload simulation
    const mockUrls = [
      'https://microsoft.com/en-us/mock-invoice-10023.pdf',
      'https://gcp.google.com/billing/invoice-992381.pdf',
      'https://azure.microsoft.com/billing/inv-448821.pdf'
    ];
    const randUrl = mockUrls[Math.floor(Math.random() * mockUrls.length)];
    setInvoiceForm({ ...invoiceForm, invoiceUrl: randUrl });
    toast.success('Document uploaded successfully (Simulated)');
  };

  // Filter logs based on active tab and search query
  const getFilteredLogs = () => {
    const typeMap = {
      qc_inspections: 'inspected',
      damaged_log: 'damaged',
      missed_log: 'missed',
      invoice_portal: 'inspected' // Show raw invoice inspections
    };
    const targetType = typeMap[activeTab];
    return qualityLogs.filter(log => {
      const matchType = log.qcType === targetType;
      const matchSearch = log.materialName.toLowerCase().includes(search.toLowerCase()) ||
                          (log.invoiceNumber && log.invoiceNumber.toLowerCase().includes(search.toLowerCase()));
      // If invoice portal, only show logs that actually contain an invoice number
      if (activeTab === 'invoice_portal') {
        return matchType && matchSearch && log.invoiceNumber;
      }
      return matchType && matchSearch;
    });
  };

  const filteredLogs = getFilteredLogs();

  const uniqueRadii = Array.from(new Set(productTemplates.map(t => t.radius).filter(Boolean))).filter(x => x !== 'N/A').sort();
  const uniqueVs = Array.from(new Set(productTemplates.map(t => t.vs).filter(Boolean))).filter(x => x !== 'N/A').sort();
  const uniqueHs = Array.from(new Set(productTemplates.map(t => t.hs).filter(Boolean))).filter(x => x !== 'N/A').sort();
  const uniqueSr = Array.from(new Set(productTemplates.map(t => t.sr).filter(Boolean))).filter(x => x !== 'N/A').sort();
  const uniqueSeriesList = Array.from(new Set(productTemplates.map(t => t.series).filter(Boolean))).filter(x => x !== 'N/A').sort();

  /* ------------------------------------------------------- derived counters */
  const outcomeCount = (key) => filteredLogs.filter(l => (l.outcome || 'pass') === key).length;
  const tabCount = (key) => {
    const typeMap = {
      qc_inspections: 'inspected',
      damaged_log: 'damaged',
      missed_log: 'missed',
      invoice_portal: 'inspected',
    };
    return qualityLogs.filter(l => {
      if (l.qcType !== typeMap[key]) return false;
      if (key === 'invoice_portal') return !!l.invoiceNumber;
      return true;
    }).length;
  };

  const resetFormsAndOpen = () => {
    setQcForm({
      materialName: '',
      quantity: 1,
      unit: 'pcs',
      remarks: '',
      qcType: 'inspected',
      modelNumber: '',
      width: '',
      size: '',
      radius: '',
      chainType: 'OP',
      numberOfLinks: '',
      length: '',
      mountingBracketType: '',
      accessories: '',
      inspectionType: 'first_inspection',
      outcome: 'pass',
      dimensions: '',
      conduitClamp: '',
      reworkReason: ''
    });

    setInvoiceForm({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
    setShowQcModal(true);
  };

  /* --------------------------------------------------------------- columns */
  const columns = [
    {
      key: 'materialName',
      header: 'Material / Item',
      primary: true,
      render: (log) => log.materialName,
    },
    {
      key: 'inspectionType',
      header: 'Stage',
      hideBelow: 900,
      render: (log) => (
        <Badge>{log.inspectionType === 'final_inspection' ? 'Final' : 'First'}</Badge>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (log) => {
        const meta = OUTCOME_META[log.outcome] || OUTCOME_META.pass;
        return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
      },
    },
    {
      key: 'quantity',
      header: 'Qty Checked',
      align: 'right',
      sortValue: (log) => Number(log.quantity) || 0,
      render: (log) => (
        <span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.quantity}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{log.unit}</span>
        </span>
      ),
    },
    ...(activeTab === 'invoice_portal'
      ? [
        {
          key: 'invoiceNumber',
          header: 'Invoice Number',
          render: (log) => (
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.invoiceNumber}</span>
          ),
        },
        {
          key: 'invoiceUrl',
          header: 'Document',
          sortable: false,
          render: (log) => (
            <a
              href={log.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              View Scan <LuExternalLink />
            </a>
          ),
        },
      ]
      : []),
    {
      key: 'status',
      header: 'Inspection Status',
      hideBelow: 900,
      render: (log) => (
        <Badge
          tone={log.status === 'pending_verification' ? 'warning' : log.status === 'verified' ? 'success' : 'danger'}
        >
          {(log.status || '').replace('_', ' ')}
        </Badge>
      ),
    },
    /* Notes are free prose of any length, so they are not a grid column — they
       live in the record's detail view, behind the row's View action. */
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (log) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {/* Clamped cells hide their tail — this opens the full record. */}
          <Button
            size="xs"
            variant="ghost"
            icon={<LuEye />}
            title="View full details"
            onClick={() => setDetailLog(log)}
          >
            View
          </Button>
          <button
            className="icon-btn"
            style={{ width: 36, height: 36, color: 'var(--danger)' }}
            title="Delete log"
            aria-label="Delete log"
            onClick={() => setDeleteTarget(log)}
          >
            <LuTrash2 />
          </button>
        </div>
      ),
    },
  ];

  const isInvoicePortal = activeTab === 'invoice_portal';
  const outcomeMeta = OUTCOME_META[qcForm.outcome] || OUTCOME_META.pass;

  return (
    <DashboardLayout pageTitle="Quality Control Workspace">
      <Page>
        <PageHeader
          title="Quality Control Workspace"
          subtitle="Log inspections across both stages, flag damaged or short material and file scanned invoices."
          actions={
            <Button variant="primary" icon={<LuPlus />} onClick={resetFormsAndOpen}>
              {isInvoicePortal ? 'Upload Invoice Bill' : 'Add Inspection Record'}
            </Button>
          }
        />

        <StatRow>
          <StatTile label="Records in view" value={filteredLogs.length} icon={<LuClipboardCheck />} tone="primary" />
          <StatTile label="Passed" value={outcomeCount('pass')} icon={<LuCircleCheck />} tone="green" />
          <StatTile label="On Hold" value={outcomeCount('hold')} icon={<LuPause />} tone="amber" />
          <StatTile label="Rework" value={outcomeCount('rework')} icon={<LuRotateCcw />} tone="violet" />
          <StatTile label="Rejected" value={outcomeCount('reject')} icon={<LuCircleX />} tone="red" />
        </StatRow>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={SECTION_TABS.map(t => ({ ...t, count: tabCount(t.key) }))}
        />

        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search items or invoices…"
            onChange={setSearch}
          />
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filteredLogs}
          loading={loading}
          pageSize={10}
          empty={
            <EmptyState
              icon={<LuSearch />}
              title="No quality logs in this section"
              text="Nothing matches the current search, or no record has been filed here yet."
              action={
                <Button variant="primary" icon={<LuPlus />} onClick={resetFormsAndOpen}>
                  {isInvoicePortal ? 'Upload Invoice Bill' : 'Add Inspection Record'}
                </Button>
              }
            />
          }
        />

        {/* QC & INVOICE ENTRY DIALOG */}
        <Dialog
          open={showQcModal}
          onClose={() => setShowQcModal(false)}
          title={isInvoicePortal ? 'OCR Bill / Invoice Upload Portal' : 'New Quality Inspection Log'}
          subtitle={isInvoicePortal
            ? 'File a scanned supplier invoice against the inward material.'
            : 'Record the inspection stage, outcome and the exact specification checked.'}
          size={isInvoicePortal ? 'md' : 'lg'}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowQcModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                form="qc-form"
                icon={<LuSave />}
                loading={submitting}
                disabled={submitting || (isInvoicePortal && !invoiceForm.invoiceUrl)}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </>
          }
        >
          <form id="qc-form" onSubmit={handleSaveQC}>
            {isInvoicePortal ? (

              /* INVOICE PORTAL FORM */
              <FormGrid>
                <Field label="Invoice / Bill Number" required span="all">
                  <Input type="text" required value={invoiceForm.invoiceNumber}
                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-001" />
                </Field>
                <Field label="Material Inward Name" required span="all">
                  <Input type="text" required value={invoiceForm.materialName}
                    onChange={e => setInvoiceForm({ ...invoiceForm, materialName: e.target.value })}
                    placeholder="e.g. Nylon Drag Chains STR-35" />
                </Field>
                <Field label="Billed Qty" required>
                  <Input type="number" step="0.01" required value={invoiceForm.quantity}
                    onChange={e => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} />
                </Field>
                <Field label="Unit" required>
                  <Select value={invoiceForm.unit}
                    onChange={e => setInvoiceForm({ ...invoiceForm, unit: e.target.value })}>
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="meters">meters</option>
                    <option value="boxes">boxes</option>
                  </Select>
                </Field>
                <Field label="Upload Scan Invoice (PDF/Image)" required span="all">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button icon={<LuUpload />} onClick={triggerMockUpload} style={{ flex: 1, minHeight: 36 }}>
                      Simulate Scan Document
                    </Button>
                    {invoiceForm.invoiceUrl && (
                      <Badge tone="success" icon={<LuCircleCheck />}>Uploaded</Badge>
                    )}
                  </div>
                </Field>
                <Field label="Invoice Remarks" span="all">
                  <Textarea rows="2" value={invoiceForm.remarks}
                    onChange={e => setInvoiceForm({ ...invoiceForm, remarks: e.target.value })}
                    placeholder="Verify details..." />
                </Field>
              </FormGrid>

            ) : (

              /* INSPECTION LOG FORM */
              <>
                {/* 1b. Inspection Stage — the two QC stages as a segmented control */}
                <div>
                  <span className="field-label">Inspection Stage</span>
                  <Tabs
                    value={qcForm.inspectionType}
                    onChange={(v) => setQcForm({ ...qcForm, inspectionType: v })}
                    items={[
                      { key: 'first_inspection', label: 'First Inspection' },
                      { key: 'final_inspection', label: 'Final Inspection' },
                    ]}
                  />
                </div>

                <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                  {/* 1. Product Name — always first */}
                  <Field label="Product Name" required span="all">
                    <Input
                      type="text"
                      required
                      value={qcForm.materialName}
                      onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })}
                      placeholder="e.g. Nylon Drag Chain"
                    />
                  </Field>

                  <Field label="Outcome">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Select
                        value={qcForm.outcome}
                        onChange={e => setQcForm({ ...qcForm, outcome: e.target.value })}
                        style={{ fontWeight: 700, color: outcomeMeta.color }}
                      >
                        <option value="pass">PASS</option>
                        <option value="hold">HOLD</option>
                        <option value="reject">REJECT</option>
                        <option value="rework">REWORK</option>
                      </Select>
                      <Badge tone={outcomeMeta.tone} icon={outcomeMeta.icon}>{outcomeMeta.label}</Badge>
                    </div>
                  </Field>

                  {qcForm.outcome === 'rework' && (
                    <Field label="Rework Reason">
                      <Input value={qcForm.reworkReason}
                        onChange={e => setQcForm({ ...qcForm, reworkReason: e.target.value })}
                        placeholder="Describe what needs rework..." />
                    </Field>
                  )}
                </FormGrid>

                {/* DRAG CHAIN CONFIGURATION SECTION — DB-driven dropdowns */}
                {isDragChain && (
                  <Surface
                    pad={false}
                    style={{
                      background: 'color-mix(in srgb, var(--c-orange) 6%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--c-orange) 24%, transparent)',
                      boxShadow: 'none',
                      padding: 16,
                      marginBottom: 'var(--sp-4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--c-orange)', display: 'flex', fontSize: '1.05rem' }}><LuSettings2 /></span>
                      <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        Drag Chain Configuration (PDF Specification)
                      </h3>
                      {catalogModelNumbers.length === 0 && (
                        <span style={{ marginLeft: 'auto' }}>
                          <Badge tone="warning" icon={<LuTriangleAlert />}>No catalog data</Badge>
                        </span>
                      )}
                    </div>

                    <FormGrid>
                      {/* 1. Model Number — from DB */}
                      <Field label="Model No." required>
                        <Select
                          value={qcForm.modelNumber}
                          onChange={e => handleModelChange(e.target.value)}
                        >
                          <option value="">-- Select Model --</option>
                          {catalogModelNumbers.map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                      </Field>

                      {/* 2. Width (Inner Width) — cascades from Model */}
                      <Field label="Width (Inner)">
                        <Select
                          value={qcForm.width}
                          onChange={e => setQcForm(p => ({ ...p, width: e.target.value }))}
                        >
                          <option value="">-- Select Width --</option>
                          {availableWidths.map(w => <option key={w} value={w}>{w}</option>)}
                        </Select>
                      </Field>

                      {/* 3. Bending Radius — 5, 10, 15, 20 ... up to 700 */}
                      <Field label="Bending Radius">
                        <Select
                          value={qcForm.radius?.replace(/^R/i, '') || ''}
                          onChange={e => setQcForm(p => ({ ...p, radius: e.target.value }))}
                        >
                          <option value="">-- Select Radius --</option>
                          {BENDING_RADII_OPTIONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </Select>
                      </Field>

                      {/* 4. Type: OP / CP / SEMI */}
                      <Field label="Type (Open/Closed)">
                        <Select
                          value={qcForm.chainType || 'OP'}
                          onChange={e => setQcForm(p => ({ ...p, chainType: e.target.value }))}
                        >
                          <option value="OP">OP — Open</option>
                          <option value="CP">CP — Closed</option>
                          <option value="SEMI">SEMI — Semi-Closed</option>
                        </Select>
                      </Field>

                      {/* 5. Number of Links per meter — from DB */}
                      <Field label="No. of Links (per m)">
                        <Select
                          value={qcForm.numberOfLinks}
                          onChange={e => setQcForm(p => ({ ...p, numberOfLinks: e.target.value }))}
                        >
                          <option value="">-- Select Links --</option>
                          {availableLinks.length > 0
                            ? availableLinks.map(l => <option key={l} value={l}>{l}</option>)
                            : ['18', '20', '22', '24', '26', '28', '30'].map(l => <option key={l} value={l}>{l}</option>)
                          }
                        </Select>
                      </Field>

                      {/* 6. Length */}
                      <Field label="Length (mm / m)">
                        <Select
                          value={qcForm.length}
                          onChange={e => setQcForm(p => ({ ...p, length: e.target.value }))}
                        >
                          <option value="">-- Select Length --</option>
                          {['500 MM', '1000 MM', '1500 MM', '2000 MM', '2500 MM', '3000 MM', '4000 MM', '5000 MM'].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </Select>
                      </Field>

                      {/* 7. Mounting Bracket Type */}
                      <Field label="Mounting Bracket Type" span={2}>
                        <Select
                          value={qcForm.mountingBracketType}
                          onChange={e => setQcForm(p => ({ ...p, mountingBracketType: e.target.value }))}
                        >
                          <option value="">-- Select Bracket --</option>
                          <option value="B-BOX">B-BOX Type ({formatMountingBracketCode('B-BOX', qcForm.modelNumber || '35.1')})</option>
                          <option value="L-ANGULAR">L-ANGULAR Type ({formatMountingBracketCode('L-ANGULAR', qcForm.modelNumber || '35.1')})</option>
                          <option value="LSR(P)">LSR (P) — Plastic Angular Strain Relief ({formatMountingBracketCode('LSR(P)', qcForm.modelNumber || '35.1')})</option>
                          <option value="LSR(M)">LSR (M) — Metal Angular Strain Relief ({formatMountingBracketCode('LSR(M)', qcForm.modelNumber || '35.1')})</option>
                          <option value="SRP-25">SRP-25</option>
                          <option value="SRP-35">SRP-35</option>
                          <option value="SRP-50">SRP-50</option>
                        </Select>
                      </Field>

                      {/* 8. Accessories / Separator */}
                      <Field label="Accessories (Separator)">
                        <Select
                          value={qcForm.accessories}
                          onChange={e => setQcForm(p => ({ ...p, accessories: e.target.value }))}
                        >
                          <option value="">-- None / Not Required --</option>
                          <option value="HS">HS — Horizontal Separator</option>
                          <option value="VS">VS — Vertical Separator</option>
                          <option value="HS+VS">HS + VS (Both)</option>
                        </Select>
                      </Field>
                    </FormGrid>

                    {/* Live Spec Preview */}
                    {qcForm.materialName && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '8px 12px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--fs-xs)',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <LuClipboardCheck /> Inspection spec:
                        <strong style={{ color: 'var(--text-primary)' }}>{qcForm.materialName}</strong>
                      </div>
                    )}
                  </Surface>
                )}

                <FormGrid>
                  {/* 5. Quantity + Unit */}
                  <Field label="Inspected Quantity (Pieces / pcs)" required>
                    <Input type="number" step="0.01" required value={qcForm.quantity}
                      onChange={e => setQcForm({ ...qcForm, quantity: e.target.value })} />
                  </Field>
                  <Field label="Unit" required>
                    <Select value={qcForm.unit}
                      onChange={e => setQcForm({ ...qcForm, unit: e.target.value })}>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="meters">meters (Meters)</option>
                      <option value="boxes">boxes (Boxes)</option>
                    </Select>
                  </Field>

                  {/* 6. Remarks */}
                  <Field label="QC Notes / Diagnostic Remarks" span="all">
                    <Textarea rows="2" value={qcForm.remarks}
                      onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })}
                      placeholder="State details of damages, shortages, or discrepancies..." />
                  </Field>
                </FormGrid>
              </>
            )}
          </form>
        </Dialog>

        {/* INSPECTION LOG DETAIL DRAWER */}
        <Drawer
          open={!!detailLog}
          onClose={() => setDetailLog(null)}
          title={detailLog?.materialName || 'Inspection Log'}
          subtitle={detailLog?.modelNumber || undefined}
          footer={<Button variant="cancel" onClick={() => setDetailLog(null)}>Close</Button>}
        >
          {detailLog && (
            <>
              <DescList
                items={[
                  {
                    label: 'Outcome',
                    value: (() => {
                      const meta = OUTCOME_META[detailLog.outcome] || OUTCOME_META.pass;
                      return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
                    })(),
                  },
                  { label: 'Stage', value: detailLog.inspectionType === 'final_inspection' ? 'Final inspection' : 'First inspection' },
                  { label: 'Log Type', value: humanStatus(detailLog.qcType) },
                  { label: 'Inspection Status', value: humanStatus(detailLog.status) },
                  { label: 'Qty Checked', value: `${detailLog.quantity ?? 0} ${detailLog.unit || ''}` },
                  { label: 'Model Number', value: detailLog.modelNumber },
                  { label: 'Invoice Number', value: detailLog.invoiceNumber },
                  {
                    label: 'Invoice Document',
                    value: detailLog.invoiceUrl ? (
                      <a
                        href={detailLog.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        View Scan <LuExternalLink />
                      </a>
                    ) : '',
                  },
                  { label: 'Series', value: detailLog.series },
                  { label: 'Design Type', value: detailLog.designType },
                  ...(isDragChain ? [
                    { label: 'Radius', value: detailLog.radius },
                    { label: 'VS', value: detailLog.vs },
                    { label: 'HS', value: detailLog.hs },
                    { label: 'SR', value: detailLog.sr },
                  ] : []),
                  { label: 'Logged On', value: detailLog.createdAt ? new Date(detailLog.createdAt).toLocaleString() : '' },
                  { label: 'Last Updated', value: detailLog.updatedAt ? new Date(detailLog.updatedAt).toLocaleString() : '' },
                ]}
              />

              {/* Prose lives here rather than in the grid, so it can be read in
                  full instead of being clamped into a column. */}
              <NoteBlock label="Notes" text={detailLog.remarks} />
              <NoteBlock label="Dimensions Checked" text={detailLog.dimensions} />
              <NoteBlock label="Conduit Clamp / Gland" text={detailLog.conduitClamp} />
              <NoteBlock label="Rework Reason" text={detailLog.reworkReason} />
            </>
          )}
        </Drawer>

        {/* DELETE CONFIRMATION */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            if (target) handleDeleteLog(target._id);
          }}
          title="Delete this quality log?"
          text={deleteTarget
            ? `"${deleteTarget.materialName}" will be permanently removed from the quality records.`
            : ''}
          confirmLabel="Delete Log"
        />
      </Page>
    </DashboardLayout>
  );
};

export default QualityDashboard;
