import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI, orderAPI } from '../../services/api';
import {
  LuBoxes, LuClipboardCheck, LuShoppingBag, LuPlus, LuClipboardList, LuRefreshCw,
  LuSave, LuCircleCheck, LuUsersRound, LuPencil, LuTrash2, LuTruck, LuReceipt,
  LuFactory, LuTriangleAlert, LuPackage, LuHammer, LuUser, LuCog, LuRuler,
  LuSettings, LuFileText, LuWarehouse, LuInbox, LuEye,
} from 'react-icons/lu';

import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import SalesPipelineTab from './SalesPipelineTab';
import DispatchTab from '../store/DispatchTab';
import InvoiceGenerator from '../finance/InvoiceGenerator';
import { generateMergedProductName, formatDragChainOrderCode, formatMountingBracketCode } from '../../utils/productNameHelper';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, Drawer, Field, Input, Select, Textarea,
  Badge, Button, EmptyState, Tabs,
} from '../../components/ui';

/* ------------------------------------------------- small cell presenters */

/** `sent_to_pm` reads badly in a detail pane — show "Sent to pm". */
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



const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

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

const SalesDashboard = () => {

  const { user } = useAuth();
  const isDragChain = user?.organizationId?.subIndustry === 'Drag Chain' || !user?.organizationId?.subIndustry;
  const [activeTab, setActiveTab] = useState('store_stock'); // 'store_stock', 'shortages_buy', 'place_orders', 'qc_verification'
  
  const [inventory, setInventory] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [qualityLogs, setQualityLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  const [orderShortages, setOrderShortages] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Presentation-only: record detail overlays (prose lives here, not in columns)
  const [detailItem, setDetailItem] = useState(null);
  const [detailSourcing, setDetailSourcing] = useState(null);

  // Sourcing Order form (Unified Flow)
  const [isOrderCustomModel, setIsOrderCustomModel] = useState(false);
  const [availableOrderInnerSizes, setAvailableOrderInnerSizes] = useState([]);
  const [availableOrderRadii, setAvailableOrderRadii] = useState([]);
  const [orderForm, setOrderForm] = useState({
    productName: '',
    itemType: 'finished_good',
    salesPersonName: user?.name || '',
    chainLength: '1000',
    orderQuantity: 1,
    unitPrice: 0,
    unit: 'meters',
    modelNumber: '',
    productSize: '',
    description: '',
    radius: 'N/A',
    designType: 'OP',
    vs: 'N/A',
    hs: 'N/A',
    sr: 'N/A'
  });

  // Inventory Item Modals & Forms (Sales Add Stock Feature)
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
    series: 'N/A'
  });

  // Admin Edit Build Job Modal
  const [showEditBuildModal, setShowEditBuildModal] = useState(false);
  const [editingBuildJob, setEditingBuildJob] = useState(null);
  const [editBuildForm, setEditBuildForm] = useState({ productName: '', orderQuantity: 100, status: 'pending', machineName: '', estimatedDate: '' });

  // QC Log Modal (Sales CRUD on QC Logs)
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

      // If finished good and model is custom/new, auto-save to product templates
      if (itemForm.modelNumber && itemForm.type === 'finished_good') {
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
        series: 'N/A'
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
      unit: item.unit,
      location: item.location || 'Unassigned',
      size: item.size || '',
      description: item.description || '',
      modelNumber: item.modelNumber || '',
      rack: item.rack || '',
      radius: item.radius || 'N/A',
      designType: item.designType || 'N/A',
      vs: item.vs || 'N/A',
      hs: item.hs || 'N/A',
      sr: item.sr || 'N/A',
      series: item.series || 'N/A'
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

  // Auto-generate merged Product Name for orderForm whenever specs change
  useEffect(() => {
    if (orderForm.modelNumber) {
      const mergedName = generateMergedProductName({
        modelNumber: orderForm.modelNumber,
        productSize: orderForm.productSize,
        radius: orderForm.radius,
        designType: orderForm.designType,
        vs: orderForm.vs,
        hs: orderForm.hs,
        sr: orderForm.sr
      });
      if (mergedName && mergedName !== orderForm.productName) {
        setOrderForm(prev => ({ ...prev, productName: mergedName }));
      }
    }
  }, [orderForm.modelNumber, orderForm.productSize, orderForm.radius, orderForm.designType, orderForm.vs, orderForm.hs, orderForm.sr]);

  const catalogModelNumbers = useMemo(() => {
    const dbModels = productTemplates.map(item => item.modelNumber).filter(Boolean);
    return Array.from(new Set(dbModels)).sort();
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

  // Auto-compose spec string for itemForm
  useEffect(() => {
    if (isDragChain && itemForm.modelNumber) {
      const generatedName = formatDragChainOrderCode({
        modelNumber: itemForm.modelNumber,
        width: itemForm.width,
        radius: itemForm.radius,
        chainType: itemForm.chainType,
        numberOfLinks: itemForm.numberOfLinks,
        length: itemForm.length,
        mountingBracketType: itemForm.mountingBracketType,
        accessories: itemForm.accessories
      }) || `Drag Chain ${itemForm.modelNumber}`;

      if (generatedName !== itemForm.name) {
        setItemForm(prev => ({
          ...prev,
          name: generatedName,
          size: prev.width || prev.size
        }));
      }
    }
  }, [
    isDragChain, itemForm.modelNumber, itemForm.width, itemForm.radius,
    itemForm.chainType, itemForm.numberOfLinks, itemForm.length,
    itemForm.mountingBracketType, itemForm.accessories
  ]);

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
      name: `Drag Chain ${modelNum}`,
      width: '',
      size: '',
      radius: '',
      chainType: match?.chainType || prev.chainType || 'OP',
      numberOfLinks: match?.numberOfLinks || prev.numberOfLinks || '',
      length: match?.length || prev.length || '',
      mountingBracketType: match?.mountingBracketType || prev.mountingBracketType || '',
      accessories: match?.accessories || prev.accessories || '',
      almirah: match?.almirah || prev.almirah || '',
      rack: match?.rack || prev.rack || ''
    }));
  };

  const handleInnerSizeChange = (e) => {
    const selectedInner = e.target.value;
    const match = productTemplates.find(item => item.modelNumber === itemForm.modelNumber && (item.innerSize === selectedInner || item.size === selectedInner));
    if (match) {
      setAvailableRadii(match.radii || []);
      const selectedRadius = match.radii && match.radii.length > 0 ? match.radii[0] : '';
      const mergedName = generateMergedProductName({
        modelNumber: itemForm.modelNumber,
        size: selectedInner,
        radius: selectedRadius,
        designType: match.designType || itemForm.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      });
      setItemForm(prev => ({
        ...prev,
        name: mergedName,
        size: selectedInner,
        description: match.outerSize ? `Outer: ${match.outerSize}` : prev.description,
        radius: selectedRadius,
        designType: match.designType || prev.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      }));
    } else {
      setItemForm(prev => ({ ...prev, size: selectedInner }));
    }
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

  // SBS Log Catalog Handlers
  const handleSbsModelChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsSbsCustomModel(true);
      setAvailableSbsInnerSizes([]);
      setAvailableSbsRadii([]);
      setSbsForm(prev => ({ ...prev, modelNumber: '', itemName: '', size: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else if (val === '') {
      setIsSbsCustomModel(false);
      setAvailableSbsInnerSizes([]);
      setAvailableSbsRadii([]);
      setSbsForm(prev => ({ ...prev, modelNumber: '', itemName: '', size: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else {
      setIsSbsCustomModel(false);
      const matches = productTemplates.filter(item => item.modelNumber === val);
      const innerSizes = Array.from(new Set(matches.map(m => m.innerSize)));
      const firstEntry = matches[0];
      setAvailableSbsInnerSizes(innerSizes);
      setAvailableSbsRadii([]);
      const autoInner = innerSizes.length === 1 ? innerSizes[0] : '';
      const autoRadius = firstEntry?.radii && firstEntry.radii.length > 0 ? firstEntry.radii[0] : '';
      const autoName = generateMergedProductName({
        modelNumber: val,
        size: autoInner,
        radius: autoRadius,
        designType: firstEntry ? firstEntry.designType : 'OP',
        vs: firstEntry ? firstEntry.vs : '',
        hs: firstEntry ? firstEntry.hs : '',
        sr: firstEntry ? firstEntry.sr : ''
      });
      setSbsForm(prev => ({
        ...prev, modelNumber: val, itemName: autoName, size: autoInner, radius: autoRadius,
        designType: firstEntry ? firstEntry.designType : 'OP', vs: firstEntry ? firstEntry.vs : '', hs: firstEntry ? firstEntry.hs : '', sr: firstEntry ? firstEntry.sr : ''
      }));
    }
  };

  const handleSbsInnerSizeChange = (e) => {
    const selectedInner = e.target.value;
    const match = productTemplates.find(item => item.modelNumber === sbsForm.modelNumber && (item.innerSize === selectedInner || item.size === selectedInner));
    if (match) {
      setAvailableSbsRadii(match.radii || []);
      const selectedRadius = match.radii && match.radii.length > 0 ? match.radii[0] : '';
      const mergedName = generateMergedProductName({
        modelNumber: sbsForm.modelNumber,
        size: selectedInner,
        radius: selectedRadius,
        designType: match.designType || sbsForm.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      });
      setSbsForm(prev => ({
        ...prev,
        itemName: mergedName,
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

  // Manufacturing Order Catalog Handlers
  const handleOrderModelChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsOrderCustomModel(true);
      setAvailableOrderInnerSizes([]);
      setAvailableOrderRadii([]);
      setOrderForm(prev => ({ ...prev, modelNumber: '', productName: '', productSize: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else if (val === '') {
      setIsOrderCustomModel(false);
      setAvailableOrderInnerSizes([]);
      setAvailableOrderRadii([]);
      setOrderForm(prev => ({ ...prev, modelNumber: '', productName: '', productSize: '', radius: '', designType: 'OP', vs: '', hs: '', sr: '' }));
    } else {
      setIsOrderCustomModel(false);
      const matches = productTemplates.filter(item => item.modelNumber === val);
      const innerSizes = Array.from(new Set(matches.map(m => m.innerSize)));
      const firstEntry = matches[0];
      setAvailableOrderInnerSizes(innerSizes);
      setAvailableOrderRadii([]);
      const autoInner = innerSizes.length === 1 ? innerSizes[0] : '';
      const autoRadius = firstEntry?.radii && firstEntry.radii.length > 0 ? firstEntry.radii[0] : '';
      const autoName = generateMergedProductName({
        modelNumber: val,
        size: autoInner,
        radius: autoRadius,
        designType: firstEntry ? firstEntry.designType : 'OP',
        vs: firstEntry ? firstEntry.vs : '',
        hs: firstEntry ? firstEntry.hs : '',
        sr: firstEntry ? firstEntry.sr : ''
      });
      setOrderForm(prev => ({
        ...prev, modelNumber: val, productName: autoName, productSize: autoInner, radius: autoRadius,
        designType: firstEntry ? firstEntry.designType : 'OP', vs: firstEntry ? firstEntry.vs : '', hs: firstEntry ? firstEntry.hs : '', sr: firstEntry ? firstEntry.sr : ''
      }));
    }
  };

  const handleOrderInnerSizeChange = (e) => {
    const selectedInner = e.target.value;
    const match = productTemplates.find(item => item.modelNumber === orderForm.modelNumber && (item.innerSize === selectedInner || item.size === selectedInner));
    if (match) {
      setAvailableOrderRadii(match.radii || []);
      const selectedRadius = match.radii && match.radii.length > 0 ? match.radii[0] : '';
      const mergedName = generateMergedProductName({
        modelNumber: orderForm.modelNumber,
        size: selectedInner,
        radius: selectedRadius,
        designType: match.designType || orderForm.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      });
      setOrderForm(prev => ({
        ...prev,
        productName: mergedName,
        productSize: selectedInner,
        description: match.outerSize ? `Outer: ${match.outerSize}` : prev.description,
        radius: selectedRadius,
        designType: match.designType || prev.designType,
        vs: match.vs || 'N/A',
        hs: match.hs || 'N/A',
        sr: match.sr || 'N/A'
      }));
    } else {
      setOrderForm(prev => ({ ...prev, productSize: selectedInner }));
    }
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

  // Create Build Order
  const handlePlaceBuildOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalForm = {
        ...orderForm,
        productName: orderForm.productName || (orderForm.modelNumber ? `Drag Chain ${orderForm.modelNumber}` : 'Drag Chain')
      };
      await operationsAPI.createBuildJob(finalForm);
      toast.success('Production order placed! Supervisor has been alerted in real-time.');
      setOrderForm({
        productName: '',
        itemType: 'finished_good',
        salesPersonName: user?.name || '',
        chainLength: '1000',
        orderQuantity: 1,
        unitPrice: 0,
        unit: 'pcs',
        modelNumber: '',
        productSize: '',
        description: '',
        radius: 'N/A',
        designType: 'OP',
        vs: 'N/A',
        hs: 'N/A',
        sr: 'N/A'
      });
      setIsOrderCustomModel(false);
      setAvailableOrderInnerSizes([]);
      setAvailableOrderRadii([]);
      setActiveTab('place_orders');
      fetchData();
    } catch (err) {
      toast.error('Failed to place production order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditBuild = (job) => {
    setEditingBuildJob(job);
    setEditBuildForm({
      productName: job.productName || '',
      orderQuantity: job.orderQuantity || 1,
      status: job.status || 'pending',
      machineName: job.machineName || (job.machineId?.name || ''),
      estimatedDate: job.estimatedDate ? new Date(job.estimatedDate).toISOString().split('T')[0] : ''
    });
    setShowEditBuildModal(true);
  };

  const handleSaveEditBuild = async (e) => {
    e.preventDefault();
    if (!editingBuildJob) return;
    setSubmitting(true);
    try {
      await operationsAPI.updateBuildJob(editingBuildJob._id, editBuildForm);
      toast.success('Build Job updated successfully!');
      setShowEditBuildModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update Build Job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBuildJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this manufacturing build queue entry?')) {
      try {
        await operationsAPI.deleteBuildJob(jobId);
        toast.success('Manufacturing queue entry deleted successfully!');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete manufacturing queue entry');
      }
    }
  };

  // Shortage / Buy / Sales Log CRUD (Sales Full Control)
  const handleSaveSbs = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSbsId) {
        await operationsAPI.updateShortageBuySale(editingSbsId, sbsForm);
        toast.success('Communication log updated');
      } else {
        await operationsAPI.createShortageBuySale(sbsForm);
        toast.success('Communication log created & synced to team in real-time');
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




  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, buildRes, qcRes, sbsRes, shortRes, tempRes] = await Promise.all([
        operationsAPI.getInventory(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales(),
        orderAPI.getShortages(),
        operationsAPI.getProductTemplates()
      ]);
      setInventory(invRes.data.data);
      setBuildJobs(buildRes.data.data);
      setQualityLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
      setOrderShortages(shortRes.data.data);
      setProductTemplates(tempRes.data.data);
    } catch (err) {
      toast.error('Failed to load sales database');
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

      socket.on('inventory_updated', fetchData);
      socket.on('build_updated', fetchData);
      socket.on('quality_updated', fetchData);
      socket.on('communication_updated', fetchData);
      socket.on('product_templates_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // QC Log CRUD (Sales full access)
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
        toast.success('Quality invoice record updated');
      } else {
        await operationsAPI.createQualityLog(formData);
        toast.success('Quality invoice record created');
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
    if (!window.confirm('Delete this quality log/invoice entry?')) return;
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Quality log entry deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const handleVerifyQC = async (id) => {
    try {
      await operationsAPI.verifyQualityLog(id);
      toast.success('Quality document verified!');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify document');
    }
  };

  // Sourcing Shortage/Buy Order Action
  const handleOrderShortage = async (job) => {
    try {
      await operationsAPI.updateShortageBuySale(job._id, { status: 'ordered' });
      if (job.type === 'sale') {
        toast.success('Sale registered successfully!');
      } else {
        toast.success('Shortage raw materials ordered! Logged in pipeline.');
      }
      fetchData();
    } catch (err) {
      toast.error(job.type === 'sale' ? 'Failed to register sale' : 'Failed to order shortage items');
    }
  };

  const handleAddSourcingRemarks = async (id, remarks) => {
    try {
      await operationsAPI.updateShortageBuySale(id, { remarks });
      toast.success('Remarks updated in real-time');
      fetchData();
    } catch (err) {
      toast.error('Failed to save remarks');
    }
  };

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

  const filteredInventory = inventory.filter(item =>
    item.qualityStatus !== 'rejected' &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueRadii = Array.from(new Set(productTemplates.map(t => t.radius).filter(Boolean))).filter(x => x !== 'N/A').sort();

  /* ------------------------------------------------------------- summary */
  const pendingQcCount = qualityLogs.filter(l => l.invoiceNumber && l.status === 'pending_verification').length;
  const sourcingLogs = sbsLogs.filter(j => ['shortage', 'buy', 'sale'].includes(j.type));
  const openSourcingCount = sourcingLogs.filter(j => !['ordered', 'completed', 'received'].includes(j.status)).length;
  const queuePendingCount = buildJobs.filter(j => ['pending', 'processing', 'shortage_reported'].includes(j.status)).length;

  const TAB_ITEMS = [
    { key: 'sales_pipeline', label: 'Sales Pipeline', icon: <LuUsersRound /> },
    { key: 'store_stock', label: 'Store Stock', icon: <LuBoxes /> },
    { key: 'shortages_buy', label: 'Shortage & Buy', icon: <LuClipboardList /> },
    { key: 'place_orders', label: 'Manufacturing Orders', icon: <LuShoppingBag /> },
    { key: 'qc_verification', label: 'QC Invoices', icon: <LuClipboardCheck />, count: pendingQcCount },
    { key: 'invoice_generator', label: 'Bill & Invoice', icon: <LuReceipt /> },
    { key: 'dispatch', label: 'Dispatch', icon: <LuTruck /> },
  ];

  const showWorkspaceChrome = ['store_stock', 'shortages_buy', 'place_orders', 'qc_verification'].includes(activeTab);

  /* ------------------------------------------------------- table columns */
  const muted = { color: 'var(--text-muted)' };

  const inventoryColumns = [
    {
      key: 'name',
      header: 'Item Name',
      primary: true,
      render: (item) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
          <div style={{ fontSize: 'var(--fs-xs)', ...muted }}>{item.modelNumber || 'No model number'}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 1280,
      render: (item) => <Badge>{(item.type || '').replace('_', ' ') || 'n/a'}</Badge>,
    },
    {
      key: 'minStock',
      header: 'Maintained Qty',
      align: 'right',
      hideBelow: 900,
      sortValue: (item) => Number(item.minStock || item.maintainedQuantity || 0),
      render: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
          {item.minStock || item.maintainedQuantity || 0} <span style={{ fontWeight: 500, ...muted }}>{item.unit}</span>
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      sortValue: (item) => Math.max(0, item.quantity - getRequiredQty(item)),
      render: (item) => {
        const reqQty = getRequiredQty(item);
        return (
          <span style={{ fontWeight: 700, color: (item.quantity - reqQty) <= 0 ? 'var(--danger)' : 'var(--success)' }}>
            {Math.max(0, item.quantity - reqQty)} <span style={{ fontWeight: 500, ...muted }}>{item.unit}</span>
          </span>
        );
      },
    },
    {
      key: 'required',
      header: 'Required',
      align: 'right',
      sortValue: (item) => getRequiredQty(item),
      render: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
          {getRequiredQty(item)} <span style={{ fontWeight: 500, ...muted }}>{item.unit}</span>
        </span>
      ),
    },
    {
      key: 'rack',
      header: 'Rack',
      hideBelow: 1280,
      render: (item) => <span style={muted}>{item.rack || 'N/A'}</span>,
    },
    {
      key: 'size',
      header: 'Item Specs',
      clamp: true,
      hideBelow: 1440,
      render: (item) => <span style={muted}>{item.size || 'N/A'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      hideBelow: 1440,
      render: (item) => (
        <span style={muted}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</span>
      ),
    },
    {
      key: 'productionStatus',
      header: 'Status',
      render: (item) =>
        (!item.productionStatus || item.productionStatus === 'none') ? (
          <Badge tone="warning">Not Sent</Badge>
        ) : item.productionStatus === 'sent_to_pm' ? (
          <Badge tone="warning">Sent to PM</Badge>
        ) : item.productionStatus === 'assigned_to_supervisor' ? (
          <Badge tone="info">Assigned: {item.assignedSupervisor}</Badge>
        ) : (
          <Badge tone="success">Completed</Badge>
        ),
    },
    /* The store remark is free prose of any length, so it is not a grid column —
       it lives in the record's detail view, behind the row's View action. */
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (item) => (
        <Button
          size="xs"
          variant="ghost"
          icon={<LuEye />}
          title="View full details"
          onClick={() => setDetailItem(item)}
        >
          View
        </Button>
      ),
    },
  ];

  const sourcingColumns = [
    {
      key: 'itemName',
      header: 'Item Name',
      primary: true,
      render: (job) => {
        const linkedJob = buildJobs.find(j => j.shortageLogId === job._id);
        return (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.itemName}</div>
            {linkedJob && (
              <div
                style={{
                  marginTop: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--c-orange-soft)',
                  border: '1px solid color-mix(in srgb, var(--c-orange) 25%, transparent)',
                  color: 'var(--c-orange)',
                  fontSize: 'var(--fs-2xs)',
                  fontWeight: 600,
                }}
              >
                <LuHammer />
                Building: <span style={{ textTransform: 'capitalize' }}>{linkedJob.status}</span>
                {linkedJob.estimatedDate && ` · Est ${new Date(linkedJob.estimatedDate).toLocaleString()}`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Log Type',
      render: (job) => (
        <Badge tone={job.type === 'shortage' ? 'danger' : job.type === 'buy' ? 'warning' : 'success'}>
          {job.type}
        </Badge>
      ),
    },
    {
      key: 'itemType',
      header: 'Item Type',
      hideBelow: 1440,
      render: (job) => <span style={muted}>{job.itemType || 'raw_material'}</span>,
    },
    {
      key: 'modelNumber',
      header: 'Model No.',
      hideBelow: 900,
      render: (job) => <span style={{ fontWeight: 600 }}>{job.modelNumber || 'N/A'}</span>,
    },
    {
      key: 'size',
      header: 'Inner Size',
      hideBelow: 1280,
      render: (job) => <span style={muted}>{job.size || 'N/A'}</span>,
    },
    {
      key: 'outerSize',
      header: 'Outer Size',
      hideBelow: 1440,
      sortValue: (job) => job.description || '',
      render: (job) => <span style={muted}>{job.description?.replace('Outer: ', '') || 'N/A'}</span>,
    },
    isDragChain && { key: 'radius', header: 'Radius', hideBelow: 1600, render: (job) => <span style={muted}>{job.radius || 'N/A'}</span> },
    isDragChain && { key: 'vs', header: 'VS', hideBelow: 1600, render: (job) => <span style={muted}>{job.vs || 'N/A'}</span> },
    isDragChain && { key: 'hs', header: 'HS', hideBelow: 1600, render: (job) => <span style={muted}>{job.hs || 'N/A'}</span> },
    isDragChain && { key: 'sr', header: 'SR', hideBelow: 1600, render: (job) => <span style={muted}>{job.sr || 'N/A'}</span> },
    {
      key: 'quantity',
      header: 'Required Qty',
      align: 'right',
      sortValue: (job) => Number(job.quantity) || 0,
      render: (job) => (
        <span style={{ fontWeight: 700 }}>
          {job.quantity} <span style={{ fontWeight: 500, ...muted }}>{job.unit}</span>
        </span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assignee',
      hideBelow: 1280,
      render: (job) => <span style={{ fontWeight: 600, color: 'var(--c-blue)' }}>{job.assignedTo}</span>,
    },
    {
      key: 'status',
      header: 'Sourcing Status',
      render: (job) => (
        <Badge tone={job.status === 'pending' ? 'warning' : job.status === 'assigned' ? 'info' : 'success'}>
          {job.status}
        </Badge>
      ),
    },
    /* Purchase remarks are free prose of any length, so they are not a grid
       column — the same editable field lives in the record's detail view,
       behind the row's View action. */
    {
      key: 'actions',
      header: 'Action',
      sortable: false,
      render: (job) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            size="xs"
            variant="ghost"
            icon={<LuEye />}
            title="View full details"
            onClick={() => setDetailSourcing(job)}
          >
            View
          </Button>
          {!['ordered', 'completed', 'received'].includes(job.status) && ['sales', 'store_manager', 'unassigned', ''].includes(job.assignedTo) ? (
            <Button variant="primary" size="xs" onClick={() => handleOrderShortage(job)}>
              {job.type === 'sale' ? 'Sale' : 'Order'}
            </Button>
          ) : ['ordered', 'completed', 'received'].includes(job.status) ? (
            <Badge tone="success" icon={<LuCircleCheck />}>
              {job.status === 'completed' ? 'Completed' : job.type === 'sale' ? 'Sold' : 'Ordered'}
            </Badge>
          ) : null}
          <Button variant="ghost" size="xs" icon={<LuPencil />} onClick={() => handleEditSbs(job)}>Edit</Button>
          <Button variant="ghost" size="xs" icon={<LuTrash2 />} onClick={() => handleDeleteSbs(job._id)}>Delete</Button>
        </div>
      ),
    },
  ].filter(Boolean);

  const orderShortageColumns = [
    {
      key: 'orderNumber',
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
      sortValue: (s) => Number(s.shortageMeters) || 0,
      render: (s) => <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{s.shortageMeters}m</span>,
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
    {
      key: 'plannedShots',
      header: 'Planned Shots',
      align: 'right',
      hideBelow: 900,
      sortValue: (s) => Number(s.plannedShots) || 0,
      render: (s) => (s.plannedShots > 0 ? `${s.plannedShots} shots` : <span style={muted}>Not Planned</span>),
    },
    {
      key: 'createdAt',
      header: 'Date Flagged',
      hideBelow: 1024,
      render: (s) => <span style={muted}>{new Date(s.createdAt).toLocaleString()}</span>,
    },
  ];

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const buildJobColumns = [
    {
      key: 'productName',
      header: 'Product Name',
      primary: true,
      render: (job) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</div>
          <div style={{ fontSize: 'var(--fs-xs)', ...muted }}>{job.modelNumber || 'No model number'}</div>
        </div>
      ),
    },
    {
      key: 'itemType',
      header: 'Item Type',
      hideBelow: 1440,
      render: (job) => <span style={muted}>{job.itemType || 'finished_good'}</span>,
    },
    {
      key: 'productSize',
      header: 'Inner Size',
      hideBelow: 1280,
      render: (job) => <span style={muted}>{job.productSize || 'N/A'}</span>,
    },
    {
      key: 'outerSize',
      header: 'Outer Size',
      hideBelow: 1440,
      sortValue: (job) => job.description || '',
      render: (job) => <span style={muted}>{job.description?.replace('Outer: ', '') || 'N/A'}</span>,
    },
    isDragChain && {
      key: 'chainLength',
      header: 'Length (mm)',
      align: 'right',
      hideBelow: 1280,
      sortValue: (job) => Number(job.chainLength) || 0,
      render: (job) => <span style={{ fontWeight: 600 }}>{job.chainLength ? `${job.chainLength} mm` : 'N/A'}</span>,
    },
    isDragChain && { key: 'radius', header: 'Radius', hideBelow: 1600, render: (job) => <span style={muted}>{job.radius || 'N/A'}</span> },
    isDragChain && { key: 'vs', header: 'VS', hideBelow: 1600, render: (job) => <span style={muted}>{job.vs || 'N/A'}</span> },
    isDragChain && { key: 'hs', header: 'HS', hideBelow: 1600, render: (job) => <span style={muted}>{job.hs || 'N/A'}</span> },
    isDragChain && { key: 'sr', header: 'SR', hideBelow: 1600, render: (job) => <span style={muted}>{job.sr || 'N/A'}</span> },
    {
      key: 'orderQuantity',
      header: 'Required Qty',
      align: 'right',
      sortValue: (job) => Number(job.orderQuantity) || 0,
      render: (job) => (
        <span style={{ fontWeight: 700 }}>
          {job.orderQuantity} <span style={{ fontWeight: 500, ...muted }}>{job.unit || 'pcs'}</span>
        </span>
      ),
    },
    {
      key: 'salesPersonName',
      header: 'Sales Person',
      hideBelow: 1280,
      sortValue: (job) => job.salesPersonName || job.orderedBy?.name || '',
      render: (job) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--primary)' }}>
          <LuUser /> {job.salesPersonName || job.orderedBy?.name || 'Sales Team'}
        </span>
      ),
    },
    {
      key: 'machineName',
      header: 'Machine / Line',
      hideBelow: 1440,
      sortable: false,
      render: (job) =>
        job.machineId && typeof job.machineId === 'object' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--primary)', fontWeight: 600 }}>
            <LuCog /> {job.machineId.name} {job.machineId.capacity ? `(${job.machineId.capacity})` : ''}
          </span>
        ) : job.machineName ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--primary)', fontWeight: 600 }}>
            <LuCog /> {job.machineName}
          </span>
        ) : (
          <span style={muted}>Unassigned</span>
        ),
    },
    {
      key: 'materialsUsed',
      header: 'Materials Used',
      hideBelow: 1600,
      sortable: false,
      render: (job) =>
        job.materialsUsed && job.materialsUsed.length > 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <LuPackage style={{ flexShrink: 0, ...muted }} />
            {job.materialsUsed.map(m => `${m.quantity} ${m.unit} ${m.materialName}`).join(', ')}
          </span>
        ) : (
          <span style={muted}>None</span>
        ),
    },
    {
      key: 'status',
      header: 'Process Stage',
      render: (job) => (
        <div>
          <Badge
            tone={
              job.status === 'pending' ? 'warning' :
              job.status === 'shortage_reported' ? 'danger' :
              job.status === 'processing' ? 'info' :
              job.status === 'delayed' ? 'danger' : 'success'
            }
            icon={job.status === 'delayed' ? <LuTriangleAlert /> : undefined}
          >
            {job.status.replace('_', ' ')}
          </Badge>
          {job.estimatedDate && (
            <div style={{ fontSize: 'var(--fs-2xs)', marginTop: 4, ...muted }}>
              Est: {new Date(job.estimatedDate).toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    isAdmin && {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (job) => (
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <Button
            variant="ghost"
            size="xs"
            icon={<LuPencil />}
            onClick={() => handleOpenEditBuild(job)}
            title="Edit Manufacturing Queue Entry (Admin Only)"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="xs"
            icon={<LuTrash2 />}
            onClick={() => handleDeleteBuildJob(job._id)}
            title="Delete Manufacturing Queue Entry (Admin Only)"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ].filter(Boolean);

  const qcColumns = [
    {
      key: 'materialName',
      header: 'Item Billed',
      primary: true,
      render: (log) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.materialName}</div>
          {log.remarks && <div style={{ fontSize: 'var(--fs-xs)', ...muted }}>{log.remarks}</div>}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty Sourced',
      align: 'right',
      sortValue: (log) => Number(log.quantity) || 0,
      render: (log) => (
        <span style={{ fontWeight: 700 }}>
          {log.quantity} <span style={{ fontWeight: 500, ...muted }}>{log.unit}</span>
        </span>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice Number',
      render: (log) => <span style={{ fontWeight: 700, color: 'var(--success)' }}>{log.invoiceNumber}</span>,
    },
    {
      key: 'invoiceUrl',
      header: 'Document Scan',
      sortable: false,
      hideBelow: 900,
      render: (log) =>
        log.invoiceUrl ? (
          <a
            href={`${SOCKET_URL}/api/upload/view/${log.invoiceUrl.split('/').pop()}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline', color: 'var(--primary)', fontWeight: 600 }}
          >
            View Scan
          </a>
        ) : (
          <span style={muted}>No Scan</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => (
        <Badge tone={log.status === 'pending_verification' ? 'warning' : 'success'}>
          {log.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'verify',
      header: 'Verification',
      sortable: false,
      render: (log) =>
        log.status === 'pending_verification' ? (
          <Button variant="accent" size="xs" icon={<LuCircleCheck />} onClick={() => handleVerifyQC(log._id)}>
            Verify
          </Button>
        ) : (
          <Badge tone="success" icon={<LuCircleCheck />}>Verified</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (log) => (
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <Button variant="ghost" size="xs" icon={<LuPencil />} onClick={() => handleEditQcLog(log)}>Edit</Button>
          <Button variant="ghost" size="xs" icon={<LuTrash2 />} onClick={() => handleDeleteQcLog(log._id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const qcInvoiceLogs = qualityLogs.filter(l => l.invoiceNumber);

  const UNIT_OPTIONS = [
    { value: 'pcs', label: 'pcs (Pieces)' },
    { value: 'pkt', label: 'pkt (Packets)' },
    { value: 'kg', label: 'kg (Kilograms)' },
    { value: 'meters', label: 'meters (Meters)' },
    { value: 'boxes', label: 'boxes (Boxes)' },
    { value: 'liters', label: 'liters (Liters)' },
    { value: 'bags', label: 'bags (Bags)' },
    { value: 'rolls', label: 'rolls (Rolls)' },
  ];

  const ITEM_TYPE_OPTIONS = [
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'finished_good', label: 'Finished Good' },
    { value: 'hardware', label: 'Hardware / Tools' },
    { value: 'custom', label: 'Custom Tooling' },
  ];

  const FALLBACK_RADII = ['15', '25', '40', '50', '55', '75', '100', '125', '150', '175', '200', '225', '250', '300', '1000'];

  return (
    <DashboardLayout pageTitle="Sales & Sourcing Workspace">
      <Page>
        <PageHeader
          title="Sales & Sourcing Workspace"
          subtitle="Pipeline, stock availability, sourcing logs, manufacturing orders, invoicing and dispatch — in one console."
          actions={
            <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchData} loading={loading}>
              Reload
            </Button>
          }
        />

        <Tabs items={TAB_ITEMS} value={activeTab} onChange={setActiveTab} />

        {loading ? (
          <Surface>
            <EmptyState
              icon={<LuRefreshCw />}
              title="Loading sales operations…"
              text="Fetching inventory, sourcing logs, manufacturing queue and QC records."
            />
          </Surface>
        ) : (
          <>
            {showWorkspaceChrome && (
              <StatRow>
                <StatTile
                  label="Inventory Items"
                  value={inventory.length}
                  icon={<LuBoxes />}
                  tone="blue"
                  hint={`${filteredInventory.length} matching the current search`}
                />
                <StatTile
                  label="Sourcing Logs"
                  value={sourcingLogs.length}
                  icon={<LuClipboardList />}
                  tone="amber"
                  hint={`${openSourcingCount} still open`}
                />
                <StatTile
                  label="Manufacturing Queue"
                  value={buildJobs.length}
                  icon={<LuFactory />}
                  tone="violet"
                  hint={`${queuePendingCount} in progress`}
                />
                <StatTile
                  label="QC Invoices"
                  value={qcInvoiceLogs.length}
                  icon={<LuClipboardCheck />}
                  tone="green"
                  hint={`${pendingQcCount} awaiting verification`}
                />
              </StatRow>
            )}

            {activeTab === 'sales_pipeline' ? (
              <SalesPipelineTab />
            ) : activeTab === 'invoice_generator' ? (
              <InvoiceGenerator isEmbedded={true} />
            ) : activeTab === 'dispatch' ? (
              <DispatchTab />
            ) : activeTab === 'store_stock' ? (

              /* ------------------------------------------- STORE STOCK VIEW */
              <Section title="Available Inventory Levels">
                <Toolbar>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search available items…" />
                  <ToolbarSpacer />
                  <Badge tone="info">{filteredInventory.length} items</Badge>
                  <DensitySwitch />
                </Toolbar>

                <DataTable
                  columns={inventoryColumns}
                  rows={filteredInventory}
                  rowKey={(r) => r._id}
                  pageSize={25}
                  empty={
                    <EmptyState
                      icon={<LuWarehouse />}
                      title="No items in stock"
                      text="Inventory added by the store team will appear here."
                    />
                  }
                />
              </Section>

            ) : activeTab === 'shortages_buy' ? (

              /* --------------------------------------- SHORTAGE & BUY LOGS */
              <>
                <Section
                  title="Active Purchase, Sales & Shortages Log"
                  actions={
                    openSourcingCount > 0
                      ? <Badge tone="warning" icon={<LuTriangleAlert />}>{openSourcingCount} open</Badge>
                      : <Badge tone="success" icon={<LuCircleCheck />}>All sourced</Badge>
                  }
                >
                  <DataTable
                    columns={sourcingColumns}
                    rows={sourcingLogs}
                    rowKey={(r) => r._id}
                    pageSize={20}
                    empty={
                      <EmptyState
                        icon={<LuClipboardList />}
                        title="No active sourcing logs"
                        text="Shortages, purchase requests and sales entries will be listed here."
                      />
                    }
                  />
                </Section>

                <Section
                  title="Client Order Shortages"
                  actions={
                    orderShortages.length > 0
                      ? <Badge tone="danger" icon={<LuTriangleAlert />}>{orderShortages.length} open</Badge>
                      : null
                  }
                >
                  <DataTable
                    columns={orderShortageColumns}
                    rows={orderShortages}
                    rowKey={(r) => r._id}
                    pageSize={15}
                    empty={
                      <EmptyState
                        icon={<LuPackage />}
                        title="No active client order shortages"
                        text="Difference reports raised against client orders will show up here."
                      />
                    }
                  />
                </Section>
              </>

            ) : activeTab === 'place_orders' ? (

              /* ------------------------------------- MANUFACTURING ORDERS */
              <>
                <Section title="Order Product Build">
                  <Surface>
                    <form onSubmit={handlePlaceBuildOrder}>
                      {/* 1. Model Number */}
                      {isDragChain ? (
                        <FormGrid>
                          <Field label="Model Number" required span={isOrderCustomModel ? undefined : 2}>
                            <Select
                              required
                              value={isOrderCustomModel ? 'custom' : orderForm.modelNumber}
                              onChange={handleOrderModelChange}
                            >
                              <option value="">-- Select Model Number --</option>
                              {catalogModelNumbers.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              <option value="custom">-- Custom Model Number / Manual Entry --</option>
                            </Select>
                          </Field>

                          {isOrderCustomModel && (
                            <Field label="Custom Model Number" required>
                              <Input
                                type="text"
                                required
                                value={orderForm.modelNumber}
                                onChange={e => setOrderForm({ ...orderForm, modelNumber: e.target.value, productName: `Drag Chain ${e.target.value}` })}
                                placeholder="e.g. STAR-CUSTOM-100"
                              />
                            </Field>
                          )}
                        </FormGrid>
                      ) : (
                        <FormGrid>
                          <Field label="Model Number" required>
                            <Input
                              type="text"
                              required
                              value={orderForm.modelNumber}
                              onChange={e => setOrderForm({ ...orderForm, modelNumber: e.target.value })}
                              placeholder="e.g. Model-123"
                            />
                          </Field>
                          <Field label="Product Name" required>
                            <Input
                              type="text"
                              required
                              value={orderForm.productName || ''}
                              onChange={e => setOrderForm({ ...orderForm, productName: e.target.value })}
                              placeholder="e.g. Nylon Slices"
                            />
                          </Field>
                        </FormGrid>
                      )}

                      <FormGrid style={{ marginTop: 14 }}>
                        {/* Sales Person Name */}
                        <Field label="Sales Person Name" required span="all">
                          <Input
                            type="text"
                            required
                            value={orderForm.salesPersonName || user?.name || ''}
                            onChange={e => setOrderForm({ ...orderForm, salesPersonName: e.target.value })}
                            placeholder="e.g. Rahul Sharma (Sales Officer)"
                          />
                        </Field>

                        {/* 2. Item Type + Stock Unit */}
                        <Field label="Item Type" required>
                          <Select
                            value={orderForm.itemType || 'finished_good'}
                            onChange={e => setOrderForm({ ...orderForm, itemType: e.target.value })}
                          >
                            <option value="finished_good">Finished Good</option>
                            <option value="raw_material">Raw Material</option>
                            <option value="hardware">Hardware / Tools</option>
                            <option value="custom">Custom Tooling</option>
                          </Select>
                        </Field>
                        <Field label="Stock Unit" required>
                          <Select
                            required
                            options={UNIT_OPTIONS}
                            value={orderForm.unit || 'pcs'}
                            onChange={e => setOrderForm({ ...orderForm, unit: e.target.value })}
                          />
                        </Field>
                      </FormGrid>

                      {/* 4. Cascading Spec Section */}
                      {isDragChain && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
                            <LuRuler style={{ color: 'var(--primary)' }} /> Chain Specification
                          </div>
                          <FormGrid>
                            <Field label="Inner Size">
                              {availableOrderInnerSizes.length > 0 ? (
                                <Select value={orderForm.productSize} onChange={handleOrderInnerSizeChange}>
                                  <option value="">-- Choose Inner Size --</option>
                                  {availableOrderInnerSizes.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </Select>
                              ) : (
                                <Input
                                  type="text"
                                  value={orderForm.productSize}
                                  onChange={e => setOrderForm({ ...orderForm, productSize: e.target.value })}
                                  placeholder="e.g. 35X140 OP"
                                />
                              )}
                            </Field>

                            <Field label="Outer Size" hint="Auto-filled from the catalogue">
                              <Input
                                type="text"
                                readOnly
                                value={orderForm.description?.replace('Outer: ', '') || 'Auto-generated'}
                                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                              />
                            </Field>

                            {isDragChain && (
                              <Field label="Bending Radius">
                                <Select
                                  value={orderForm.radius}
                                  onChange={e => setOrderForm({ ...orderForm, radius: e.target.value })}
                                >
                                  <option value="">-- Select Radius --</option>
                                  {availableOrderRadii.length > 0
                                    ? availableOrderRadii.map(r => <option key={r} value={r}>{r}</option>)
                                    : FALLBACK_RADII.map(r => <option key={r} value={r}>{r}</option>)
                                  }
                                </Select>
                              </Field>
                            )}
                          </FormGrid>
                        </div>
                      )}

                      {/* 5. Length in mm & Required Build Quantity */}
                      {isDragChain ? (
                        <>
                          <FormGrid style={{ marginTop: 14 }}>
                            <Field label="Length in mm / m" required>
                              <Input
                                type="number"
                                required
                                min="0.001"
                                step="any"
                                value={orderForm.chainLength || ''}
                                onChange={e => setOrderForm({ ...orderForm, chainLength: e.target.value })}
                                placeholder="e.g. 1000 or 1.5"
                              />
                            </Field>
                            <Field label={`Required Build Quantity (${orderForm.unit || 'pcs / m'})`} required>
                              <Input
                                type="number"
                                required
                                min="0.001"
                                step="any"
                                value={orderForm.orderQuantity}
                                onChange={e => setOrderForm({ ...orderForm, orderQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                placeholder="e.g. 5 or 2.5"
                              />
                            </Field>
                          </FormGrid>

                          {orderForm.chainLength && orderForm.orderQuantity && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: '9px 13px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--c-blue-soft)',
                                border: '1px solid color-mix(in srgb, var(--c-blue) 25%, transparent)',
                                color: 'var(--c-blue)',
                                fontSize: 'var(--fs-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <LuRuler style={{ flexShrink: 0 }} />
                              Total production length:&nbsp;
                              <strong>
                                {(Number(orderForm.chainLength) > 50
                                  ? ((Number(orderForm.chainLength) * Number(orderForm.orderQuantity)) / 1000).toFixed(2)
                                  : (Number(orderForm.chainLength) * Number(orderForm.orderQuantity)).toFixed(2))} Meters
                              </strong>
                              <span style={{ color: 'var(--text-muted)' }}>
                                ({orderForm.orderQuantity} × {orderForm.chainLength} {Number(orderForm.chainLength) > 50 ? 'mm' : 'm'})
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <FormGrid style={{ marginTop: 14 }}>
                          <Field label={`Required Build Quantity (${orderForm.unit || 'pcs'})`} required>
                            <Input
                              type="number"
                              required
                              min="0.001"
                              step="any"
                              value={orderForm.orderQuantity}
                              onChange={e => setOrderForm({ ...orderForm, orderQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                            />
                          </Field>
                        </FormGrid>
                      )}

                      <div style={{ marginTop: 18 }}>
                        <Button type="submit" variant="primary" icon={<LuSave />} loading={submitting} disabled={submitting}>
                          {submitting ? 'Placing Order…' : 'Submit Build Order'}
                        </Button>
                      </div>
                    </form>
                  </Surface>
                </Section>

                <Section
                  title="Manufacturing Queue Status"
                  actions={
                    queuePendingCount > 0
                      ? <Badge tone="info" icon={<LuFactory />}>{queuePendingCount} in progress</Badge>
                      : null
                  }
                >
                  <DataTable
                    columns={buildJobColumns}
                    rows={buildJobs}
                    rowKey={(r) => r._id}
                    pageSize={20}
                    empty={
                      <EmptyState
                        icon={<LuFactory />}
                        title="No orders in queue"
                        text="Build orders you submit above will be tracked here."
                      />
                    }
                  />
                </Section>
              </>

            ) : activeTab === 'qc_verification' ? (

              /* ------------------------------- QC INVOICE VERIFICATION */
              <Section
                title="QC Invoice Document Registry"
                actions={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<LuPlus />}
                    onClick={() => {
                      setEditingQcId(null);
                      setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
                      setShowQcModal(true);
                    }}
                  >
                    Add QC Invoice Log
                  </Button>
                }
              >
                <DataTable
                  columns={qcColumns}
                  rows={qcInvoiceLogs}
                  rowKey={(r) => r._id}
                  pageSize={20}
                  empty={
                    <EmptyState
                      icon={<LuInbox />}
                      title="No QC invoice logs registered"
                      text="Log a sourcing invoice to start the verification trail."
                    />
                  }
                />
              </Section>

            ) : null}
          </>
        )}

        {/* ------------------------------ QC LOG ENTRY MODAL (Sales CRUD) */}
        <Dialog
          open={showQcModal}
          onClose={() => setShowQcModal(false)}
          title={editingQcId ? 'Edit Invoice Log' : 'Log New Sourcing Invoice'}
          subtitle="Register the supplier invoice backing a QC inspection."
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowQcModal(false)}>Cancel</Button>
              <Button type="submit" form="qc-log-form" variant="primary" loading={submitting} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Invoice Log'}
              </Button>
            </>
          }
        >
          <form id="qc-log-form" onSubmit={handleSaveQcLog}>
            <FormGrid>
              <Field label="Material / Item Billed" required span="all">
                <Input
                  type="text"
                  required
                  value={qcForm.materialName}
                  onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })}
                  placeholder="e.g. STR-35 Drag Chain links"
                />
              </Field>

              <Field label="Quantity" required>
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
              <Field label="Invoice Number" required>
                <Input
                  type="text"
                  required
                  value={qcForm.invoiceNumber}
                  onChange={e => setQcForm({ ...qcForm, invoiceNumber: e.target.value })}
                  placeholder="Invoice code"
                />
              </Field>

              <Field
                label="Upload Invoice Document"
                span="all"
                hint={qcForm.invoiceUrl && !invoiceFile ? 'An existing scan is already attached.' : 'Image or PDF'}
              >
                <Input
                  type="file"
                  onChange={e => setInvoiceFile(e.target.files[0])}
                  accept="image/*,application/pdf"
                  style={{ paddingTop: 5, height: 'auto', minHeight: 34 }}
                />
                {qcForm.invoiceUrl && !invoiceFile && (
                  <div style={{ fontSize: 'var(--fs-xs)', marginTop: 6 }}>
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
                  placeholder="Invoice / discrepancy state notes…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* -------------------------------------------- STOCK ITEM MODAL */}
        <Dialog
          open={showItemModal}
          onClose={() => setShowItemModal(false)}
          title={editingItemId ? 'Edit Stock Item' : 'Add Inventory Stock Item'}
          subtitle="Specification, stock level and warehouse position."
          size="xl"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button type="submit" form="stock-item-form" variant="primary" loading={submitting} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Item'}
              </Button>
            </>
          }
        >
          <form id="stock-item-form" onSubmit={handleSaveItem}>
            <FormGrid>
              {/* 1. Item Name — always first */}
              <Field label="Item / Product Name" required span="all">
                <Input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Nylon Drag Chain"
                />
              </Field>

              {/* 2. Item Type + Stock Unit */}
              <Field label="Item Type" required>
                <Select value={itemForm.type} onChange={handleTypeChange} options={ITEM_TYPE_OPTIONS} />
              </Field>
              <Field label="Stock Unit" required>
                <Select
                  required
                  options={UNIT_OPTIONS}
                  value={itemForm.unit}
                  onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                />
              </Field>
            </FormGrid>

            {/* 3. DRAG CHAIN CONFIGURATION SECTION — DB-driven dropdowns */}
            {isDragChain ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <LuSettings style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Drag Chain Configuration (PDF Specification)
                  </h3>
                  {catalogModelNumbers.length === 0 && (
                    <Badge tone="warning" icon={<LuTriangleAlert />}>No catalog data</Badge>
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
                      {BENDING_RADII_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
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
                    <Select value={itemForm.length} onChange={e => setItemForm(p => ({ ...p, length: e.target.value }))}>
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
                      marginTop: 12,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      fontSize: 'var(--fs-sm)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <LuFileText style={{ flexShrink: 0 }} />
                    Generated product name:
                    <strong style={{ color: 'var(--primary)' }}>{itemForm.name}</strong>
                  </div>
                )}
              </div>
            ) : (
              <FormGrid style={{ marginTop: 14 }}>
                <Field label="Model Number" required>
                  <Input
                    type="text"
                    required
                    value={itemForm.modelNumber}
                    onChange={e => setItemForm({ ...itemForm, modelNumber: e.target.value })}
                    placeholder="e.g. Model-123"
                  />
                </Field>
                <Field label="Product Name" required>
                  <Input
                    type="text"
                    required
                    value={itemForm.name || ''}
                    onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Nylon Slices"
                  />
                </Field>
              </FormGrid>
            )}

            <FormGrid style={{ marginTop: 14 }}>
              {/* 6. Maintained Qty (Min Stock) */}
              <Field label={`Maintained Qty / Min Stock (${itemForm.unit || 'meters'})`} required span="all">
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

              {/* 7. Location hierarchy */}
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
                hint={excelAlmirahFound ? `Excel match: ${excelAlmirahFound}` : undefined}
              >
                {autoAlmirahOptions.length > 0 ? (
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
                    style={{ borderColor: 'var(--c-blue)', background: 'var(--c-blue-soft)' }}
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
                    style={excelAlmirahFound ? { borderColor: 'var(--c-blue)', background: 'var(--c-blue-soft)' } : undefined}
                  />
                )}
              </Field>

              <Field
                label="Rack / Shelf (S.No)"
                hint={autoRackOptions.length > 0 ? `${autoRackOptions.length} racks matched from Excel` : undefined}
              >
                {autoRackOptions.length > 0 ? (
                  <Select
                    value={itemForm.rack || ''}
                    onChange={e => setItemForm({ ...itemForm, rack: e.target.value })}
                    style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}
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

              {/* 8. Description */}
              <Field label="Item Description" span="all">
                <Textarea
                  rows="2"
                  value={itemForm.description}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Supplier info…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* --------------- SHORTAGE / BUY / SALE LOG MODAL (UNIFIED FLOW) */}
        <Dialog
          open={showSbsModal}
          onClose={() => setShowSbsModal(false)}
          title={editingSbsId ? 'Edit Log Entry' : 'Log Shortage, Buy or Sales Entry'}
          subtitle="Raise a sourcing request against the unified inventory flow."
          size="xl"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowSbsModal(false)}>Cancel</Button>
              <Button type="submit" form="sbs-log-form" variant="primary" loading={submitting} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Log'}
              </Button>
            </>
          }
        >
          <form id="sbs-log-form" onSubmit={handleSaveSbs}>
            <FormGrid>
              {/* 1. Register Type */}
              <Field label="Register Type" required>
                <Select value={sbsForm.type} onChange={e => setSbsForm({ ...sbsForm, type: e.target.value })}>
                  <option value="shortage">Shortage (Lack of stock)</option>
                  <option value="buy">Buy (Purchase Request)</option>
                  <option value="sale">Sale (Sales Order)</option>
                </Select>
              </Field>

              {/* 2. Product Name */}
              <Field label="Product Name" required>
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
                <Select
                  value={sbsForm.itemType || 'raw_material'}
                  onChange={e => setSbsForm({ ...sbsForm, itemType: e.target.value })}
                  options={ITEM_TYPE_OPTIONS}
                />
              </Field>
              <Field label="Stock Unit" required>
                <Select
                  required
                  options={UNIT_OPTIONS}
                  value={sbsForm.unit || 'pcs'}
                  onChange={e => setSbsForm({ ...sbsForm, unit: e.target.value })}
                />
              </Field>

              {/* 4. Model Number */}
              {isDragChain ? (
                <>
                  <Field label="Model Number" span={isSbsCustomModel ? undefined : 2}>
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
                    <Field label="Custom Model Number">
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
                <Field label="Model Number" required span={2}>
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

            {/* 5. Cascading Spec Section */}
            {isDragChain && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
                  <LuRuler style={{ color: 'var(--primary)' }} /> Chain Specification
                </div>
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

                  <Field label="Outer Size" hint="Auto-filled from the catalogue">
                    <Input
                      type="text"
                      readOnly
                      value={sbsForm.description?.replace('Outer: ', '') || 'Auto-generated'}
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                    />
                  </Field>

                  {isDragChain && (
                    <Field label="Bending Radius">
                      <Select
                        value={sbsForm.radius}
                        onChange={e => setSbsForm({ ...sbsForm, radius: e.target.value })}
                      >
                        <option value="">-- Select Radius --</option>
                        {availableSbsRadii.length > 0
                          ? availableSbsRadii.map(r => <option key={r} value={r}>{r}</option>)
                          : FALLBACK_RADII.map(r => <option key={r} value={r}>{r}</option>)
                        }
                      </Select>
                    </Field>
                  )}
                </FormGrid>
              </div>
            )}

            {/* 6. Quantity + Unit Price + Real-time Total Banner */}
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <FormGrid>
                <Field label={`Quantity (${sbsForm.unit || 'pcs'})`} required>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={sbsForm.quantity}
                    onChange={e => setSbsForm({ ...sbsForm, quantity: Number(e.target.value) })}
                  />
                </Field>
                <Field label={`Price / Rate for 1 ${sbsForm.unit || 'pcs'} (₹)`}>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={sbsForm.unitPrice || 0}
                    onChange={e => setSbsForm({ ...sbsForm, unitPrice: Number(e.target.value) })}
                    placeholder="e.g. 150"
                  />
                </Field>
              </FormGrid>

              <div
                style={{
                  marginTop: 12,
                  background: 'var(--success-soft)',
                  border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Total price of the product quantity:
                </span>
                <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--success)' }}>
                  ₹{((sbsForm.quantity || 0) * (sbsForm.unitPrice || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <FormGrid style={{ marginTop: 14 }}>
              {/* 7. Initial Sourcing Assignment / Assignee */}
              <Field label="Initial Sourcing Assignment / Assignee" required span="all">
                <Select
                  value={sbsForm.assignedTo || 'unassigned'}
                  onChange={e => setSbsForm({ ...sbsForm, assignedTo: e.target.value })}
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="supervisor">Supervisor (Production Line)</option>
                  <option value="sales">Sales Officer (Purchase Sourcing)</option>
                  <option value="quality_checker">Quality Checker (QC Inspections)</option>
                  <option value="store_manager">Store Manager (Godown Stock)</option>
                  <option value="production_manager">Production Manager</option>
                </Select>
              </Field>

              {/* 8. Remarks */}
              <Field label="Remarks" span="all">
                <Textarea
                  rows="2"
                  value={sbsForm.remarks}
                  onChange={e => setSbsForm({ ...sbsForm, remarks: e.target.value })}
                  placeholder="Describe details…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ------------------------------------ ADMIN EDIT BUILD JOB MODAL */}
        <Dialog
          open={showEditBuildModal}
          onClose={() => setShowEditBuildModal(false)}
          title="Edit Manufacturing Build Job"
          subtitle="Admin only — adjust the queue entry."
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowEditBuildModal(false)}>Cancel</Button>
              <Button type="submit" form="edit-build-form" variant="primary" loading={submitting} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <form id="edit-build-form" onSubmit={handleSaveEditBuild}>
            <FormGrid>
              <Field label="Product Name" required span="all">
                <Input
                  type="text"
                  required
                  value={editBuildForm.productName}
                  onChange={e => setEditBuildForm({ ...editBuildForm, productName: e.target.value })}
                />
              </Field>
              <Field label="Order Quantity (pcs)" required>
                <Input
                  type="number"
                  required
                  min={1}
                  value={editBuildForm.orderQuantity}
                  onChange={e => setEditBuildForm({ ...editBuildForm, orderQuantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Status" required>
                <Select
                  value={editBuildForm.status}
                  onChange={e => setEditBuildForm({ ...editBuildForm, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="delayed">Delayed</option>
                  <option value="shortage_reported">Shortage Reported</option>
                  <option value="completed">Completed</option>
                  <option value="received">Received</option>
                  <option value="declined">Declined</option>
                </Select>
              </Field>
              <Field label="Estimated Completion Date" span="all">
                <Input
                  type="date"
                  value={editBuildForm.estimatedDate}
                  onChange={e => setEditBuildForm({ ...editBuildForm, estimatedDate: e.target.value })}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* STORE STOCK DETAIL DRAWER */}
        <Drawer
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={detailItem?.name || 'Stock Item'}
          subtitle={detailItem?.modelNumber || undefined}
          footer={<Button variant="cancel" onClick={() => setDetailItem(null)}>Close</Button>}
        >
          {detailItem && (
            <>
              <DescList
                items={[
                  { label: 'Item Type', value: <Badge>{(detailItem.type || '').replace('_', ' ') || 'n/a'}</Badge> },
                  { label: 'Maintained Qty', value: `${detailItem.minStock || detailItem.maintainedQuantity || 0} ${detailItem.unit || ''}` },
                  { label: 'In Stock', value: `${detailItem.quantity || 0} ${detailItem.unit || ''}` },
                  { label: 'Required Qty', value: `${getRequiredQty(detailItem)} ${detailItem.unit || ''}` },
                  { label: 'Available Qty', value: `${Math.max(0, Number(detailItem.quantity || 0) - getRequiredQty(detailItem))} ${detailItem.unit || ''}` },
                  { label: 'Unit Price', value: detailItem.unitPrice || '' },
                  { label: 'Warehouse', value: detailItem.warehouseLocation },
                  { label: 'Almirah', value: detailItem.almirah },
                  { label: 'Rack / Shelf', value: detailItem.rack },
                  { label: 'Location', value: detailItem.location },
                  { label: 'Item Specs', value: detailItem.size },
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
                  { label: 'Production Status', value: humanStatus(detailItem.productionStatus) || 'Not sent' },
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

        {/* SOURCING LOG DETAIL DRAWER */}
        <Drawer
          open={!!detailSourcing}
          onClose={() => setDetailSourcing(null)}
          title={detailSourcing?.itemName || 'Sourcing Log'}
          subtitle={detailSourcing?.modelNumber || undefined}
          footer={<Button variant="cancel" onClick={() => setDetailSourcing(null)}>Close</Button>}
        >
          {detailSourcing && (
            <>
              <DescList
                items={[
                  {
                    label: 'Log Type',
                    value: (
                      <Badge tone={detailSourcing.type === 'shortage' ? 'danger' : detailSourcing.type === 'buy' ? 'warning' : 'success'}>
                        {detailSourcing.type}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Sourcing Status',
                    value: (
                      <Badge tone={detailSourcing.status === 'pending' ? 'warning' : detailSourcing.status === 'assigned' ? 'info' : 'success'}>
                        {detailSourcing.status}
                      </Badge>
                    ),
                  },
                  { label: 'Item Type', value: humanStatus(detailSourcing.itemType) },
                  { label: 'Required Qty', value: `${detailSourcing.quantity ?? 0} ${detailSourcing.unit || ''}` },
                  { label: 'Model Number', value: detailSourcing.modelNumber },
                  { label: 'Inner Size', value: detailSourcing.size },
                  { label: 'Outer Size', value: detailSourcing.description?.replace('Outer: ', '') },
                  { label: 'Design Type', value: detailSourcing.designType },
                  ...(isDragChain ? [
                    { label: 'Radius', value: detailSourcing.radius },
                    { label: 'VS', value: detailSourcing.vs },
                    { label: 'HS', value: detailSourcing.hs },
                    { label: 'SR', value: detailSourcing.sr },
                  ] : []),
                  { label: 'Assignee', value: humanStatus(detailSourcing.assignedTo) },
                  { label: 'Raised On', value: detailSourcing.createdAt ? new Date(detailSourcing.createdAt).toLocaleString() : '' },
                  { label: 'Last Updated', value: detailSourcing.updatedAt ? new Date(detailSourcing.updatedAt).toLocaleString() : '' },
                ]}
              />

              {/* Purchase remarks are prose, so they get a full-width field here
                  instead of a clamped grid cell. Same save handler as before. */}
              <div style={{ marginTop: 'var(--sp-5)' }}>
                <Field label="Purchase Remarks">
                  <Textarea
                    rows="4"
                    placeholder="Add sourcing updates…"
                    defaultValue={detailSourcing.remarks || ''}
                    onBlur={(e) => handleAddSourcingRemarks(detailSourcing._id, e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}
        </Drawer>
      </Page>
    </DashboardLayout>
  );
};

export default SalesDashboard;
