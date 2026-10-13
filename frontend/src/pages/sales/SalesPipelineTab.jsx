import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { salesPipelineAPI, operationsAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  LuPlus, LuPencil, LuTrash2, LuX, LuSave, LuMessageSquare,
  LuCircleCheck, LuCircleX, LuClock, LuClipboardList, LuShieldCheck, LuPrinter,
  LuTarget, LuScrollText, LuFileText, LuFileCheck, LuReceipt, LuTruck, LuPackage,
  LuCog, LuUser, LuGlobe, LuPhone, LuCalendar, LuTag, LuBuilding2, LuTrendingUp,
  LuTriangleAlert, LuCircleAlert, LuHistory, LuHandCoins, LuBriefcase,
} from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { formatDragChainOrderCode, formatMountingBracketCode } from '../../utils/productNameHelper';
import OrderWorkflowBanner, { OrderStepBadge } from '../../components/common/OrderWorkflowBanner';
import {
  PageHeader, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, Drawer, Field, Input, Select, Textarea, Checkbox,
  Badge, Button, EmptyState, Skeleton, Tabs,
} from '../../components/ui';

/* Icon + tone per funnel stage — keeps the KPI row and the grid in one language. */
const STAGE_ICONS = {
  lead: <LuTarget />,
  quotation: <LuScrollText />,
  pi: <LuFileCheck />,
  customer_po: <LuBriefcase />,
  sales_order: <LuHandCoins />,
};

const STAGE_TONES = {
  lead: 'primary',
  quotation: 'blue',
  pi: 'amber',
  customer_po: 'violet',
  sales_order: 'green',
};

/* Audit trail action → badge tone/label. */
const AUDIT_ACTIONS = {
  created: { tone: 'info', label: 'Created' },
  updated: { tone: 'blue', label: 'Updated' },
  approved: { tone: 'success', label: 'Admin Approved' },
  rejected: { tone: 'danger', label: 'Admin Rejected' },
  stage_changed: { tone: 'warning', label: 'Stage Changed' },
};

/**
 * Grouped block inside the record dialog: a tinted panel with a heading row.
 * `tone` maps to the --c-* token family ('primary' uses the brand token).
 */
