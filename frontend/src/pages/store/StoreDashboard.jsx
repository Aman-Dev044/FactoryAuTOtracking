import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api, { operationsAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import {
  LuBoxes, LuClipboardCheck, LuPlus, LuRefreshCw, LuCircleCheck, LuUsersRound,
  LuCircleX, LuClipboardList, LuTruck, LuPencil, LuTrash2, LuPackage,
  LuTriangleAlert, LuSend, LuWarehouse, LuSettings2, LuHammer, LuScanLine,
  LuExternalLink, LuShieldCheck, LuCircleAlert, LuUserCheck,
  LuEye,
} from 'react-icons/lu';
import { getIndustryConfig } from '../../config/industryConfig';

import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import DispatchTab from './DispatchTab';
import { generateMergedProductName, formatMountingBracketCode } from '../../utils/productNameHelper';
import DynamicFormEngine from '../../components/common/DynamicFormEngine';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Drawer, Dialog, Field, Input, Textarea, Select,
  Button, Badge, EmptyState, Tabs,
} from '../../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

// Clean incremental radii list in steps of 5: 5, 10, 15, 20 ... up to 700
const BENDING_RADII_OPTIONS = Array.from({ length: 140 }, (_, i) => String((i + 1) * 5));

const isValidModelNumber = (modelNumber) => {

  if (!modelNumber || typeof modelNumber !== 'string') return false;
  const str = modelNumber.trim();
  if (!str || !isNaN(Number(str))) return false;
  const lower = str.toLowerCase();
  const excludeWords = [
    'gland', 'clamp', 'nut', 'lock', 'total mtr', 'end part', 'angular',
    'divider', 'upper part', 'end connector', 'mix', 'small lock', 'strip lock'
  ];
  if (excludeWords.some(w => lower.includes(w))) return false;
  return /^(H[-0-9]|10X|15X|20X|21\.1|22X|24\.|25X|25\/|25-|2627\.|3435\.|35X|35XR|42\.1|42X|45X|45XR|56\.1|60X|60XR)/i.test(str);
};

/* ------------------------------------------------- small cell presenters */

/** `sent_for_qc` reads badly in a detail pane — show "Sent for qc". */
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

const MutedCell = ({ children }) => (
  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{children}</span>
);

const NumCell = ({ value, unit, tone }) => (
  <span style={{ fontWeight: 700, color: tone || 'var(--text-primary)', whiteSpace: 'nowrap' }}>
    {value}
    {unit ? <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}> {unit}</span> : null}
  </span>
);

/** Wraps in-row controls so a row click (detail drawer) does not fire. */
const RowActions = ({ children }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', flexWrap: 'wrap' }}
  >
    {children}
  </div>
);