const Panel = ({ icon, title, meta, tone, children }) => {
  const bg = tone === 'primary' ? 'var(--primary-soft)' : tone ? `var(--c-${tone}-soft)` : 'var(--bg-subtle)';
  const fg = tone === 'primary' ? 'var(--primary)' : tone ? `var(--c-${tone})` : 'var(--primary)';
  const line = tone === 'primary'
    ? 'color-mix(in srgb, var(--primary) 25%, transparent)'
    : tone
      ? `color-mix(in srgb, var(--c-${tone}) 25%, transparent)`
      : 'var(--border)';

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 'var(--radius-lg)',
        background: bg,
        border: `1px solid ${line}`,
        marginBottom: 14,
      }}
    >
      {(title || meta) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {icon && <span style={{ display: 'inline-flex', color: fg, fontSize: '1.05rem' }}>{icon}</span>}
          {title && (
            <h4 style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h4>
          )}
          {meta && (
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              {meta}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'var(--primary)', icon: '🆕', desc: 'Fresh unconverted inquiry' },
  { value: 'contacted', label: 'Contacted', color: 'var(--c-blue)', icon: '📞', desc: 'Initial contact made with prospect' },
  { value: 'working', label: 'Working / In Progress', color: 'var(--c-cyan)', icon: '⚙️', desc: 'Actively discussing requirement' },
  { value: 'qualified', label: 'Qualified', color: 'var(--success)', icon: '✅', desc: 'Meets criteria / ready for quote' },
  { value: 'unqualified', label: 'Unqualified / Disqualified', color: 'var(--danger)', icon: '❌', desc: 'Budget, competitor, or dropped' },
  { value: 'nurturing', label: 'Nurturing', color: 'var(--c-violet)', icon: '🌱', desc: 'Future opportunity' }
];

const OPPORTUNITY_TYPE_OPTIONS = [
  { value: 'new_business', label: 'New Business', icon: '💼' },
  { value: 'existing_business', label: 'Existing Business / Repeat', icon: '🔄' },
  { value: 'replacement', label: 'Replacement Requirement', icon: '🛠️' },
  { value: 'oem_partner', label: 'OEM Machine Builder', icon: '🤝' },
  { value: 'expansion', label: 'Line Expansion / Project Add-on', icon: '📈' },
  { value: 'other', label: 'Other Inquiry', icon: '📌' }
];

const RATING_OPTIONS = [
  { value: 'hot', label: 'Hot', icon: '🔥', color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 15%, transparent)', desc: 'Ready to buy (7-15 days)' },
  { value: 'warm', label: 'Warm', icon: '🌤️', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', desc: 'Interested, evaluating budget' },
  { value: 'cold', label: 'Cold', icon: '❄️', color: 'var(--c-blue)', bg: 'color-mix(in srgb, var(--c-blue) 15%, transparent)', desc: 'Early inquiry / long timeline' }
];

const LIFECYCLE_STAGES = [
  { key: 'lead', label: 'Lead', icon: '🎯', desc: 'Raw contact' },
  { key: 'mql', label: 'MQL', icon: '📊', desc: 'Marketing Qualified' },
  { key: 'sql', label: 'SQL', icon: '💼', desc: 'Sales Qualified' },
  { key: 'opportunity', label: 'Opportunity', icon: '🚀', desc: 'Deal In Play' },
  { key: 'customer', label: 'Customer', icon: '🏆', desc: 'Won Customer' }
];

const REJECTION_REASONS = [
  { value: 'competitor_price', label: 'Competitor Price Lower' },
  { value: 'spec_mismatch', label: 'Technical Spec Mismatch' },
  { value: 'project_cancelled', label: 'Project Cancelled / On Hold' },
  { value: 'budget_constraint', label: 'Budget Not Allocated' },
  { value: 'no_response', label: 'Client Not Responding' },
  { value: 'quality_issue', label: 'Sample / Trial Rejected' },
  { value: 'other', label: 'Other Reason' }
];

const LEAD_SOURCES = [
  'Direct Inquiry',
  'Website / Portal',
  'Cold Call',
  'Customer Referral',
  'Trade Show / Expo',
  'WhatsApp Business',
  'Inbound Email',
  'Indiamart / TradeIndia',
  'Distributor / Partner',
  'Other'
];

const STAGE_CONFIG = {
  lead:        { label: 'Lead',        color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 15%, transparent)',  icon: '🎯' },
  quotation:   { label: 'Quotation',   color: 'var(--c-blue)', bg: 'color-mix(in srgb, var(--c-blue) 15%, transparent)', icon: '📜' },
  pi:          { label: 'Proforma Inv (PI)', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', icon: '📄' },
  customer_po: { label: 'Customer PO', color: 'var(--c-violet)', bg: 'color-mix(in srgb, var(--c-violet) 15%, transparent)', icon: '📥' },
  sales_order: { label: 'Sales Order', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)',  icon: '🚀' }
};

// Model specifications, pitch, links per meter and pricing are loaded dynamically from MongoDB ProductTemplates.
const getSpecFromModel = (modelNumber = '', templates = []) => {
  if (!modelNumber) return { pitch: 0, linksPerMeter: 0, ratePerMeter: 0, defaultWidth: '' };
  const raw = modelNumber.toString().trim();
  const clean = raw.toUpperCase().replace(/\s+/g, '');

  if (Array.isArray(templates) && templates.length > 0) {
    // 1. Exact match by modelNumber
    let match = templates.find(t => {
      if (!t.modelNumber) return false;
      const tClean = t.modelNumber.toUpperCase().replace(/\s+/g, '');
      return t.modelNumber === raw || tClean === clean;
    });

    // 2. Prioritized match (longest/most specific model number first)
    if (!match) {
      const sortedTemplates = [...templates].sort((a, b) => (b.modelNumber || '').length - (a.modelNumber || '').length);
      match = sortedTemplates.find(t => {
        if (!t.modelNumber) return false;
        const tClean = t.modelNumber.toUpperCase().replace(/[\s-_]/g, '');
        const targetClean = clean.replace(/[\s-_]/g, '');
        return targetClean.includes(tClean) || tClean.includes(targetClean);
      });
    }

    if (match) {
      const pitch = parseFloat(match.pitch) || 0;
      const links = parseInt(match.linksPerMeter || match.numberOfLinks, 10) || (pitch > 0 ? Math.ceil(1000 / pitch) : 0);
      const rate = parseFloat(match.ratePerMeter || match.unitPrice) || 0;
      const width = match.width || match.innerSize || '';
      return {
        pitch,
        linksPerMeter: links,
        ratePerMeter: rate,
        defaultWidth: width,
        series: match.modelNumber
      };
    }
  }

  return { pitch: 0, linksPerMeter: 0, ratePerMeter: 0, defaultWidth: '', series: modelNumber };
};

const recalculateAll = (currentForm, changedField = '', changedValue = null, templates = []) => {
  const updated = { 
    ...currentForm, 
    dragChainConfig: { ...(currentForm.dragChainConfig || {}) } 
  };

  // Apply change if specified
  if (changedField.startsWith('dragChainConfig.')) {
    const sub = changedField.split('.')[1];
    updated.dragChainConfig[sub] = changedValue;
  } else if (changedField) {
    updated[changedField] = changedValue;
  }

  const cfg = updated.dragChainConfig;
  const spec = getSpecFromModel(cfg.modelNumber, templates);

  // 1. Pitch & Link calculation
  let pitch = parseFloat(cfg.pitch);
  if (!pitch || isNaN(pitch) || pitch <= 0) {
    pitch = spec.pitch || 46;
  }
  cfg.pitch = pitch;

  // Set quantity: how many number of sets required by customer
  let setQty = 1;
  if (cfg.quantity !== undefined && cfg.quantity !== null && cfg.quantity !== '') {
    const parsedQty = parseFloat(cfg.quantity);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      setQty = parsedQty;
    }
  }
  cfg.quantity = setQty;

  // Parse length per set in millimeters
  let setLengthMm = 1000;
  if (cfg.length) {
    const cleanLen = String(cfg.length).trim().toLowerCase();
    const num = parseFloat(cleanLen.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      if ((cleanLen.includes('m') && !cleanLen.includes('mm')) || (num < 20 && !cleanLen.includes('mm'))) {
        setLengthMm = Math.round(num * 1000);
      } else {
        setLengthMm = Math.round(num);
      }
    }
  } else {
    cfg.length = '1000 MM';
  }

  if (changedField === 'dragChainConfig.numberOfLinks' || changedField === 'dragChainConfig.totalCalculatedLinks') {
    // Reverse calculation: User typed total links
    const totalLinks = parseInt(changedValue, 10) || 0;
    if (totalLinks > 0) {
      const totalLengthMm = Math.round(totalLinks * pitch);
      setLengthMm = Math.round(totalLengthMm / setQty);
      cfg.length = `${setLengthMm} MM`;
      const totalMeters = Math.round((totalLengthMm / 1000) * 100) / 100;
      cfg.totalMeters = totalMeters;
      cfg.linksPerSet = Math.ceil(setLengthMm / pitch);
      cfg.totalCalculatedLinks = totalLinks;
    }
  } else {
    // Length per set or Set Quantity changed -> calculate total meters & links
    const totalLengthMm = setLengthMm * setQty;
    const totalMeters = Math.round((totalLengthMm / 1000) * 100) / 100;
    cfg.totalMeters = totalMeters;

    const linksPerSet = Math.ceil(setLengthMm / pitch);
    const totalLinks = Math.ceil(totalLengthMm / pitch);
    cfg.linksPerSet = linksPerSet;
    cfg.totalCalculatedLinks = totalLinks;
    cfg.numberOfLinks = String(totalLinks);
  }

  // 2. Base Rate / meter shouldn't fixed (Editable rate per meter)
  let ratePerMeter = Number(cfg.ratePerMeter);
  if (isNaN(ratePerMeter) || ratePerMeter <= 0) {
    ratePerMeter = Number(updated.ratePerMeter) > 0 ? Number(updated.ratePerMeter) : (spec.ratePerMeter || 1200);
  }
  cfg.ratePerMeter = ratePerMeter;
  updated.ratePerMeter = ratePerMeter;

  const totalMeters = cfg.totalMeters || (setLengthMm * setQty / 1000);
  const grossAmount = Math.round((totalMeters * ratePerMeter) * 100) / 100;
  cfg.grossAmount = grossAmount;
  updated.grossAmount = grossAmount;

  const discountPercent = Math.min(100, Math.max(0, Number(cfg.discountPercent ?? updated.discountPercent ?? 0)));
  cfg.discountPercent = discountPercent;
  updated.discountPercent = discountPercent;

  const discountAmount = Math.round((grossAmount * (discountPercent / 100)) * 100) / 100;
  cfg.discountAmount = discountAmount;
  updated.discountAmount = discountAmount;

  const taxableAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);
  updated.totalAmount = taxableAmount;

  const isNonGst = updated.orderDocumentType === 'standard_bill' || updated.orderDocumentType === 'non_gst_bill';
  const gstRate = isNonGst ? 0 : (Number(updated.taxRate ?? 18) / 100);
  const gstAmount = isNonGst ? 0 : Math.round((taxableAmount * gstRate) * 100) / 100;
  updated.gstAmount = gstAmount;
  updated.grandTotal = Math.round((taxableAmount + gstAmount + Number(updated.shippingCharges || 0)) * 100) / 100;

  return updated;
};

const BLANK_FORM = {
  stage: 'sales_order', customerName: '', salesPersonName: '', customerContact: '', customerEmail: '', customerAddress: '', customerGST: '',
  billingAddress: '', shippingAddress: '', isSameAsBilling: true,
  quotationNumber: '', quotationDate: '', piNumber: '', customerPoNumber: '', salesOrderNumber: '',

  // Salesforce Lead Fields
  leadOwner: '',
  leadOwnerName: '',
  leadSource: 'Direct Inquiry',
  leadStatus: 'new',
  opportunityType: 'new_business',
  rating: 'warm',
  nextSteps: '',
  nextFollowUpDate: '',
  rejectionCategory: '',
  lifecycleStage: 'lead',
  
  // Document Type & Invoicing vs Challan vs Quotation
  orderDocumentType: 'tax_invoice', // 'tax_invoice' | 'challan' | 'quotation'
  invoiceNumber: '', invoiceDate: '', hsnCode: '8483', taxRate: 18, isInterState: false, paymentTerms: '30 Days Net',
  challanNumber: '', challanDate: '', challanType: 'against_sales_order', transportMode: 'Road',
  vehicleNumber: '', eWayBillNumber: '', lrNumber: '', receiverName: '', dispatchNotes: '',

  // Sales Logistics & Courier Details (Confidential to Sales — Hidden from Dispatch Dept)
  courierPartner: '', trackingNumber: '', shippingDate: '', estimatedDeliveryDate: '',
  shippingCharges: 0, freightTerms: '', logisticRemarks: '',

  ratePerMeter: 1200,
  discountPercent: 0,
  discountAmount: 0,
  grossAmount: 1200,
  totalAmount: 1200,
  gstAmount: 216,
  grandTotal: 1416,
  creditDays: 30,
  creditDueDate: '',
  paymentStatus: 'pending', paidAmount: 0, remarks: '', approvalStatus: 'none', changeReason: '',
  dragChainConfig: {
    modelNumber: '', width: '', radius: '', chainType: 'OP',
    pitch: 46, numberOfLinks: '22', totalCalculatedLinks: 22,
    length: '1000 MM', mountingBracketType: '', accessories: '',
    quantity: 1, ratePerMeter: 1200, discountPercent: 0, discountAmount: 0, grossAmount: 1200
  }
};

export default function SalesPipelineTab() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const isDragChain = subIndustryId === 'drag_chain';

  const [pipeline, setPipeline] = useState([]);
  const [stats, setStats] = useState({ leads: 0, quotations: 0, pis: 0, pos: 0, orders: 0, overdue: 0, pendingApproval: 0, approvedOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalDocTab, setModalDocTab] = useState('tax_invoice'); // 'tax_invoice' | 'challan'
  const [productTemplates, setProductTemplates] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditRecord, setAuditRecord] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [followUpRecord, setFollowUpRecord] = useState(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const isQuotation = form.stage === 'quotation' || modalDocTab === 'quotation';
  const isPI = form.stage === 'pi' || modalDocTab === 'pi';
  const isLead = form.stage === 'lead';

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filterStage) params.stage = filterStage;
      if (filterApproval) params.approvalStatus = filterApproval;
      if (filterDocType) params.orderDocumentType = filterDocType;
      const [pRes, sRes] = await Promise.all([
        salesPipelineAPI.getAll(params),
        salesPipelineAPI.getStats()
      ]);
      setPipeline(pRes.data.data);
      setStats(sRes.data.data);
    } catch {
      toast.error('Failed to load sales pipeline');
    } finally {
      setLoading(false);
    }
  }, [filterStage, filterApproval, filterDocType]);

  // Fetch product templates from DB for cascading dropdowns
  const fetchTemplates = useCallback(async () => {
    if (!isDragChain) return;
    try {
      const res = await operationsAPI.getProductTemplates();
      setProductTemplates(res.data.data || []);
    } catch {
      // silently fail — dropdowns will be empty
    }
  }, [isDragChain]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => {
    adminAPI.getUsers().then(res => {
      setTeamUsers(res.data?.data || []);
    }).catch(() => {
      // Non-admins might not have permission to view all users, handled gracefully
    });
  }, []);

  const STANDARD_WIDTHS = ['15', '25', '38', '50', '56', '75', '100', '125', '150', '175', '200', '225', '250', '300'];
  // Bending Radius: 5, 10, 15, 20 ... up to 700 (step of 5)
  const BENDING_RADII_OPTIONS = Array.from({ length: 140 }, (_, i) => String((i + 1) * 5));
  const STANDARD_LINKS = ['18', '20', '22', '24', '26', '28', '30'];

  // ---------- Cascading dropdown computed values ----------
  const catalogModelNumbers = useMemo(() => {
    const dbModels = productTemplates.map(t => t.modelNumber).filter(Boolean);
    return Array.from(new Set(dbModels)).sort();
  }, [productTemplates]);

  const availableWidths = useMemo(() => {
    let list = [];
    if (form.dragChainConfig.modelNumber) {
      list = productTemplates
        .filter(t => t.modelNumber === form.dragChainConfig.modelNumber)
        .map(t => t.width || t.innerSize)
        .filter(Boolean);
    }
    if (list.length === 0) {
      const allDbWidths = productTemplates.map(t => t.width || t.innerSize).filter(Boolean);
      list = Array.from(new Set([...allDbWidths, ...STANDARD_WIDTHS]));
    }
    return Array.from(new Set(list)).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });
  }, [productTemplates, form.dragChainConfig.modelNumber]);

  const availableLinks = useMemo(() => {
    let links = [];
    if (form.dragChainConfig.modelNumber) {
      const matches = productTemplates.filter(t => t.modelNumber === form.dragChainConfig.modelNumber);
      links = Array.from(new Set(matches.map(t => t.numberOfLinks || t.linksPerMeter).filter(Boolean)));
    }
    if (links.length === 0) {
      const allDbLinks = productTemplates.map(t => t.numberOfLinks || t.linksPerMeter).filter(Boolean);
      links = Array.from(new Set([...allDbLinks, ...STANDARD_LINKS]));
    }
    return links.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [productTemplates, form.dragChainConfig.modelNumber]);

  const availableRadii = useMemo(() => {
    let list = [];
    if (form.dragChainConfig.modelNumber) {
      const matches = productTemplates.filter(t => t.modelNumber === form.dragChainConfig.modelNumber);
      matches.forEach(t => {
        if (t.radius) {
          const parts = String(t.radius).split(/[,/ ]+/);
          parts.forEach(p => {
            const clean = p.replace(/^R/i, '').trim();
            if (clean && !isNaN(parseInt(clean, 10))) list.push(clean);
          });
        }
      });
    }
    if (list.length === 0) {
      list = BENDING_RADII_OPTIONS;
    }
    return Array.from(new Set(list)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [productTemplates, form.dragChainConfig.modelNumber]);

  // When model changes — reset Bending Radius & Width (Inner), cascade pitch, editable rate per meter (Database-First)
  const handleModelChange = (val) => {
    const spec = getSpecFromModel(val, productTemplates);

    const updated = recalculateAll({
      ...form,
      dragChainConfig: {
        ...form.dragChainConfig,
        modelNumber: val,
        // Client requirement: Bending Radius and Width (inner) values to be reset
        width: '',
        radius: '',
        chainType: form.dragChainConfig.chainType || 'OP',
        pitch: spec.pitch || 46,
        ratePerMeter: spec.ratePerMeter || 1200,
        mountingBracketType: form.dragChainConfig.mountingBracketType || '',
        accessories: form.dragChainConfig.accessories || ''
      }
    }, 'dragChainConfig.modelNumber', val, productTemplates);

    setForm(updated);
  };

  const openCreate = async (defaultStage = 'sales_order', defaultDocType = null) => {
    const year = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    const rand = Math.floor(1000 + Math.random() * 9000);

    let nextSONum = `SO-${year}-${rand}`;
    let nextQuoteNum = `QTN-${year}-${rand}`;
    let nextPINum = `PI-${year}-${rand}`;
    try {
      const res = await salesPipelineAPI.getNextSONumber();
      if (res.data?.nextSONumber) {
        nextSONum = res.data.nextSONumber;
        nextQuoteNum = res.data.nextSONumber.replace('SO-', 'QTN-');
        nextPINum = res.data.nextSONumber.replace('SO-', 'PI-');
      }
    } catch (err) {
      console.warn('Could not fetch next SO number, using fallback:', err);
    }

    const isQuote = defaultStage === 'quotation';
    const isPi = defaultStage === 'pi';
    const isLd = defaultStage === 'lead';

    let initialDocType = 'tax_invoice';
    if (isQuote) initialDocType = 'quotation';
    else if (isPi) initialDocType = 'pi';
    else if (isLd) initialDocType = 'quotation';
    else if (defaultDocType) initialDocType = defaultDocType;

    const initial = recalculateAll({
      ...BLANK_FORM,
      stage: defaultStage,
      salesPersonName: user?.name || '',
      leadOwnerName: user?.name || '',
      leadOwner: user?._id || '',
      leadSource: 'Direct Inquiry',
      leadStatus: 'new',
      opportunityType: 'new_business',
      rating: 'warm',
      lifecycleStage: 'lead',
      salesOrderNumber: nextSONum,
      quotationNumber: (isPi || isLd) ? '' : nextQuoteNum,
      piNumber: nextPINum,
      customerPoNumber: '',
      quotationDate: today,
      invoiceNumber: (isQuote || isPi || isLd) ? '' : initialDocType === 'standard_bill' ? `BILL-${year}-${rand}` : `INV-${year}-${rand}`,
      challanNumber: `DC-${year}-${rand}`,
      invoiceDate: today,
      challanDate: today,
      taxRate: initialDocType === 'standard_bill' ? 0 : 18,
      orderDocumentType: initialDocType
    }, 'dragChainConfig.quantity', 1);

    setForm(initial);
    setModalDocTab(initialDocType);
    setEditingId(null);
    setShowModal(true);
  };

  const openAuditLogs = async (rec) => {
    setAuditRecord(rec);
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const res = await salesPipelineAPI.getAuditLogs(rec._id);
      if (res.data?.data) {
        setAuditRecord(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch real-time audit logs, using record state:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const openPreview = (rec) => {
    setPreviewRecord(rec);
    setShowPreviewModal(true);
  };
  
  const openEdit = (rec) => {
    const isQuote = rec.stage === 'quotation' || rec.orderDocumentType === 'quotation';
    const isPi = rec.stage === 'pi' || rec.orderDocumentType === 'pi';
    const isLd = rec.stage === 'lead';
    const docType = isQuote ? 'quotation' : isPi ? 'pi' : isLd ? 'quotation' : (rec.orderDocumentType || (rec.challanNumber ? 'challan' : 'tax_invoice'));
    const cfg = rec.items?.[0]?.dragChainConfig || rec.dragChainConfig || BLANK_FORM.dragChainConfig;
    const spec = getSpecFromModel(cfg.modelNumber || rec.modelNumber, productTemplates);

    const populated = {
      stage: rec.stage || 'sales_order',
      customerName: rec.customerName || '',
      salesPersonName: rec.salesPersonName || user?.name || '',
      customerContact: rec.customerContact || '',
      customerEmail: rec.customerEmail || '',
      customerAddress: rec.customerAddress || rec.billingAddress || '',
      customerGST: rec.customerGST || '',
      billingAddress: rec.billingAddress || rec.customerAddress || '',
      shippingAddress: rec.shippingAddress || rec.customerAddress || '',
      isSameAsBilling: rec.isSameAsBilling !== undefined ? !!rec.isSameAsBilling : (rec.billingAddress ? rec.billingAddress === rec.shippingAddress : true),
      quotationNumber: rec.quotationNumber || '',
      quotationDate: rec.quotationDate ? new Date(rec.quotationDate).toISOString().split('T')[0] : (rec.invoiceDate ? new Date(rec.invoiceDate).toISOString().split('T')[0] : ''),
      piNumber: rec.piNumber || '',
      customerPoNumber: rec.customerPoNumber || '',
      salesOrderNumber: rec.salesOrderNumber || '',

      // Salesforce Lead Fields
      leadOwner: rec.leadOwner?._id || rec.leadOwner || '',
      leadOwnerName: rec.leadOwnerName || rec.leadOwner?.name || rec.salesPersonName || user?.name || '',
      leadSource: rec.leadSource || 'Direct Inquiry',
      leadStatus: rec.leadStatus || 'new',
      opportunityType: rec.opportunityType || 'new_business',
      rating: rec.rating || 'warm',
      nextSteps: rec.nextSteps || '',
      nextFollowUpDate: rec.nextFollowUpDate ? new Date(rec.nextFollowUpDate).toISOString().split('T')[0] : '',
      rejectionCategory: rec.rejectionCategory || '',
      lifecycleStage: rec.lifecycleStage || 'lead',
      
      orderDocumentType: docType,
      invoiceNumber: rec.invoiceNumber || '',
      invoiceDate: rec.invoiceDate ? new Date(rec.invoiceDate).toISOString().split('T')[0] : '',
      hsnCode: rec.hsnCode || '8483',
      taxRate: rec.taxRate ?? 18,
      isInterState: !!rec.isInterState,
      paymentTerms: rec.paymentTerms || '30 Days Net',

      challanNumber: rec.challanNumber || '',
      challanDate: rec.challanDate ? new Date(rec.challanDate).toISOString().split('T')[0] : '',
      challanType: rec.challanType || 'against_sales_order',
      transportMode: rec.transportMode || 'Road',
      vehicleNumber: rec.vehicleNumber || '',
      eWayBillNumber: rec.eWayBillNumber || '',
      lrNumber: rec.lrNumber || '',
      receiverName: rec.receiverName || '',
      dispatchNotes: rec.dispatchNotes || '',

      // Sales Logistics & Courier Details
      courierPartner: rec.courierPartner || '',
      trackingNumber: rec.trackingNumber || '',
      shippingDate: rec.shippingDate ? new Date(rec.shippingDate).toISOString().split('T')[0] : '',
      estimatedDeliveryDate: rec.estimatedDeliveryDate ? new Date(rec.estimatedDeliveryDate).toISOString().split('T')[0] : '',
      shippingCharges: rec.shippingCharges || 0,
      freightTerms: rec.freightTerms || '',
      logisticRemarks: rec.logisticRemarks || '',

      ratePerMeter: rec.ratePerMeter || cfg.ratePerMeter || spec.ratePerMeter,
      discountPercent: rec.discountPercent ?? cfg.discountPercent ?? 0,
      discountAmount: rec.discountAmount || cfg.discountAmount || 0,
      grossAmount: rec.grossAmount || cfg.grossAmount || 0,
      totalAmount: rec.totalAmount || 0,
      gstAmount: rec.gstAmount || 0,
      grandTotal: rec.grandTotal || 0,
      creditDays: rec.creditDays || 30,
      creditDueDate: rec.creditDueDate ? new Date(rec.creditDueDate).toISOString().split('T')[0] : '',
      paymentStatus: rec.paymentStatus || 'pending',
      paidAmount: rec.paidAmount || 0,
      remarks: rec.remarks || '',
      changeReason: '',
      approvalStatus: rec.approvalStatus || 'none',
      dragChainConfig: {
        ...cfg,
        pitch: cfg.pitch || spec.pitch || 46,
        ratePerMeter: cfg.ratePerMeter || spec.ratePerMeter,
        discountPercent: cfg.discountPercent ?? rec.discountPercent ?? 0,
        totalCalculatedLinks: cfg.totalCalculatedLinks || Math.ceil(((parseFloat(cfg.quantity) || 1) * 1000) / (cfg.pitch || spec.pitch || 46))
      }
    };

    const calculated = recalculateAll(populated);
    setForm(calculated);
    setModalDocTab(docType);
    setEditingId(rec._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const isQuotation = form.stage === 'quotation' || modalDocTab === 'quotation';
    const isPI = form.stage === 'pi' || modalDocTab === 'pi';
    const isLeadStage = form.stage === 'lead';
    try {
      const payload = {
        ...form,
        orderDocumentType: isQuotation ? 'quotation' : isPI ? 'pi' : isLeadStage ? 'quotation' : modalDocTab,
        auditNote: form.changeReason || '',
        items: [{
          modelNumber: form.dragChainConfig.modelNumber || 'Custom Drag Chain',
          quantity: form.dragChainConfig.quantity || 1,
          unit: isDragChain ? 'meter' : 'pcs',
          unitPrice: form.dragChainConfig.ratePerMeter || form.ratePerMeter || 1200,
          totalPrice: form.grandTotal,
          dragChainConfig: form.dragChainConfig
        }]
      };

      if (editingId) {
        await salesPipelineAPI.update(editingId, payload);
        toast.success(
          isLeadStage
            ? '✅ Salesforce Lead updated successfully'
            : isQuotation 
            ? '✅ Quotation updated successfully' 
            : isPI 
            ? '✅ Proforma Invoice (PI) updated successfully' 
            : form.orderDocumentType === 'standard_bill' || modalDocTab === 'standard_bill'
            ? '✅ Standard Bill (Non-GST) updated successfully'
            : 'Record updated & changes logged in Audit Trail'
        );
      } else {
        await salesPipelineAPI.create(payload);
        toast.success(
          isLeadStage
            ? '✅ Salesforce Lead Created Successfully'
            : isQuotation 
            ? '✅ Quotation Created Successfully' 
            : isPI 
            ? '✅ Proforma Invoice (PI) Created Successfully' 
            : modalDocTab === 'standard_bill'
            ? '✅ Standard Bill (Non-GST) Created Successfully'
            : modalDocTab === 'challan' 
            ? '✅ Delivery Challan Sales Order Created' 
            : '✅ Tax Invoice Sales Order Created'
        );
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pipeline record?')) return;
    try {
      await salesPipelineAPI.delete(id);
      toast.success('Record deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleStageAdvance = async (id, stage) => {
    try {
      await salesPipelineAPI.update(id, { stage });
      toast.success(`Advanced to ${STAGE_CONFIG[stage].label}`);
      fetchData();
    } catch {
      toast.error('Failed to advance stage');
    }
  };

  const handleApproveOrder = async (id) => {
    try {
      await salesPipelineAPI.approve(id);
      toast.success('✅ Sales Order Approved by Admin!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve Sales Order');
    }
  };

  const handleRejectOrder = async (id) => {
    const reason = window.prompt('Enter reason for rejecting this Sales Order (sent to Sales team):');
    if (reason === null) return; // User cancelled
    try {
      await salesPipelineAPI.reject(id, reason.trim() || 'Pricing or Terms not approved');
      toast.error('❌ Sales Order Rejected');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject Sales Order');
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpNote.trim()) return;
    try {
      await salesPipelineAPI.addFollowUp(followUpRecord._id, followUpNote);
      toast.success('Follow-up note added');
      setShowFollowUpModal(false);
      setFollowUpNote('');
      fetchData();
    } catch {
      toast.error('Failed to add follow-up');
    }
  };

  // Helper for total calculation
  const handleAmountChange = (val, isGSTRate = false) => {
    let amt = form.totalAmount;
    if (!isGSTRate) {
      amt = Number(val);
      const gst = amt * 0.18;
      setForm(p => ({ ...p, totalAmount: amt, gstAmount: gst, grandTotal: amt + gst }));
    }
  };

  const isOverdue = (rec) => {
    if (rec.paymentStatus === 'paid') return false;
    if (rec.paymentStatus === 'overdue') return true;
    if (rec.creditDueDate && new Date(rec.creditDueDate) < new Date()) return true;
    return false;
  };

  const filtered = pipeline.filter(p =>
    p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.leadOwnerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.salesPersonName?.toLowerCase().includes(search.toLowerCase()) ||
    p.quotationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.piNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.customerPoNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.salesOrderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.challanNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const stageCount = (key) =>
    key === 'lead' ? stats.leads
      : key === 'quotation' ? stats.quotations
      : key === 'pi' ? stats.pis
      : key === 'customer_po' ? stats.pos
      : stats.orders;

  /* ------------------------------------------------------- grid columns */
  const dim = { color: 'var(--text-muted)' };

  const columns = [
    {
      key: 'customerName',
      header: 'Customer / Lead Owner',
      primary: true,
      render: (rec) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.customerName}</div>
          {rec.stage === 'lead' ? (
            <>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <LuUser /> {rec.leadOwnerName || rec.leadOwner?.name || rec.salesPersonName || 'Unassigned'}
              </div>
              {rec.leadSource && (
                <div style={{ fontSize: 'var(--fs-2xs)', display: 'flex', alignItems: 'center', gap: 4, ...dim }}>
                  <LuGlobe /> {rec.leadSource}
                </div>
              )}
              {rec.customerContact && (
                <div style={{ fontSize: 'var(--fs-2xs)', display: 'flex', alignItems: 'center', gap: 4, ...dim }}>
                  <LuPhone /> {rec.customerContact}
                </div>
              )}
            </>
          ) : (
            <>
              {rec.salesPersonName && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LuUser /> {rec.salesPersonName}
                </div>
              )}
              {rec.customerContact && (
                <div style={{ fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', gap: 4, ...dim }}>
                  <LuPhone /> {rec.customerContact}
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage & Status',
      render: (rec) => {
        const sc = STAGE_CONFIG[rec.stage] || STAGE_CONFIG.lead;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <OrderStepBadge record={rec} />
            <select
              value={rec.stage}
              onClick={(e) => e.stopPropagation()}
              onChange={e => handleStageAdvance(rec._id, e.target.value)}
              className="field-control"
              style={{ background: sc.bg, color: sc.color, borderColor: sc.color, height: 28, fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer', maxWidth: 190 }}
            >
              {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            {/* Salesforce Lead Status, Rating & Lifecycle Badges */}
            {rec.stage === 'lead' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge tone={rec.rating === 'hot' ? 'danger' : rec.rating === 'cold' ? 'blue' : 'warning'}>
                    {rec.rating === 'hot' ? 'Hot' : rec.rating === 'cold' ? 'Cold' : 'Warm'}
                  </Badge>
                  {rec.leadStatus && (
                    <Badge tone={rec.leadStatus === 'qualified' ? 'success' : rec.leadStatus === 'unqualified' ? 'danger' : 'info'}>
                      {LEAD_STATUS_OPTIONS.find(s => s.value === rec.leadStatus)?.label || rec.leadStatus}
                    </Badge>
                  )}
                </div>
                <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, ...dim }}>
                  Stage: <span style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{rec.lifecycleStage || 'Lead'}</span>
                </div>
              </div>
            )}

            {/* Approval Status Indicator for Sales Orders */}
            {rec.stage === 'sales_order' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                {rec.approvalStatus === 'approved' ? (
                  <Badge tone="success" icon={<LuCircleCheck />}>
                    Approved {rec.approvedBy?.name ? `by ${rec.approvedBy.name.split(' ')[0]}` : ''}
                  </Badge>
                ) : rec.approvalStatus === 'rejected' ? (
                  <Badge tone="danger" icon={<LuCircleX />}>
                    Rejected {rec.rejectionReason ? `(${rec.rejectionReason.slice(0, 15)}...)` : ''}
                  </Badge>
                ) : (
                  <Badge tone="warning" icon={<LuClock />}>Awaiting Admin Approval</Badge>
                )}

                {/* Live Store Fulfillment Stage */}
                {rec.dispatchId?.status === 'dispatched' ? (
                  <Badge tone="success" icon={<LuTruck />}>
                    Dispatched {rec.dispatchId.lrNumber ? `(LR #${rec.dispatchId.lrNumber})` : ''}
                  </Badge>
                ) : rec.dispatchId?.status === 'packing' ? (
                  <Badge tone="blue" icon={<LuPackage />}>
                    Packing {rec.dispatchId.totalBoxes ? `(${rec.dispatchId.totalBoxes} Boxes)` : ''}
                  </Badge>
                ) : rec.dispatchId?.status === 'hold' ? (
                  <Badge tone="danger" icon={<LuCircleAlert />}>On Hold in Store</Badge>
                ) : rec.approvalStatus === 'approved' ? (
                  <Badge tone="warning" icon={<LuCog />}>Assembly in Store</Badge>
                ) : null}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'documents',
      header: 'Doc / Next Steps',
      sortable: false,
      hideBelow: 1100,
      render: (rec) => {
        const isChallan = rec.orderDocumentType === 'challan' || (!rec.orderDocumentType && rec.challanNumber && !rec.invoiceNumber);
        return rec.stage === 'lead' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--fs-xs)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {OPPORTUNITY_TYPE_OPTIONS.find(o => o.value === rec.opportunityType)?.label || (rec.opportunityType ? rec.opportunityType.replace(/_/g, ' ') : 'New Business')}
            </span>
            {rec.nextSteps && (
              <div style={{ color: 'var(--warning)', fontWeight: 600 }}>
                Next: {rec.nextSteps.slice(0, 35)}{rec.nextSteps.length > 35 ? '…' : ''}
              </div>
            )}
            {rec.rejectionReason && (
              <div style={{ color: 'var(--danger)', fontWeight: 600 }}>
                Lost: {rec.rejectionReason.slice(0, 25)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--fs-xs)', ...dim }}>
            {rec.stage === 'sales_order' && (
              <div>
                {rec.orderDocumentType === 'standard_bill' || rec.orderDocumentType === 'non_gst_bill' ? (
                  <Badge tone="success" icon={<LuFileText />}>Standard Bill</Badge>
                ) : isChallan ? (
                  <Badge tone="purple" icon={<LuTruck />}>Delivery Challan</Badge>
                ) : (
                  <Badge tone="blue" icon={<LuReceipt />}>Tax Invoice</Badge>
                )}
              </div>
            )}

            {rec.salesOrderNumber && <div style={{ color: 'var(--primary)', fontWeight: 700 }}>SO: {rec.salesOrderNumber}</div>}
            {(rec.orderDocumentType === 'standard_bill' || rec.orderDocumentType === 'non_gst_bill') && rec.invoiceNumber ? (
              <div style={{ color: 'var(--success)', fontWeight: 600 }}>Bill: {rec.invoiceNumber} (Non-GST)</div>
            ) : rec.invoiceNumber ? (
              <div style={{ color: 'var(--c-blue)', fontWeight: 600 }}>Inv: {rec.invoiceNumber}</div>
            ) : null}
            {rec.challanNumber && <div style={{ color: 'var(--c-violet)', fontWeight: 600 }}>DC: {rec.challanNumber}</div>}
            {rec.quotationNumber && <div>Q: {rec.quotationNumber}</div>}
            {rec.piNumber && <div>PI: {rec.piNumber}</div>}
            {rec.customerPoNumber && <div>PO: {rec.customerPoNumber}</div>}

            {/* Sales Confidential Logistics & Courier Details */}
            {(rec.courierPartner || rec.trackingNumber) && (
              <div
                style={{
                  marginTop: 4,
                  background: 'var(--c-blue-soft)',
                  color: 'var(--c-blue)',
                  border: '1px solid color-mix(in srgb, var(--c-blue) 25%, transparent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexWrap: 'wrap',
                  fontSize: 'var(--fs-2xs)',
                }}
              >
                <LuTruck /> {rec.courierPartner || 'Courier'}
                {rec.trackingNumber && <span style={{ fontWeight: 700 }}>#{rec.trackingNumber}</span>}
                {rec.freightTerms && <span style={dim}>({rec.freightTerms.replace(/_/g, ' ')})</span>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'specs',
      header: isDragChain ? 'Drag Chain Specs' : 'Product Details',
      sortable: false,
      hideBelow: 1400,
      render: (rec) => {
        const cfg = rec.items?.[0]?.dragChainConfig || rec.dragChainConfig || {};
        if (!isDragChain) {
          return (
            <span style={dim}>
              {rec.items && rec.items.length > 0 ? `${rec.items.length} items` : (rec.stage === 'lead' ? 'Inquiry Stage' : '--')}
            </span>
          );
        }
        if (!(cfg.modelNumber || cfg.series)) {
          return <span style={dim}>{rec.stage === 'lead' ? 'Inquiry Stage' : '--'}</span>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--fs-xs)' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 'var(--fs-base)' }}>
              {cfg.modelNumber || cfg.series}{' '}
              <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                ({cfg.chainType || cfg.openClosed || 'OP'})
              </span>
            </span>
            <span style={dim}>
              {[
                cfg.width && `W: ${cfg.width}`,
                cfg.radius && `R: ${cfg.radius}`,
                (cfg.pitch || getSpecFromModel(cfg.modelNumber).pitch) && `Pitch: ${cfg.pitch || getSpecFromModel(cfg.modelNumber).pitch}mm`,
                (cfg.totalCalculatedLinks || cfg.numberOfLinks) && `${cfg.totalCalculatedLinks || cfg.numberOfLinks} links`
              ].filter(Boolean).join(' | ')}
            </span>
            <span style={dim}>
              {[cfg.length && `L: ${cfg.length}`, cfg.mountingBracketType && `Bracket: ${cfg.mountingBracketType}`, cfg.accessories && `Acc: ${cfg.accessories}`].filter(Boolean).join(' | ')}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Qty: {cfg.quantity || 1} {isDragChain ? 'm (Meters)' : 'pcs'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'grandTotal',
      header: 'Amount / Value',
      align: 'right',
      sortValue: (rec) => Number(rec.grandTotal || rec.totalAmount || 0),
      render: (rec) => {
        const cfg = rec.items?.[0]?.dragChainConfig || rec.dragChainConfig || {};
        const isChallan = rec.orderDocumentType === 'challan' || (!rec.orderDocumentType && rec.challanNumber && !rec.invoiceNumber);
        return (
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{(rec.grandTotal || rec.totalAmount || 0).toLocaleString()}
            </div>
            {rec.stage === 'lead' ? (
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--primary)', fontWeight: 600 }}>
                Approx Opportunity Value
              </div>
            ) : (
              <>
                {(rec.discountPercent > 0 || cfg.discountPercent > 0) && (
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--success)', fontWeight: 700 }}>
                    {rec.discountPercent || cfg.discountPercent}% Discount
                  </div>
                )}
                {(rec.ratePerMeter > 0 || cfg.ratePerMeter > 0) && (
                  <div style={{ fontSize: 'var(--fs-2xs)', ...dim }}>
                    ₹{(rec.ratePerMeter || cfg.ratePerMeter || 0)}/m base rate
                  </div>
                )}
                {isChallan && (
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--success)', fontWeight: 600 }}>Transit Note</div>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due / Follow-up',
      hideBelow: 900,
      sortValue: (rec) => new Date(rec.stage === 'lead' ? (rec.nextFollowUpDate || 0) : (rec.creditDueDate || 0)).getTime(),
      render: (rec) => {
        const overdue = isOverdue(rec);
        if (rec.stage === 'lead') {
          return rec.nextFollowUpDate ? (
            <Badge tone={new Date(rec.nextFollowUpDate) < new Date() ? 'danger' : 'info'} icon={<LuCalendar />}>
              {new Date(rec.nextFollowUpDate).toLocaleDateString()}
            </Badge>
          ) : <span style={dim}>No date set</span>;
        }
        return rec.creditDueDate ? (
          <div>
            <Badge tone={overdue ? 'danger' : 'neutral'} icon={overdue ? <LuTriangleAlert /> : <LuCalendar />}>
              {new Date(rec.creditDueDate).toLocaleDateString()}
            </Badge>
            {overdue && (
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--danger)', fontWeight: 700, marginTop: 3 }}>
                CREDIT OVERDUE
              </div>
            )}
          </div>
        ) : <span style={dim}>No due date</span>;
      },
    },
    {
      key: 'followUps',
      header: 'Follow-ups',
      align: 'right',
      hideBelow: 1100,
      sortValue: (rec) => rec.followUps?.length || 0,
      render: (rec) => (
        <Button
          variant="secondary"
          size="xs"
          icon={<LuMessageSquare />}
          onClick={(e) => { e.stopPropagation(); setFollowUpRecord(rec); setShowFollowUpModal(true); }}
        >
          {rec.followUps?.length || 0} Notes
        </Button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (rec) => (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 1-Click Stage Progression Shortcuts */}
          {rec.stage === 'lead' && (
            <Button
              variant="secondary"
              size="xs"
              icon={<LuScrollText />}
              onClick={() => openEdit({ ...rec, stage: 'quotation', orderDocumentType: 'quotation' })}
              title="Convert Lead to Quotation"
            >
              Quote
            </Button>
          )}
          {rec.stage === 'quotation' && (
            <Button
              variant="secondary"
              size="xs"
              icon={<LuFileCheck />}
              onClick={() => handleStageAdvance(rec._id, 'customer_po')}
              title="Customer PO Received"
            >
              PO
            </Button>
          )}
          {rec.stage === 'customer_po' && (
            <Button
              variant="secondary"
              size="xs"
              icon={<LuReceipt />}
              onClick={() => handleStageAdvance(rec._id, 'pi')}
              title="Issue Proforma Invoice"
            >
              PI
            </Button>
          )}
          {rec.stage === 'pi' && (
            <Button
              variant="success"
              size="xs"
              icon={<LuTag />}
              onClick={() => handleStageAdvance(rec._id, 'sales_order')}
              title="Generate Tax Invoice / Sales Order"
            >
              Order
            </Button>
          )}

          {/* Admin Approval Quick Action Buttons */}
          {isAdmin && rec.stage === 'sales_order' && rec.approvalStatus !== 'approved' && (
            <>
              <Button variant="success" size="xs" icon={<LuCircleCheck />} onClick={() => handleApproveOrder(rec._id)} title="Approve Sales Order">
                Approve
              </Button>
              {rec.approvalStatus !== 'rejected' && (
                <Button variant="danger" size="xs" icon={<LuCircleX />} onClick={() => handleRejectOrder(rec._id)} title="Reject Sales Order">
                  Reject
                </Button>
              )}
            </>
          )}

          <Button variant="secondary" size="xs" icon={<LuPrinter />} onClick={() => openPreview(rec)} title="Preview & Print Official Document">
            Print
          </Button>
          <Button variant="secondary" size="xs" icon={<LuClipboardList />} onClick={() => openAuditLogs(rec)} title="View Audit Trail">
            {rec.auditLogs?.length || 0}
          </Button>
          <Button variant="secondary" size="xs" icon={<LuPencil />} onClick={() => openEdit(rec)} title="Edit" aria-label="Edit" />
          <Button variant="danger" size="xs" icon={<LuTrash2 />} onClick={() => handleDelete(rec._id)} title="Delete" aria-label="Delete" />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Sales Pipeline & ${isDragChain ? 'Drag Chain ' : ''}Order Fulfillment Funnel`}
        subtitle="Lead → Quotation → PI → Customer PO → Sales Order → Store assembly → Box packing → Logistics dispatch."
      />

      {/* Create actions — wraps cleanly on narrow viewports */}
      <Toolbar>
        <Button variant="secondary" icon={<LuTarget />} onClick={() => openCreate('lead')}>Lead</Button>
        <Button variant="primary" icon={<LuReceipt />} onClick={() => openCreate('sales_order', 'tax_invoice')}>Tax Invoice</Button>
        <Button variant="secondary" icon={<LuFileText />} onClick={() => openCreate('sales_order', 'standard_bill')}>Standard Bill</Button>
        <Button variant="secondary" icon={<LuTruck />} onClick={() => openCreate('sales_order', 'challan')}>Delivery Challan</Button>
        <Button variant="secondary" icon={<LuFileCheck />} onClick={() => openCreate('pi')}>Proforma (PI)</Button>
        <Button variant="secondary" icon={<LuScrollText />} onClick={() => openCreate('quotation')}>Quotation</Button>
      </Toolbar>

      {/* End-to-End 9-Step Lifecycle Banner */}
      <OrderWorkflowBanner
        activeStageKey={filterStage || 'lead'}
        onStepClick={(s) => {
          if (['lead', 'quotation', 'customer_po', 'pi', 'sales_order'].includes(s.key)) {
            setFilterStage(s.key);
            setFilterApproval('');
          } else if (s.key === 'invoice') {
            setFilterStage('sales_order');
            setFilterDocType('tax_invoice');
            setFilterApproval('');
          } else if (s.key === 'payment') {
            setFilterStage('sales_order');
          }
        }}
      />

      {/* Funnel KPIs — click to filter the grid */}
      <StatRow>
        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
          <StatTile
            key={key}
            label={cfg.label}
            value={stageCount(key)}
            icon={STAGE_ICONS[key]}
            tone={STAGE_TONES[key]}
            hint={filterStage === key ? 'Filtering this stage' : 'Click to filter'}
            onClick={() => { setFilterStage(filterStage === key ? '' : key); setFilterApproval(''); }}
          />
        ))}

        <StatTile
          label="SO Pending Approval"
          value={stats.pendingApproval || 0}
          icon={<LuClock />}
          tone="amber"
          hint={filterApproval === 'pending' ? 'Filtering pending' : 'Click to filter'}
          onClick={() => { setFilterApproval(filterApproval === 'pending' ? '' : 'pending'); setFilterStage('sales_order'); }}
        />

        <StatTile
          label="Payment Overdue"
          value={stats.overdue}
          icon={<LuTriangleAlert />}
          tone="red"
          hint={stats.overdue > 0 ? 'Needs collection follow-up' : 'Nothing overdue'}
        />
      </StatRow>

      {/* Search & Filters */}
      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer, PI #, PO #, quote #, SO #, Inv #, Challan #…"
        />
        <Select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Stages</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All Document Types</option>
          <option value="tax_invoice">Tax Invoice (GST)</option>
          <option value="standard_bill">Standard Bill (Non-GST)</option>
          <option value="challan">Delivery Challan (DC)</option>
          <option value="quotation">Quotations</option>
          <option value="pi">Proforma Invoices (PI)</option>
        </Select>
        <Select value={filterApproval} onChange={e => setFilterApproval(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All Approval Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <ToolbarSpacer />
        <DensitySwitch />
      </Toolbar>

      {/* Pipeline Table */}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r._id}
        loading={loading}
        pageSize={20}
        empty={
          <EmptyState
            icon={<LuTarget />}
            title="No pipeline records found"
            text="Create a lead, quotation, proforma invoice or sales order to start the funnel."
            action={<Button variant="primary" icon={<LuPlus />} onClick={() => openCreate('lead')}>New Lead</Button>}
          />
        }
      />

      {/* CREATE / EDIT MODAL */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        title={
          editingId
            ? (isLead ? 'Edit Salesforce Lead' : isQuotation ? 'Edit Sales Quotation' : isPI ? 'Edit Proforma Invoice (PI)' : 'Edit Sales Pipeline Record')
            : (isLead ? 'Create Salesforce Lead' : isQuotation ? 'Create Sales Quotation' : isPI ? 'Create Proforma Invoice (PI)' : 'Create Sales Pipeline Record')
        }
        subtitle={
          isLead
            ? 'Lead owner, qualification, rating, next steps and lifecycle stage.'
            : isQuotation
            ? 'Customer price proposal & quotation estimate form.'
            : isPI
            ? 'Commercial proforma invoice for customer advance payment with Customer PO reference.'
            : 'Drag chain specification with automated pitch & link calculation, base price, discount and auto SO numbering.'
        }
        footer={
          <>
            {editingId && (
              <Button
                variant="secondary"
                icon={<LuClipboardList />}
                onClick={() => openAuditLogs({ _id: editingId, customerName: form.customerName, salesOrderNumber: form.salesOrderNumber, stage: form.stage, approvalStatus: form.approvalStatus })}
              >
                Audit History
              </Button>
            )}
            <Button variant="cancel" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="pipeline-record-form" variant="primary" icon={<LuSave />} loading={submitting} disabled={submitting}>
              {submitting
                ? 'Saving…'
                : isLead
                  ? (editingId ? 'Update Lead' : 'Create Lead')
                  : isQuotation
                    ? (editingId ? 'Update Quotation' : 'Create Quotation')
                    : isPI
                      ? (editingId ? 'Update Proforma Invoice' : 'Create Proforma Invoice (PI)')
                      : editingId
                        ? 'Update Record & Log Changes'
                        : modalDocTab === 'standard_bill'
                          ? 'Create Standard Bill (Non-GST)'
                          : modalDocTab === 'challan'
                            ? 'Create Delivery Challan Order'
                            : 'Create Tax Invoice Order'}
            </Button>
          </>
        }
      >
        {/* DOCUMENT TYPE TABS (Tax Invoice vs Standard Bill vs Challan) — hidden for Lead, Quotation & PI */}
        {isLead ? (
          <Panel
            icon={<LuTarget />}
            title="Salesforce Lead Qualification Module"
            tone="primary"
            meta={form.rating === 'hot' ? 'Hot Lead' : form.rating === 'cold' ? 'Cold Lead' : 'Warm Lead'}
          >
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 10 }}>
              Manage lead ownership, qualification, opportunity type, rating & lifecycle stages.
            </div>

            {/* Lifecycle Stage Progression Bar */}
            <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>LIFECYCLE STAGE PROGRESSION</span>
              <span style={{ color: 'var(--primary)' }}>
                Current: {LIFECYCLE_STAGES.find(s => s.key === form.lifecycleStage)?.label || 'Lead'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 4, borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              {LIFECYCLE_STAGES.map((st) => {
                const isActive = (form.lifecycleStage || 'lead') === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, lifecycleStage: st.key }))}
                    style={{
                      flex: 1,
                      minWidth: 92,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? 'var(--on-primary)' : 'var(--text-muted)',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </Panel>
        ) : isQuotation ? (
          <Panel icon={<LuScrollText />} title="Customer Quotation Proposal" tone="blue">
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Price proposal & estimate for a customer inquiry. Tax invoice, GST supply & dispatch courier details are excluded for quotations.
            </div>
          </Panel>
        ) : isPI ? (
          <Panel icon={<LuFileCheck />} title="Commercial Proforma Invoice (PI)" tone="amber">
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Proforma invoice for customer advance payment. Delivery challan & dispatch logistics details are excluded for PIs.
            </div>
          </Panel>
        ) : (
          <Tabs
            items={[
              { key: 'tax_invoice', label: 'Tax Invoice (GST)', icon: <LuReceipt /> },
              { key: 'standard_bill', label: 'Standard Bill (Non-GST)', icon: <LuFileText /> },
              { key: 'challan', label: 'Delivery Challan (DC)', icon: <LuTruck /> },
            ]}
            value={modalDocTab}
            onChange={(k) => {
              if (k === 'tax_invoice') {
                setModalDocTab('tax_invoice');
                const updated = recalculateAll({
                  ...form,
                  orderDocumentType: 'tax_invoice',
                  taxRate: form.taxRate || 18,
                  invoiceNumber: form.invoiceNumber && !form.invoiceNumber.startsWith('DC-') ? form.invoiceNumber : `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                }, 'taxRate', form.taxRate || 18, productTemplates);
                setForm(updated);
              } else if (k === 'standard_bill') {
                setModalDocTab('standard_bill');
                const updated = recalculateAll({
                  ...form,
                  orderDocumentType: 'standard_bill',
                  taxRate: 0,
                  gstAmount: 0,
                  invoiceNumber: form.invoiceNumber && !form.invoiceNumber.startsWith('DC-') ? form.invoiceNumber : `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                }, 'orderDocumentType', 'standard_bill', productTemplates);
                setForm(updated);
              } else if (k === 'challan') {
                setModalDocTab('challan');
                const updated = recalculateAll({
                  ...form,
                  orderDocumentType: 'challan',
                  challanNumber: form.challanNumber || `DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                }, 'orderDocumentType', 'challan', productTemplates);
                setForm(updated);
              }
            }}
          />
        )}

        <form id="pipeline-record-form" onSubmit={handleSubmit}>
          {/* Post-Approval Editing Notice Banner */}
          {form.approvalStatus === 'approved' && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                background: 'var(--c-blue-soft)', border: '1px solid color-mix(in srgb, var(--c-blue) 30%, transparent)',
                borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 'var(--fs-sm)', color: 'var(--c-blue)'
              }}
            >
              <LuShieldCheck style={{ fontSize: '1.2rem', flexShrink: 0 }} />
              <div>
                <strong>Admin Approved Order:</strong> you have full permission to edit this order in any state. All modifications are permanently recorded in the <strong>Audit Log Trail</strong> with your identity and timestamp.
              </div>
            </div>
          )}

          {/* If isLead: render full Salesforce Module. Otherwise standard SO/Quote/PI fields */}
          {isLead ? (
            <>
              {/* Pipeline Stage Selector for Leads */}
              <Panel icon={<LuTarget />} title="Pipeline Stage" tone="primary" meta="Advance when qualified">
                <FormGrid>
                  <Field label="Stage" hint="Advance the lead to Quotation, PI or Sales Order">
                    <Select
                      value={form.stage}
                      onChange={e => {
                        const newStage = e.target.value;
                        setForm(p => ({
                          ...p,
                          stage: newStage,
                          orderDocumentType: newStage === 'quotation' ? 'quotation' : newStage === 'pi' ? 'pi' : (modalDocTab === 'challan' ? 'challan' : 'tax_invoice')
                        }));
                        if (newStage === 'quotation') {
                          setModalDocTab('quotation');
                        } else if (newStage === 'pi') {
                          setModalDocTab('pi');
                        } else if (modalDocTab === 'quotation' || modalDocTab === 'pi') {
                          setModalDocTab('tax_invoice');
                        }
                      }}
                    >
                      {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Field>
                </FormGrid>
              </Panel>

              {/* SECTION 1: LEAD OWNERS & ASSIGNMENT */}
              <Panel icon={<LuUser />} title="Lead Owners & Assignment" tone="primary" meta="Lead Owner Module">
                <FormGrid>
                  <Field label="Lead Owner" required>
                    {teamUsers && teamUsers.length > 0 ? (
                      <Select
                        value={form.leadOwner || ''}
                        onChange={e => {
                          const selId = e.target.value;
                          const selUser = teamUsers.find(u => u._id === selId);
                          setForm(p => ({
                            ...p,
                            leadOwner: selId,
                            leadOwnerName: selUser?.name || p.leadOwnerName,
                            salesPersonName: selUser?.name || p.salesPersonName
                          }));
                        }}
                      >
                        <option value="">-- Select Lead Owner --</option>
                        {teamUsers.map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role || 'Sales'})</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={form.leadOwnerName || form.salesPersonName || user?.name || ''}
                        onChange={e => setForm(p => ({ ...p, leadOwnerName: e.target.value, salesPersonName: e.target.value }))}
                      />
                    )}
                  </Field>
                  <Field label="Sales Representative">
                    <Input
                      value={form.salesPersonName || user?.name || ''}
                      onChange={e => setForm(p => ({ ...p, salesPersonName: e.target.value }))}
                      placeholder="Assigned sales rep"
                    />
                  </Field>
                  <Field label="Lead Source">
                    <Select
                      value={form.leadSource || 'Direct Inquiry'}
                      onChange={e => setForm(p => ({ ...p, leadSource: e.target.value }))}
                    >
                      {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                </FormGrid>
              </Panel>

              {/* SECTION 2: PROSPECT & COMPANY CONTACT INFORMATION */}
              <Panel icon={<LuBuilding2 />} title="Prospect & Company Contact Information">
                <FormGrid>
                  <Field label="Customer / Company Name" required>
                    <Input
                      required
                      value={form.customerName}
                      onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                      placeholder="e.g. Acme Automation / Tata Motors"
                    />
                  </Field>
                  <Field label="Contact Number">
                    <Input
                      value={form.customerContact}
                      onChange={e => setForm(p => ({ ...p, customerContact: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </Field>
                  <Field label="Email Address">
                    <Input
                      type="email"
                      value={form.customerEmail}
                      onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="contact@company.com"
                    />
                  </Field>
                  <Field label="Customer Location / Address" span="all">
                    <Input
                      value={form.customerAddress || form.billingAddress || ''}
                      onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value, billingAddress: e.target.value }))}
                      placeholder="City, State, Industrial Area…"
                    />
                  </Field>
                </FormGrid>
              </Panel>

              {/* SECTION 3: LEAD DETAILS (Lead Status, Opportunity Type, Rating) */}
              <Panel icon={<LuTrendingUp />} title="Lead Details: Status, Opportunity Type & Rating" tone="blue" meta="Salesforce Lead Details">
                <FormGrid>
                  <Field label="Lead Status" required>
                    <Select
                      value={form.leadStatus || 'new'}
                      onChange={e => setForm(p => ({ ...p, leadStatus: e.target.value }))}
                    >
                      {LEAD_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Opportunity Type" required>
                    <Select
                      value={form.opportunityType || 'new_business'}
                      onChange={e => setForm(p => ({ ...p, opportunityType: e.target.value }))}
                    >
                      {OPPORTUNITY_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </Field>
                </FormGrid>

                {/* Rating (Hot / Warm / Cold) */}
                <Field label="Rating" required span="all">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                    {RATING_OPTIONS.map(r => {
                      const isSelected = (form.rating || 'warm') === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setForm(p => ({ ...p, rating: r.value }))}
                          style={{
                            border: `1.5px solid ${isSelected ? r.color : 'var(--border)'}`,
                            background: isSelected ? r.bg : 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                            padding: '9px 12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'var(--transition-fast)',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: isSelected ? r.color : 'var(--text-primary)' }}>
                            {r.label}
                          </div>
                          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </Panel>

              {/* SECTION 4: NEXT STEPS / REJECTION INFORMATION */}
              <Panel
                icon={form.leadStatus === 'unqualified' ? <LuCircleX /> : <LuTarget />}
                title="Next Steps & Follow-Up / Rejection Information"
                tone={form.leadStatus === 'unqualified' ? 'red' : 'amber'}
              >
                <FormGrid>
                  <Field label="Next Steps" span={2}>
                    <Input
                      value={form.nextSteps || ''}
                      onChange={e => setForm(p => ({ ...p, nextSteps: e.target.value }))}
                      placeholder="e.g. Share catalog & engineering drawing by Friday / arrange factory visit"
                    />
                  </Field>
                  <Field label="Next Follow-Up Date">
                    <Input
                      type="date"
                      value={form.nextFollowUpDate || ''}
                      onChange={e => setForm(p => ({ ...p, nextFollowUpDate: e.target.value }))}
                    />
                  </Field>

                  <Field label="Rejection Category" hint="Only if the lead is disqualified / closed-lost">
                    <Select
                      value={form.rejectionCategory || ''}
                      onChange={e => setForm(p => ({ ...p, rejectionCategory: e.target.value }))}
                    >
                      <option value="">-- None / Still Active --</option>
                      {REJECTION_REASONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Rejection Details / Disqualification Reason" span={2}>
                    <Input
                      value={form.rejectionReason || ''}
                      onChange={e => setForm(p => ({ ...p, rejectionReason: e.target.value }))}
                      placeholder="e.g. Budget cut, competitor price 20% lower, or requirements not matching"
                    />
                  </Field>
                </FormGrid>
              </Panel>

              {/* SECTION 5: LIFECYCLE STAGE & REMARKS / COMMENTS */}
              <Panel icon={<LuMessageSquare />} title="Lifecycle Stage & Remarks / Comments">
                <FormGrid>
                  <Field label="Lifecycle Stage">
                    <Select
                      value={form.lifecycleStage || 'lead'}
                      onChange={e => setForm(p => ({ ...p, lifecycleStage: e.target.value }))}
                    >
                      {LIFECYCLE_STAGES.map(s => (
                        <option key={s.key} value={s.key}>{s.label} ({s.desc})</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Estimated Deal Value (₹ Approx)" span={2}>
                    <Input
                      type="number"
                      value={form.totalAmount || 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setForm(p => ({ ...p, totalAmount: val, grossAmount: val, grandTotal: val }));
                      }}
                      placeholder="e.g. 50000"
                    />
                  </Field>
                  <Field label="Remarks / Comments" span="all">
                    <Textarea
                      rows={3}
                      value={form.remarks || ''}
                      onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                      placeholder="Record meeting minutes, client discussion, technical requirements or the next milestone…"
                    />
                  </Field>
                </FormGrid>
              </Panel>

              {/* SECTION 6: DRAG CHAIN SIZING REQUIREMENTS (OPTIONAL) */}
              {isDragChain && (
                <details
                  style={{
                    background: 'var(--c-orange-soft)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid color-mix(in srgb, var(--c-orange) 25%, transparent)',
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--c-orange)' }}>
                    Optional: Drag Chain Product Sizing & Requirements
                  </summary>
                  <FormGrid style={{ marginTop: 14 }}>
                    <Field label="Model No.">
                      <Select
                        value={form.dragChainConfig.modelNumber}
                        onChange={e => handleModelChange(e.target.value)}
                      >
                        <option value="">-- Select Model --</option>
                        {catalogModelNumbers.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                    </Field>
                    <Field label="Width (Inner)" required>
                      <Select
                        value={form.dragChainConfig.width || ''}
                        onChange={e => setForm(recalculateAll(form, 'dragChainConfig.width', e.target.value))}
                      >
                        <option value="">-- Select Width --</option>
                        {availableWidths.map(w => <option key={w} value={w}>{w} mm</option>)}
                      </Select>
                    </Field>
                    <Field label="Bending Radius" required>
                      <Select
                        value={form.dragChainConfig.radius?.replace(/^R/i, '') || ''}
                        onChange={e => setForm(recalculateAll(form, 'dragChainConfig.radius', e.target.value))}
                      >
                        <option value="">-- Select Radius --</option>
                        {availableRadii.map(r => <option key={r} value={r}>R{r}</option>)}
                      </Select>
                    </Field>
                    <Field label="Length per Set">
                      <Input
                        placeholder="e.g. 1000 MM, 1.5 M"
                        value={form.dragChainConfig.length || ''}
                        onChange={e => setForm(recalculateAll(form, 'dragChainConfig.length', e.target.value))}
                      />
                    </Field>
                    <Field label="Quantity (No. of Sets)">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={form.dragChainConfig.quantity || 1}
                        onChange={e => setForm(recalculateAll(form, 'dragChainConfig.quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10)))}
                        placeholder="1"
                      />
                    </Field>
                    <Field label="Separator / Divider">
                      <Select
                        value={form.dragChainConfig.accessories || ''}
                        onChange={e => setForm(recalculateAll(form, 'dragChainConfig.accessories', e.target.value))}
                      >
                        <option value="">-- None / Not Required --</option>
                        <option value="VS">VS — Vertical Separator / Divider</option>
                        <option value="HS">HS — Horizontal Separator / Divider</option>
                        <option value="HS+VS">HS + VS — Both</option>
                      </Select>
                    </Field>
                  </FormGrid>
                </details>
              )}
            </>
          ) : (
            <>
              {/* Stage, Customer & Sales Person */}
              <FormGrid style={{ marginBottom: 14 }}>
                <Field label="Pipeline Stage" required>
                  <Select
                    value={form.stage}
                    onChange={e => {
                      const newStage = e.target.value;
                      setForm(p => ({
                        ...p,
                        stage: newStage,
                        orderDocumentType: newStage === 'quotation' ? 'quotation' : newStage === 'pi' ? 'pi' : (modalDocTab === 'challan' ? 'challan' : 'tax_invoice')
                      }));
                      if (newStage === 'quotation') {
                        setModalDocTab('quotation');
                      } else if (newStage === 'pi') {
                        setModalDocTab('pi');
                      } else if (modalDocTab === 'quotation' || modalDocTab === 'pi') {
                        setModalDocTab('tax_invoice');
                      }
                    }}
                  >
                    {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Select>
                </Field>
                <Field label="Customer Name" required>
                  <Input required value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="e.g. Acme Automation" />
                </Field>
                <Field label="Sales Person" required>
                  <Input required value={form.salesPersonName || user?.name || ''} onChange={e => setForm(p => ({ ...p, salesPersonName: e.target.value }))} placeholder="e.g. Rahul Sharma" />
                </Field>

                <Field label="Contact Number">
                  <Input value={form.customerContact} onChange={e => setForm(p => ({ ...p, customerContact: e.target.value }))} placeholder="+91…" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} placeholder="sales@acme.com" />
                </Field>
                <Field
                  label={isQuotation ? 'Quotation Ref #' : isPI ? 'Proforma Number #' : 'Sales Order Ref #'}
                  hint="Auto-calculated — editable"
                >
                  <Input
                    value={isQuotation ? (form.quotationNumber || '') : isPI ? (form.piNumber || '') : form.salesOrderNumber}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p => ({
                        ...p,
                        ...(isQuotation
                          ? { quotationNumber: val, salesOrderRef: val }
                          : isPI
                          ? { piNumber: val, salesOrderRef: val }
                          : { salesOrderNumber: val })
                      }));
                    }}
                    placeholder={isQuotation ? 'QTN-2026-0001' : isPI ? 'PI-2026-0001' : 'SO-2026-0001'}
                    style={{ background: 'var(--success-soft)', borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)', fontWeight: 700 }}
                  />
                </Field>
                {isPI && (
                  <Field label="Customer PO Number">
                    <Input
                      value={form.customerPoNumber || ''}
                      onChange={e => setForm(p => ({ ...p, customerPoNumber: e.target.value }))}
                      placeholder="Enter Customer PO Number"
                    />
                  </Field>
                )}

                {/* Billing & Shipping Address with Same-as-Billing toggle */}
                <Field label="Billing Address" span={2}>
                  <Input
                    value={form.billingAddress}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p => ({
                        ...p,
                        billingAddress: val,
                        customerAddress: val,
                        shippingAddress: p.isSameAsBilling ? val : p.shippingAddress
                      }));
                    }}
                    placeholder="Enter Customer Billing Address"
                  />
                </Field>
                <Field label="Shipping Address" span={2}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Checkbox
                      label="Same as billing"
                      checked={form.isSameAsBilling}
                      onChange={e => {
                        const checked = e.target.checked;
                        setForm(p => ({
                          ...p,
                          isSameAsBilling: checked,
                          shippingAddress: checked ? p.billingAddress : p.shippingAddress
                        }));
                      }}
                    />
                    <Input
                      disabled={form.isSameAsBilling}
                      value={form.shippingAddress}
                      onChange={e => setForm(p => ({ ...p, shippingAddress: e.target.value }))}
                      placeholder="Enter Shipping / Delivery Address"
                      style={form.isSameAsBilling ? { opacity: 0.7 } : undefined}
                    />
                  </div>
                </Field>
              </FormGrid>
            </>
          )}

          {/* QUOTATION PROPOSAL SPECIFICS */}
          {isQuotation && !isLead && (
            <Panel icon={<LuScrollText />} title="Quotation Proposal Details" tone="blue">
              <FormGrid>
                <Field label="Quotation Ref No." required>
                  <Input
                    required={isQuotation}
                    value={form.quotationNumber || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p => ({ ...p, quotationNumber: val, salesOrderRef: val }));
                    }}
                    placeholder="QTN-2026-001"
                  />
                </Field>
                <Field label="Quotation Date" required>
                  <Input
                    type="date"
                    required={isQuotation}
                    value={form.quotationDate || ''}
                    onChange={e => setForm(p => ({ ...p, quotationDate: e.target.value }))}
                  />
                </Field>
                <Field label="Payment Terms / Quotation Validity">
                  <Input
                    value={form.paymentTerms || ''}
                    onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                    placeholder="e.g. 100% Advance / 30 Days Net"
                  />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* PROFORMA INVOICE (PI) SPECIFICS */}
          {isPI && !isLead && (
            <Panel icon={<LuFileCheck />} title="Proforma Invoice & Commercial Terms" tone="amber">
              <FormGrid>
                <Field label="Proforma Number" required>
                  <Input
                    required={isPI}
                    value={form.piNumber || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p => ({ ...p, piNumber: val, salesOrderRef: val }));
                    }}
                    placeholder="PI-2026-001"
                  />
                </Field>
                <Field label="Proforma Date" required>
                  <Input
                    type="date"
                    required={isPI}
                    value={form.invoiceDate || ''}
                    onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))}
                  />
                </Field>
                <Field label="Customer PO Number">
                  <Input
                    value={form.customerPoNumber || ''}
                    onChange={e => setForm(p => ({ ...p, customerPoNumber: e.target.value }))}
                    placeholder="Enter Customer PO Number"
                  />
                </Field>
                <Field label="Preceding Quotation Ref #">
                  <Input
                    value={form.quotationNumber || ''}
                    onChange={e => setForm(p => ({ ...p, quotationNumber: e.target.value }))}
                    placeholder="QTN-2026-XXXX"
                  />
                </Field>
                <Field label="Payment Terms / Advance Terms">
                  <Input
                    value={form.paymentTerms || ''}
                    onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                    placeholder="e.g. 100% Advance / 30 Days Net"
                  />
                </Field>
                <Field label="Customer GSTIN">
                  <Input
                    value={form.customerGST || ''}
                    onChange={e => setForm(p => ({ ...p, customerGST: e.target.value }))}
                    placeholder="27AAPCA1234F1Z5"
                  />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* TAX INVOICE SPECIFICS */}
          {modalDocTab === 'tax_invoice' && !isQuotation && !isPI && !isLead && (
            <Panel icon={<LuReceipt />} title="Tax Invoice & GST Billing Details" tone="blue">
              <FormGrid>
                <Field label="Tax Invoice No." required>
                  <Input required={modalDocTab === 'tax_invoice' && !isQuotation && !isPI && !isLead} value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="INV-2026-001" />
                </Field>
                <Field label="Invoice Date">
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} />
                </Field>
                <Field label="Customer GSTIN">
                  <Input value={form.customerGST} onChange={e => setForm(p => ({ ...p, customerGST: e.target.value }))} placeholder="27AAPCA1234F1Z5" />
                </Field>
                <Field label="HSN / SAC Code">
                  <Input value={form.hsnCode} onChange={e => setForm(p => ({ ...p, hsnCode: e.target.value }))} placeholder="8483 / 3926" />
                </Field>
                <Field label="GST Supply Type">
                  <Select value={form.isInterState ? 'inter' : 'intra'} onChange={e => setForm(p => ({ ...p, isInterState: e.target.value === 'inter' }))}>
                    <option value="intra">Intra-State (9% CGST + 9% SGST)</option>
                    <option value="inter">Inter-State (18% IGST)</option>
                  </Select>
                </Field>
                <Field label="Payment Terms">
                  <Input value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} placeholder="30 Days Net / Immediate" />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* STANDARD BILL (NON-GST) SPECIFICS */}
          {modalDocTab === 'standard_bill' && !isQuotation && !isPI && !isLead && (
            <Panel icon={<LuFileText />} title="Standard Bill (Non-GST) / Bill of Supply" tone="green" meta="0% GST / Non-Taxable Retail Supply">
              <FormGrid>
                <Field label="Standard Bill No." required>
                  <Input
                    required={modalDocTab === 'standard_bill' && !isQuotation && !isPI && !isLead}
                    value={form.invoiceNumber}
                    onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                    placeholder="BILL-2026-001"
                  />
                </Field>
                <Field label="Bill Date">
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} />
                </Field>
                <Field label="Payment Terms">
                  <Input value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} placeholder="Immediate / 30 Days Net" />
                </Field>
                <Field label="HSN / SAC Code" hint="Optional">
                  <Input value={form.hsnCode} onChange={e => setForm(p => ({ ...p, hsnCode: e.target.value }))} placeholder="8483 / 3926" />
                </Field>
                <Field label="Billing Notes / Remarks" span={2}>
                  <Input
                    value={form.dispatchNotes || ''}
                    onChange={e => setForm(p => ({ ...p, dispatchNotes: e.target.value }))}
                    placeholder="e.g. Non-taxable goods delivery / standard supply"
                  />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* DELIVERY CHALLAN SPECIFICS */}
          {modalDocTab === 'challan' && !isQuotation && !isPI && !isLead && (
            <Panel icon={<LuTruck />} title="Delivery Challan & Dispatch Logistics" tone="violet">
              <FormGrid>
                <Field label="Challan No." required>
                  <Input required={modalDocTab === 'challan' && !isQuotation && !isPI && !isLead} value={form.challanNumber} onChange={e => setForm(p => ({ ...p, challanNumber: e.target.value }))} placeholder="DC-2026-001" />
                </Field>
                <Field label="Challan Date">
                  <Input type="date" value={form.challanDate} onChange={e => setForm(p => ({ ...p, challanDate: e.target.value }))} />
                </Field>
                <Field label="Challan Nature / Purpose">
                  <Select value={form.challanType} onChange={e => setForm(p => ({ ...p, challanType: e.target.value }))}>
                    <option value="against_sales_order">Delivery Against Sales Order</option>
                    <option value="supply_on_approval">Supply on Approval</option>
                    <option value="job_work">Job Work / Testing</option>
                    <option value="sample_testing">Demonstration / Sample</option>
                    <option value="returnable">Returnable Goods</option>
                    <option value="non_returnable">Non-Returnable Goods</option>
                    <option value="other">Other Supply</option>
                  </Select>
                </Field>
                <Field label="Transport Mode">
                  <Select value={form.transportMode} onChange={e => setForm(p => ({ ...p, transportMode: e.target.value }))}>
                    <option value="Road">Road Transport</option>
                    <option value="Courier">Courier / Express</option>
                    <option value="Hand Delivery">Hand Delivery</option>
                    <option value="Air">Air Cargo</option>
                    <option value="Train">Rail Cargo</option>
                  </Select>
                </Field>
                <Field label="Vehicle Number">
                  <Input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} placeholder="e.g. DL-01-AB-1234" />
                </Field>
                <Field label="E-Way Bill # / LR #">
                  <Input value={form.eWayBillNumber || form.lrNumber} onChange={e => setForm(p => ({ ...p, eWayBillNumber: e.target.value, lrNumber: e.target.value }))} placeholder="EWB or Lorry Receipt #" />
                </Field>
                <Field label="Receiver / Consignee Person">
                  <Input value={form.receiverName} onChange={e => setForm(p => ({ ...p, receiverName: e.target.value }))} placeholder="e.g. Site In-Charge" />
                </Field>
                <Field label="Dispatch / Transit Remarks" span={2}>
                  <Input value={form.dispatchNotes} onChange={e => setForm(p => ({ ...p, dispatchNotes: e.target.value }))} placeholder="e.g. Fragile items, deliver to gate #2" />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* Preceding Reference Numbers — hidden for Lead, Quotation & PI */}
          {!isQuotation && !isPI && !isLead && (
            <Panel icon={<LuFileText />} title="Preceding Reference Numbers">
              <FormGrid>
                <Field label="Quotation #">
                  <Input value={form.quotationNumber} onChange={e => setForm(p => ({ ...p, quotationNumber: e.target.value }))} placeholder="Quotation #" />
                </Field>
                <Field label="PI #">
                  <Input value={form.piNumber} onChange={e => setForm(p => ({ ...p, piNumber: e.target.value }))} placeholder="PI #" />
                </Field>
                <Field label="Customer PO #">
                  <Input value={form.customerPoNumber} onChange={e => setForm(p => ({ ...p, customerPoNumber: e.target.value }))} placeholder="Customer PO #" />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* DRAG CHAIN CONFIGURATION — DB-driven dropdowns & pitch/links/pricing formulas (hidden for Leads) */}
          {isDragChain && !isLead && (
            <Panel
              icon={<LuCog />}
              title="Drag Chain Configuration & Auto Calculations"
              tone="orange"
              meta="Formula: Links = Length(mm) ÷ Pitch(mm)"
            >
              <FormGrid>
                {/* 1. Model Number — from DB */}
                <Field label="Model No." required>
                  <Select
                    value={form.dragChainConfig.modelNumber}
                    onChange={e => handleModelChange(e.target.value)}
                  >
                    <option value="">-- Select Model --</option>
                    {catalogModelNumbers.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>

                {/* 2. Width (Inner Width) — resets on Model change */}
                <Field label="Width (Inner)" required hint="Reset on model change">
                  <Select
                    value={form.dragChainConfig.width || ''}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.width', e.target.value))}
                  >
                    <option value="">-- Select Width --</option>
                    {availableWidths.map(w => <option key={w} value={w}>{w} mm</option>)}
                  </Select>
                </Field>

                {/* 3. Bending Radius — resets on Model change */}
                <Field label="Bending Radius" required hint="Reset on model change">
                  <Select
                    value={form.dragChainConfig.radius?.replace(/^R/i, '') || ''}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.radius', e.target.value))}
                  >
                    <option value="">-- Select Radius --</option>
                    {availableRadii.map(r => (
                      <option key={r} value={r}>R{r}</option>
                    ))}
                  </Select>
                </Field>

                {/* 4. Type: OP / CP / SEMI */}
                <Field label="Type (Open/Closed)">
                  <Select
                    value={form.dragChainConfig.chainType}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.chainType', e.target.value))}
                  >
                    <option value="OP">OP — Open</option>
                    <option value="CP">CP — Closed</option>
                    <option value="SEMI">SEMI — Semi-Closed</option>
                  </Select>
                </Field>

                {/* 5. Pitch (mm) */}
                <Field label="Pitch (mm)" hint="Auto-formula">
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 45.5, 55.5"
                    value={form.dragChainConfig.pitch || ''}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.pitch', e.target.value))}
                  />
                </Field>

                {/* 6. Number of Links — auto calculated / reverse editable */}
                <Field
                  label="Total Links"
                  hint={
                    form.dragChainConfig.linksPerSet
                      ? `Auto-synced · ${form.dragChainConfig.linksPerSet} links/set × ${form.dragChainConfig.quantity || 1} sets`
                      : 'Auto-synced'
                  }
                >
                  <Input
                    type="number"
                    placeholder="e.g. 22, 44"
                    value={form.dragChainConfig.totalCalculatedLinks || form.dragChainConfig.numberOfLinks || ''}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.numberOfLinks', e.target.value))}
                  />
                </Field>

                {/* 7. Length per set */}
                <Field label="Length per Set (mm / m)" hint="Single set length">
                  <Input
                    list="chain-length-presets"
                    placeholder="e.g. 1000 MM, 1.5 M"
                    value={form.dragChainConfig.length}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.length', e.target.value))}
                  />
                  <datalist id="chain-length-presets">
                    <option value="500 MM" />
                    <option value="1000 MM" />
                    <option value="1500 MM" />
                    <option value="2000 MM" />
                    <option value="2500 MM" />
                    <option value="3000 MM" />
                    <option value="4000 MM" />
                    <option value="5000 MM" />
                    <option value="1.0 M" />
                    <option value="1.5 M" />
                    <option value="2.0 M" />
                    <option value="2.5 M" />
                    <option value="3.0 M" />
                  </datalist>
                </Field>

                {/* 8. Quantity (number of sets required by customer) */}
                <Field
                  label="Quantity (No. of Sets)"
                  required
                  hint={`Total: ${form.dragChainConfig.totalMeters || (form.dragChainConfig.quantity || 1)} Meters (${form.dragChainConfig.totalCalculatedLinks || 22} links total)`}
                >
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={form.dragChainConfig.quantity}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10)))}
                    style={{ fontWeight: 700 }}
                  />
                </Field>

                {/* 9. Mounting bracket type */}
                <Field label="Mounting Bracket Type">
                  <Select
                    value={form.dragChainConfig.mountingBracketType}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.mountingBracketType', e.target.value))}
                  >
                    <option value="">-- Select Bracket --</option>
                    <option value="B-BOX">B-BOX Type ({formatMountingBracketCode('B-BOX', form.dragChainConfig.modelNumber || '35.1')})</option>
                    <option value="L-ANGULAR">L-ANGULAR Type ({formatMountingBracketCode('L-ANGULAR', form.dragChainConfig.modelNumber || '35.1')})</option>
                    <option value="LSR(P)">LSR (P) — Plastic Angular Strain Relief ({formatMountingBracketCode('LSR(P)', form.dragChainConfig.modelNumber || '35.1')})</option>
                    <option value="LSR(M)">LSR (M) — Metal Angular Strain Relief ({formatMountingBracketCode('LSR(M)', form.dragChainConfig.modelNumber || '35.1')})</option>
                    <option value="SRP-25">SRP-25</option>
                    <option value="SRP-35">SRP-35</option>
                    <option value="SRP-50">SRP-50</option>
                  </Select>
                </Field>

                {/* 10. Separator / divider */}
                <Field label="Separator / Divider" hint="Cable partition">
                  <Select
                    value={form.dragChainConfig.accessories || ''}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.accessories', e.target.value))}
                  >
                    <option value="">-- None / Not Required --</option>
                    <option value="VS">VS — Vertical Separator / Divider</option>
                    <option value="HS">HS — Horizontal Separator / Divider</option>
                    <option value="HS+VS">HS + VS — Both Horizontal & Vertical Separator / Divider</option>
                  </Select>
                </Field>

                {/* 11. Base price / meter — editable */}
                <Field label="Base Rate / Meter (₹)" required hint="Editable rate">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 1200"
                    value={form.dragChainConfig.ratePerMeter ?? form.ratePerMeter ?? 1200}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.ratePerMeter', parseFloat(e.target.value) || 0))}
                    style={{ fontWeight: 700 }}
                  />
                </Field>

                {/* 12. Sales discount % — adjustable */}
                <Field label="Sales Discount (%)" hint="Sales adjustable">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="0%"
                    value={form.dragChainConfig.discountPercent ?? form.discountPercent ?? 0}
                    onChange={e => setForm(recalculateAll(form, 'dragChainConfig.discountPercent', parseFloat(e.target.value) || 0))}
                    style={{ borderColor: 'color-mix(in srgb, var(--success) 50%, transparent)', fontWeight: 700, color: 'var(--success)' }}
                  />
                </Field>
              </FormGrid>

              {/* Live Calculation Summary Breakdown */}
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  background: 'var(--success-soft)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
                    Gross ({form.dragChainConfig.totalMeters || 1}m × ₹{form.dragChainConfig.ratePerMeter || 1200})
                  </div>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-primary)' }}>₹{(form.grossAmount || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--success)' }}>Discount ({form.discountPercent || 0}%)</div>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--success)' }}>-₹{(form.discountAmount || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--c-blue)' }}>Taxable Amount</div>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--c-blue)' }}>₹{(form.totalAmount || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>GST ({form.taxRate || 18}%)</div>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-primary)' }}>+₹{(form.gstAmount || 0).toLocaleString()}</div>
                </div>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                  }}
                >
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--success)', fontWeight: 700 }}>Grand Total</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--success)' }}>₹{(form.grandTotal || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Live Preview — the formed product code (length × set quantity) */}
              {form.dragChainConfig.modelNumber && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Order model code</div>
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--primary)', fontWeight: 700 }}>
                      Length × Set ({form.dragChainConfig.quantity || 1} sets) = {Math.round((form.dragChainConfig.totalMeters || 1) * 1000)}mm
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--fs-md)', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.02em', wordBreak: 'break-word' }}>
                    {formatDragChainOrderCode({ ...form.dragChainConfig, quantity: form.dragChainConfig.quantity })}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* Sales Confidential Logistics & Courier Details (hidden for Leads, Quotations & PI) */}
          {!isQuotation && !isPI && !isLead && (
            <Panel icon={<LuTruck />} title="Logistics & Courier Details" tone="blue" meta="Sales only — hidden from Dispatch">
              <FormGrid>
                <Field label="Courier / Transport Partner">
                  <Input placeholder="e.g. DTDC, Blue Dart, V-Trans" value={form.courierPartner} onChange={e => setForm(p => ({ ...p, courierPartner: e.target.value }))} />
                </Field>
                <Field label="Tracking / Docket / AWB No">
                  <Input placeholder="Tracking or Consignment No" value={form.trackingNumber} onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))} />
                </Field>
                <Field label="Shipping Date">
                  <Input type="date" value={form.shippingDate} onChange={e => setForm(p => ({ ...p, shippingDate: e.target.value }))} />
                </Field>
                <Field label="Est. Delivery Date">
                  <Input type="date" value={form.estimatedDeliveryDate} onChange={e => setForm(p => ({ ...p, estimatedDeliveryDate: e.target.value }))} />
                </Field>
                <Field label="Shipping Charges (₹)">
                  <Input type="number" placeholder="0" value={form.shippingCharges} onChange={e => setForm(p => ({ ...p, shippingCharges: Number(e.target.value) }))} />
                </Field>
                <Field label="Freight Terms">
                  <Select value={form.freightTerms} onChange={e => setForm(p => ({ ...p, freightTerms: e.target.value }))}>
                    <option value="">Select Freight Terms</option>
                    <option value="paid_by_us">Paid by Us (Included)</option>
                    <option value="to_pay">To Pay (Customer Pays)</option>
                    <option value="billed_to_customer">Billed to Customer Extra</option>
                    <option value="paid_by_sender">Paid by Sender</option>
                    <option value="to_pay_customer">To-Pay by Customer</option>
                    <option value="included_in_invoice">Included in Invoice</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="fob">FOB Factory</option>
                    <option value="cif">CIF Destination</option>
                  </Select>
                </Field>
                <Field label="Logistics / Delivery Remarks" span="all">
                  <Input placeholder="e.g. Handle with care, delivery via local branch" value={form.logisticRemarks} onChange={e => setForm(p => ({ ...p, logisticRemarks: e.target.value }))} />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* Change Reason & Audit Note (when editing) */}
          {editingId && (
            <Panel icon={<LuClipboardList />} title="Change Reason / Audit Note" meta="Optional">
              <FormGrid>
                <Field label="Recorded in the audit trail" span="all">
                  <Input
                    placeholder="e.g. Client increased length by 2m / price discount authorized per agreement"
                    value={form.changeReason || ''}
                    onChange={e => setForm(p => ({ ...p, changeReason: e.target.value }))}
                  />
                </Field>
              </FormGrid>
            </Panel>
          )}

          {/* Financial & Credit Days (hidden for Leads) */}
          {!isLead && (
            <FormGrid style={{ marginBottom: 6 }}>
              <Field
                label={isQuotation ? 'Quotation Value / Approx (₹)' : isPI ? 'Proforma Total Value (₹)' : modalDocTab === 'challan' ? 'Goods Value / Approx (₹)' : 'Total Taxable Amount (₹)'}
                hint={isDragChain ? 'Calculated from the chain configuration' : undefined}
              >
                <Input
                  type="number"
                  readOnly={isDragChain}
                  value={form.totalAmount}
                  onChange={e => handleAmountChange(e.target.value)}
                  style={isDragChain ? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' } : undefined}
                />
              </Field>
              <Field label="Credit Days (PDF)">
                <Input type="number" value={form.creditDays} onChange={e => setForm(p => ({ ...p, creditDays: Number(e.target.value) }))} placeholder="30" />
              </Field>
              <Field label="Credit Due Date">
                <Input type="date" value={form.creditDueDate} onChange={e => setForm(p => ({ ...p, creditDueDate: e.target.value }))} />
              </Field>
            </FormGrid>
          )}
        </form>
      </Dialog>

      {/* FOLLOW-UP NOTES MODAL */}
      <Dialog
        open={!!(showFollowUpModal && followUpRecord)}
        onClose={() => setShowFollowUpModal(false)}
        title={followUpRecord ? `Follow-ups for ${followUpRecord.customerName}` : 'Follow-ups'}
        subtitle="Visit notes, calls and commitments recorded against this record."
        footer={
          <>
            <Button variant="cancel" onClick={() => setShowFollowUpModal(false)}>Close</Button>
            <Button type="submit" form="follow-up-form" variant="primary" icon={<LuPlus />}>Add Note</Button>
          </>
        }
      >
        <div
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            marginBottom: 14,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            background: 'var(--bg-subtle)',
          }}
        >
          {!followUpRecord?.followUps || followUpRecord.followUps.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>No follow-up notes yet.</div>
          ) : (
            followUpRecord.followUps.map((f, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i === followUpRecord.followUps.length - 1 ? 'none' : '1px solid var(--border)',
                  paddingBottom: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)' }}>{f.note}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(f.date).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <form id="follow-up-form" onSubmit={handleAddFollowUp}>
          <Field label="New follow-up note">
            <Textarea
              rows={3}
              required
              placeholder="Add follow-up / visit note…"
              value={followUpNote}
              onChange={e => setFollowUpNote(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>

      {/* AUDIT LOG HISTORY DRAWER */}
      <Drawer
        open={!!(showAuditModal && auditRecord)}
        onClose={() => setShowAuditModal(false)}
        wide
        title="Audit Log & Change History"
        subtitle={auditRecord ? `${auditRecord.customerName}${auditRecord.salesOrderNumber ? ` · ${auditRecord.salesOrderNumber}` : ''}` : ''}
        footer={<Button variant="secondary" onClick={() => setShowAuditModal(false)}>Close</Button>}
      >
        {loadingAudit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton h={56} radius="var(--radius-lg)" />
            <Skeleton h={56} radius="var(--radius-lg)" />
            <Skeleton h={56} radius="var(--radius-lg)" />
          </div>
        ) : (!auditRecord?.auditLogs || auditRecord.auditLogs.length === 0) ? (
          <EmptyState
            icon={<LuHistory />}
            title="No history yet"
            text="No changes have been logged for this record."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditRecord.auditLogs.map((log, idx) => {
              const ac = AUDIT_ACTIONS[log.action] || AUDIT_ACTIONS.updated;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone={ac.tone}>{ac.label}</Badge>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <LuUser /> {log.changedByName || log.changedBy?.name || 'Authorized User'}
                      </span>
                      {(log.changedByRole || log.changedBy?.role) && (
                        <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
                          ({log.changedByRole || log.changedBy?.role})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <LuClock /> {new Date(log.changedAt).toLocaleString()}
                    </span>
                  </div>

                  {log.note && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--primary)', fontStyle: 'italic', marginBottom: 8 }}>
                      “{log.note}”
                    </div>
                  )}

                  {log.changesSummary && log.changesSummary.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                      {log.changesSummary.map((ch, i) => (
                        <li key={i} style={{ marginBottom: 3 }}>{ch}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* DOCUMENT PREVIEW & PRINT MODAL */}
      {showPreviewModal && previewRecord && (() => {
        const isQuote = previewRecord.stage === 'quotation' || previewRecord.orderDocumentType === 'quotation';
        const isPi = previewRecord.stage === 'pi' || previewRecord.orderDocumentType === 'pi';
        const isStandardBill = previewRecord.orderDocumentType === 'standard_bill' || previewRecord.orderDocumentType === 'non_gst_bill';
        const isChallanDoc = previewRecord.orderDocumentType === 'challan' || (!previewRecord.orderDocumentType && previewRecord.challanNumber && !previewRecord.invoiceNumber);
        
        const docTitle = isQuote 
          ? 'SALES QUOTATION / PRICE PROPOSAL' 
          : isPi 
          ? 'PROFORMA INVOICE (PI)' 
          : isStandardBill 
          ? 'STANDARD BILL / RETAIL INVOICE (NON-GST)' 
          : isChallanDoc 
          ? 'DELIVERY CHALLAN (GOODS MOVEMENT)' 
          : 'TAX INVOICE (GST)';

        const docNumber = isQuote 
          ? (previewRecord.quotationNumber || previewRecord.salesOrderNumber || 'QTN-DRAFT')
          : isPi 
          ? (previewRecord.piNumber || previewRecord.salesOrderNumber || 'PI-DRAFT')
          : isStandardBill
          ? (previewRecord.invoiceNumber || previewRecord.salesOrderNumber || 'BILL-DRAFT')
          : isChallanDoc 
          ? (previewRecord.challanNumber || previewRecord.salesOrderNumber || 'DC-DRAFT')
          : (previewRecord.invoiceNumber || previewRecord.salesOrderNumber || 'INV-DRAFT');

        const docDate = previewRecord.invoiceDate || previewRecord.quotationDate || previewRecord.challanDate || previewRecord.createdAt;
        const cfg = previewRecord.items?.[0]?.dragChainConfig || previewRecord.dragChainConfig || {};

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
          }} onClick={e => e.target === e.currentTarget && setShowPreviewModal(false)}>
            {/* Pinned to the light palette: this is a preview of a printed
                document on white paper, so it must not follow a dark theme. */}
            <div data-theme="light" style={{
              background: '#fff', color: '#1e293b', borderRadius: '16px', width: '100%', maxWidth: '850px',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              position: 'relative', fontFamily: 'Inter, system-ui, sans-serif'
            }} onClick={e => e.stopPropagation()}>
              {/* Header Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {isQuote ? '📜' : isPi ? '📑' : isStandardBill ? '📄' : isChallanDoc ? '🚚' : '🧾'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    Document Preview & Print
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => window.print()} 
                    className="btn btn-primary" 
                    style={{ background: 'var(--c-blue)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <LuPrinter /> Print / Save as PDF
                  </button>
                  <button 
                    onClick={() => setShowPreviewModal(false)} 
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    <LuX />
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet Body */}
              <div style={{ padding: '24px 28px', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
                <div id="printable-sales-document" style={{ border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '28px', background: '#fff' }}>
                {/* Title Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-strong)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {user?.organizationId?.name || 'TRACKBELLS AUTOMATION'}
                    </h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '350px' }}>
                      {user?.organizationId?.address || 'Industrial Area, Manufacturing Hub'}
                    </div>
                    {user?.organizationId?.gstin && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                        GSTIN: {user.organizationId.gstin}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block', padding: '6px 14px', borderRadius: '6px',
                      background: isStandardBill ? 'var(--success-soft)' : isChallanDoc ? 'var(--c-violet-soft)' : isQuote ? 'var(--c-blue-soft)' : isPi ? 'var(--warning-soft)' : 'var(--c-blue-soft)',
                      color: isStandardBill ? 'var(--success)' : isChallanDoc ? 'var(--c-violet)' : isQuote ? 'var(--c-blue)' : isPi ? 'var(--warning)' : 'var(--c-blue)',
                      border: `1px solid ${isStandardBill ? 'var(--success-soft)' : isChallanDoc ? 'var(--c-violet-soft)' : isQuote ? 'var(--c-blue-soft)' : isPi ? 'var(--warning-soft)' : 'var(--c-blue-soft)'}`,
                      fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.5px'
                    }}>
                      {docTitle}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                      Doc No: {docNumber}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Date: {new Date(docDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Customer & Billing / Shipping Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {isChallanDoc ? 'CONSIGNEE / RECIPIENT' : 'BILLED TO:'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{previewRecord.customerName}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {previewRecord.billingAddress || previewRecord.customerAddress || 'Address on file'}
                    </div>
                    {previewRecord.customerContact && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        📞 Contact: {previewRecord.customerContact}
                      </div>
                    )}
                    {previewRecord.customerGST && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-blue)', marginTop: '3px' }}>
                        GSTIN: {previewRecord.customerGST}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {isChallanDoc ? 'DISPATCH & LOGISTICS' : 'SHIPPED TO / REF:'}
                    </div>
                    {isChallanDoc ? (
                      <>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          🚚 Vehicle: {previewRecord.vehicleNumber || 'Assigned Carrier'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Mode: {previewRecord.transportMode || 'Road'} | Purpose: {previewRecord.challanType?.replace(/_/g, ' ') || 'Supply'}
                        </div>
                        {(previewRecord.lrNumber || previewRecord.eWayBillNumber) && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            LR/EWB #: {previewRecord.lrNumber || previewRecord.eWayBillNumber}
                          </div>
                        )}
                        {previewRecord.receiverName && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Receiver: {previewRecord.receiverName}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {previewRecord.shippingAddress || previewRecord.billingAddress || previewRecord.customerAddress || 'Same as billing address'}
                        </div>
                        {previewRecord.salesOrderNumber && (
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                            Sales Order: {previewRecord.salesOrderNumber}
                          </div>
                        )}
                        {previewRecord.customerPoNumber && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Customer PO: {previewRecord.customerPoNumber}
                          </div>
                        )}
                        {previewRecord.paymentTerms && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Payment Terms: {previewRecord.paymentTerms}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '4px 0 0 0' }}>#</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item Description & Specification</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>HSN</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Taxable (₹)</th>
                      {!isStandardBill && !isChallanDoc && <th style={{ padding: '8px 12px', textAlign: 'right' }}>GST %</th>}
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRadius: '0 4px 0 0' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((previewRecord.items && previewRecord.items.length > 0) ? previewRecord.items : [previewRecord]).map((item, idx) => {
                      const itemCfg = item.dragChainConfig || cfg;
                      const specDesc = formatDragChainOrderCode(itemCfg) || item.description || item.modelNumber || 'Standard Industrial Product';
                      const bracketDesc = formatMountingBracketCode(itemCfg);
                      const itemQty = item.quantity || itemCfg.quantity || 1;
                      const itemRate = item.unitPrice || previewRecord.ratePerMeter || itemCfg.ratePerMeter || 1200;
                      const itemGross = previewRecord.grossAmount || (itemQty * itemRate);
                      const itemTaxable = previewRecord.totalAmount || itemGross;
                      const itemTotal = isStandardBill || isChallanDoc ? itemTaxable : (previewRecord.grandTotal || itemTaxable);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              {item.modelNumber || itemCfg.modelNumber || 'Standard Product'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {specDesc}
                            </div>
                            {bracketDesc && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Mounting Bracket: {bracketDesc}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                            {previewRecord.hsnCode || '8483'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, verticalAlign: 'top' }}>
                            {itemQty} {item.unit || (isDragChain ? 'Mtr' : 'Pcs')}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                            ₹{Number(itemRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                            ₹{Number(itemTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          {!isStandardBill && !isChallanDoc && (
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                              {previewRecord.taxRate ?? 18}%
                            </td>
                          )}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', verticalAlign: 'top' }}>
                            ₹{Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial Totals & Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '16px' }}>
                  <div>
                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        TERMS & CONDITIONS / NOTES:
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        1. Goods once sold will not be taken back without prior authorization.<br />
                        2. {isStandardBill ? 'Standard Bill of Supply issued without GST charge (0% Tax / Exempted).' : isChallanDoc ? 'Goods dispatched for transportation/delivery purpose only.' : 'GST charged as per applicable Govt GST slabs.'}<br />
                        3. Payment Due: {previewRecord.creditDays || 30} Days ({previewRecord.creditDueDate ? new Date(previewRecord.creditDueDate).toLocaleDateString('en-IN') : 'From Invoice Date'}).
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>Subtotal (Gross):</span>
                      <span style={{ fontWeight: 600 }}>₹{Number(previewRecord.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {Number(previewRecord.discountAmount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--success)', marginBottom: '6px' }}>
                        <span>Discount ({previewRecord.discountPercent}%):</span>
                        <span>-₹{Number(previewRecord.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>Taxable Amount:</span>
                      <span style={{ fontWeight: 700 }}>₹{Number(previewRecord.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {isStandardBill || isChallanDoc ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--success)', marginBottom: '6px', fontWeight: 600 }}>
                        <span>GST (0% Non-GST / Exempt):</span>
                        <span>₹0.00</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--c-blue)', marginBottom: '6px', fontWeight: 600 }}>
                        <span>GST ({previewRecord.taxRate ?? 18}%):</span>
                        <span>₹{Number(previewRecord.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {Number(previewRecord.shippingCharges) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Shipping / Freight:</span>
                        <span>₹{Number(previewRecord.shippingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div style={{ borderTop: '2px solid var(--border-strong)', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      <span>Grand Total:</span>
                      <span>₹{Number(previewRecord.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-ghost)' }}>
                    Generated by: {user?.name || 'Sales Officer'} | System Timestamp: {new Date().toLocaleString('en-IN')}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '180px', borderBottom: '1px solid var(--border-strong)', marginBottom: '6px' }}></div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Authorized Signatory</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>For {user?.organizationId?.name || 'TrackBells'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
    </div>
  );
}