const StoreDashboard = () => {

  const { user } = useAuth();
  // Currency follows the tenant's country setting.
  const { formatCurrency } = useOrg();
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const industryConfig = getIndustryConfig(subIndustryId);
  const [dynamicInventoryFields, setDynamicInventoryFields] = useState([]);
  const isDragChain = subIndustryId === 'drag_chain';

  // Fetch dynamic domain schema
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await api.get(`/domain/schema/${subIndustryId}`);
        const moduleSchema = res.data.find(s => s.moduleKey === 'storeManagerFields' || s.moduleKey === 'inventoryFields');
        if (moduleSchema) {
          setDynamicInventoryFields(moduleSchema.fields);
        }
      } catch (err) {
        console.error('Failed to load dynamic domain schema', err);
      }
    };
    if (subIndustryId) {
      fetchSchema();
    }
  }, [subIndustryId]);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'qc_verification', 'sbs_logs', 'assignment'

  const [inventory, setInventory] = useState([]);
  const [qualityLogs, setQualityLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [orderShortages, setOrderShortages] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Pagination states (10 items per page)
  const [invPage, setInvPage] = useState(1);
  const [qcPage, setQcPage] = useState(1);
  const [sbsPage, setSbsPage] = useState(1);

  // Presentation-only view state (filters + detail drawer)
  const [invTypeFilter, setInvTypeFilter] = useState('all');
  const [sbsSearch, setSbsSearch] = useState('');
  const [sbsTypeFilter, setSbsTypeFilter] = useState('all');
  const [qcSearch, setQcSearch] = useState('');
  const [qcStatusFilter, setQcStatusFilter] = useState('all');
  const [detailItem, setDetailItem] = useState(null);

  // Sockets for Handshake Popup
  const [handshakeJob, setHandshakeJob] = useState(null);
  const [rackLocation, setRackLocation] = useState('Rack A - Bin 1');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    type: 'finished_good',
    quantity: 0,
    minStock: 100,
    maintainedQuantity: 100,
    unitPrice: 0,
    unit: 'meters',
    location: 'Unassigned',

    size: '',
    width: '',
    description: '',
    modelNumber: '',
    rack: '',
    radius: '',
    chainType: 'OP',
    numberOfLinks: '',
    length: '',
    mountingBracketType: '',
    accessories: '',
    series: 'N/A',
    metadata: {}  // Dynamic industry-specific fields
  });

  // QC Log Modal (Store Manager CRUD on QC Logs)
  const [showQcModal, setShowQcModal] = useState(false);
  const [editingQcId, setEditingQcId] = useState(null);
  const [qcForm, setQcForm] = useState({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Shortage/Buy/Sale Modal (Unified Flow)
  const [showSbsModal, setShowSbsModal] = useState(false);
  const [editingSbsId, setEditingSbsId] = useState(null);
  const [isSbsCustomModel, setIsSbsCustomModel] = useState(false);
  const [availableSbsInnerSizes, setAvailableSbsInnerSizes] = useState([]);
  const [availableSbsRadii, setAvailableSbsRadii] = useState([]);
  const [sbsForm, setSbsForm] = useState({
    type: 'shortage',
    itemName: '',
    itemType: 'finished_good',
    quantity: 0,
    unitPrice: 0,
    unit: 'meters',
    modelNumber: '',
    size: '',
    description: '',
    radius: 'N/A',
    designType: 'OP',
    vs: 'N/A',
    hs: 'N/A',
    sr: 'N/A',
    assignedTo: 'unassigned',
    remarks: ''
  });

  // Send to PM Modal State
  const [showSendToPmModal, setShowSendToPmModal] = useState(false);
  const [selectedPmItem, setSelectedPmItem] = useState(null);
  const [pmStoreRemarks, setPmStoreRemarks] = useState('');

  const handleSendToPmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPmItem) return;
    setSubmitting(true);
    try {
      await operationsAPI.updateInventoryItem(selectedPmItem._id, {
        productionStatus: 'sent_to_pm',
        storeRemarks: pmStoreRemarks,
        sentToPmAt: new Date()
      });
      toast.success('Successfully sent shortage request to Production Manager!');
      setShowSendToPmModal(false);
      setSelectedPmItem(null);
      setPmStoreRemarks('');
      fetchData();
    } catch (err) {
      toast.error('Failed to send to Production Manager');
    } finally {
      setSubmitting(false);
    }
  };

  // Task Assignment form
  const [selectedSbsId, setSelectedSbsId] = useState('');
  const [assigneeRole, setAssigneeRole] = useState('supervisor');

  const getRequiredQty = (item) => {
    let required = 0;
    const itemIdStr = item._id ? item._id.toString() : '';
    const itemNameLower = (item.name || '').toLowerCase().trim();
    const itemModelLower = (item.modelNumber || '').toLowerCase().trim();

    // 1. Calculate from active buildJobs (Order Product Build)
    buildJobs.forEach(job => {
      if (['pending', 'processing', 'shortage_reported', 'assigned'].includes(job.status)) {
        const jobInvId = job.inventoryItemId ? (job.inventoryItemId._id || job.inventoryItemId).toString() : '';
        const matchesId = itemIdStr && jobInvId && itemIdStr === jobInvId;
        const jobNameLower = (job.productName || '').toLowerCase().trim();
        const jobModelLower = (job.modelNumber || '').toLowerCase().trim();

        const matchesModel = itemModelLower && (
          (jobModelLower && jobModelLower === itemModelLower) ||
          (jobNameLower && jobNameLower.includes(itemModelLower))
        );
        const matchesName = itemNameLower && jobNameLower && (jobNameLower.includes(itemNameLower) || itemNameLower.includes(jobNameLower));

        if (matchesId || matchesModel || matchesName) {
          required += Number(job.orderQuantity) || 0;
        }
      }
    });

    // 2. Calculate from sbsLogs (ShortageBuySale)
    sbsLogs.forEach(log => {
      // Prevent double-counting: skip shortage logs that are linked to active BuildJobs (since BuildJob orderQuantity is already counted)
      const isLinkedToActiveBuildJob = buildJobs.some(job => {
        if (!['pending', 'processing', 'shortage_reported', 'assigned'].includes(job.status)) return false;
        const jobShortageId = job.shortageLogId ? (job.shortageLogId._id || job.shortageLogId).toString() : '';
        const logIdStr = log._id ? log._id.toString() : '';
        return jobShortageId && logIdStr && jobShortageId === logIdStr;
      });

      if (!isLinkedToActiveBuildJob && ['shortage', 'buy'].includes(log.type) && ['pending', 'assigned', 'ordered'].includes(log.status)) {
        const logInvId = log.inventoryItemId ? (log.inventoryItemId._id || log.inventoryItemId).toString() : '';
        const matchesId = itemIdStr && logInvId && itemIdStr === logInvId;
        const logItemLower = (log.itemName || '').toLowerCase().trim();
        const logModelLower = (log.modelNumber || '').toLowerCase().trim();

        const matchesModel = itemModelLower && logModelLower && itemModelLower === logModelLower;
        const matchesName = logItemLower && itemNameLower && (logItemLower.includes(itemNameLower) || itemNameLower.includes(logItemLower));

        if (matchesId || matchesModel || matchesName) {
          required += Number(log.quantity) || 0;
        }
      }
    });

    // 3. Calculate from orderShortages (ShortageReport)
    orderShortages.forEach(s => {
      if (['pending_planning', 'pending'].includes(s.status) && s.modelNumber) {
        const sModelLower = s.modelNumber.toLowerCase().trim();
        const matchesName = itemNameLower && (sModelLower.includes(itemNameLower) || itemNameLower.includes(sModelLower));
        const matchesModel = itemModelLower && (sModelLower.includes(itemModelLower) || itemModelLower.includes(sModelLower));
        if (matchesName || matchesModel) {
          required += Number(s.shortageMeters) || 0;
        }
      }
    });

    return required;
  };


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, qcRes, sbsRes, buildRes, shortRes, tempRes] = await Promise.all([
        operationsAPI.getInventory(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales(),
        operationsAPI.getBuildJobs(),
        orderAPI.getShortages(),
        operationsAPI.getProductTemplates()
      ]);
      setInventory(invRes.data.data);
      setQualityLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
      setBuildJobs(buildRes.data.data);
      setOrderShortages(shortRes.data.data);
      setProductTemplates(tempRes.data.data);
    } catch (err) {
      toast.error('Failed to load store operations data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('product_sent_to_store', (data) => {
        setHandshakeJob(data);
        toast('New Finished Product Dispatched from Production!', { icon: '🏭' });
      });

      socket.on('inventory_updated', fetchData);
      socket.on('quality_updated', fetchData);
      socket.on('communication_updated', fetchData);
      socket.on('build_updated', fetchData);
      socket.on('product_templates_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // Inventory CRUD
  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItemId) {
        await operationsAPI.updateInventoryItem(editingItemId, itemForm);
        toast.success('Inventory item updated');
      } else {
        await operationsAPI.createInventoryItem(itemForm);
        toast.success('Inventory item created');
      }

      // If finished good and model is valid custom/new model, auto-save to product templates (Only for Drag Chain)
      if (isDragChain && itemForm.modelNumber && itemForm.type === 'finished_good' && isValidModelNumber(itemForm.modelNumber)) {
        const exists = productTemplates.some(t => t.modelNumber.toLowerCase() === itemForm.modelNumber.toLowerCase());
        if (!exists) {
          try {
            await operationsAPI.createProductTemplate({
              modelNumber: itemForm.modelNumber,
              name: itemForm.name,
              rack: itemForm.rack || 'Unassigned',
              unit: itemForm.unit,
              innerSize: itemForm.size || 'N/A',
              radius: itemForm.radius || 'N/A',
              designType: itemForm.designType || 'N/A',
              vs: itemForm.vs || 'N/A',
              hs: itemForm.hs || 'N/A',
              sr: itemForm.sr || 'N/A',
              series: itemForm.series || 'N/A'
            });
          } catch (tempErr) {
            console.error('Failed to auto-save product template:', tempErr);
          }
        }
      }

      setShowItemModal(false);
      setItemForm({
        name: '',
        type: 'finished_good',
        quantity: 0,
        minStock: 100,
        maintainedQuantity: 100,
        unitPrice: 0,
        unit: isDragChain ? 'meters' : 'pcs',
        location: 'Unassigned',

        size: '',
        description: '',
        modelNumber: '',
        rack: '',
        radius: 'N/A',
        designType: 'N/A',
        vs: 'N/A',
        hs: 'N/A',
        sr: 'N/A',
        series: 'N/A',
        metadata: {}
      });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (item) => {
    const matchesTemplate = productTemplates.some(t => t.modelNumber === item.modelNumber);
    setIsCustomModel(!!item.modelNumber && !matchesTemplate);
    setItemForm({
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      minStock: item.minStock || item.maintainedQuantity || 0,
      maintainedQuantity: item.maintainedQuantity || item.minStock || 0,
      unitPrice: item.unitPrice || 0,
      unit: item.unit,
      location: item.location || 'Unassigned',

      size: item.size || '',
      description: item.description || '',
      modelNumber: item.modelNumber || '',
      warehouseLocation: item.warehouseLocation || '',
      almirah: item.almirah || '',
      rack: item.rack || '',
      radius: item.radius || 'N/A',
      designType: item.designType || 'N/A',
      vs: item.vs || 'N/A',
      hs: item.hs || 'N/A',
      sr: item.sr || 'N/A',
      series: item.series || 'N/A',
      metadata: item.metadata || {}
    });
    setEditingItemId(item._id);
    setShowItemModal(true);
  };

  // Catalog cascading states
  const [availableInnerSizes, setAvailableInnerSizes] = useState([]);
  const [availableRadii, setAvailableRadii] = useState([]);
  const [autoAlmirahOptions, setAutoAlmirahOptions] = useState([]);
  const [autoRackOptions, setAutoRackOptions] = useState([]);
  const [excelAlmirahFound, setExcelAlmirahFound] = useState('');

  const getExcelCodeBeforeX = (excelModelStr) => {
    if (!excelModelStr) return '';
    const s = excelModelStr.trim().toUpperCase();
    const parts = s.split(/[Xx]/);
    const beforeX = parts[0].trim();
    return beforeX.replace(/^H[-_\s]?/, '').trim();
  };

  const getSmartRackAndAlmirahInfo = useCallback((modelQuery, sizeQuery, radiusQuery, selectedAlm = '') => {
    const rawQuery = (modelQuery || sizeQuery || '').trim();
    if (!rawQuery) return { almirahs: [], selectedAlmirah: '', rackOptions: [] };

    const upperInput = rawQuery.toUpperCase();

    // 1. Compound decimal codes first e.g. 24.25.1, 2627.35.1, 3435.45.1
    const compMatch = upperInput.match(/\d{4,}\.\d+\.\d+|\d{2}\.\d{2}\.\d+/);
    const decMatch = upperInput.match(/\d+\.\d+/);
    const intMatch = upperInput.match(/\d{2,3}/);

    let targetCode = '';
    let isDecimalOrCompound = false;

    if (compMatch) {
      targetCode = compMatch[0];
      isDecimalOrCompound = true;
    } else if (decMatch) {
      targetCode = decMatch[0];
      isDecimalOrCompound = true;
    } else if (intMatch) {
      targetCode = intMatch[0];
      isDecimalOrCompound = false;
    } else {
      targetCode = upperInput;
      isDecimalOrCompound = false;
    }

    let matched = productTemplates.filter(item => {
      const modelStr = (item.modelNumber || item.name || '').toUpperCase();
      return modelStr.includes(targetCode);
    });

    if (matched.length === 0) {
      return { almirahs: [], selectedAlmirah: '', rackOptions: [] };
    }

    const almirahs = Array.from(new Set(matched.map(m => m.almirah || m.location || 'Almirah 1').filter(Boolean)));
    const activeAlmirah = (selectedAlm && almirahs.includes(selectedAlm)) ? selectedAlm : almirahs[0] || 'Almirah 1';

    const rackOptions = Array.from(
      new Set(matched.map(m => m.rack || 'Rack 1').filter(Boolean))
    ).sort();

    return { almirahs, selectedAlmirah: activeAlmirah, rackOptions };
  }, [productTemplates]);

  useEffect(() => {
    if (!itemForm.modelNumber && !itemForm.size) {
      setAutoAlmirahOptions([]);
      setAutoRackOptions([]);
      setExcelAlmirahFound('');
      return;
    }
    const { almirahs, selectedAlmirah, rackOptions } = getSmartRackAndAlmirahInfo(itemForm.modelNumber, itemForm.size, itemForm.radius, itemForm.almirah);
    if (selectedAlmirah) {
      setExcelAlmirahFound(selectedAlmirah);
      setAutoAlmirahOptions(almirahs);
      setAutoRackOptions(rackOptions);
      setItemForm(prev => ({
        ...prev,
        almirah: prev.almirah && almirahs.includes(prev.almirah) ? prev.almirah : selectedAlmirah,
        rack: rackOptions.length > 0 ? (rackOptions.includes(prev.rack) ? prev.rack : rackOptions[0]) : prev.rack
      }));
    } else {
      setExcelAlmirahFound('');
      setAutoAlmirahOptions([]);
      setAutoRackOptions([]);
    }
  }, [itemForm.modelNumber, itemForm.size, itemForm.radius, getSmartRackAndAlmirahInfo]);

  // Auto-generate merged Product Name for itemForm whenever specs change
  useEffect(() => {
    if (itemForm.modelNumber) {
      const mergedName = generateMergedProductName({
        modelNumber: itemForm.modelNumber,
        size: itemForm.size,
        radius: itemForm.radius,
        designType: itemForm.designType,
        vs: itemForm.vs,
        hs: itemForm.hs,
        sr: itemForm.sr
      });
      if (mergedName && mergedName !== itemForm.name) {
        setItemForm(prev => ({ ...prev, name: mergedName }));
      }
    }
  }, [itemForm.modelNumber, itemForm.size, itemForm.radius, itemForm.designType, itemForm.vs, itemForm.hs, itemForm.sr]);

  // Auto-generate merged Product Name for sbsForm whenever specs change
  useEffect(() => {
    if (sbsForm.modelNumber) {
      const mergedName = generateMergedProductName({
        modelNumber: sbsForm.modelNumber,
        size: sbsForm.size,
        radius: sbsForm.radius,
        designType: sbsForm.designType,
        vs: sbsForm.vs,
        hs: sbsForm.hs,
        sr: sbsForm.sr
      });
      if (mergedName && mergedName !== sbsForm.itemName) {
        setSbsForm(prev => ({ ...prev, itemName: mergedName }));
      }
    }
  }, [sbsForm.modelNumber, sbsForm.size, sbsForm.radius, sbsForm.designType, sbsForm.vs, sbsForm.hs, sbsForm.sr]);

  const catalogModelNumbers = useMemo(() => {
    return Array.from(new Set(productTemplates.map(item => item.modelNumber).filter(Boolean)));
  }, [productTemplates]);

  const availableWidths = useMemo(() => {
    if (!itemForm.modelNumber) {
      return Array.from(new Set(productTemplates.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
    }
    const matches = productTemplates.filter(t => t.modelNumber === itemForm.modelNumber);
    const widths = Array.from(new Set(matches.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
    return widths.length > 0 ? widths : Array.from(new Set(productTemplates.map(t => t.width || t.innerSize || t.size).filter(Boolean)));
  }, [productTemplates, itemForm.modelNumber]);

  const availableLinks = useMemo(() => {
    if (!itemForm.modelNumber) {
      return Array.from(new Set(productTemplates.map(t => t.numberOfLinks).filter(Boolean)));
    }
    const matches = productTemplates.filter(t => t.modelNumber === itemForm.modelNumber);
    const links = Array.from(new Set(matches.map(t => t.numberOfLinks).filter(Boolean)));
    return links.length > 0 ? links : Array.from(new Set(productTemplates.map(t => t.numberOfLinks).filter(Boolean)));
  }, [productTemplates, itemForm.modelNumber]);

  const handleModelChange = (modelNum) => {
    if (!modelNum) {
      setItemForm(prev => ({
        ...prev,
        modelNumber: '',
        name: '',
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
    const widthVal = match?.width || match?.innerSize || '';
    const parts = [
      modelNum,
      widthVal,
      rawR ? `R${rawR}` : '',
      match?.chainType || 'OP',
      match?.numberOfLinks ? `${match.numberOfLinks} Links` : '',
      match?.length,
      match?.mountingBracketType,
      match?.accessories
    ].filter(Boolean);
    const generatedName = `Drag Chain ${parts.join(' · ')}`;

    setItemForm(prev => ({
      ...prev,
      modelNumber: modelNum,
      name: generatedName,
      width: widthVal,
      size: widthVal || prev.size,
      radius: rawR || prev.radius || '',
      chainType: match?.chainType || prev.chainType || 'OP',
      numberOfLinks: match?.numberOfLinks || prev.numberOfLinks || '',
      length: match?.length || prev.length || '',
      mountingBracketType: match?.mountingBracketType || prev.mountingBracketType || '',
      accessories: match?.accessories || prev.accessories || '',
      almirah: match?.almirah || prev.almirah || '',
      rack: match?.rack || prev.rack || ''
    }));
  };

  const handleTypeChange = (e) => {
    const typeVal = e.target.value;
    let defaultUnit = 'pcs';
    if (typeVal === 'raw_material') defaultUnit = 'kg';
    else if (typeVal === 'finished_good') defaultUnit = isDragChain ? 'meters' : 'pcs';
    else if (typeVal === 'hardware') defaultUnit = 'pcs';
    else if (typeVal === 'custom') defaultUnit = 'pcs';

    setItemForm(prev => ({
      ...prev,
      type: typeVal,
      unit: defaultUnit
    }));
  };


  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await operationsAPI.deleteInventoryItem(id);
      toast.success('Item deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleSendForQC = async (item) => {
    try {
      await operationsAPI.updateInventoryItem(item._id, {
        qualityStatus: 'sent_for_qc',
        qcRequestedAt: new Date()
      });
      toast.success(`Sent "${item.name}" for Quality Control Check!`);
      fetchData();
    } catch (err) {
      toast.error('Failed to send for quality check');
    }
  };

  // QC Log CRUD (Store Manager full access)
  const handleSaveQcLog = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('materialName', qcForm.materialName);
      formData.append('quantity', qcForm.quantity);
      formData.append('unit', qcForm.unit);
      formData.append('remarks', qcForm.remarks);
      formData.append('qcType', qcForm.qcType);
      formData.append('invoiceNumber', qcForm.invoiceNumber);

      if (invoiceFile) {
        formData.append('invoiceFile', invoiceFile);
      } else {
        formData.append('invoiceUrl', qcForm.invoiceUrl);
      }

      if (editingQcId) {
        await operationsAPI.updateQualityLog(editingQcId, formData);
        toast.success('Quality inspection log updated');
      } else {
        await operationsAPI.createQualityLog(formData);
        toast.success('Quality inspection log created');
      }
      setShowQcModal(false);
      setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
      setInvoiceFile(null);
      setEditingQcId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save quality log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditQcLog = (log) => {
    setQcForm({
      materialName: log.materialName,
      quantity: log.quantity,
      unit: log.unit,
      remarks: log.remarks || '',
      qcType: log.qcType,
      invoiceNumber: log.invoiceNumber || '',
      invoiceUrl: log.invoiceUrl || ''
    });
    setInvoiceFile(null);
    setEditingQcId(log._id);
    setShowQcModal(true);
  };

  const handleDeleteQcLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Quality log?')) return;
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Quality inspection log deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete quality log');
    }
  };

  const handleVerifyQC = async (id) => {
    try {
      await operationsAPI.verifyQualityLog(id);
      toast.success('Quality log verified and inventory adjusted!');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify QC entry');
    }
  };

  // SBS Log Catalog Handlers
  const handleSbsModelChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsSbsCustomModel(true);
      setAvailableSbsInnerSizes([]);
      setAvailableSbsRadii([]);
      setSbsForm(prev => ({ ...prev, modelNumber: '', size: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else if (val === '') {
      setIsSbsCustomModel(false);
      setAvailableSbsInnerSizes([]);
      setAvailableSbsRadii([]);
      setSbsForm(prev => ({ ...prev, modelNumber: '', size: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else {
      setIsSbsCustomModel(false);
      const matches = productTemplates.filter(item => item.modelNumber === val);
      const innerSizes = Array.from(new Set(matches.map(m => m.innerSize)));
      const firstEntry = matches[0];
      setAvailableSbsInnerSizes(innerSizes);
      setAvailableSbsRadii([]);
      setSbsForm(prev => ({
        ...prev, modelNumber: val, size: '', radius: '',
        designType: firstEntry ? firstEntry.designType : 'OP', vs: '', hs: '', sr: ''
      }));
    }
  };

  const handleSbsInnerSizeChange = (e) => {
    const selectedInner = e.target.value;
    const match = productTemplates.find(item => item.modelNumber === sbsForm.modelNumber && (item.innerSize === selectedInner || item.size === selectedInner));
    if (match) {
      setAvailableSbsRadii(match.radii || []);
      const selectedRadius = match.radii && match.radii.length > 0 ? match.radii[0] : '';
      setSbsForm(prev => ({
        ...prev,
        size: selectedInner,
        description: match.outerSize ? `Outer: ${match.outerSize}` : prev.description,
        radius: selectedRadius,
        designType: match.designType || prev.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      }));
    } else {
      setSbsForm(prev => ({ ...prev, size: selectedInner }));
    }
  };

  // Shortage / Buy / Sales Log CRUD
  const handleSaveSbs = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSbsId) {
        await operationsAPI.updateShortageBuySale(editingSbsId, sbsForm);
        toast.success('Communication log updated');
      } else {
        await operationsAPI.createShortageBuySale(sbsForm);
        toast.success('Communication log created & synced to Sales in real-time');
      }
      setShowSbsModal(false);
      setSbsForm({
        type: 'shortage',
        itemName: '',
        itemType: 'raw_material',
        quantity: 0,
        unitPrice: 0,
        unit: 'pcs',
        modelNumber: '',
        size: '',
        description: '',
        radius: 'N/A',
        designType: 'OP',
        vs: 'N/A',
        hs: 'N/A',
        sr: 'N/A',
        assignedTo: 'unassigned',
        remarks: ''
      });
      setIsSbsCustomModel(false);
      setAvailableSbsInnerSizes([]);
      setAvailableSbsRadii([]);
      setEditingSbsId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSbs = (log) => {
    const matchesTemplate = productTemplates.some(t => t.modelNumber === log.modelNumber);
    setIsSbsCustomModel(!!log.modelNumber && !matchesTemplate);
    setSbsForm({
      type: log.type,
      itemName: log.itemName,
      itemType: log.itemType || 'raw_material',
      quantity: log.quantity,
      unitPrice: log.unitPrice || 0,
      unit: log.unit || 'pcs',
      modelNumber: log.modelNumber || '',
      size: log.size || '',
      description: log.description || '',
      radius: log.radius || 'N/A',
      designType: log.designType || 'OP',
      vs: log.vs || 'N/A',
      hs: log.hs || 'N/A',
      sr: log.sr || 'N/A',
      assignedTo: log.assignedTo || 'unassigned',
      remarks: log.remarks || ''
    });
    setEditingSbsId(log._id);
    setShowSbsModal(true);
  };

  const handleDeleteSbs = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await operationsAPI.deleteShortageBuySale(id);
      toast.success('Log entry deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log entry');
    }
  };

  // Handshake verification
  const handleHandshakeSubmit = async (accepted) => {
    try {
      await operationsAPI.receiveProduct(handshakeJob.jobId, { accepted, rackLocation });
      if (accepted) {
        toast.success('Product accepted and stocked in inventory!');
      } else {
        toast.error('Product dispatch rejected!');
      }
      setHandshakeJob(null);
      fetchData();
    } catch (err) {
      toast.error('Handshake failed');
    }
  };

  // Task Assignment
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedSbsId) {
      toast.error('Please select an active shortage/buy log');
      return;
    }
    setSubmitting(true);
    try {
      await operationsAPI.updateShortageBuySale(selectedSbsId, {
        status: 'assigned',
        assignedTo: assigneeRole
      });
      toast.success(`Task successfully assigned to ${assigneeRole.toUpperCase()} in real-time!`);
      setSelectedSbsId('');
      fetchData();
    } catch (err) {
      toast.error('Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.qualityStatus !== 'rejected' && (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
    )
  );

  /* --------------------------------------------- derived, view-only values */

  const pendingQcCount = qualityLogs.filter(l => l.status === 'pending_verification').length;
  const openShortages = sbsLogs.filter(l => l.type === 'shortage' && ['pending', 'assigned', 'ordered'].includes(l.status)).length;
  const lowStockCount = inventory.filter(i => Number(i.quantity || 0) <= Number(i.minStock || i.maintainedQuantity || 0)).length;

  const visibleInventory = invTypeFilter === 'all'
    ? filteredInventory
    : filteredInventory.filter(i => i.type === invTypeFilter);

  const visibleSbsLogs = sbsLogs
    .filter(l => sbsTypeFilter === 'all' || l.type === sbsTypeFilter)
    .filter(l => {
      const q = sbsSearch.trim().toLowerCase();
      if (!q) return true;
      return `${l.itemName || ''} ${l.modelNumber || ''} ${l.assignedTo || ''}`.toLowerCase().includes(q);
    });

  const visibleQcLogs = qualityLogs
    .filter(l => qcStatusFilter === 'all' || l.status === qcStatusFilter)
    .filter(l => {
      const q = qcSearch.trim().toLowerCase();
      if (!q) return true;
      return `${l.materialName || ''} ${l.invoiceNumber || ''} ${l.qcType || ''}`.toLowerCase().includes(q);
    });

  const invTypeChips = [
    { key: 'all', label: 'All types', count: filteredInventory.length },
    { key: 'finished_good', label: 'Finished', count: filteredInventory.filter(i => i.type === 'finished_good').length },
    { key: 'raw_material', label: 'Raw', count: filteredInventory.filter(i => i.type === 'raw_material').length },
    { key: 'hardware', label: 'Hardware', count: filteredInventory.filter(i => i.type === 'hardware').length },
    { key: 'custom', label: 'Custom', count: filteredInventory.filter(i => i.type === 'custom').length },
  ];

  const sbsTypeChips = [
    { key: 'all', label: 'All', count: sbsLogs.length },
    { key: 'shortage', label: 'Shortage', count: sbsLogs.filter(l => l.type === 'shortage').length },
    { key: 'buy', label: 'Buy', count: sbsLogs.filter(l => l.type === 'buy').length },
    { key: 'sale', label: 'Sale', count: sbsLogs.filter(l => l.type === 'sale').length },
  ];

  const qcStatusChips = [
    { key: 'all', label: 'All', count: qualityLogs.length },
    { key: 'pending_verification', label: 'Pending', count: pendingQcCount },
    { key: 'verified', label: 'Verified', count: qualityLogs.filter(l => l.status === 'verified').length },
  ];

  const tabItems = [
    { key: 'inventory', label: 'Unified Inventory', icon: <LuBoxes />, count: inventory.length },
    { key: 'dispatch', label: 'Assembly & Packing', icon: <LuTruck /> },
    { key: 'sbs_logs', label: 'Shortage, Buy & Sales', icon: <LuClipboardList />, count: sbsLogs.length },
    { key: 'qc_verification', label: 'Quality Verification', icon: <LuClipboardCheck />, count: pendingQcCount },
    { key: 'assignment', label: 'Task Assignment', icon: <LuUsersRound /> },
  ];

  /* ------------------------------------------------------------ grid specs */

  const inventoryColumns = [
    {
      key: 'name',
      header: 'Item Name',
      primary: true,
      render: (item) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            {item.modelNumber || 'No model number'}
          </div>
        </div>
      ),
    },
    {
      key: 'modelNumber',
      header: 'Model Number',
      hideBelow: 1280,
      render: (item) => (
        <div style={{ minWidth: 0 }}>
          <MutedCell>{item.modelNumber || 'N/A'}</MutedCell>
          {!isDragChain && item.metadata && Object.keys(item.metadata).length > 0 && (
            <div style={{ marginTop: 'var(--sp-1)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
              {dynamicInventoryFields.slice(0, 3).map(field => item.metadata[field.key] ? (
                <Badge key={field.key} tone="info">{field.label}: {item.metadata[field.key]}</Badge>
              ) : null)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 1100,
      render: (item) => <Badge>{(item.type || '').replace('_', ' ')}</Badge>,
    },
    {
      key: 'minStock',
      header: 'Maintained Qty',
      align: 'right',
      hideBelow: 1100,
      sortValue: (item) => Number(item.minStock || item.maintainedQuantity || 0),
      render: (item) => (
        <NumCell
          value={item.minStock || item.maintainedQuantity || 0}
          unit={item.unit}
          tone="var(--warning)"
        />
      ),
    },
    {
      key: 'available',
      header: 'Available Qty',
      align: 'right',
      sortValue: (item) => Math.max(0, Number(item.quantity || 0) - getRequiredQty(item)),
      render: (item) => {
        const reqQty = getRequiredQty(item);
        const avail = Number(item.quantity || 0) - reqQty;
        return (
          <NumCell
            value={Math.max(0, avail)}
            unit={item.unit}
            tone={avail <= 0 ? 'var(--danger)' : 'var(--success)'}
          />
        );
      },
    },
    {
      key: 'required',
      header: 'Required Qty',
      align: 'right',
      sortValue: (item) => getRequiredQty(item),
      render: (item) => <NumCell value={getRequiredQty(item)} unit={item.unit} tone="var(--danger)" />,
    },
    {
      key: 'rack',
      header: 'Rack',
      hideBelow: 1440,
      render: (item) => <MutedCell>{item.rack || 'N/A'}</MutedCell>,
    },
    ...(isDragChain ? [
      { key: 'radius', header: 'Radius', hideBelow: 1600, render: (i) => <MutedCell>{i.radius || 'N/A'}</MutedCell> },
      { key: 'vs', header: 'VS', hideBelow: 1600, render: (i) => <MutedCell>{i.vs || 'N/A'}</MutedCell> },
      { key: 'hs', header: 'HS', hideBelow: 1600, render: (i) => <MutedCell>{i.hs || 'N/A'}</MutedCell> },
      { key: 'sr', header: 'SR', hideBelow: 1600, render: (i) => <MutedCell>{i.sr || 'N/A'}</MutedCell> },
    ] : []),
    {
      key: 'createdAt',
      header: 'Added',
      hideBelow: 1440,
      render: (item) => (
        <MutedCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</MutedCell>
      ),
    },
    {
      key: 'quality',
      header: 'Quality',
      sortable: false,
      hideBelow: 900,
      render: (item) => (
        <RowActions>
          {(!item.qualityStatus || item.qualityStatus === 'pending') && (
            <Button size="xs" variant="secondary" icon={<LuClipboardCheck />} onClick={() => handleSendForQC(item)}>
              QC Check
            </Button>
          )}
          {item.qualityStatus === 'sent_for_qc' && (
            <Badge tone="warning" icon={<LuScanLine />}>QC Sent</Badge>
          )}
          {item.qualityStatus === 'verified' && (
            <Badge tone="success" icon={<LuShieldCheck />}>QC Verified</Badge>
          )}
          {item.qualityStatus === 'rejected' && (
            <span title={item.qcRemarks || 'No remarks'}>
              <Badge tone="danger" icon={<LuCircleX />}>QC Rejected</Badge>
            </span>
          )}
        </RowActions>
      ),
    },
    {
      key: 'productionStatus',
      header: 'Status',
      sortable: false,
      render: (item) => (
        <RowActions>
          {(!item.productionStatus || item.productionStatus === 'none') ? (
            <Button
              size="xs"
              variant="primary"
              icon={<LuSend />}
              onClick={() => {
                setSelectedPmItem(item);
                setPmStoreRemarks('');
                setShowSendToPmModal(true);
              }}
            >
              Send to PM
            </Button>
          ) : item.productionStatus === 'sent_to_pm' ? (
            <Badge tone="warning">Sent to PM</Badge>
          ) : item.productionStatus === 'assigned_to_supervisor' ? (
            <Badge tone="info">Assigned: {item.assignedSupervisor}</Badge>
          ) : (
            <Badge tone="success">Completed</Badge>
          )}
        </RowActions>
      ),
    },
    /* The remark is free prose of any length, so it is not a grid column —
       it lives in the record's detail view, behind the row's View action. */
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      wrap: true,
      render: (item) => (
        <RowActions>
          {/* Clamped cells (remark, specs) hide their tail — this opens the
              full record, so nothing is only reachable by guessing. */}
          <Button
            size="xs"
            variant="ghost"
            icon={<LuEye />}
            title="View full details"
            onClick={() => setDetailItem(item)}
          >
            View
          </Button>
          <Button size="xs" variant="ghost" icon={<LuPencil />} onClick={() => handleEditItem(item)}>Edit</Button>
          <Button size="xs" variant="ghost" icon={<LuTrash2 />} onClick={() => handleDeleteItem(item._id)}>Delete</Button>
        </RowActions>
      ),
    },
  ];

  const sbsColumns = [
    {
      key: 'itemName',
      header: 'Item Name',
      primary: true,
      render: (log) => {
        const linkedJob = buildJobs.find(j => j.shortageLogId === log._id);
        return (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.itemName}</div>
            {linkedJob && (
              <div style={{ marginTop: 'var(--sp-1)' }}>
                <Badge tone="info" icon={<LuHammer />}>
                  Building: {linkedJob.status}
                  {linkedJob.estimatedDate ? ` · Est ${new Date(linkedJob.estimatedDate).toLocaleString()}` : ''}
                </Badge>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Log Type',
      render: (log) => (
        <Badge tone={log.type === 'shortage' ? 'danger' : log.type === 'buy' ? 'warning' : 'success'}>
          {log.type}
        </Badge>
      ),
    },
    { key: 'itemType', header: 'Item Type', hideBelow: 1280, render: (log) => <MutedCell>{log.itemType || 'raw_material'}</MutedCell> },
    { key: 'modelNumber', header: 'Model Number', hideBelow: 1100, render: (log) => <MutedCell>{log.modelNumber || 'N/A'}</MutedCell> },
    { key: 'size', header: 'Inner Size', hideBelow: 1280, render: (log) => <MutedCell>{log.size || 'N/A'}</MutedCell> },
    { key: 'description', header: 'Outer Size', hideBelow: 1440, render: (log) => <MutedCell>{log.description?.replace('Outer: ', '') || 'N/A'}</MutedCell> },
    ...(isDragChain ? [
      { key: 'radius', header: 'Bending Radius', hideBelow: 1600, render: (l) => <MutedCell>{l.radius || 'N/A'}</MutedCell> },
      { key: 'vs', header: 'VS', hideBelow: 1600, render: (l) => <MutedCell>{l.vs || 'N/A'}</MutedCell> },
      { key: 'hs', header: 'HS', hideBelow: 1600, render: (l) => <MutedCell>{l.hs || 'N/A'}</MutedCell> },
      { key: 'sr', header: 'SR', hideBelow: 1600, render: (l) => <MutedCell>{l.sr || 'N/A'}</MutedCell> },
    ] : []),
    {
      key: 'quantity',
      header: 'Required Qty',
      align: 'right',
      sortValue: (log) => Number(log.quantity || 0),
      render: (log) => <NumCell value={log.quantity} unit={log.unit} />,
    },
    {
      key: 'assignedTo',
      header: 'Assigned Role',
      hideBelow: 1100,
      render: (log) => <span style={{ color: 'var(--c-blue)', fontWeight: 600 }}>{log.assignedTo}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => (
        <Badge tone={log.status === 'pending' ? 'warning' : log.status === 'assigned' ? 'info' : 'success'}>
          {log.status}
        </Badge>
      ),
    },
    { key: 'remarks', header: 'Remarks', hideBelow: 1440, clamp: true, render: (log) => <MutedCell>{log.remarks || 'No remarks.'}</MutedCell> },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (log) => (
        <RowActions>
          <Button size="xs" variant="ghost" icon={<LuPencil />} onClick={() => handleEditSbs(log)}>Edit</Button>
          <Button size="xs" variant="ghost" icon={<LuTrash2 />} onClick={() => handleDeleteSbs(log._id)}>Delete</Button>
        </RowActions>
      ),
    },
  ];

  const orderShortageColumns = [
    {
      key: 'orderId',
      header: 'Ref Order',
      primary: true,
      sortValue: (s) => s.orderId?.orderNumber || '',
      render: (s) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.orderId?.orderNumber || 'N/A'}</span>,
    },
    { key: 'modelNumber', header: 'Model Number', render: (s) => <span style={{ fontWeight: 600 }}>{s.modelNumber}</span> },
    {
      key: 'shortageMeters',
      header: 'Shortage Qty',
      align: 'right',
      sortValue: (s) => Number(s.shortageMeters || 0),
      render: (s) => <NumCell value={`${s.shortageMeters}m`} tone="var(--danger)" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge tone={s.status === 'pending_planning' ? 'danger' : 'success'}>
          {s.status.replace('_', ' ')}
        </Badge>
      ),
    },
    { key: 'plannedShots', header: 'Planned Shots', hideBelow: 900, render: (s) => <MutedCell>{s.plannedShots > 0 ? `${s.plannedShots} shots` : 'Not Planned'}</MutedCell> },
    { key: 'createdAt', header: 'Date Flagged', hideBelow: 1100, render: (s) => <MutedCell>{new Date(s.createdAt).toLocaleString()}</MutedCell> },
  ];

  const qcColumns = [
    {
      key: 'materialName',
      header: 'Material Name',
      primary: true,
      render: (log) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.materialName}</div>
          {log.remarks && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{log.remarks}</div>}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortValue: (log) => Number(log.quantity || 0),
      render: (log) => <NumCell value={log.quantity} unit={log.unit} />,
    },
    {
      key: 'qcType',
      header: 'Log Type',
      render: (log) => (
        <Badge tone={log.qcType === 'inspected' ? 'success' : log.qcType === 'damaged' ? 'danger' : 'warning'}>
          {log.qcType}
        </Badge>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice / Scan',
      hideBelow: 900,
      render: (log) => (
        log.invoiceNumber ? (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{log.invoiceNumber}</div>
            <a
              href={log.invoiceUrl ? `${SOCKET_URL}/api/upload/view/${log.invoiceUrl.split('/').pop()}` : '#'}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: 'var(--primary)', textDecoration: 'underline' }}
            >
              <LuExternalLink /> View Scan
            </a>
          </div>
        ) : <MutedCell>No invoice</MutedCell>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => (
        <Badge tone={log.status === 'pending_verification' ? 'warning' : log.status === 'verified' ? 'success' : 'danger'}>
          {log.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'verify',
      header: 'Verification',
      sortable: false,
      render: (log) => (
        <RowActions>
          {log.status === 'pending_verification' ? (
            <Button size="xs" variant="success" icon={<LuCircleCheck />} onClick={() => handleVerifyQC(log._id)}>
              Verify &amp; Stock
            </Button>
          ) : (
            <MutedCell>Verified</MutedCell>
          )}
        </RowActions>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (log) => (
        <RowActions>
          <Button size="xs" variant="ghost" icon={<LuPencil />} onClick={() => handleEditQcLog(log)}>Edit</Button>
          <Button size="xs" variant="ghost" icon={<LuTrash2 />} onClick={() => handleDeleteQcLog(log._id)}>Delete</Button>
        </RowActions>
      ),
    },
  ];

  const detailRequired = detailItem ? getRequiredQty(detailItem) : 0;

  return (
    <DashboardLayout pageTitle="Godown & Store Operations">
      <Page>
        <PageHeader
          title="Godown & Store Operations"
          subtitle="Unified inventory, quality verification, sourcing logs and real-time task assignment."
          actions={<Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchData}>Reload</Button>}
        />

        <StatRow>
          <StatTile label="Stock Items" value={inventory.length} icon={<LuBoxes />} tone="primary" hint="Across all item types" />
          <StatTile label="Low / At Minimum" value={lowStockCount} icon={<LuTriangleAlert />} tone="amber" hint="At or below maintained qty" />
          <StatTile label="Open Shortages" value={openShortages} icon={<LuPackage />} tone="red" hint="Shortage logs awaiting action" />
          <StatTile label="QC Pending" value={pendingQcCount} icon={<LuClipboardCheck />} tone="violet" hint="Logs awaiting verification" />
          <StatTile label="Client Order Shortages" value={orderShortages.length} icon={<LuCircleAlert />} tone="orange" hint="Difference reports" />
        </StatRow>

        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

        {activeTab === 'dispatch' ? (
          <DispatchTab />
        ) : activeTab === 'inventory' ? (

          /* UNIFIED INVENTORY VIEW */
          <Section>
            <Toolbar>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search inventory name or type…"
              />
              <ChipGroup items={invTypeChips} value={invTypeFilter} onChange={setInvTypeFilter} />
              <ToolbarSpacer />
              <DensitySwitch />
              <Button
                variant="primary"
                icon={<LuPlus />}
                onClick={() => {
                  setEditingItemId(null);
                  setIsCustomModel(false);
                  setItemForm({
                    name: '',
                    type: 'finished_good',
                    quantity: 0,
                    minStock: 100,
                    maintainedQuantity: 100,
                    unitPrice: 0,
                    unit: isDragChain ? 'meters' : 'pcs',
                    location: 'Unassigned',
                    size: '',
                    description: '',
                    modelNumber: '',
                    rack: '',
                    radius: 'N/A',
                    designType: 'N/A',
                    vs: 'N/A',
                    hs: 'N/A',
                    sr: 'N/A',
                    series: 'N/A'
                  });
                  setShowItemModal(true);
                }}
              >
                Add Stock Item
              </Button>
            </Toolbar>

            <DataTable
              columns={inventoryColumns}
              rows={visibleInventory}
              loading={loading}
              pageSize={10}
              onRowClick={(item) => setDetailItem(item)}
              empty={
                <EmptyState
                  icon={<LuWarehouse />}
                  title="No inventory items"
                  text="No inventory items match the search."
                />
              }
            />
          </Section>

        ) : activeTab === 'sbs_logs' ? (

          /* SHORTAGE, BUY & SALES LOGS */
          <>
            <Section title="Shortage, Buy & Sales Registry">
              <Toolbar>
                <SearchInput
                  value={sbsSearch}
                  onChange={setSbsSearch}
                  placeholder="Search item, model or role…"
                />
                <ChipGroup items={sbsTypeChips} value={sbsTypeFilter} onChange={setSbsTypeFilter} />
                <ToolbarSpacer />
                <DensitySwitch />
                <Button
                  variant="primary"
                  icon={<LuPlus />}
                  onClick={() => {
                    setEditingSbsId(null);
                    setSbsForm({ type: 'shortage', itemName: '', quantity: 0, unit: 'pcs', assignedTo: 'unassigned', remarks: '' });
                    setShowSbsModal(true);
                  }}
                >
                  Log New Entry
                </Button>
              </Toolbar>

              <DataTable
                columns={sbsColumns}
                rows={visibleSbsLogs}
                loading={loading}
                pageSize={15}
                empty={
                  <EmptyState
                    icon={<LuClipboardList />}
                    title="No logs registered yet"
                    text="Shortage, buy and sale entries you log will appear here."
                  />
                }
              />
            </Section>

            {/* Client Order Shortages (Difference Reports) */}
            <Section title="Client Order Shortages (Difference Reports)">
              <DataTable
                columns={orderShortageColumns}
                rows={orderShortages}
                loading={loading}
                pageSize={10}
                empty={
                  <EmptyState
                    icon={<LuCircleAlert />}
                    title="No active client order shortages"
                    text="Difference reports flagged against client orders show up here."
                  />
                }
              />
            </Section>
          </>

        ) : activeTab === 'qc_verification' ? (

          /* QC VERIFICATION VIEW (WITH FULL STORE MANAGER CRUD) */
          <Section title="Quality Logs & Invoices Verification Panel">
            <Toolbar>
              <SearchInput
                value={qcSearch}
                onChange={setQcSearch}
                placeholder="Search material or invoice…"
              />
              <ChipGroup items={qcStatusChips} value={qcStatusFilter} onChange={setQcStatusFilter} />
              <ToolbarSpacer />
              <DensitySwitch />
              <Button
                variant="primary"
                icon={<LuPlus />}
                onClick={() => {
                  setEditingQcId(null);
                  setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
                  setShowQcModal(true);
                }}
              >
                Add QC Log
              </Button>
            </Toolbar>

            <DataTable
              columns={qcColumns}
              rows={visibleQcLogs}
              loading={loading}
              pageSize={15}
              empty={
                <EmptyState
                  icon={<LuClipboardCheck />}
                  title="No QC log documents registered"
                  text="Quality inspections and invoice scans will be listed here."
                />
              }
            />
          </Section>

        ) : (

          /* REAL-TIME ASSIGNMENT PANEL VIEW */
          <Section title="Shortage & Task Assignments Panel">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--sp-5)',
                alignItems: 'start',
              }}
            >
              <Surface>
                <form onSubmit={handleAssignTask}>
                  <FormGrid>
                    <Field label="Select Shortage / Sourcing Sbs Log" required span="all">
                      <Select required value={selectedSbsId} onChange={e => setSelectedSbsId(e.target.value)}>
                        <option value="">-- Choose Log Entry --</option>
                        {sbsLogs.filter(j => j.status === 'pending').map(job => (
                          <option key={job._id} value={job._id}>
                            [{job.type.toUpperCase()}] {job.itemName} (Qty: {job.quantity})
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Assign to Role / Workspace" required span="all">
                      <Select value={assigneeRole} onChange={e => setAssigneeRole(e.target.value)}>
                        <option value="supervisor">Supervisor (Production Line)</option>
                        <option value="production_manager">Production Manager</option>
                        <option value="sales">Sales Officer (Purchase sourcing)</option>
                        <option value="quality_checker">Quality Checker (QC Inspections)</option>
                        <option value="gate_guard">Gate Guard (Gate Entry checks)</option>
                      </Select>
                    </Field>
                  </FormGrid>

                  <div style={{ marginTop: 'var(--sp-5)' }}>
                    <Button type="submit" variant="primary" block icon={<LuUserCheck />} loading={submitting}>
                      Dispatch Assignment
                    </Button>
                  </div>
                </form>
              </Surface>

              <Surface>
                <h4 style={{ margin: '0 0 var(--sp-3)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>
                  Active Shortages Tracking
                </h4>
                {sbsLogs.filter(j => j.type === 'shortage').length === 0 ? (
                  <EmptyState
                    icon={<LuPackage />}
                    title="No active shortages"
                    text="Shortage entries reported by the store team appear here."
                  />
                ) : (
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {sbsLogs.filter(j => j.type === 'shortage').map(job => {
                      const linkedJob = buildJobs.find(j => j.shortageLogId === job._id);
                      return (
                        <li
                          key={job._id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 'var(--sp-3)',
                            flexWrap: 'wrap',
                            padding: 'var(--sp-3) 0',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--fs-base)' }}>{job.itemName}</div>
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Assigned to: {job.assignedTo}</div>
                            {linkedJob && (
                              <div style={{ marginTop: 'var(--sp-1)' }}>
                                <Badge tone="info" icon={<LuHammer />}>
                                  Building: {linkedJob.status}
                                  {linkedJob.estimatedDate ? ` · Est ${new Date(linkedJob.estimatedDate).toLocaleString()}` : ''}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Badge tone="danger">Shortage: {job.quantity} {job.unit}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Surface>
            </div>
          </Section>
        )}

        {/* INVENTORY DETAIL DRAWER */}
        <Drawer
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={detailItem?.name || 'Stock Item'}
          subtitle={detailItem?.modelNumber || undefined}
          footer={
            detailItem ? (
              <>
                <Button variant="cancel" onClick={() => setDetailItem(null)}>Close</Button>
                <Button
                  variant="primary"
                  icon={<LuPencil />}
                  onClick={() => { const it = detailItem; setDetailItem(null); handleEditItem(it); }}
                >
                  Edit Item
                </Button>
              </>
            ) : null
          }
        >
          {detailItem && (
            <>
              <DescList
                items={[
                  { label: 'Item Type', value: <Badge>{(detailItem.type || '').replace('_', ' ')}</Badge> },
                  { label: 'Maintained Qty', value: `${detailItem.minStock || detailItem.maintainedQuantity || 0} ${detailItem.unit || ''}` },
                  { label: 'In Stock', value: `${detailItem.quantity || 0} ${detailItem.unit || ''}` },
                  { label: 'Required Qty', value: `${detailRequired} ${detailItem.unit || ''}` },
                  { label: 'Available Qty', value: `${Math.max(0, Number(detailItem.quantity || 0) - detailRequired)} ${detailItem.unit || ''}` },
                  { label: 'Unit Price', value: detailItem.unitPrice ? formatCurrency(detailItem.unitPrice) : '' },
                  {
                    label: 'Stock Value',
                    value: detailItem.unitPrice
                      ? formatCurrency(Number(detailItem.unitPrice) * Number(detailItem.quantity || 0))
                      : '',
                  },
                  { label: 'Warehouse', value: detailItem.warehouseLocation },
                  { label: 'Almirah', value: detailItem.almirah },
                  { label: 'Rack / Shelf', value: detailItem.rack },
                  { label: 'Location', value: detailItem.location },
                  { label: 'Size', value: detailItem.size },
                  { label: 'Series', value: detailItem.series },
                  { label: 'Design Type', value: detailItem.designType },
                  ...(isDragChain ? [
                    { label: 'Radius', value: detailItem.radius },
                    { label: 'VS', value: detailItem.vs },
                    { label: 'HS', value: detailItem.hs },
                    { label: 'SR', value: detailItem.sr },
                  ] : []),
                  { label: 'Quality Status', value: humanStatus(detailItem.qualityStatus) },
                  { label: 'QC Requested', value: detailItem.qcRequestedAt ? new Date(detailItem.qcRequestedAt).toLocaleString() : '' },
                  { label: 'Production Status', value: humanStatus(detailItem.productionStatus) },
                  { label: 'Assigned Supervisor', value: detailItem.assignedSupervisor },
                  { label: 'Sent to PM', value: detailItem.sentToPmAt ? new Date(detailItem.sentToPmAt).toLocaleString() : '' },
                  { label: 'Added On', value: detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString() : '' },
                  { label: 'Last Updated', value: detailItem.updatedAt ? new Date(detailItem.updatedAt).toLocaleString() : '' },
                ]}
              />

              {/* Prose lives here rather than in the grid, so it can be read in
                  full instead of being clamped into a column. */}
              <NoteBlock label="Store Remark" text={detailItem.storeRemarks} />
              <NoteBlock label="PM Remark" text={detailItem.pmRemarks} />
              <NoteBlock label="QC Remark" text={detailItem.qcRemarks} />
              <NoteBlock label="Description" text={detailItem.description} />
            </>
          )}
        </Drawer>

        {/* HANDSHAKE VERIFICATION FLOATING MODAL */}
        <Dialog
          open={!!handshakeJob}
          onClose={() => setHandshakeJob(null)}
          title="Finished Product Handshake Verification"
          subtitle="Confirm Receipt of a Finished Batch from Production"
          footer={
            <>
              <Button variant="danger" onClick={() => handleHandshakeSubmit(false)}>No, Reject Shipment</Button>
              <Button variant="success" icon={<LuCircleCheck />} onClick={() => handleHandshakeSubmit(true)}>
                Yes, Recieved Properly
              </Button>
            </>
          }
        >
          {handshakeJob && (
            <>
              <div
                style={{
                  background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--sp-4)',
                  marginBottom: 'var(--sp-5)',
                }}
              >
                <p style={{ color: 'var(--text-primary)', margin: '0 0 var(--sp-2)', fontSize: 'var(--fs-md)' }}>
                  Supervisor has sent a finished batch of <strong>{handshakeJob.productName}</strong>.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-2)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                  <div>Size: {handshakeJob.productSize}</div>
                  <div>Quantity: {handshakeJob.quantity} pcs</div>
                </div>
              </div>

              <Field
                label="Assign Stock Location"
                required
                hint={'Confirming "Yes" will automatically increase the stock in your Unified Store Inventory with Date & Time logs.'}
              >
                <Input
                  type="text"
                  value={rackLocation}
                  onChange={e => setRackLocation(e.target.value)}
                  placeholder="e.g. Rack B - Bin 3"
                />
              </Field>
            </>
          )}
        </Dialog>

        {/* STOCK ITEM MODAL */}
        <Dialog
          open={showItemModal}
          onClose={() => setShowItemModal(false)}
          title={editingItemId ? 'Edit Stock Item Details' : 'Add New Stock Item'}
          subtitle={industryConfig?.label}
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button type="submit" form="store-item-form" variant="primary" loading={submitting}>
                {submitting ? 'Saving…' : 'Save Item'}
              </Button>
            </>
          }
        >
          <form id="store-item-form" onSubmit={handleSaveItem}>

            {/* 1. Item Name — always first. 2. Item Type + Stock Unit */}
            <FormGrid>
              <Field label="Product Name" required span="all">
                <Input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Nylon Drag Chain"
                />
              </Field>

              <Field label="Item Type" required>
                <Select value={itemForm.type} onChange={handleTypeChange}>
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_good">Finished Good</option>
                  <option value="hardware">Hardware / Tools</option>
                  <option value="custom">Custom Tooling</option>
                </Select>
              </Field>

              <Field label="Stock Unit" required>
                <Select required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="pkt">pkt (Packets)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="meters">meters (Meters)</option>
                  <option value="boxes">boxes (Boxes)</option>
                  <option value="liters">liters (Liters)</option>
                  <option value="bags">bags (Bags)</option>
                  <option value="rolls">rolls (Rolls)</option>
                </Select>
              </Field>
            </FormGrid>

            {/* 3. DRAG CHAIN CONFIGURATION SECTION — DB-driven dropdowns */}
            {isDragChain ? (
              <Surface style={{ marginTop: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
                  <LuSettings2 style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Drag Chain Configuration (PDF Specification)
                  </h3>
                  {catalogModelNumbers.length === 0 && (
                    <Badge tone="warning" icon={<LuTriangleAlert />}>No catalog data — add product templates first</Badge>
                  )}
                </div>

                <FormGrid>
                  {/* 1. Model Number — from DB */}
                  <Field label="Model No." required>
                    <Select value={itemForm.modelNumber} onChange={e => handleModelChange(e.target.value)}>
                      <option value="">-- Select Model --</option>
                      {catalogModelNumbers.map(m => <option key={m} value={m}>{m}</option>)}
                    </Select>
                  </Field>

                  {/* 2. Width (Inner Width) — cascades from Model */}
                  <Field label="Width (Inner)">
                    <Select value={itemForm.width} onChange={e => setItemForm(p => ({ ...p, width: e.target.value }))}>
                      <option value="">-- Select Width --</option>
                      {availableWidths.map(w => <option key={w} value={w}>{w}</option>)}
                    </Select>
                  </Field>

                  {/* 3. Bending Radius — 5, 10, 15, 20 ... up to 700 */}
                  <Field label="Bending Radius">
                    <Select
                      value={itemForm.radius?.replace(/^R/i, '') || ''}
                      onChange={e => setItemForm(p => ({ ...p, radius: e.target.value }))}
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
                      value={itemForm.chainType || 'OP'}
                      onChange={e => setItemForm(p => ({ ...p, chainType: e.target.value }))}
                    >
                      <option value="OP">OP — Open</option>
                      <option value="CP">CP — Closed</option>
                      <option value="SEMI">SEMI — Semi-Closed</option>
                    </Select>
                  </Field>

                  {/* 5. Number of Links per meter — from DB */}
                  <Field label="No. of Links (per m)">
                    <Select
                      value={itemForm.numberOfLinks}
                      onChange={e => setItemForm(p => ({ ...p, numberOfLinks: e.target.value }))}
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
                      value={itemForm.length}
                      onChange={e => setItemForm(p => ({ ...p, length: e.target.value }))}
                    >
                      <option value="">-- Select Length --</option>
                      {['500 MM', '1000 MM', '1500 MM', '2000 MM', '2500 MM', '3000 MM', '4000 MM', '5000 MM'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </Select>
                  </Field>

                  {/* 7. Mounting Bracket Type */}
                  <Field label="Mounting Bracket Type">
                    <Select
                      value={itemForm.mountingBracketType}
                      onChange={e => setItemForm(p => ({ ...p, mountingBracketType: e.target.value }))}
                    >
                      <option value="">-- Select Bracket --</option>
                      <option value="B-BOX">B-BOX Type ({formatMountingBracketCode('B-BOX', itemForm.modelNumber || '35.1')})</option>
                      <option value="L-ANGULAR">L-ANGULAR Type ({formatMountingBracketCode('L-ANGULAR', itemForm.modelNumber || '35.1')})</option>
                      <option value="LSR(P)">LSR (P) — Plastic Angular Strain Relief ({formatMountingBracketCode('LSR(P)', itemForm.modelNumber || '35.1')})</option>
                      <option value="LSR(M)">LSR (M) — Metal Angular Strain Relief ({formatMountingBracketCode('LSR(M)', itemForm.modelNumber || '35.1')})</option>
                      <option value="SRP-25">SRP-25</option>
                      <option value="SRP-35">SRP-35</option>
                      <option value="SRP-50">SRP-50</option>
                    </Select>
                  </Field>

                  {/* 8. Accessories / Separator */}
                  <Field label="Accessories (Separator)">
                    <Select
                      value={itemForm.accessories}
                      onChange={e => setItemForm(p => ({ ...p, accessories: e.target.value }))}
                    >
                      <option value="">-- None / Not Required --</option>
                      <option value="HS">HS — Horizontal Separator</option>
                      <option value="VS">VS — Vertical Separator</option>
                      <option value="HS+VS">HS + VS (Both)</option>
                    </Select>
                  </Field>
                </FormGrid>

                {/* Live Spec Preview */}
                {itemForm.name && (
                  <div
                    style={{
                      marginTop: 'var(--sp-3)',
                      padding: 'var(--sp-2) var(--sp-3)',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--fs-sm)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-2)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>Generated Product Name:</span>
                    <strong style={{ color: 'var(--primary)' }}>{itemForm.name}</strong>
                  </div>
                )}
              </Surface>
            ) : (
              <FormGrid style={{ marginTop: 'var(--sp-4)' }}>
                <Field label="Model Number" required span="all">
                  <Input
                    type="text"
                    required
                    value={itemForm.modelNumber}
                    onChange={e => setItemForm({ ...itemForm, modelNumber: e.target.value })}
                    placeholder="e.g. Model-123"
                  />
                </Field>
              </FormGrid>
            )}

            {/* 4.5 DYNAMIC INDUSTRY FIELDS — shown only for non-DragChain industries */}
            {!isDragChain && dynamicInventoryFields.length > 0 && (
              <Surface style={{ marginTop: 'var(--sp-5)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--sp-3)' }}>
                  {industryConfig.label} — Specific Details
                </div>
                <DynamicFormEngine
                  fields={dynamicInventoryFields}
                  data={itemForm.metadata || {}}
                  onChange={(key, value) => setItemForm({ ...itemForm, metadata: { ...itemForm.metadata, [key]: value } })}
                />
              </Surface>
            )}

            {/* 6. Maintained Qty. 7. Location hierarchy. 8. Description */}
            <FormGrid style={{ marginTop: 'var(--sp-5)' }}>
              <Field label={`Maintained Qty (Min Stock) (${itemForm.unit || 'meters'})`} required span="all">
                <Input
                  type="number"
                  min={0}
                  required
                  value={itemForm.minStock ?? itemForm.maintainedQuantity ?? 0}
                  onChange={e => setItemForm({
                    ...itemForm,
                    minStock: Math.max(0, Number(e.target.value) || 0),
                    maintainedQuantity: Math.max(0, Number(e.target.value) || 0)
                  })}
                  placeholder="e.g. 100"
                />
              </Field>

              <Field label="Warehouse Location" span="all">
                <Input
                  type="text"
                  value={itemForm.warehouseLocation || ''}
                  onChange={e => setItemForm({ ...itemForm, warehouseLocation: e.target.value })}
                  placeholder="e.g. Main Godown / WH-1"
                />
              </Field>

              <Field
                label="Almirah / Cupboard"
                hint={excelAlmirahFound ? 'Excel auto-filled' : undefined}
              >
                {autoAlmirahOptions.length > 1 ? (
                  <Select
                    value={itemForm.almirah || ''}
                    onChange={e => {
                      const selectedAlm = e.target.value;
                      const { rackOptions } = getSmartRackAndAlmirahInfo(itemForm.modelNumber, itemForm.size, itemForm.radius, selectedAlm);
                      setAutoRackOptions(rackOptions);
                      setItemForm(prev => ({
                        ...prev,
                        almirah: selectedAlm,
                        rack: rackOptions.length > 0 ? rackOptions[0] : prev.rack
                      }));
                    }}
                    style={{ borderColor: 'var(--c-blue)' }}
                  >
                    {autoAlmirahOptions.map(alm => (
                      <option key={alm} value={alm}>{alm}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type="text"
                    value={itemForm.almirah || ''}
                    onChange={e => setItemForm({ ...itemForm, almirah: e.target.value })}
                    placeholder="e.g. ALMIRAH NO 3"
                    style={excelAlmirahFound ? { borderColor: 'var(--c-blue)' } : undefined}
                  />
                )}
              </Field>

              <Field
                label="Rack / Shelf (S.No)"
                hint={autoRackOptions.length > 0 ? `${autoRackOptions.length} Excel racks available` : undefined}
              >
                {autoRackOptions.length > 0 ? (
                  <Select
                    value={itemForm.rack || ''}
                    onChange={e => setItemForm({ ...itemForm, rack: e.target.value })}
                    style={{ borderColor: 'var(--success)' }}
                  >
                    <option value="">-- Choose Rack (S.No) --</option>
                    {autoRackOptions.map(r => (
                      <option key={r} value={r}>S.No / Rack #{r}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type="text"
                    value={itemForm.rack || ''}
                    onChange={e => setItemForm({ ...itemForm, rack: e.target.value })}
                    placeholder="e.g. Shelf 4A / S.No 10"
                  />
                )}
              </Field>

              <Field label="Item Description" span="all">
                <Textarea
                  rows="2"
                  value={itemForm.description}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Supplier info..."
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* QC LOG ENTRY MODAL (Store Manager CRUD) */}
        <Dialog
          open={showQcModal}
          onClose={() => setShowQcModal(false)}
          title={editingQcId ? 'Edit QC Document' : 'Log QC Inspection & Invoice Scan'}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowQcModal(false)}>Cancel</Button>
              <Button type="submit" form="store-qc-form" variant="primary" loading={submitting}>
                {submitting ? 'Saving…' : 'Save QC Log'}
              </Button>
            </>
          }
        >
          <form id="store-qc-form" onSubmit={handleSaveQcLog}>
            <FormGrid>
              <Field label="Material / Item Name" required span="all">
                <Input
                  type="text"
                  required
                  value={qcForm.materialName}
                  onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })}
                  placeholder="e.g. Nylon Slices"
                />
              </Field>

              <Field label="Quantity Checked" required>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={qcForm.quantity}
                  onChange={e => setQcForm({ ...qcForm, quantity: Number(e.target.value) })}
                />
              </Field>

              <Field label="Unit" required>
                <Input
                  type="text"
                  required
                  value={qcForm.unit}
                  onChange={e => setQcForm({ ...qcForm, unit: e.target.value })}
                />
              </Field>

              <Field label="Report Category" required>
                <Select value={qcForm.qcType} onChange={e => setQcForm({ ...qcForm, qcType: e.target.value })}>
                  <option value="inspected">Inspected Goods</option>
                  <option value="damaged">Damaged Materials</option>
                  <option value="missed">Missed/Short Items</option>
                </Select>
              </Field>

              <Field label="Invoice / Bill Number">
                <Input
                  type="text"
                  value={qcForm.invoiceNumber}
                  onChange={e => setQcForm({ ...qcForm, invoiceNumber: e.target.value })}
                  placeholder="Optional Bill Number"
                />
              </Field>

              <Field label="Upload Invoice Document" span="all">
                <input
                  type="file"
                  className="field-control"
                  onChange={e => setInvoiceFile(e.target.files[0])}
                  accept="image/*,application/pdf"
                />
                {qcForm.invoiceUrl && !invoiceFile && (
                  <div style={{ fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-2)', color: 'var(--text-muted)' }}>
                    Current:{' '}
                    <a
                      href={qcForm.invoiceUrl ? `${SOCKET_URL}/api/upload/view/${qcForm.invoiceUrl.split('/').pop()}` : '#'}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'underline', color: 'var(--primary)' }}
                    >
                      View Existing Scan
                    </a>
                  </div>
                )}
              </Field>

              <Field label="Inspector Remarks" span="all">
                <Textarea
                  rows="2"
                  value={qcForm.remarks}
                  onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })}
                  placeholder="Quality or discrepancy state details..."
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* SHORTAGE / BUY / SALE LOG MODAL (UNIFIED INVENTORY FLOW WITHOUT LOCATION) */}
        <Dialog
          open={showSbsModal}
          onClose={() => setShowSbsModal(false)}
          title={editingSbsId ? 'Edit Log Entry' : 'Log Shortage, Buy or Sales Entry'}
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowSbsModal(false)}>Cancel</Button>
              <Button type="submit" form="store-sbs-form" variant="primary" loading={submitting}>
                {submitting ? 'Saving…' : 'Save Log'}
              </Button>
            </>
          }
        >
          <form id="store-sbs-form" onSubmit={handleSaveSbs}>
            <FormGrid>
              {/* 1. Register Type */}
              <Field label="Register Type" required span="all">
                <Select value={sbsForm.type} onChange={e => setSbsForm({ ...sbsForm, type: e.target.value })}>
                  <option value="shortage">Shortage (Lack of stock)</option>
                  <option value="buy">Buy (Purchase Request)</option>
                  <option value="sale">Sale (Sales Order)</option>
                </Select>
              </Field>

              {/* 2. Product Name */}
              <Field label="Product Name" required span="all">
                <Input
                  type="text"
                  required
                  value={sbsForm.itemName}
                  onChange={e => setSbsForm({ ...sbsForm, itemName: e.target.value })}
                  placeholder="e.g. Nylon Drag Chain"
                />
              </Field>

              {/* 3. Item Type + Stock Unit */}
              <Field label="Item Type" required>
                <Select value={sbsForm.itemType || 'raw_material'} onChange={e => setSbsForm({ ...sbsForm, itemType: e.target.value })}>
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_good">Finished Good</option>
                  <option value="hardware">Hardware / Tools</option>
                  <option value="custom">Custom Tooling</option>
                </Select>
              </Field>

              <Field label="Stock Unit" required>
                <Select required value={sbsForm.unit || 'pcs'} onChange={e => setSbsForm({ ...sbsForm, unit: e.target.value })}>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="pkt">pkt (Packets)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="meters">meters (Meters)</option>
                  <option value="boxes">boxes (Boxes)</option>
                  <option value="liters">liters (Liters)</option>
                  <option value="bags">bags (Bags)</option>
                  <option value="rolls">rolls (Rolls)</option>
                </Select>
              </Field>

              {/* 4. Model Number */}
              {isDragChain ? (
                <>
                  <Field label="Model Number" span="all">
                    <Select
                      value={isSbsCustomModel ? 'custom' : sbsForm.modelNumber}
                      onChange={handleSbsModelChange}
                    >
                      <option value="">-- Select Model Number --</option>
                      {catalogModelNumbers.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="custom">-- Custom Model Number / Manual Entry --</option>
                    </Select>
                  </Field>

                  {isSbsCustomModel && (
                    <Field label="Custom Model Number" span="all">
                      <Input
                        type="text"
                        value={sbsForm.modelNumber}
                        onChange={e => setSbsForm({ ...sbsForm, modelNumber: e.target.value })}
                        placeholder="e.g. STAR-CUSTOM-100"
                      />
                    </Field>
                  )}
                </>
              ) : (
                <Field label="Model Number" required span="all">
                  <Input
                    type="text"
                    required
                    value={sbsForm.modelNumber}
                    onChange={e => setSbsForm({ ...sbsForm, modelNumber: e.target.value })}
                    placeholder="e.g. Model-123"
                  />
                </Field>
              )}
            </FormGrid>

            {/* 5. Cascading Spec Section (Inner Size, Outer Size, Bending Radius) */}
            {isDragChain && (
              <Surface style={{ marginTop: 'var(--sp-4)' }}>
                <FormGrid>
                  <Field label="Inner Size">
                    {availableSbsInnerSizes.length > 0 ? (
                      <Select value={sbsForm.size} onChange={handleSbsInnerSizeChange}>
                        <option value="">-- Choose Inner Size --</option>
                        {availableSbsInnerSizes.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        type="text"
                        value={sbsForm.size}
                        onChange={e => setSbsForm({ ...sbsForm, size: e.target.value })}
                        placeholder="e.g. 35X140 OP"
                      />
                    )}
                  </Field>

                  <Field label="Outer Size (Auto-Filled)">
                    <Input
                      type="text"
                      readOnly
                      value={sbsForm.description?.replace('Outer: ', '') || 'Auto-generated'}
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                    />
                  </Field>

                  {/* Row 2: Bending Radius (Only for Drag Chain) */}
                  {isDragChain && (
                    <Field label="Bending Radius" span="all">
                      <Select
                        value={sbsForm.radius}
                        onChange={e => setSbsForm({ ...sbsForm, radius: e.target.value })}
                      >
                        <option value="">-- Select Radius --</option>
                        {availableSbsRadii.length > 0 ? (
                          availableSbsRadii.map(r => <option key={r} value={r}>{r}</option>)
                        ) : (
                          ['15', '25', '40', '50', '55', '75', '100', '125', '150', '175', '200', '225', '250', '300', '1000'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))
                        )}
                      </Select>
                    </Field>
                  )}
                </FormGrid>
              </Surface>
            )}

            <FormGrid style={{ marginTop: 'var(--sp-4)' }}>
              {/* 6. Quantity */}
              <Field label={`Quantity (${sbsForm.unit || 'pcs'})`} required span="all">
                <Input
                  type="number"
                  step="0.01"
                  required
                  min={0.01}
                  value={sbsForm.quantity}
                  onChange={e => setSbsForm({ ...sbsForm, quantity: Number(e.target.value) })}
                />
              </Field>

              {/* 7. Initial Sourcing Assignment & Remarks */}
              <Field label="Initial Sourcing Assignment" span="all">
                <Select value={sbsForm.assignedTo} onChange={e => setSbsForm({ ...sbsForm, assignedTo: e.target.value })}>
                  <option value="unassigned">Unassigned</option>
                  <option value="supervisor">Supervisor (Production Line)</option>
                  <option value="sales">Sales Officer (Purchase sourcing)</option>
                  <option value="quality_checker">Quality Checker (QC Inspections)</option>
                  <option value="store_manager">Store Manager (Godown stock)</option>
                  <option value="production_manager">Production Manager</option>
                </Select>
              </Field>

              <Field label="Remarks" span="all">
                <Textarea
                  rows="2"
                  value={sbsForm.remarks}
                  onChange={e => setSbsForm({ ...sbsForm, remarks: e.target.value })}
                  placeholder="Describe details..."
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* SEND SHORTAGE TO PRODUCTION MANAGER MODAL */}
        <Dialog
          open={showSendToPmModal}
          onClose={() => setShowSendToPmModal(false)}
          title="Send Shortage to Production Manager"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowSendToPmModal(false)}>Cancel</Button>
              <Button type="submit" form="store-pm-form" variant="primary" icon={<LuSend />} loading={submitting}>
                {submitting ? 'Sending…' : 'Submit to PM'}
              </Button>
            </>
          }
        >
          <form id="store-pm-form" onSubmit={handleSendToPmSubmit}>
            <FormGrid>
              <Field label="Item / Product Name" span="all">
                <Input
                  type="text"
                  readOnly
                  value={selectedPmItem?.name || ''}
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                />
              </Field>
              <Field label="Store Manager Remark" required span="all">
                <Textarea
                  rows="3"
                  required
                  value={pmStoreRemarks}
                  onChange={e => setPmStoreRemarks(e.target.value)}
                  placeholder="Describe shortage details or urgent replenishment requirements for Production Manager..."
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>
      </Page>
    </DashboardLayout>
  );
};

export default StoreDashboard;
