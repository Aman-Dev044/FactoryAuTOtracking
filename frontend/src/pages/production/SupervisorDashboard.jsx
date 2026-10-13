import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI, orderAPI, aiAPI } from '../../services/api';
import {
  LuCircleCheck, LuCog, LuSlidersHorizontal, LuPlus, LuPlay, LuCircleArrowRight,
  LuTrash2, LuBox, LuClipboardList, LuClock, LuEye, LuPencil, LuPackage,
  LuTriangleAlert, LuZap, LuHistory, LuFactory, LuDownload, LuExternalLink,
  LuBot, LuChevronDown, LuUser, LuMapPin, LuTimer, LuLayers,
} from 'react-icons/lu';

import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup, DensitySwitch,
  DataTable, Drawer, Dialog, ConfirmDialog,
  Field, Input, Select, Textarea,
  Button, Badge, EmptyState, Tabs, Pager,
} from '../../components/ui';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://localhost:6465`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

/* ------------------------------------------------------------------ tokens */

const tint = (token, pct) => `color-mix(in srgb, ${token} ${pct}%, transparent)`;

const MACHINE_TONES = {
  working: 'success',
  available: 'success',
  running: 'info',
  damaged: 'danger',
  broken: 'danger',
  destroyed: 'danger',
  'not found': 'neutral',
};
const machineTone = (status) => MACHINE_TONES[status] || 'warning';

const BUILD_TONES = {
  processing: 'success',
  completed: 'success',
  received: 'success',
  delayed: 'danger',
  shortage_reported: 'danger',
  declined: 'danger',
  pending: 'warning',
};
const buildTone = (status) => BUILD_TONES[status] || 'warning';

const humanise = (value = '') => String(value).replace(/_/g, ' ');

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

/** Tokenised progress meter — purely a visual read-out, never a data source. */
const Meter = ({ value = 0, tone = 'var(--primary)', label }) => (
  <div style={{ minWidth: 92 }}>
    <div
      style={{
        height: 6,
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-subtle)',
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          background: tone,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
    {label && (
      <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-ghost)', marginTop: 4 }}>
        {label}
      </div>
    )}
  </div>
);

/** Elapsed share of the planned window. Display only — no business effect. */
const jobProgress = (job) => {
  if (!job) return 0;
  if (['completed', 'received'].includes(job.status)) return 100;
  const start = new Date(job.startedAt || job.createdAt).getTime();
  const end = job.estimatedDate ? new Date(job.estimatedDate).getTime() : 0;
  if (!start || !end || end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
};

const Stack = ({ children, gap = 2 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>{children}</div>
);

const SubText = ({ children, tone = 'var(--text-muted)', italic }) => (
  <span
    style={{
      fontSize: 'var(--fs-xs)',
      color: tone,
      fontStyle: italic ? 'italic' : undefined,
      fontWeight: 400,
    }}
  >
    {children}
  </span>
);

const RowActions = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
    {children}
  </div>
);

const CountdownTimer = ({ job, onStatusChange }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const hasTriggeredDelay = useRef(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!job || !job.estimatedDate) return 'No ETA';

      if (job.status === 'completed') {
        return '✅ Completed';
      }
      if (job.status === 'delayed') {
        return '⚠️ Delayed';
      }
      if (job.status === 'shortage_reported') {
        return '⚠️ Shortage';
      }

      const difference = new Date(job.estimatedDate) - new Date();
      if (difference <= 0) {
        if (job.status === 'processing' && !hasTriggeredDelay.current) {
          hasTriggeredDelay.current = true;
          if (onStatusChange) {
            onStatusChange(job, 'delayed');
          }
        }
        return '⚠️ Delayed';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      return parts.join(' ');
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [job, onStatusChange]);

  const isDelayed = timeLeft.includes('Delayed') || (job && job.status === 'delayed');
  const isCompleted = timeLeft.includes('Completed') || (job && job.status === 'completed');
  const isShortage = timeLeft.includes('Shortage') || (job && job.status === 'shortage_reported');

  const tone = isCompleted ? 'success' : (isDelayed || isShortage) ? 'danger' : 'info';

  return (
    <Badge tone={tone} icon={<LuClock />}>
      {timeLeft}
    </Badge>
  );
};

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const isDragChain = subIndustryId === 'drag_chain';
  const [activeTab, setActiveTab] = useState(user?.role === 'production_manager' ? 'machines' : 'gate_approvals'); // 'gate_approvals', 'machines', 'build_queue', 'tasks'

  const [machineSearch, setMachineSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  const [gateEntries, setGateEntries] = useState([]);
  const [gateFilter, setGateFilter] = useState('pending'); // 'pending', 'completed', 'all'
  const [machines, setMachines] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [orderShortages, setOrderShortages] = useState([]);
  const [allSbsLogs, setAllSbsLogs] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ plannedShots: '' });
  const [aiLoading, setAiLoading] = useState(false);

  // Destructive confirmations funnel through one ConfirmDialog.
  const [confirmState, setConfirmState] = useState(null);
  const closeConfirm = () => setConfirmState(null);

  // PM Assign Supervisor Modal State
  const [showAssignSupervisorModal, setShowAssignSupervisorModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState('Supervisor Line 1');
  const [pmAssignRemarks, setPmAssignRemarks] = useState('');

  // View Product Specs Modal State
  const [showViewSpecsModal, setShowViewSpecsModal] = useState(false);
  const [viewSpecsItem, setViewSpecsItem] = useState(null);

  const handleOpenViewSpecs = (item) => {
    setViewSpecsItem(item);
    setShowViewSpecsModal(true);
  };

  // Presentation-only: gate entry detail overlay (prose lives here, not in a column)
  const [detailGateEntry, setDetailGateEntry] = useState(null);

  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [inventoryPage, setInventoryPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleAssignSupervisorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;
    setSubmitting(true);
    try {
      await operationsAPI.updateInventoryItem(selectedInventoryItem._id, {
        productionStatus: 'assigned_to_supervisor',
        assignedSupervisor: selectedSupervisor,
        pmRemarks: pmAssignRemarks || 'Urgent basis priority production required',
        assignedSupervisorAt: new Date()
      });
      toast.success(`Shortage assigned to ${selectedSupervisor} on urgent basis!`);
      setShowAssignSupervisorModal(false);
      setSelectedInventoryItem(null);
      setPmAssignRemarks('');
      fetchData();
    } catch (err) {
      toast.error('Failed to assign supervisor');
    } finally {
      setSubmitting(false);
    }
  };

  // Modals
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // Gate Entry Verification Remark Modal
  const [showGateVerifyModal, setShowGateVerifyModal] = useState(false);
  const [selectedGateEntryId, setSelectedGateEntryId] = useState(null);
  const [verificationRemarks, setVerificationRemarks] = useState('');

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

  const [dbCategories, setDbCategories] = useState([]);

  // Dynamically constructed pure DB Machine Categories
  const MACHINE_CATEGORIES = React.useMemo(() => {
    const categories = {};

    (dbCategories || []).forEach(cat => {
      if (cat.categoryName) {
        categories[cat.categoryName] = cat.machineNames || [];
      }
    });

    (machines || []).forEach(m => {
      const cat = m.category || m.productionLine || 'General Plant Utilities';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      if (m.name && !categories[cat].includes(m.name)) {
        categories[cat].push(m.name);
      }
    });

    return categories;
  }, [dbCategories, machines]);

  const PREDEFINED_MACHINES = React.useMemo(() => {
    const set = new Set();
    Object.values(MACHINE_CATEGORIES).forEach(list => list.forEach(item => set.add(item)));
    (machines || []).forEach(m => { if (m.name) set.add(m.name); });
    return Array.from(set);
  }, [MACHINE_CATEGORIES, machines]);

  // Machine Form
  const [machineForm, setMachineForm] = useState({ name: '', status: 'available', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '', productionLine: 'Line 1' });
  const [editingMachineId, setEditingMachineId] = useState(null);
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isCustomMachineName, setIsCustomMachineName] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubMachine, setSelectedSubMachine] = useState('');
  const [showCustomDropdown, setShowCustomDropdown] = useState(false);
  const [activeHoverCategory, setActiveHoverCategory] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCustomDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Build Form
  const [buildModalMode, setBuildModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedJobId, setSelectedJobId] = useState('');
  const [buildStatus, setBuildStatus] = useState('processing');
  const [estimatedDate, setEstimatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [buildTime, setBuildTime] = useState(new Date().toTimeString().slice(0, 5));
  const [materialsUsed, setMaterialsUsed] = useState([{ materialName: '', quantity: 25, unit: 'kg' }]);
  const [customFields, setCustomFields] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [shotCount, setShotCount] = useState(1);

  // Material Inventory CRUD Form States
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    name: '',
    type: 'raw_material',
    quantity: 0,
    unit: 'kg',
    location: 'Unassigned',
    size: '',
    description: ''
  });

  // Automatically update selectedJob in create mode when a job is picked from the dropdown
  useEffect(() => {
    if (buildModalMode === 'create') {
      if (selectedJobId) {
        if (selectedJobId.startsWith('shortage_')) {
          return;
        }
        const job = buildJobs.find(j => j._id === selectedJobId);
        setSelectedJob(job || null);
      } else {
        setSelectedJob(null);
      }
    }
  }, [selectedJobId, buildJobs, buildModalMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gateRes, machRes, buildRes, invRes, shortageRes, orderShortRes] = await Promise.all([
        gateEntryAPI.getAll({ limit: 100 }),
        operationsAPI.getMachines(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getInventory(),
        operationsAPI.getShortageBuySales(),
        orderAPI.getShortages()
      ]);
      setGateEntries(gateRes.data.data);
      setMachines(machRes.data.data);
      setBuildJobs(buildRes.data.data);
      setAllInventoryItems(invRes.data.data);
      setRawMaterials(invRes.data.data.filter(item => item.type === 'raw_material'));
      // Filter shortage logs assigned to supervisor or production manager
      setShortages(shortageRes.data.data.filter(item => item.assignedTo === 'supervisor' || item.assignedTo === 'production_manager'));
      setAllSbsLogs(shortageRes.data.data);
      setOrderShortages(orderShortRes.data.data);
    } catch (err) {
      toast.error('Failed to load supervisor workspace data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen to real-time events to reload queue
    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('gate_entry_updated', fetchData);
      socket.on('build_updated', fetchData);
      socket.on('machine_updated', fetchData);
      socket.on('communication_updated', fetchData);
      socket.on('inventory_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  const getRequiredQty = useCallback((item) => {
    if (!item) return 0;
    let required = 0;
    const itemIdStr = item._id ? item._id.toString() : '';
    const itemNameLower = (item.name || item.itemName || '').toLowerCase().trim();
    const itemModelLower = (item.modelNumber || '').toLowerCase().trim();

    // 1. Calculate from active buildJobs (Order Product Build)
    buildJobs.forEach(job => {
      if (['pending', 'processing', 'shortage_reported', 'assigned'].includes(job.status)) {
        const jobInvId = job.inventoryItemId ? (job.inventoryItemId._id || job.inventoryItemId).toString() : '';
        const matchesId = itemIdStr && jobInvId && itemIdStr === jobInvId;
        const jobNameLower = (job.productName || '').toLowerCase().trim();
        const jobModelLower = (job.modelNumber || '').toLowerCase().trim();
        const matchesName = itemNameLower && (jobNameLower.includes(itemNameLower) || itemNameLower.includes(jobNameLower));
        const matchesModel = itemModelLower && (jobModelLower.includes(itemModelLower) || itemModelLower.includes(jobModelLower));

        if (matchesId || matchesName || matchesModel) {
          required += Number(job.orderQuantity) || 0;
        }
      }
    });

    // 2. Calculate from allSbsLogs (ShortageBuySale)
    allSbsLogs.forEach(log => {
      if (['shortage', 'buy'].includes(log.type) && ['pending', 'assigned', 'ordered'].includes(log.status)) {
        const logInvId = log.inventoryItemId ? (log.inventoryItemId._id || log.inventoryItemId).toString() : '';
        const matchesId = itemIdStr && logInvId && itemIdStr === logInvId;
        const logItemLower = (log.itemName || '').toLowerCase().trim();
        if (matchesId || (logItemLower && (itemNameLower && (logItemLower.includes(itemNameLower) || itemNameLower.includes(logItemLower)) || (itemModelLower && (logItemLower.includes(itemModelLower) || itemModelLower.includes(logItemLower)))))) {
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
  }, [buildJobs, allSbsLogs, orderShortages]);

  // Order Shortage Planning Handlers
  const handlePlanShortage = async (e) => {
    e.preventDefault();
    if (!selectedShortage) return;
    setSubmitting(true);
    try {
      await orderAPI.planShortage(selectedShortage._id, planForm);
      toast.success('Production Plan generated successfully');
      setShowPlanModal(false);
      setPlanForm({ plannedShots: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to plan production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAI = async () => {
    if (!selectedShortage) return;
    setAiLoading(true);
    try {
      const res = await aiAPI.predictShots({
        modelNumber: selectedShortage.modelNumber,
        shortageMeters: selectedShortage.shortageMeters
      });
      const data = res.data.data;
      setPlanForm({ plannedShots: data.shots_needed });
      toast.success(`AI calculated ${data.shots_needed} shots needed. Requires ${data.nylon_kg}kg Nylon and ~${data.time_hrs}hrs.`);
    } catch (err) {
      toast.error('AI Calculation Failed');
    } finally {
      setAiLoading(false);
    }
  };

  // Open Gate Verify Modal
  const handleOpenGateVerify = (id) => {
    setSelectedGateEntryId(id);
    setVerificationRemarks('');
    setShowGateVerifyModal(true);
  };

  // Gate Approval Handler
  const handleApproveGate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await gateEntryAPI.update(selectedGateEntryId, {
        status: 'verified',
        remarks: verificationRemarks,
        verifiedBy: user._id
      });
      toast.success('Gate Entry approved & verified with remarks successfully');
      setShowGateVerifyModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve Gate Entry');
    } finally {
      setSubmitting(false);
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
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Machine Handlers
  const handleSaveMachine = async (e) => {
    e.preventDefault();
    if (!machineForm.name.trim()) {
      toast.error('Please specify a machine name');
      return;
    }
    setSubmitting(true);
    const payload = {
      ...machineForm,
      category: selectedCategory && selectedCategory !== 'custom' ? selectedCategory : (machineForm.category || 'General Machinery')
    };
    try {
      if (editingMachineId) {
        await operationsAPI.updateMachine(editingMachineId, payload);
        toast.success('Machine status updated');
      } else {
        await operationsAPI.createMachine(payload);
        toast.success('Machine added to directory');
      }
      setMachineForm({ name: '', status: 'available', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '', productionLine: 'Line 1' });
      setEditingMachineId(null);
      setSelectedMachineType('');
      setSelectedCategory('');
      setSelectedSubMachine('');
      setIsCustomMachineName(false);
      setShowCustomDropdown(false);
      setActiveHoverCategory(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMachine = (mach) => {
    setMachineForm({
      name: mach.name,
      status: mach.status,
      remarks: mach.remarks || '',
      capacity: mach.capacity || '',
      modelNumber: mach.modelNumber || '',
      powerRating: mach.powerRating || '',
      lastServiceDate: mach.lastServiceDate ? new Date(mach.lastServiceDate).toISOString().split('T')[0] : '',
      productionLine: mach.productionLine || 'Line 1'
    });
    setEditingMachineId(mach._id);

    let foundCategory = '';
    let foundSub = '';

    for (const [cat, sublist] of Object.entries(MACHINE_CATEGORIES)) {
      if (sublist.includes(mach.name)) {
        foundCategory = cat;
        foundSub = mach.name;
        break;
      }
    }

    if (foundCategory) {
      setSelectedCategory(foundCategory);
      setSelectedSubMachine(foundSub);
      setActiveHoverCategory(foundCategory);
      setIsCustomMachineName(false);
    } else {
      setSelectedCategory('custom');
      setSelectedSubMachine('');
      setActiveHoverCategory('custom');
      setIsCustomMachineName(true);
    }

    setShowMachineModal(true);
  };

  const handleDeleteMachine = (id) => {
    setConfirmState({
      title: 'Delete this machine?',
      text: 'The machine will be removed from the factory directory. This cannot be undone.',
      confirmLabel: 'Delete machine',
      onConfirm: async () => {
        try {
          await operationsAPI.deleteMachine(id);
          toast.success('Machine deleted');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete machine');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  // Build Queue Handlers
  const handleOpenCreateBuild = () => {
    setBuildModalMode('create');
    setSelectedJobId('');
    setSelectedJob(null);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));
    setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setSelectedMachineId('');
    setShotCount(1);
    setShowBuildModal(true);
  };
  const handleOpenBuildFromShortage = (item) => {
    setBuildModalMode('create');
    const nameVal = item.itemName || item.productName || item.name || 'Drag Chain';
    const qtyVal = item.quantity || item.orderQuantity || 1;
    const modelVal = item.modelNumber || (nameVal.match(/STAR[A-Za-z0-9.]+/)?.[0]) || '';

    const tempJob = {
      _id: `shortage_${item._id}`,
      productName: nameVal,
      orderQuantity: qtyVal,
      productSize: item.size || item.productSize || 'Standard',
      description: item.description || '',
      modelNumber: modelVal,
      radius: item.radius || 'N/A',
      designType: item.designType || 'OP',
      vs: item.vs || 'N/A',
      hs: item.hs || 'N/A',
      sr: item.sr || 'N/A',
      status: 'pending',
      shortageLogId: item._id
    };
    setSelectedJobId(tempJob._id);
    setSelectedJob(tempJob);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));

    const matchingMat = rawMaterials.find(m =>
      m.name === nameVal ||
      m.modelNumber === modelVal ||
      (m.modelNumber && modelVal && m.modelNumber.toLowerCase().includes(modelVal.toLowerCase()))
    );
    const chosenMatName = matchingMat ? matchingMat.name : (modelVal || (rawMaterials[0]?.name || nameVal));

    setMaterialsUsed([{ materialName: chosenMatName, quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setSelectedMachineId('');
    setShotCount(1);
    setShowBuildModal(true);
  };

  const handleOpenBuild = (job) => {
    setBuildModalMode('create');
    setSelectedJobId(job._id);
    setSelectedJob(job);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));
    setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setSelectedMachineId('');
    setShotCount(1);
    setShowBuildModal(true);
  };

  const handleOpenEditBuild = (job) => {
    setBuildModalMode('edit');
    setSelectedJobId(job._id);
    setSelectedJob(job);
    setBuildStatus(job.status);
    setShotCount(job.shotCount || 1);

    if (job.estimatedDate) {
      const d = new Date(job.estimatedDate);
      setEstimatedDate(d.toISOString().split('T')[0]);
      setBuildTime(d.toTimeString().slice(0, 5));
    } else {
      setEstimatedDate(new Date().toISOString().split('T')[0]);
      setBuildTime(new Date().toTimeString().slice(0, 5));
    }

    if (job.materialsUsed && job.materialsUsed.length > 0) {
      setMaterialsUsed(job.materialsUsed.map(m => ({
        materialName: m.materialName,
        quantity: m.quantity,
        unit: m.unit
      })));
    } else {
      setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    }

    if (job.customFields && job.customFields.length > 0) {
      setCustomFields(job.customFields.map(f => ({
        key: f.key,
        value: f.value
      })));
    } else {
      setCustomFields([]);
    }

    if (job.machineId) {
      setSelectedMachineId(job.machineId._id || job.machineId);
    } else {
      setSelectedMachineId('');
    }

    setShowBuildModal(true);
  };

  const handleDeleteBuildJob = (jobId) => {
    setConfirmState({
      title: 'Delete this build queue entry?',
      text: 'The manufacturing build queue entry will be permanently removed.',
      confirmLabel: 'Delete entry',
      onConfirm: async () => {
        try {
          await operationsAPI.deleteBuildJob(jobId);
          toast.success('Manufacturing queue entry deleted successfully!');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete manufacturing queue entry');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  // Admin Edit & Delete Shortage Log Handlers
  const [showShortageEditModal, setShowShortageEditModal] = useState(false);
  const [editingShortageLog, setEditingShortageLog] = useState(null);
  const [shortageEditForm, setShortageEditForm] = useState({
    itemName: '',
    quantity: 1,
    unit: 'pcs',
    assignedTo: 'supervisor',
    status: 'assigned',
    remarks: ''
  });

  const handleOpenEditShortageLog = (item) => {
    setEditingShortageLog(item);
    setShortageEditForm({
      itemName: item.itemName || item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      assignedTo: item.assignedTo || 'supervisor',
      status: item.status || 'assigned',
      remarks: item.remarks || ''
    });
    setShowShortageEditModal(true);
  };

  const handleSaveEditShortageLog = async (e) => {
    e.preventDefault();
    if (!editingShortageLog) return;
    setSubmitting(true);
    try {
      await operationsAPI.updateShortageBuySale(editingShortageLog._id, shortageEditForm);
      toast.success('Shortage log updated successfully!');
      setShowShortageEditModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update shortage log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShortageLog = (id) => {
    setConfirmState({
      title: 'Delete this shortage log?',
      text: 'The shortage log entry will be permanently removed.',
      confirmLabel: 'Delete log',
      onConfirm: async () => {
        try {
          await operationsAPI.deleteShortageBuySale(id);
          toast.success('Shortage log deleted successfully!');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete shortage log entry');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const handleForwardShortageToSales = (item) => {
    setConfirmState({
      title: 'Forward this task to Sales?',
      text: 'The shortage task will be reassigned to the Sales team for sourcing.',
      confirmLabel: 'Forward to Sales',
      tone: 'primary',
      onConfirm: async () => {
        try {
          await operationsAPI.updateShortageBuySale(item._id, { assignedTo: 'sales', status: 'pending' });
          toast.success('Task successfully forwarded to Sales!');
          fetchData();
        } catch (err) {
          toast.error('Failed to forward task to Sales');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleAddMaterial = () => {
    setMaterialsUsed([...materialsUsed, { materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 1, unit: 'kg' }]);
  };

  const handleRemoveMaterial = (index) => {
    setMaterialsUsed(materialsUsed.filter((_, i) => i !== index));
  };

  const handleStartProcessBuild = async (e) => {
    e.preventDefault();
    if (!selectedJob) {
      toast.error('Please select a build order.');
      return;
    }
    if (!selectedMachineId) {
      toast.error('Please assign a machine for this build.');
      return;
    }
    setSubmitting(true);
    try {
      const selectedMachine = machines.find(m => m._id === selectedMachineId);
      const machName = selectedMachine?.name || '';
      const prodLine = selectedMachine?.productionLine || 'Line 1';

      const payload = {
        status: buildModalMode === 'create' ? 'processing' : buildStatus,
        estimatedDate: estimatedDate ? new Date(`${estimatedDate}T${buildTime}:00`) : undefined,
        materialsUsed,
        customFields,
        machineId: selectedMachineId,
        machineName: machName,
        productionLine: prodLine,
        shotCount: Number(shotCount)
      };

      if (buildModalMode === 'create') {
        payload.startedAt = Date.now();
      }

      if (selectedJob._id.toString().startsWith('shortage_')) {
        const createPayload = {
          productName: selectedJob.productName,
          productSize: selectedJob.productSize || 'Standard',
          orderQuantity: selectedJob.orderQuantity,
          status: 'processing',
          estimatedDate: payload.estimatedDate,
          materialsUsed: payload.materialsUsed,
          customFields: payload.customFields,
          machineId: payload.machineId,
          machineName: payload.machineName,
          productionLine: payload.productionLine,
          shotCount: payload.shotCount,
          shortageLogId: selectedJob.shortageLogId,
          startedAt: Date.now()
        };
        await operationsAPI.createBuildJob(createPayload);
        // Also update the shortage log status to 'assigned'
        await operationsAPI.updateShortageBuySale(selectedJob.shortageLogId, { status: 'assigned' });
        toast.success('Production build process created from shortage log!');
      } else {
        await operationsAPI.updateBuildJob(selectedJob._id, payload);
        toast.success(
          buildModalMode === 'create'
            ? 'Product has been loaded into production line!'
            : 'Build process configuration updated!'
        );
      }
      setShowBuildModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update build process');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToStore = async (id) => {
    try {
      await operationsAPI.sendToStore(id);
      toast.success('Product completed and dispatched to Store (Handshake Sent)!');
      fetchData();
    } catch (err) {
      toast.error('Failed to complete build job');
    }
  };

  const reportShortage = async (job) => {
    try {
      await operationsAPI.updateBuildJob(job._id, { status: 'shortage_reported' });
      toast.success('Shortage report sent to Sales and Store Manager');
      fetchData();
    } catch (err) {
      toast.error('Failed to report shortage');
    }
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMaterialId) {
        await operationsAPI.updateInventoryItem(editingMaterialId, materialForm);
        toast.success('Material inventory item updated');
      } else {
        await operationsAPI.createInventoryItem(materialForm);
        toast.success('Material inventory item created');
      }
      setShowMaterialModal(false);
      setMaterialForm({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Unassigned', size: '', description: '' });
      setEditingMaterialId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMaterial = (item) => {
    setEditingMaterialId(item._id);
    setMaterialForm({
      name: item.name,
      type: item.type || 'raw_material',
      quantity: item.quantity,
      unit: item.unit || 'kg',
      location: item.location || 'Unassigned',
      size: item.size || '',
      description: item.description || ''
    });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterialItem = (id) => {
    setConfirmState({
      title: 'Delete this material record?',
      text: 'The inventory record will be permanently removed.',
      confirmLabel: 'Delete record',
      onConfirm: async () => {
        try {
          await operationsAPI.deleteInventoryItem(id);
          toast.success('Material record deleted successfully');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete material record');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const handleStatusChange = async (job, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (['processing', 'delayed'].includes(newStatus) && !job.machineId) {
        toast.error('Please assign a machine first by clicking "Start Build" or "Edit Process".');
        return;
      }
      await operationsAPI.updateBuildJob(job._id, payload);

      if (job.shortageLogId) {
        if (newStatus === 'completed') {
          await operationsAPI.updateShortageBuySale(job.shortageLogId, { status: 'completed' });
        }
      }

      toast.success(`Build status updated to ${newStatus.replace('_', ' ')}!`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleMachineStatusChange = async (mach, newStatus) => {
    try {
      await operationsAPI.updateMachine(mach._id, { status: newStatus });
      toast.success(`Machine status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update machine status');
    }
  };

  const groupBuildJobsByModel = (jobsList) => {
    const map = new Map();
    jobsList.forEach(job => {
      const modelKey = (job.modelNumber && job.modelNumber.trim())
        ? job.modelNumber.trim().toUpperCase()
        : (job.productName ? job.productName.trim().toUpperCase() : job._id.toString());

      if (!map.has(modelKey)) {
        map.set(modelKey, {
          key: modelKey,
          jobs: [],
          totalQty: 0,
          primaryJob: job,
          sizes: new Set(),
          orderedByNames: new Set()
        });
      }

      const group = map.get(modelKey);
      group.jobs.push(job);
      group.totalQty += Number(job.orderQuantity) || 0;
      if (job.productSize) group.sizes.add(job.productSize);
      const salesPerson = job.salesPersonName || job.orderedBy?.name;
      if (salesPerson) group.orderedByNames.add(salesPerson);

      const statusPriority = { processing: 4, delayed: 4, shortage_reported: 3, pending: 2, completed: 1, received: 1, declined: 0 };
      if ((statusPriority[job.status] || 0) > (statusPriority[group.primaryJob.status] || 0)) {
        group.primaryJob = job;
      }
    });

    return Array.from(map.values()).map(group => ({
      ...group.primaryJob,
      orderQuantity: group.totalQty,
      productSize: Array.from(group.sizes).join(', ') || group.primaryJob.productSize || 'N/A',
      orderedByName: Array.from(group.orderedByNames).join(', ') || group.primaryJob.salesPersonName || group.primaryJob.orderedBy?.name || 'Sales Officer',
      groupedCount: group.jobs.length
    }));
  };

  const groupedBuildJobs = groupBuildJobsByModel(buildJobs);

  /* ------------------------------------------------------------- derived */

  const isPM = user?.role === 'production_manager';
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const filteredGateEntries = gateEntries.filter(entry => {
    if (gateFilter === 'pending') return entry.status === 'pending';
    if (gateFilter === 'completed') return ['verified', 'grn_created', 'rejected'].includes(entry.status);
    return true;
  });

  const pendingGateCount = gateEntries.filter(e => e.status === 'pending').length;
  const completedGateCount = gateEntries.filter(e => ['verified', 'grn_created', 'rejected'].includes(e.status)).length;

  const assignedTaskCount =
    shortages.filter(s => {
      if (s.status === 'completed' || s.status === 'ordered') return false;
      const linkedJob = buildJobs.find(j => j.shortageLogId === s._id);
      if (linkedJob && ['completed', 'received', 'declined'].includes(linkedJob.status)) return false;
      return true;
    }).length +
    allInventoryItems.filter(item => {
      if (item.productionStatus !== 'assigned_to_supervisor') return false;
      const linkedJob = buildJobs.find(j => j.shortageLogId === item._id);
      if (linkedJob && ['completed', 'received', 'declined'].includes(linkedJob.status)) return false;
      return true;
    }).length;

  const inventoryShortageCount = allInventoryItems.filter(item => item.productionStatus && item.productionStatus !== 'none').length;
  const supervisorInventoryTasks = allInventoryItems.filter(item => item.productionStatus === 'assigned_to_supervisor');
  const liveJobs = buildJobs.filter(j => ['pending', 'processing', 'shortage_reported', 'delayed'].includes(j.status));
  const runningJobs = buildJobs.filter(j => ['processing', 'delayed'].includes(j.status));
  const availableMachines = machines.filter(m => ['available', 'working'].includes(m.status)).length;

  const tabItems = [
    ...(!isPM ? [{ key: 'gate_approvals', label: 'Gate Approvals', icon: <LuCircleCheck />, count: filteredGateEntries.length }] : []),
    { key: 'machines', label: 'Machine Automation', icon: <LuCog />, count: machines.length },
    ...(!isPM ? [{ key: 'build_queue', label: 'Product Build Queue', icon: <LuSlidersHorizontal />, count: groupedBuildJobs.length }] : []),
    ...(!isPM ? [{ key: 'tasks', label: 'Assigned Tasks', icon: <LuClipboardList />, count: assignedTaskCount }] : []),
    ...(isPM ? [{ key: 'order_history', label: 'Order Live & History', icon: <LuHistory />, count: buildJobs.length }] : []),
    { key: 'inventory_shortage', label: 'Inventory Shortage', icon: <LuBox />, count: inventoryShortageCount },
    { key: 'materials', label: 'Material Inventory', icon: <LuPackage />, count: rawMaterials.length },
  ];

  /* ------------------------------------------------- header action button */

  let headerAction = null;
  if (activeTab === 'machines' && ['super_admin', 'admin'].includes(user?.role)) {
    headerAction = (
      <Button
        variant="primary"
        icon={<LuPlus />}
        onClick={() => {
          setEditingMachineId(null);
          setMachineForm({ name: '', status: 'available', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '', productionLine: 'Line 1' });
          setSelectedMachineType('');
          setSelectedCategory('');
          setSelectedSubMachine('');
          setShowCustomDropdown(false);
          setActiveHoverCategory(null);
          setIsCustomMachineName(false);
          setShowMachineModal(true);
        }}
      >
        Add Machine
      </Button>
    );
  } else if (activeTab === 'build_queue' && !isPM) {
    headerAction = (
      <Button variant="primary" icon={<LuPlus />} onClick={handleOpenCreateBuild}>
        Create Build Process
      </Button>
    );
  } else if (activeTab === 'materials') {
    headerAction = (
      <Button
        variant="primary"
        icon={<LuPlus />}
        onClick={() => {
          setEditingMaterialId(null);
          setMaterialForm({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Production Area', size: '', description: '' });
          setShowMaterialModal(true);
        }}
      >
        Add Material
      </Button>
    );
  }

  /* --------------------------------------------------------- table columns */

  const invoiceCell = (entry) => (
    entry.invoiceUrl ? (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href={entry.invoiceUrl ? `${SOCKET_URL}/api/upload/view/${entry.invoiceUrl.split('/').pop()}` : '#'}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-xs"
        >
          <LuExternalLink /> View
        </a>
        <a
          href={`${SOCKET_URL}/api/upload/download/${entry.invoiceUrl.split('/').pop()}`}
          download
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-xs"
          style={{ borderColor: tint('var(--success)', 45), color: 'var(--success)' }}
        >
          <LuDownload /> Download
        </a>
      </div>
    ) : (
      <SubText tone="var(--text-ghost)">No invoice</SubText>
    )
  );

  const gateColumns = [
    {
      key: 'billNumber',
      header: 'Bill Info',
      primary: true,
      render: (entry) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.billNumber}</span>
          <SubText tone="var(--text-ghost)">{new Date(entry.createdAt).toLocaleString()}</SubText>
          {/* The remark used to echo here too; prose of any length stretched the
              row, so it now lives only in the detail drawer. */}
        </Stack>
      ),
    },
    { key: 'vendorName', header: 'Vendor' },
    {
      key: 'materialType',
      header: 'Material',
      hideBelow: 640,
      render: (entry) => <span style={{ textTransform: 'capitalize' }}>{entry.materialType}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      sortValue: (entry) => Number(entry.quantity) || 0,
      render: (entry) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.quantity} {entry.unit}</span>
      ),
    },
    {
      key: 'driverName',
      header: 'Driver / Vehicle',
      hideBelow: 1100,
      render: (entry) => (
        <Stack>
          <span>{entry.driverName}</span>
          <SubText tone="var(--text-ghost)">{entry.vehicleNumber}</SubText>
        </Stack>
      ),
    },
    { key: 'invoice', header: 'Invoice', sortable: false, hideBelow: 900, render: invoiceCell },
    ...(gateFilter === 'pending'
      ? [{
          key: 'actions',
          header: 'Actions',
          sortable: false,
          align: 'right',
          render: (entry) => (
            <RowActions>
              {/* Clamped cells hide their tail — this opens the full record. */}
              <Button
                size="xs"
                variant="ghost"
                icon={<LuEye />}
                title="View full details"
                onClick={() => setDetailGateEntry(entry)}
              >
                View
              </Button>
              <Button size="xs" icon={<LuBox />} onClick={() => openAddItemsModal(entry)}>
                Add Items &amp; Verify
              </Button>
              <Button size="xs" variant="primary" icon={<LuCircleCheck />} onClick={() => handleOpenGateVerify(entry._id)}>
                Verify Only
              </Button>
            </RowActions>
          ),
        }]
      : [
          {
            key: 'verifiedBy',
            header: 'Verifier Info',
            hideBelow: 900,
            sortValue: (entry) => entry.verifiedBy?.name || 'Supervisor',
            render: (entry) => (
              <Stack>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.verifiedBy?.name || 'Supervisor'}</span>
                <SubText tone="var(--text-ghost)">{new Date(entry.updatedAt).toLocaleString()}</SubText>
              </Stack>
            ),
          },
          /* Remarks / notes are free prose of any length, so they are not a grid
             column — they live in the entry's detail view, behind the View action. */
          {
            key: 'status',
            header: 'Status',
            render: (entry) => (
              <Badge tone={entry.status === 'grn_created' ? 'success' : entry.status === 'verified' ? 'info' : 'danger'}>
                {entry.status === 'verified' ? 'Verified' : entry.status === 'grn_created' ? 'GRN Created' : humanise(entry.status)}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            sortable: false,
            align: 'right',
            render: (entry) => (
              <RowActions>
                <Button
                  size="xs"
                  variant="ghost"
                  icon={<LuEye />}
                  title="View full details"
                  onClick={() => setDetailGateEntry(entry)}
                >
                  View
                </Button>
              </RowActions>
            ),
          },
        ]),
  ];

  const machineColumns = [
    {
      key: 'name',
      header: 'Machine',
      primary: true,
      render: (mach) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mach.name}</span>
          <SubText>{mach.remarks || 'No remarks.'}</SubText>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (mach) => (
        <Badge tone={machineTone(mach.status)}>
          {humanise(mach.status)}
        </Badge>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      hideBelow: 1100,
      render: (mach) => mach.capacity || '--',
    },
    {
      key: 'modelNumber',
      header: 'Model',
      hideBelow: 1100,
      render: (mach) => mach.modelNumber || '--',
    },
    {
      key: 'powerRating',
      header: 'Power',
      hideBelow: 1280,
      render: (mach) => mach.powerRating || '--',
    },
    {
      key: 'lastServiceDate',
      header: 'Serviced',
      hideBelow: 1280,
      render: (mach) => (mach.lastServiceDate ? new Date(mach.lastServiceDate).toLocaleDateString() : '--'),
    },
    {
      key: 'actions',
      header: 'Set status',
      sortable: false,
      align: 'right',
      render: (mach) => (
        <RowActions>
          <Select
            value={mach.status}
            onChange={(e) => handleMachineStatusChange(mach, e.target.value)}
            aria-label={`Change status of ${mach.name}`}
            style={{ height: 30, width: 130, cursor: 'pointer', fontSize: 'var(--fs-xs)' }}
          >
            <option value="working">Working</option>
            <option value="available">Available</option>
            <option value="damaged">Damaged</option>
            <option value="not found">Not Found</option>
            <option value="idle">Idle</option>
            <option value="destroyed">Destroyed</option>
          </Select>
          {['super_admin', 'admin'].includes(user?.role) && (
            <>
              <Button size="xs" icon={<LuPencil />} onClick={() => handleEditMachine(mach)} title="Edit machine">
                Edit
              </Button>
              <Button
                size="xs"
                icon={<LuTrash2 />}
                onClick={() => handleDeleteMachine(mach._id)}
                title="Delete machine"
                style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
              >
                Delete
              </Button>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const liveJobColumns = [
    {
      key: 'productName',
      header: 'Product',
      primary: true,
      render: (job) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</span>
          {job.productSize && <SubText tone="var(--text-ghost)">{job.productSize}</SubText>}
        </Stack>
      ),
    },
    {
      key: 'orderQuantity',
      header: 'Qty',
      align: 'right',
      sortValue: (job) => Number(job.orderQuantity) || 0,
      render: (job) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{job.orderQuantity} pcs</span>,
    },
    {
      key: 'machineName',
      header: 'Machine & Line',
      hideBelow: 900,
      render: (job) => (
        <Stack>
          <span>{job.machineName || 'Not Assigned'}</span>
          <SubText tone="var(--primary)">{job.productionLine || 'Line 1'}</SubText>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => <Badge tone={buildTone(job.status)}>{humanise(job.status)}</Badge>,
    },
    {
      key: 'progress',
      header: 'Progress',
      hideBelow: 1100,
      sortValue: (job) => jobProgress(job),
      render: (job) => {
        const pct = jobProgress(job);
        const tone = job.status === 'delayed' || job.status === 'shortage_reported'
          ? 'var(--danger)'
          : pct >= 100 ? 'var(--success)' : 'var(--primary)';
        return <Meter value={pct} tone={tone} label={`${pct}% of planned window`} />;
      },
    },
    {
      key: 'createdAt',
      header: 'Start',
      hideBelow: 1280,
      render: (job) => <SubText>{new Date(job.createdAt).toLocaleString()}</SubText>,
    },
    {
      key: 'eta',
      header: 'Time Remaining',
      sortable: false,
      align: 'right',
      render: (job) => <CountdownTimer job={job} />,
    },
  ];

  const historyColumns = [
    {
      key: 'productName',
      header: 'Product',
      primary: true,
      render: (job) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</span>
          {job.productSize && <SubText tone="var(--text-ghost)">{job.productSize}</SubText>}
        </Stack>
      ),
    },
    {
      key: 'orderQuantity',
      header: 'Qty',
      align: 'right',
      sortValue: (job) => Number(job.orderQuantity) || 0,
      render: (job) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{job.orderQuantity} pcs</span>,
    },
    {
      key: 'machineName',
      header: 'Machine & Line',
      hideBelow: 900,
      render: (job) => (
        <Stack>
          <span>{job.machineName || 'Not Assigned'}</span>
          <SubText tone="var(--text-ghost)">{job.productionLine || 'Line 1'}</SubText>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => (
        <Badge tone={['received', 'completed'].includes(job.status) ? 'success' : 'danger'}>
          {humanise(job.status)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hideBelow: 1100,
      render: (job) => <SubText>{new Date(job.createdAt).toLocaleString()}</SubText>,
    },
    {
      key: 'completedAt',
      header: 'Completed',
      align: 'right',
      sortValue: (job) => new Date(job.completedAt || job.updatedAt).getTime(),
      render: (job) => (
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--success)', fontWeight: 500 }}>
          {job.completedAt ? new Date(job.completedAt).toLocaleString() : new Date(job.updatedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const queueColumns = [
    {
      key: 'productName',
      header: 'Product Details',
      clamp: true,
      primary: true,
      render: (job) => (
        <Stack gap={3}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</span>
          <SubText tone="var(--text-ghost)">Size: {job.productSize || 'N/A'}</SubText>
          {job.machineId && typeof job.machineId === 'object' ? (
            <SubText tone="var(--primary)">
              {job.machineId.name} · {job.productionLine || job.machineId.productionLine || 'Line 1'}
              {job.shotCount ? ` · ${job.shotCount} shots` : ''}
            </SubText>
          ) : job.machineName ? (
            <SubText tone="var(--primary)">
              {job.machineName} · {job.productionLine || 'Line 1'}
              {job.shotCount ? ` · ${job.shotCount} shots` : ''}
            </SubText>
          ) : null}
          {job.materialsUsed && job.materialsUsed.length > 0 && (
            <SubText>
              Materials: {job.materialsUsed.map(m => `${m.quantity} ${m.unit} ${m.materialName}`).join(', ')}
            </SubText>
          )}
        </Stack>
      ),
    },
    {
      key: 'orderQuantity',
      header: 'Ordered Qty',
      align: 'right',
      sortValue: (job) => Number(job.orderQuantity) || 0,
      render: (job) => {
        let linkedShortage = null;
        if (job.shortageLogId) {
          const targetId = (job.shortageLogId._id || job.shortageLogId).toString();
          linkedShortage = allSbsLogs.find(s => s._id.toString() === targetId);
        }
        if (!linkedShortage && job.inventoryItemId) {
          const invId = (job.inventoryItemId._id || job.inventoryItemId).toString();
          linkedShortage = allSbsLogs.find(s =>
            s.inventoryItemId &&
            (s.inventoryItemId._id || s.inventoryItemId).toString() === invId &&
            s.type === 'shortage' &&
            s.status !== 'completed'
          );
        }
        return (
          <Stack gap={4}>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{job.orderQuantity} pcs</span>
            {linkedShortage && (
              <span style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
                <Badge tone="danger" icon={<LuTriangleAlert />}>
                  {linkedShortage.quantity} {linkedShortage.unit} short
                </Badge>
              </span>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'orderedByName',
      header: 'Ordered By',
      hideBelow: 1100,
      sortValue: (job) => job.orderedByName || job.salesPersonName || job.orderedBy?.name || 'Sales Officer',
      render: (job) => (
        <Stack gap={4}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {job.orderedByName || job.salesPersonName || job.orderedBy?.name || 'Sales Officer'}
          </span>
          <span>
            <Badge tone="info">{job.orderedRole || 'SALES'}</Badge>
          </span>
        </Stack>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hideBelow: 1280,
      sortValue: (job) => new Date(job.createdAt).getTime(),
      render: (job) => (
        <Stack>
          <SubText tone="var(--text-secondary)">{new Date(job.createdAt).toLocaleDateString()}</SubText>
          <SubText tone="var(--text-ghost)">
            {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </SubText>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => (
        <Stack gap={4}>
          <Select
            value={job.status}
            disabled={['completed', 'received', 'declined'].includes(job.status)}
            onChange={(e) => handleStatusChange(job, e.target.value)}
            aria-label={`Change status of ${job.productName}`}
            style={{ height: 30, width: 168, cursor: 'pointer', fontSize: 'var(--fs-xs)', textTransform: 'capitalize' }}
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delayed">Delayed</option>
            <option value="shortage_reported">Shortage Reported</option>
            <option value="completed">Completed</option>
            <option value="received" disabled={job.status !== 'received'}>Received</option>
            <option value="declined" disabled={job.status !== 'declined'}>Declined</option>
          </Select>
          {job.estimatedDate && (
            <SubText tone="var(--text-ghost)">Est: {new Date(job.estimatedDate).toLocaleString()}</SubText>
          )}
        </Stack>
      ),
    },
    {
      key: 'actions',
      header: 'Build Actions',
      sortable: false,
      align: 'right',
      render: (job) => (
        <RowActions>
          {job.status === 'pending' && (
            <>
              <Button size="xs" variant="primary" icon={<LuPlay />} onClick={() => handleOpenBuild(job)}>
                Start Build
              </Button>
              <Button
                size="xs"
                icon={<LuTriangleAlert />}
                onClick={() => reportShortage(job)}
                style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
              >
                Report Shortage
              </Button>
            </>
          )}
          {job.status === 'shortage_reported' && (
            <>
              <Button size="xs" variant="primary" icon={<LuPlay />} onClick={() => handleOpenBuild(job)}>
                Start Build (Override)
              </Button>
              <Button size="xs" icon={<LuCog />} onClick={() => handleOpenEditBuild(job)}>
                Edit Process
              </Button>
            </>
          )}
          {['processing', 'delayed'].includes(job.status) && (
            <>
              <Button size="xs" variant="accent" icon={<LuCircleArrowRight />} onClick={() => handleSendToStore(job._id)}>
                Send to Store
              </Button>
              <Button size="xs" icon={<LuCog />} onClick={() => handleOpenEditBuild(job)}>
                Edit Process
              </Button>
            </>
          )}
          {['completed', 'received', 'declined'].includes(job.status) && (
            <SubText tone="var(--text-ghost)">Finished ({humanise(job.status)})</SubText>
          )}

          {/* ADMIN ONLY EDIT & DELETE OPTIONS */}
          {isAdmin && (
            <>
              <Button
                size="xs"
                icon={<LuPencil />}
                onClick={() => handleOpenEditBuild(job)}
                title="Edit Manufacturing Queue Entry (Admin Only)"
              >
                Edit
              </Button>
              <Button
                size="xs"
                icon={<LuTrash2 />}
                onClick={() => handleDeleteBuildJob(job._id)}
                title="Delete Manufacturing Queue Entry (Admin Only)"
                style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
              >
                Delete
              </Button>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const shortageTaskColumns = [
    {
      key: 'itemName',
      header: 'Item Details',
      clamp: true,
      primary: true,
      render: (item) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.itemName}</span>
          {item.remarks && <SubText>{item.remarks}</SubText>}
        </Stack>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 900,
      render: (item) => <Badge>{humanise(item.type).toUpperCase()}</Badge>,
    },
    {
      key: 'quantity',
      header: 'Shortage Deficit',
      align: 'right',
      sortValue: (item) => Number(item.quantity) || 0,
      render: (item) => (
        <Stack gap={2}>
          <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{item.quantity} {item.unit}</span>
          <SubText tone="var(--text-ghost)">To build</SubText>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge tone={item.status === 'completed' ? 'success' : item.status === 'assigned' ? 'info' : 'warning'}>
          {humanise(item.status)}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Assigned',
      hideBelow: 1100,
      sortValue: (item) => new Date(item.updatedAt).getTime(),
      render: (item) => <SubText>{new Date(item.updatedAt).toLocaleDateString()}</SubText>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (item) => (
        <RowActions>
          <Button size="xs" icon={<LuEye />} onClick={() => handleOpenViewSpecs(item)}>
            View
          </Button>

          {item.status !== 'completed' ? (() => {
            const linkedJob = buildJobs.find(j => j.shortageLogId === item._id || (j._id && j._id.toString() === (item.shortageLogId || '').toString()));

            if (linkedJob && ['processing', 'delayed'].includes(linkedJob.status)) {
              return <CountdownTimer job={linkedJob} onStatusChange={handleStatusChange} />;
            }

            if (linkedJob && ['completed', 'received'].includes(linkedJob.status)) {
              return <Badge tone="success" icon={<LuCircleCheck />}>Completed</Badge>;
            }

            return (
              <>
                <Button size="xs" variant="success" icon={<LuPlay />} onClick={() => handleOpenBuildFromShortage(item)}>
                  Order Build
                </Button>
                <Button
                  size="xs"
                  icon={<LuCircleArrowRight />}
                  onClick={() => handleForwardShortageToSales(item)}
                  style={{ color: 'var(--primary)', borderColor: tint('var(--primary)', 40) }}
                >
                  Forward to Sales
                </Button>
              </>
            );
          })() : (
            <Badge tone="success" icon={<LuCircleCheck />}>Completed</Badge>
          )}

          {/* ADMIN & SUPERADMIN EDIT & DELETE BUTTONS */}
          {isAdmin && (
            <>
              <Button size="xs" icon={<LuPencil />} onClick={() => handleOpenEditShortageLog(item)} title="Edit Shortage Log (Admin Only)">
                Edit
              </Button>
              <Button
                size="xs"
                icon={<LuTrash2 />}
                onClick={() => handleDeleteShortageLog(item._id)}
                title="Delete Shortage Log (Admin Only)"
                style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
              >
                Delete
              </Button>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const inventoryTaskColumns = [
    {
      key: 'name',
      header: 'Item Details',
      clamp: true,
      primary: true,
      render: (item) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
          {item.storeRemarks && <SubText tone="var(--success)">Store: {item.storeRemarks}</SubText>}
          {item.pmRemarks && <SubText tone="var(--warning)">PM: {item.pmRemarks}</SubText>}
        </Stack>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 900,
      sortable: false,
      render: () => <Badge tone="danger">Inventory shortage</Badge>,
    },
    {
      key: 'required',
      header: 'Shortage Deficit',
      align: 'right',
      sortValue: (item) => getRequiredQty(item),
      render: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
          {getRequiredQty(item)} {item.unit || 'pcs'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: () => <Badge tone="info">Assigned to you</Badge>,
    },
    {
      key: 'assignedSupervisorAt',
      header: 'Assigned',
      hideBelow: 1100,
      sortValue: (item) => new Date(item.assignedSupervisorAt || item.updatedAt).getTime(),
      render: (item) => (
        <SubText>
          {item.assignedSupervisorAt
            ? new Date(item.assignedSupervisorAt).toLocaleDateString()
            : new Date(item.updatedAt).toLocaleDateString()}
        </SubText>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (item) => {
        const linkedJob = buildJobs.find(j => j.shortageLogId === item._id);
        return (
          <RowActions>
            <Button size="xs" icon={<LuEye />} onClick={() => handleOpenViewSpecs(item)}>
              View
            </Button>
            {linkedJob ? (
              <>
                <CountdownTimer job={linkedJob} onStatusChange={handleStatusChange} />
                <Button size="xs" icon={<LuCog />} onClick={() => handleOpenEditBuild(linkedJob)}>
                  Edit
                </Button>
              </>
            ) : (
              <Button size="xs" variant="success" icon={<LuPlay />} onClick={() => handleOpenBuildFromShortage(item)}>
                Order Build
              </Button>
            )}

            {/* ADMIN & SUPERADMIN EDIT & DELETE BUTTONS */}
            {isAdmin && (
              <>
                <Button size="xs" icon={<LuPencil />} onClick={() => handleEditMaterial(item)} title="Edit Inventory Item (Admin Only)">
                  Edit
                </Button>
                <Button
                  size="xs"
                  icon={<LuTrash2 />}
                  onClick={() => handleDeleteMaterialItem(item._id)}
                  title="Delete Inventory Item (Admin Only)"
                  style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
                >
                  Delete
                </Button>
              </>
            )}
          </RowActions>
        );
      },
    },
  ];

  const filteredMaterials = rawMaterials.filter(item => {
    const term = materialSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.size && item.size.toLowerCase().includes(term)) ||
      (item.location && item.location.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term))
    );
  });

  const materialColumns = [
    {
      key: 'name',
      header: 'Material',
      primary: true,
      render: (item) => (
        <Stack>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
          {item.description && <SubText>{item.description}</SubText>}
        </Stack>
      ),
    },
    {
      key: 'available',
      header: 'Available Qty',
      align: 'right',
      sortValue: (item) => Math.max(0, item.quantity - getRequiredQty(item)),
      render: (item) => {
        const reqQty = getRequiredQty(item);
        return (
          <span style={{ fontWeight: 700, color: (item.quantity - reqQty) <= 0 ? 'var(--danger)' : 'var(--success)' }}>
            {Math.max(0, item.quantity - reqQty)} {item.unit}
          </span>
        );
      },
    },
    {
      key: 'required',
      header: 'Required Qty',
      align: 'right',
      sortValue: (item) => getRequiredQty(item),
      render: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{getRequiredQty(item)} {item.unit}</span>
      ),
    },
    { clamp: true, key: 'size', header: 'Size Spec', hideBelow: 900, render: (item) => item.size || 'N/A' },
    { key: 'location', header: 'Location', hideBelow: 1100, render: (item) => item.location || 'Unassigned' },
    {
      key: 'createdAt',
      header: 'Added',
      hideBelow: 1280,
      sortValue: (item) => (item.createdAt ? new Date(item.createdAt).getTime() : 0),
      render: (item) => <SubText>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</SubText>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (item) => (
        <RowActions>
          <Button size="xs" icon={<LuPencil />} onClick={() => handleEditMaterial(item)}>Edit</Button>
          <Button
            size="xs"
            icon={<LuTrash2 />}
            onClick={() => handleDeleteMaterialItem(item._id)}
            style={{ color: 'var(--danger)', borderColor: tint('var(--danger)', 40) }}
          >
            Delete
          </Button>
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
    { key: 'modelNumber', header: 'Model Number' },
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
          {humanise(s.status).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'plannedShots',
      header: 'Planned Shots',
      align: 'right',
      hideBelow: 900,
      render: (s) => (s.plannedShots > 0 ? `${s.plannedShots} shots` : 'Not Planned'),
    },
    {
      key: 'actions',
      header: 'Action',
      sortable: false,
      align: 'right',
      render: (s) => (
        <RowActions>
          {s.status === 'pending_planning' ? (
            <Button
              size="xs"
              variant="primary"
              icon={<LuSlidersHorizontal />}
              onClick={() => {
                setSelectedShortage(s);
                setPlanForm({ plannedShots: '' });
                setShowPlanModal(true);
              }}
            >
              Plan Production
            </Button>
          ) : (
            <Badge tone="success">Planned</Badge>
          )}
        </RowActions>
      ),
    },
  ];

  const filteredInventoryShortages = allInventoryItems
    .filter(item => item.productionStatus && item.productionStatus !== 'none')
    .filter(item => {
      const linkedJob = buildJobs.find(j => j.shortageLogId === item._id);
      const isDone = item.productionStatus === 'completed' || (linkedJob && ['completed', 'received'].includes(linkedJob.status));
      if (inventoryStatusFilter === 'pending') return !isDone;
      if (inventoryStatusFilter === 'completed') return isDone;
      return true;
    });

  const inventoryShortageColumns = [
    {
      key: 'name',
      header: 'Item Name',
      primary: true,
      render: (item) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>,
    },
    {
      key: 'type',
      header: 'Item Type',
      hideBelow: 1280,
      render: (item) => <span style={{ textTransform: 'capitalize' }}>{item.type ? humanise(item.type) : 'raw material'}</span>,
    },
    { key: 'modelNumber', header: 'Model', hideBelow: 900, render: (item) => item.modelNumber || 'N/A' },
    { key: 'size', header: 'Inner Size', hideBelow: 1100, render: (item) => item.size || 'N/A' },
    {
      key: 'outerSize',
      header: 'Outer Size',
      hideBelow: 1280,
      render: (item) => item.description?.replace('Outer: ', '') || 'N/A',
    },
    ...(isDragChain
      ? [
          { key: 'radius', header: 'Bend R', hideBelow: 1440, render: (item) => item.radius || 'N/A' },
          { key: 'vs', header: 'VS', hideBelow: 1440, render: (item) => item.vs || 'N/A' },
          { key: 'hs', header: 'HS', hideBelow: 1440, render: (item) => item.hs || 'N/A' },
          { key: 'sr', header: 'SR', hideBelow: 1440, render: (item) => item.sr || 'N/A' },
        ]
      : []),
    {
      key: 'quantity',
      header: 'Available',
      align: 'right',
      sortValue: (item) => Number(item.quantity) || 0,
      render: (item) => (
        <span style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--danger)' : 'var(--success)' }}>
          {item.quantity} {item.unit}
        </span>
      ),
    },
    /* The store remark is free prose of any length, so it is not a grid column —
       it lives in the record's detail view, behind the row's View action. */
    {
      key: 'productionStatus',
      header: 'Status / Assignee',
      render: (item) => (
        item.productionStatus === 'sent_to_pm' ? (
          <Badge tone="warning">Pending PM assignment</Badge>
        ) : item.productionStatus === 'assigned_to_supervisor' ? (
          <Badge tone="info">{item.assignedSupervisor}</Badge>
        ) : (
          <Badge tone="success">Completed</Badge>
        )
      ),
    },
    /* PM remarks are free prose of any length, so they are not a grid column —
       they live in the record's detail view, behind the row's View action. */
    {
      key: 'orderStatus',
      header: 'Order Status',
      sortable: false,
      align: 'right',
      render: (item) => {
        const linkedJob = buildJobs.find(j => j.shortageLogId === item._id);
        const isDone = item.productionStatus === 'completed' || (linkedJob && ['completed', 'received'].includes(linkedJob.status));
        return (
          <RowActions>
            {/* Clamped cells hide their tail — this opens the full record. */}
            <Button
              size="xs"
              variant="ghost"
              icon={<LuEye />}
              title="View full details"
              onClick={() => handleOpenViewSpecs(item)}
            >
              View
            </Button>
            {isDone ? (
              <Badge tone="success" icon={<LuCircleCheck />}>Done</Badge>
            ) : ['production_manager', 'admin', 'super_admin'].includes(user?.role) && item.productionStatus === 'sent_to_pm' ? (
              <Button
                size="xs"
                variant="primary"
                icon={<LuCircleArrowRight />}
                onClick={() => {
                  setSelectedInventoryItem(item);
                  setSelectedSupervisor(item.assignedSupervisor || 'Supervisor Line 1');
                  setPmAssignRemarks(item.pmRemarks || 'Urgent basis priority production required');
                  setShowAssignSupervisorModal(true);
                }}
              >
                Assign to Supervisor
              </Button>
            ) : (
              <Badge tone="warning">Pending</Badge>
            )}
          </RowActions>
        );
      },
    },
  ];

  /* --------------------------------------------------------- machine view */

  const filteredMachines = machines.filter(m => {
    if (!machineSearch.trim()) return true;
    const q = machineSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.status?.toLowerCase().includes(q) ||
      m.productionLine?.toLowerCase().includes(q) ||
      m.modelNumber?.toLowerCase().includes(q) ||
      m.remarks?.toLowerCase().includes(q)
    );
  });

  const machinesByLine = filteredMachines.reduce((acc, m) => {
    const line = m.productionLine || 'Line 1';
    if (!acc[line]) acc[line] = [];
    acc[line].push(m);
    return acc;
  }, {});
  const sortedLines = Object.keys(machinesByLine).sort();

  /* ------------------------------------------------------ history / pages */

  const completedJobs = buildJobs.filter(j => ['completed', 'received', 'declined'].includes(j.status));
  const filteredCompleted = completedJobs.filter(j => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      j.productName?.toLowerCase().includes(q) ||
      j.machineName?.toLowerCase().includes(q) ||
      j.productionLine?.toLowerCase().includes(q) ||
      j.status?.toLowerCase().includes(q) ||
      j.productSize?.toLowerCase().includes(q)
    );
  });
  const historyPageCount = Math.ceil(filteredCompleted.length / 10) || 1;
  const historyRows = filteredCompleted.slice((historyPage - 1) * 10, historyPage * 10);

  const inventoryPageCount = Math.ceil(filteredInventoryShortages.length / 10) || 1;
  const inventoryRows = filteredInventoryShortages.slice((inventoryPage - 1) * 10, inventoryPage * 10);

  /* ------------------------------------------------------- build modal UI */

  const availableMachineOptions = machines.filter(m => m.status === 'available');

  return (
    <DashboardLayout pageTitle="Supervisor Operations Control">
      <Page>
        <PageHeader
          title="Supervisor Operations Control"
          subtitle="Gate approvals, machine readiness, live build queues and material shortages in one workspace."
          actions={headerAction}
        />

        <StatRow>
          <StatTile label="Machines online" value={`${availableMachines}/${machines.length}`} icon={<LuFactory />} tone="blue" />
          <StatTile label="Jobs running" value={runningJobs.length} icon={<LuZap />} tone="green" />
          <StatTile label="Live queue" value={liveJobs.length} icon={<LuLayers />} tone="violet" />
          {!isPM && <StatTile label="Gate pending" value={pendingGateCount} icon={<LuCircleCheck />} tone="amber" />}
          <StatTile label="Inventory shortages" value={inventoryShortageCount} icon={<LuTriangleAlert />} tone="red" />
          <StatTile label="Raw materials" value={rawMaterials.length} icon={<LuPackage />} tone="teal" />
        </StatRow>

        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

        {/* ===================================================== GATE APPROVALS */}
        {(activeTab === 'gate_approvals' && !isPM) ? (
          <Section
            title={gateFilter === 'pending' ? 'Pending Gate Approvals' : gateFilter === 'completed' ? 'Completed Gate Approvals' : 'All Gate Approvals'}
          >
            <Toolbar>
              <ChipGroup
                value={gateFilter}
                onChange={setGateFilter}
                items={[
                  { key: 'pending', label: 'Pending', count: pendingGateCount },
                  { key: 'completed', label: 'Completed', count: completedGateCount },
                  { key: 'all', label: 'All', count: gateEntries.length },
                ]}
              />
              <ToolbarSpacer />
              <DensitySwitch />
            </Toolbar>

            <DataTable
              columns={gateColumns}
              rows={filteredGateEntries}
              loading={loading}
              pageSize={15}
              empty={
                <EmptyState
                  icon={<LuCircleCheck />}
                  title="Nothing to approve"
                  text={
                    gateFilter === 'pending'
                      ? 'No pending gate entry approvals.'
                      : gateFilter === 'completed'
                        ? 'No completed approvals found.'
                        : 'No gate entries found.'
                  }
                />
              }
            />
          </Section>

        /* ======================================================== MACHINES */
        ) : activeTab === 'machines' ? (
          <Section title="Factory Machinery Status">
            <Toolbar>
              <SearchInput
                value={machineSearch}
                onChange={setMachineSearch}
                placeholder="Search machine by name, line, status…"
              />
              <ToolbarSpacer />
              <DensitySwitch />
            </Toolbar>

            {loading ? (
              <DataTable columns={machineColumns} rows={[]} loading />
            ) : machines.length === 0 ? (
              <EmptyState icon={<LuFactory />} title="No machines registered" text="Add a machine to start tracking the shop floor." />
            ) : filteredMachines.length === 0 ? (
              <EmptyState
                icon={<LuFactory />}
                title="No machines match your search"
                text={`Nothing found for “${machineSearch}”.`}
                action={<Button onClick={() => setMachineSearch('')}>Clear search</Button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                {sortedLines.map(lineName => (
                  <Section
                    key={lineName}
                    title={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <LuMapPin style={{ color: 'var(--primary)' }} /> {lineName}
                      </span>
                    }
                    actions={<Badge>{machinesByLine[lineName].length} machines</Badge>}
                  >
                    <DataTable
                      columns={machineColumns}
                      rows={machinesByLine[lineName]}
                      paginate={false}
                    />
                  </Section>
                ))}
              </div>
            )}
          </Section>

        /* =================================================== ORDER HISTORY */
        ) : activeTab === 'order_history' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
            <Section
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <LuZap style={{ color: 'var(--warning)' }} /> Live Building Orders
                </span>
              }
            >
              <DataTable
                columns={liveJobColumns}
                rows={liveJobs}
                loading={loading}
                pageSize={15}
                empty={
                  <EmptyState
                    icon={<LuZap />}
                    title="Nothing building right now"
                    text="No active orders are currently building in real-time."
                  />
                }
              />
            </Section>

            <Section
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <LuHistory style={{ color: 'var(--text-muted)' }} /> Completed Build History
                </span>
              }
            >
              <Toolbar>
                <SearchInput
                  value={historySearch}
                  onChange={(v) => { setHistorySearch(v); setHistoryPage(1); }}
                  placeholder="Search completed builds…"
                />
                <ToolbarSpacer />
                <DensitySwitch />
              </Toolbar>

              <DataTable
                columns={historyColumns}
                rows={historyRows}
                loading={loading}
                paginate={false}
                empty={
                  <EmptyState
                    icon={<LuHistory />}
                    title="No completed builds"
                    text={
                      completedJobs.length === 0
                        ? 'No completed build logs in history.'
                        : `No completed builds matching “${historySearch}” found.`
                    }
                  />
                }
              />

              {!loading && filteredCompleted.length > 0 && (
                <div
                  className="grid-foot"
                  style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--sp-3)' }}
                >
                  <span>{filteredCompleted.length} completed build{filteredCompleted.length === 1 ? '' : 's'}</span>
                  <Pager page={historyPage} pageCount={historyPageCount} onChange={setHistoryPage} />
                </div>
              )}
            </Section>
          </div>

        /* ===================================================== BUILD QUEUE */
        ) : (activeTab === 'build_queue' && !isPM) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
            <Section
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <LuZap style={{ color: 'var(--c-orange)' }} /> Today&apos;s Active Shots &amp; Production Lines
                </span>
              }
              actions={<Badge tone={runningJobs.length ? 'info' : 'neutral'}>{runningJobs.length} running</Badge>}
            >
              {runningJobs.length === 0 ? (
                <EmptyState
                  icon={<LuZap />}
                  title="No active shots"
                  text="No active shots or production runs currently processing. Create a build process to start."
                  action={<Button variant="primary" icon={<LuPlus />} onClick={handleOpenCreateBuild}>Create Build Process</Button>}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                    gap: 'var(--sp-3)',
                  }}
                >
                  {runningJobs.map(job => {
                    const pct = jobProgress(job);
                    const delayed = job.status === 'delayed';
                    return (
                      <Surface key={job._id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <Badge icon={<LuMapPin />}>{job.productionLine || 'Line 1'}</Badge>
                          <Badge tone={delayed ? 'danger' : 'info'} icon={delayed ? <LuTriangleAlert /> : <LuZap />}>
                            {delayed ? 'Delayed' : 'Running'}
                          </Badge>
                        </div>

                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 'var(--fs-md)',
                            color: 'var(--text-primary)',
                            marginBottom: 6,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {job.productName}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <LuUser style={{ color: 'var(--text-ghost)', flexShrink: 0 }} />
                          <SubText>{job.salesPersonName || job.orderedBy?.name || 'Sales Team'}</SubText>
                        </div>

                        <DescList
                          items={[
                            { label: 'Machine', value: job.machineName || 'Unspecified' },
                            { label: 'Quantity', value: `${job.orderQuantity} pcs` },
                            { label: 'Shots', value: `${job.shotCount || 1} runs` },
                          ]}
                        />

                        <div style={{ marginTop: 12 }}>
                          <Meter
                            value={pct}
                            tone={delayed ? 'var(--danger)' : 'var(--primary)'}
                            label={`${pct}% of planned window elapsed`}
                          />
                        </div>

                        {job.estimatedDate && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              borderTop: '1px solid var(--border-light)',
                              paddingTop: 10,
                              marginTop: 12,
                            }}
                          >
                            <LuTimer style={{ color: 'var(--text-ghost)', flexShrink: 0 }} />
                            <SubText tone="var(--text-ghost)">
                              Est. completion {new Date(job.estimatedDate).toLocaleString()}
                            </SubText>
                          </div>
                        )}
                      </Surface>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="Active Build Queue"
              actions={
                <Button variant="primary" size="sm" icon={<LuPlus />} onClick={handleOpenCreateBuild}>
                  Create Build Process
                </Button>
              }
            >
              <Toolbar>
                <ToolbarSpacer />
                <DensitySwitch />
              </Toolbar>
              <DataTable
                columns={queueColumns}
                rows={groupedBuildJobs}
                loading={loading}
                pageSize={15}
                empty={
                  <EmptyState
                    icon={<LuSlidersHorizontal />}
                    title="Queue is empty"
                    text="No active production orders in queue."
                    action={<Button variant="primary" icon={<LuPlus />} onClick={handleOpenCreateBuild}>Create Build Process</Button>}
                  />
                }
              />
            </Section>
          </div>

        /* ========================================================== TASKS */
        ) : (activeTab === 'tasks' && !isPM) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
            {!loading && shortages.length === 0 && supervisorInventoryTasks.length === 0 ? (
              <Section title="Assigned Shortages & Tasks Log">
                <EmptyState
                  icon={<LuClipboardList />}
                  title="No tasks assigned"
                  text="No tasks or shortages assigned to your role currently."
                />
              </Section>
            ) : (
              <>
                <Section title="Assigned Shortage Logs" actions={<Badge>{shortages.length}</Badge>}>
                  <DataTable
                    columns={shortageTaskColumns}
                    rows={shortages}
                    loading={loading}
                    pageSize={15}
                    empty={<EmptyState icon={<LuClipboardList />} title="No shortage logs" text="Nothing assigned to your role yet." />}
                  />
                </Section>

                <Section
                  title="Inventory Shortages Assigned to You"
                  actions={<Badge tone={supervisorInventoryTasks.length ? 'danger' : 'neutral'}>{supervisorInventoryTasks.length}</Badge>}
                >
                  <DataTable
                    columns={inventoryTaskColumns}
                    rows={supervisorInventoryTasks}
                    loading={loading}
                    pageSize={15}
                    empty={<EmptyState icon={<LuBox />} title="Nothing assigned" text="The production manager has not assigned any inventory shortage to you." />}
                  />
                </Section>
              </>
            )}
          </div>

        /* ====================================================== MATERIALS */
        ) : activeTab === 'materials' ? (
          <Section title="Material Inventory Registry">
            <Toolbar>
              <SearchInput
                value={materialSearch}
                onChange={setMaterialSearch}
                placeholder="Search materials by name, size or location…"
              />
              <ToolbarSpacer />
              <DensitySwitch />
              <Button
                variant="primary"
                size="sm"
                icon={<LuPlus />}
                onClick={() => {
                  setEditingMaterialId(null);
                  setMaterialForm({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Production Area', size: '', description: '' });
                  setShowMaterialModal(true);
                }}
              >
                Add Material
              </Button>
            </Toolbar>

            <DataTable
              columns={materialColumns}
              rows={filteredMaterials}
              loading={loading}
              pageSize={15}
              empty={<EmptyState icon={<LuPackage />} title="No materials found" text="No matching materials found." />}
            />
          </Section>

        /* ================================================ ORDER SHORTAGES */
        ) : activeTab === 'order_shortages' ? (
          <Section
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LuTriangleAlert style={{ color: 'var(--danger)' }} /> Client Order Shortages
              </span>
            }
          >
            <DataTable
              columns={orderShortageColumns}
              rows={orderShortages}
              loading={loading}
              pageSize={15}
              empty={<EmptyState icon={<LuTriangleAlert />} title="No client order shortages" text="No active client order shortages." />}
            />
          </Section>

        /* ============================================= INVENTORY SHORTAGE */
        ) : activeTab === 'inventory_shortage' ? (
          <Section
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LuBox style={{ color: 'var(--primary)' }} /> Unified Inventory Shortage Registry
              </span>
            }
          >
            <Toolbar>
              <ChipGroup
                value={inventoryStatusFilter}
                onChange={(v) => { setInventoryStatusFilter(v); setInventoryPage(1); }}
                items={[
                  { key: 'all', label: 'All Orders' },
                  { key: 'pending', label: 'Pending Orders' },
                  { key: 'completed', label: 'Completed Orders' },
                ]}
              />
              <ToolbarSpacer />
              <DensitySwitch />
            </Toolbar>

            <DataTable
              columns={inventoryShortageColumns}
              rows={inventoryRows}
              loading={loading}
              paginate={false}
              empty={
                <EmptyState
                  icon={<LuBox />}
                  title="No shortage orders"
                  text="No inventory shortage orders found for this filter."
                />
              }
            />

            {!loading && filteredInventoryShortages.length > 0 && (
              <div
                className="grid-foot"
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--sp-3)' }}
              >
                <span>{filteredInventoryShortages.length} record{filteredInventoryShortages.length === 1 ? '' : 's'}</span>
                <Pager page={inventoryPage} pageCount={inventoryPageCount} onChange={setInventoryPage} />
              </div>
            )}
          </Section>
        ) : null}

        {/* ============================================ ASSIGN SUPERVISOR */}
        <Dialog
          open={showAssignSupervisorModal}
          onClose={() => setShowAssignSupervisorModal(false)}
          title="Assign Inventory Shortage to Supervisor"
          subtitle={selectedInventoryItem?.name}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowAssignSupervisorModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="assign-supervisor-form" loading={submitting}>
                {submitting ? 'Assigning…' : 'Assign Supervisor'}
              </Button>
            </>
          }
        >
          <form id="assign-supervisor-form" onSubmit={handleAssignSupervisorSubmit}>
            <FormGrid>
              <Field label="Item / Product Name" span="all">
                <Input readOnly value={selectedInventoryItem?.name || ''} />
              </Field>

              <Field label="Store Manager Remark" span="all">
                <div
                  style={{
                    padding: '9px 12px',
                    background: tint('var(--success)', 10),
                    border: `1px solid ${tint('var(--success)', 26)}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--success)',
                    fontSize: 'var(--fs-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <LuCircleCheck style={{ flexShrink: 0 }} />
                  {selectedInventoryItem?.storeRemarks || 'Urgent replenishment required'}
                </div>
              </Field>

              <Field label="Assign Supervisor / Production Line" required span="all">
                <Select required value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)}>
                  <option value="Supervisor Line 1">Supervisor Line 1 (Main Assembly)</option>
                  <option value="Supervisor Line 2">Supervisor Line 2 (Shots Production)</option>
                  <option value="Production Supervisor">Production Supervisor</option>
                  <option value="Quality Supervisor">Quality Supervisor</option>
                </Select>
              </Field>

              <Field label="Production Manager Remarks (Urgent Basis)" required span="all">
                <Textarea
                  rows="3"
                  required
                  value={pmAssignRemarks}
                  onChange={e => setPmAssignRemarks(e.target.value)}
                  placeholder="e.g. Urgent basis priority production required for client order…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ================================================== GATE VERIFY */}
        <Dialog
          open={showGateVerifyModal}
          onClose={() => setShowGateVerifyModal(false)}
          title="Verify Gate Shipment"
          size="sm"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowGateVerifyModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="gate-verify-form" loading={submitting}>
                {submitting ? 'Verifying…' : 'Verify & Approve'}
              </Button>
            </>
          }
        >
          <form id="gate-verify-form" onSubmit={handleApproveGate}>
            <Field label="Verification remarks" required>
              <Textarea
                required
                rows="3"
                value={verificationRemarks}
                onChange={e => setVerificationRemarks(e.target.value)}
                placeholder="e.g. Nylon sacks quantity verified, bags checked, no damages found."
              />
            </Field>
          </form>
        </Dialog>

        {/* ================================================== MACHINE FORM */}
        <Dialog
          open={showMachineModal}
          onClose={() => setShowMachineModal(false)}
          title={editingMachineId ? 'Edit Belt Machine Status' : 'Add Belt Production Machine'}
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowMachineModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="machine-form" loading={submitting}>
                {submitting ? 'Saving…' : 'Save Machine'}
              </Button>
            </>
          }
        >
          <form id="machine-form" onSubmit={handleSaveMachine}>
            <FormGrid>
              <Field label="Machine Type" required span="all">
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  {/* Trigger */}
                  <button
                    type="button"
                    className="field-control"
                    onClick={() => setShowCustomDropdown(!showCustomDropdown)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: 8,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {machineForm.name || '-- Select Machine --'}
                    </span>
                    <LuChevronDown style={{ color: 'var(--text-ghost)', flexShrink: 0 }} />
                  </button>

                  {/* Floating category menu */}
                  {showCustomDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        width: 'min(460px, 100%)',
                        maxHeight: 260,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        zIndex: 60,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Categories */}
                      <div
                        style={{
                          width: 190,
                          flexShrink: 0,
                          borderRight: '1px solid var(--border)',
                          padding: '6px 0',
                          overflowY: 'auto',
                          background: 'var(--bg-subtle)',
                        }}
                      >
                        {Object.keys(MACHINE_CATEGORIES).map(cat => (
                          <div
                            key={cat}
                            onMouseEnter={() => setActiveHoverCategory(cat)}
                            style={{
                              padding: '9px 14px',
                              fontSize: 'var(--fs-sm)',
                              cursor: 'pointer',
                              color: activeHoverCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                              background: activeHoverCategory === cat ? tint('var(--primary)', 10) : 'transparent',
                              fontWeight: activeHoverCategory === cat ? 600 : 500,
                              transition: 'var(--transition-fast)',
                            }}
                          >
                            {cat}
                          </div>
                        ))}
                        <div
                          onMouseEnter={() => setActiveHoverCategory('custom')}
                          onClick={() => {
                            setIsCustomMachineName(true);
                            setMachineForm(prev => ({ ...prev, name: '' }));
                            setShowCustomDropdown(false);
                          }}
                          style={{
                            padding: '9px 14px',
                            fontSize: 'var(--fs-sm)',
                            cursor: 'pointer',
                            color: activeHoverCategory === 'custom' ? 'var(--primary)' : 'var(--text-secondary)',
                            background: activeHoverCategory === 'custom' ? tint('var(--primary)', 10) : 'transparent',
                            fontWeight: activeHoverCategory === 'custom' ? 600 : 500,
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          -- Custom Name --
                        </div>
                      </div>

                      {/* Sub-machines */}
                      <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto', minWidth: 0 }}>
                        {activeHoverCategory && activeHoverCategory !== 'custom' ? (
                          <>
                            <div
                              style={{
                                padding: '8px 14px 4px',
                                fontSize: 'var(--fs-2xs)',
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {activeHoverCategory}
                            </div>
                            {(MACHINE_CATEGORIES[activeHoverCategory] || []).map(sub => {
                              const picked = machineForm.name === sub;
                              return (
                                <div
                                  key={sub}
                                  onClick={() => {
                                    setMachineForm(prev => ({ ...prev, name: sub }));
                                    setIsCustomMachineName(false);
                                    setShowCustomDropdown(false);
                                  }}
                                  style={{
                                    padding: '7px 12px',
                                    fontSize: 'var(--fs-sm)',
                                    cursor: 'pointer',
                                    color: picked ? 'var(--primary)' : 'var(--text-primary)',
                                    background: picked ? tint('var(--primary)', 8) : 'transparent',
                                    border: `1px solid ${picked ? 'var(--primary)' : 'transparent'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    margin: '2px 8px',
                                    transition: 'var(--transition-fast)',
                                  }}
                                >
                                  {sub}
                                </div>
                              );
                            })}
                          </>
                        ) : activeHoverCategory === 'custom' ? (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                            Click to type a custom name.
                          </div>
                        ) : (
                          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-ghost)', fontSize: 'var(--fs-sm)' }}>
                            Hover a category to view machines
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {isCustomMachineName && (
                <Field label="Custom Machine Name" required span="all">
                  <Input
                    type="text"
                    required
                    value={machineForm.name}
                    onChange={e => setMachineForm({ ...machineForm, name: e.target.value })}
                    placeholder="Enter custom machine name"
                  />
                </Field>
              )}

              <Field label="Operational Status" required>
                <Select value={machineForm.status} onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}>
                  <option value="working">Working</option>
                  <option value="available">Available</option>
                  <option value="damaged">Damaged</option>
                  <option value="not found">Not Found</option>
                  <option value="idle">Idle</option>
                  <option value="destroyed">Destroyed</option>
                  <option value="running">In Progress (Running)</option>
                  <option value="broken">Broken (Damaged)</option>
                </Select>
              </Field>

              <Field label="Production Line" required>
                <Select value={machineForm.productionLine} onChange={e => setMachineForm({ ...machineForm, productionLine: e.target.value })}>
                  <option value="Line 1">Production Line 1</option>
                  <option value="Line 2">Production Line 2</option>
                  <option value="Line 3">Production Line 3</option>
                  <option value="Line A">Line A (Molding)</option>
                  <option value="Line B">Line B (Extrusion)</option>
                  <option value="Line C">Line C (Assembly)</option>
                </Select>
              </Field>

              <Field label="Production Capacity" required>
                <Input
                  type="text"
                  value={machineForm.capacity}
                  onChange={e => setMachineForm({ ...machineForm, capacity: e.target.value })}
                  placeholder="e.g. 200 meters/hour or 500 pcs/day"
                />
              </Field>

              <Field label="Model Number">
                <Input
                  type="text"
                  value={machineForm.modelNumber}
                  onChange={e => setMachineForm({ ...machineForm, modelNumber: e.target.value })}
                  placeholder="e.g. BELT-VULC-300"
                />
              </Field>

              <Field label="Power Rating">
                <Input
                  type="text"
                  value={machineForm.powerRating}
                  onChange={e => setMachineForm({ ...machineForm, powerRating: e.target.value })}
                  placeholder="e.g. 15 kW"
                />
              </Field>

              <Field label="Last Service Date">
                <Input
                  type="date"
                  value={machineForm.lastServiceDate}
                  onChange={e => setMachineForm({ ...machineForm, lastServiceDate: e.target.value })}
                />
              </Field>

              <Field label="Maintenance Notes / Mold Config" span="all">
                <Textarea
                  rows="3"
                  value={machineForm.remarks}
                  onChange={e => setMachineForm({ ...machineForm, remarks: e.target.value })}
                  placeholder="Mold width configurations, tension calibration, or recent maintenance details…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ==================================================== BUILD FORM */}
        <Dialog
          open={showBuildModal}
          onClose={() => setShowBuildModal(false)}
          title={buildModalMode === 'create' ? 'Configure Production Build Process' : 'Edit Build Process Configuration'}
          subtitle={selectedJob?.productName}
          size="lg"
          footer={
            selectedJob ? (
              <>
                <Button variant="cancel" onClick={() => setShowBuildModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" form="build-form" loading={submitting}>
                  {submitting ? 'Saving…' : (buildModalMode === 'create' ? 'Load Production Process' : 'Save Process Updates')}
                </Button>
              </>
            ) : (
              <Button variant="cancel" onClick={() => setShowBuildModal(false)}>Close</Button>
            )
          }
        >
          {buildModalMode === 'create' && (
            <Field label="Select Pending Build Order" required>
              <Select required value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
                <option value="">-- Choose Pending Order --</option>
                {selectedJobId && selectedJobId.startsWith('shortage_') && selectedJob && (
                  <option value={selectedJobId}>
                    [SHORTAGE] {selectedJob.productName} (Qty: {selectedJob.orderQuantity} pcs)
                  </option>
                )}
                {buildJobs.filter(j => ['pending', 'shortage_reported'].includes(j.status) || j._id === selectedJobId).map(j => (
                  <option key={j._id} value={j._id}>
                    {j.productName} (Qty: {j.orderQuantity} pcs, Size: {j.productSize || 'Standard'}) - {j.status}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {selectedJob && (
            <div style={{ marginTop: buildModalMode === 'create' ? 'var(--sp-4)' : 0, marginBottom: 'var(--sp-4)' }}>
              <Surface
                style={{
                  background: tint('var(--primary)', 7),
                  borderColor: tint('var(--primary)', 26),
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {buildModalMode === 'create' ? 'Target product' : 'Editing process'}: {selectedJob.productName}
                </div>
                <DescList
                  items={[
                    { label: 'Target Qty', value: `${selectedJob.orderQuantity} pcs` },
                    ...(buildModalMode === 'edit'
                      ? [{ label: 'Original status', value: <span style={{ textTransform: 'capitalize' }}>{humanise(selectedJob.status || '')}</span> }]
                      : []),
                  ]}
                />
              </Surface>
            </div>
          )}

          {selectedJob ? (
            <form id="build-form" onSubmit={handleStartProcessBuild}>
              <FormGrid>
                {buildModalMode === 'edit' && (
                  <Field label="Supervise Status" required span="all">
                    <Select required value={buildStatus} onChange={e => setBuildStatus(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing / In Production</option>
                      <option value="delayed">Delayed</option>
                      <option value="shortage_reported">Shortage Reported</option>
                      <option value="completed">Completed / Sent to Store</option>
                    </Select>
                  </Field>
                )}

                <Field label="Assign Machine / Production Line" required>
                  <Select required value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
                    {availableMachineOptions.length === 0 ? (
                      <option value="" disabled>-- No Machines Available (All Working/Busy) --</option>
                    ) : (
                      <>
                        <option value="">-- Select Available Machine --</option>
                        {availableMachineOptions.map(m => (
                          <option key={m._id} value={m._id}>{m.name} (Cap: {m.capacity || 'N/A'})</option>
                        ))}
                      </>
                    )}
                  </Select>
                </Field>

                <Field label="Shot Count / Batches" required>
                  <Input type="number" required min="1" value={shotCount} onChange={e => setShotCount(Number(e.target.value))} />
                </Field>

                <Field label="Estimated Completion Date" required>
                  <Input type="date" required value={estimatedDate} onChange={e => setEstimatedDate(e.target.value)} />
                </Field>

                <Field label="Completion Time" required>
                  <Input type="time" required value={buildTime} onChange={e => setBuildTime(e.target.value)} />
                </Field>
              </FormGrid>

              {/* Material Consumption Logs */}
              <Section
                title="Material Inwards Log"
                actions={<Button size="xs" icon={<LuPlus />} onClick={handleAddMaterial}>Add Material</Button>}
              >
                {materialsUsed.map((mat, idx) => {
                  const uniqueNames = Array.from(new Set(rawMaterials.map(m => m.name)));
                  const defaultOptions = ['Nylon', 'PVC Resin', 'Natural Rubber', 'Steel Wire', 'Polyester Fabric'];
                  defaultOptions.forEach(opt => {
                    if (!uniqueNames.includes(opt)) {
                      uniqueNames.push(opt);
                    }
                  });

                  const isCustom = mat.isCustom || (mat.materialName !== '' && !uniqueNames.includes(mat.materialName) && mat.materialName !== 'Unspecified Raw Material');

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isCustom
                          ? 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 0.7fr) auto'
                          : 'minmax(0, 1.8fr) minmax(0, 1fr) minmax(0, 1fr) auto',
                        gap: 8,
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Select
                        value={isCustom ? 'Custom...' : (mat.materialName || '')}
                        onChange={e => {
                          const updated = [...materialsUsed];
                          const val = e.target.value;
                          if (val === 'Custom...') {
                            updated[idx].materialName = '';
                            updated[idx].isCustom = true;
                          } else {
                            updated[idx].materialName = val;
                            updated[idx].isCustom = false;
                          }
                          setMaterialsUsed(updated);
                        }}
                        aria-label="Material"
                      >
                        <option value="">-- Choose Material --</option>
                        {uniqueNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="Custom...">-- Custom... --</option>
                      </Select>

                      {isCustom && (
                        <Input
                          type="text"
                          placeholder="Type material name…"
                          required
                          value={mat.materialName}
                          onChange={e => {
                            const updated = [...materialsUsed];
                            updated[idx].materialName = e.target.value;
                            updated[idx].isCustom = true;
                            setMaterialsUsed(updated);
                          }}
                        />
                      )}

                      <Input
                        type="number"
                        placeholder="Qty"
                        required
                        value={mat.quantity}
                        onChange={e => {
                          const updated = [...materialsUsed];
                          updated[idx].quantity = Number(e.target.value);
                          setMaterialsUsed(updated);
                        }}
                        aria-label="Quantity"
                      />

                      <Select
                        value={mat.unit}
                        onChange={e => {
                          const updated = [...materialsUsed];
                          updated[idx].unit = e.target.value;
                          setMaterialsUsed(updated);
                        }}
                        aria-label="Unit"
                      >
                        <option value="kg">kg</option>
                        <option value="pcs">pcs</option>
                        <option value="bags">bags</option>
                        <option value="liters">liters</option>
                      </Select>

                      {materialsUsed.length > 1 && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleRemoveMaterial(idx)}
                          aria-label="Remove material"
                          style={{ color: 'var(--danger)' }}
                        >
                          <LuTrash2 />
                        </button>
                      )}
                    </div>
                  );
                })}
              </Section>

              {/* Flexible Custom Fields */}
              <Section
                title="Custom Inputs / Build Specs"
                actions={<Button size="xs" icon={<LuPlus />} onClick={handleAddCustomField}>Add Custom Field</Button>}
              >
                {customFields.length === 0 ? (
                  <SubText tone="var(--text-ghost)">No custom specs added.</SubText>
                ) : customFields.map((field, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr) auto',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Input
                      type="text"
                      placeholder="Field Label (e.g. Mold ID)"
                      required
                      value={field.key}
                      onChange={e => {
                        const updated = [...customFields];
                        updated[idx].key = e.target.value;
                        setCustomFields(updated);
                      }}
                    />
                    <Input
                      type="text"
                      placeholder="Value (e.g. M-88)"
                      required
                      value={field.value}
                      onChange={e => {
                        const updated = [...customFields];
                        updated[idx].value = e.target.value;
                        setCustomFields(updated);
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleRemoveCustomField(idx)}
                      aria-label="Remove custom field"
                      style={{ color: 'var(--danger)' }}
                    >
                      <LuTrash2 />
                    </button>
                  </div>
                ))}
              </Section>
            </form>
          ) : (
            <EmptyState
              icon={<LuSlidersHorizontal />}
              title="Select a build order"
              text="Please select a pending build order above to configure details."
            />
          )}
        </Dialog>

        {/* ======================================== ADD ITEMS & VERIFY GATE */}
        <Dialog
          open={showAddItemsModal && !!selectedEntryForItems}
          onClose={() => setShowAddItemsModal(false)}
          title="Add Items & Verify Gate Entry"
          subtitle={selectedEntryForItems ? `Bill ${selectedEntryForItems.billNumber}` : undefined}
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowAddItemsModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="add-items-form" loading={submitting}>
                {submitting ? 'Saving & Verifying…' : 'Save & Verify'}
              </Button>
            </>
          }
        >
          {selectedEntryForItems && (
            <>
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <Surface style={{ background: tint('var(--primary)', 7), borderColor: tint('var(--primary)', 26) }}>
                  <DescList
                    items={[
                      { label: 'Bill No', value: selectedEntryForItems.billNumber },
                      { label: 'Vendor', value: selectedEntryForItems.vendorName },
                      { label: 'Original material', value: <span style={{ textTransform: 'capitalize' }}>{selectedEntryForItems.materialType}</span> },
                      { label: 'Original qty', value: `${selectedEntryForItems.quantity} ${selectedEntryForItems.unit || ''}` },
                    ]}
                  />
                </Surface>
              </div>

              <form id="add-items-form" onSubmit={handleSaveAndVerify}>
                <FormGrid>
                  <Field label="Item / Material Name" required span="all">
                    <Input
                      required
                      value={itemsForm.name}
                      onChange={(e) => setItemsForm({ ...itemsForm, name: e.target.value })}
                      placeholder="e.g., Nylon Drag Chain"
                    />
                  </Field>

                  <Field label="Item Type" required>
                    <Select
                      value={itemsForm.type}
                      onChange={(e) => {
                        const typeVal = e.target.value;
                        const defaultUnit = typeVal === 'raw_material' ? 'kg' : 'pcs';
                        setItemsForm(prev => ({ ...prev, type: typeVal, unit: defaultUnit }));
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="raw_material">Raw Material</option>
                      <option value="finished_good">Finished Good</option>
                      <option value="hardware">Hardware / Tools</option>
                      <option value="custom">Custom Tooling</option>
                    </Select>
                  </Field>

                  <Field label="Stock Unit" required>
                    <Select
                      required
                      value={itemsForm.unit}
                      onChange={(e) => setItemsForm({ ...itemsForm, unit: e.target.value })}
                      style={{ cursor: 'pointer' }}
                    >
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
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={itemsForm.quantity}
                      onChange={(e) => setItemsForm({ ...itemsForm, quantity: e.target.value })}
                    />
                  </Field>

                  <Field label="Warehouse Location">
                    <Input
                      value={itemsForm.location}
                      onChange={(e) => setItemsForm({ ...itemsForm, location: e.target.value })}
                      placeholder="e.g., Row A - Rack 2"
                    />
                  </Field>

                  <Field label="Size / Gauge Specifications" span="all">
                    <Input
                      value={itemsForm.size}
                      onChange={(e) => setItemsForm({ ...itemsForm, size: e.target.value })}
                      placeholder="e.g., 35mm x 100mm"
                    />
                  </Field>

                  <Field label="Item Specs / Description" span="all">
                    <Textarea
                      rows="2"
                      value={itemsForm.description}
                      onChange={(e) => setItemsForm({ ...itemsForm, description: e.target.value })}
                      placeholder="Specifications…"
                    />
                  </Field>
                </FormGrid>
              </form>
            </>
          )}
        </Dialog>

        {/* ================================================= MATERIAL FORM */}
        <Dialog
          open={showMaterialModal}
          onClose={() => setShowMaterialModal(false)}
          title={editingMaterialId ? 'Edit Material Record' : 'Add New Material to Inventory'}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowMaterialModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="material-form" loading={submitting}>
                {submitting ? 'Saving…' : 'Save Material'}
              </Button>
            </>
          }
        >
          <form id="material-form" onSubmit={handleSaveMaterial}>
            <FormGrid>
              <Field label="Material Name" required span="all">
                <Input
                  type="text"
                  required
                  value={materialForm.name}
                  onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                  placeholder="e.g. Nylon Sacks, M10 Screws"
                />
              </Field>

              <Field label="Quantity" required>
                <Input
                  type="number"
                  required
                  min="0"
                  value={materialForm.quantity}
                  onChange={e => setMaterialForm({ ...materialForm, quantity: Number(e.target.value) })}
                />
              </Field>

              <Field label="Unit of Measurement" required>
                <Select
                  required
                  value={materialForm.unit}
                  onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })}
                >
                  <option value="kg">kg (Kilogram)</option>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="pkt">pkt (Packets)</option>
                  <option value="meters">meters (Meters)</option>
                  <option value="liters">liters (Liters)</option>
                  <option value="bags">bags (Bags)</option>
                </Select>
              </Field>

              <Field label="Size Specification">
                <Input
                  type="text"
                  value={materialForm.size}
                  onChange={e => setMaterialForm({ ...materialForm, size: e.target.value })}
                  placeholder="e.g. 10mm, 2m length"
                />
              </Field>

              <Field label="Location / Rack">
                <Input
                  type="text"
                  value={materialForm.location}
                  onChange={e => setMaterialForm({ ...materialForm, location: e.target.value })}
                  placeholder="e.g. Rack A - Bin 3"
                />
              </Field>

              <Field label="Description / Remarks" span="all">
                <Textarea
                  rows="3"
                  value={materialForm.description}
                  onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })}
                  placeholder="Details about quality, batch number, or storage details…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ============================================ PRODUCT SPECS DRAWER */}
        <Drawer
          open={showViewSpecsModal && !!viewSpecsItem}
          onClose={() => setShowViewSpecsModal(false)}
          wide
          title={viewSpecsItem?.productName || viewSpecsItem?.itemName || viewSpecsItem?.name || 'Drag Chain Item'}
          subtitle="Product Specification Details"
          footer={<Button variant="cancel" onClick={() => setShowViewSpecsModal(false)}>Close</Button>}
        >
          {viewSpecsItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <Surface style={{ background: tint('var(--c-blue)', 8), borderColor: tint('var(--c-blue)', 24) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Product Name</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                      {viewSpecsItem.productName || viewSpecsItem.itemName || viewSpecsItem.name || 'Drag Chain'}
                    </div>
                  </div>
                  <Badge tone="success">
                    {humanise(viewSpecsItem.status || viewSpecsItem.productionStatus || 'Pre-Selected Specification')}
                  </Badge>
                </div>
              </Surface>

              <Section title="Specifications">
                <Surface>
                  <DescList
                    items={[
                      { label: 'Model Number', value: viewSpecsItem.modelNumber || viewSpecsItem.planId?.modelNumber || 'N/A' },
                      { label: 'Item Type / Category', value: humanise(viewSpecsItem.type || viewSpecsItem.itemType || 'finished_good') },
                      { label: 'Inner Size / Width', value: viewSpecsItem.width || viewSpecsItem.size || viewSpecsItem.productSize || 'N/A' },
                      { label: 'Outer Size', value: viewSpecsItem.description?.replace('Outer: ', '') || 'N/A' },
                      { label: 'Bending Radius (R)', value: viewSpecsItem.radius || 'N/A' },
                      { label: 'Type (Open/Closed)', value: viewSpecsItem.chainType || viewSpecsItem.designType || 'OP' },
                      { label: 'No. of Links (per m)', value: viewSpecsItem.numberOfLinks || 'N/A' },
                      { label: 'Length (mm / m)', value: viewSpecsItem.length || 'N/A' },
                      { label: 'Mounting Bracket', value: viewSpecsItem.mountingBracketType || 'N/A' },
                      { label: 'Vertical Separator (VS)', value: viewSpecsItem.vs || 'N/A' },
                      { label: 'Horizontal Separator (HS)', value: viewSpecsItem.hs || 'N/A' },
                      { label: 'Strain Reliever (SR)', value: viewSpecsItem.sr || 'N/A' },
                      { label: 'Accessories (Separator)', value: viewSpecsItem.accessories || viewSpecsItem.vs || viewSpecsItem.hs || 'None' },
                      {
                        label: 'Required / Order Quantity',
                        value: `${viewSpecsItem.quantity || viewSpecsItem.orderQuantity || getRequiredQty(viewSpecsItem)} ${viewSpecsItem.unit || 'pcs'}`,
                      },
                      { label: 'Almirah Location', value: viewSpecsItem.almirah || 'N/A' },
                      { label: 'Rack / Shelf Location', value: viewSpecsItem.rack || 'N/A' },
                      /* Blank entries are dropped by DescList, so these only
                         surface for the record shapes that carry them. */
                      { label: 'Stock Location', value: viewSpecsItem.location },
                      { label: 'Warehouse', value: viewSpecsItem.warehouseLocation },
                      { label: 'Maintained Qty', value: viewSpecsItem.minStock || viewSpecsItem.maintainedQuantity ? `${viewSpecsItem.minStock || viewSpecsItem.maintainedQuantity} ${viewSpecsItem.unit || ''}` : '' },
                      { label: 'Unit Price', value: viewSpecsItem.unitPrice || '' },
                      { label: 'Series', value: viewSpecsItem.series },
                      { label: 'Quality Status', value: humanStatus(viewSpecsItem.qualityStatus) },
                      { label: 'Production Status', value: humanStatus(viewSpecsItem.productionStatus) },
                      { label: 'Assigned Supervisor', value: viewSpecsItem.assignedSupervisor },
                      { label: 'Sent to PM', value: viewSpecsItem.sentToPmAt ? new Date(viewSpecsItem.sentToPmAt).toLocaleString() : '' },
                      { label: 'Assigned At', value: viewSpecsItem.assignedSupervisorAt ? new Date(viewSpecsItem.assignedSupervisorAt).toLocaleString() : '' },
                      { label: 'Added On', value: viewSpecsItem.createdAt ? new Date(viewSpecsItem.createdAt).toLocaleString() : '' },
                      { label: 'Last Updated', value: viewSpecsItem.updatedAt ? new Date(viewSpecsItem.updatedAt).toLocaleString() : '' },
                    ]}
                  />
                </Surface>
              </Section>

              {/* Prose lives here rather than in the grid, so it can be read in
                  full instead of being clamped into a column. */}
              <NoteBlock label="Store Remark" text={viewSpecsItem.storeRemarks} />
              <NoteBlock label="PM Remarks" text={viewSpecsItem.pmRemarks} />
              <NoteBlock label="QC Remarks" text={viewSpecsItem.qcRemarks} />
              <NoteBlock label="Notes" text={viewSpecsItem.remarks} />
            </div>
          )}
        </Drawer>

        {/* ========================================== GATE ENTRY DETAIL DRAWER */}
        <Drawer
          open={!!detailGateEntry}
          onClose={() => setDetailGateEntry(null)}
          title={detailGateEntry?.billNumber || 'Gate Entry'}
          subtitle={detailGateEntry?.vendorName || undefined}
          footer={<Button variant="cancel" onClick={() => setDetailGateEntry(null)}>Close</Button>}
        >
          {detailGateEntry && (
            <>
              <DescList
                items={[
                  {
                    label: 'Status',
                    value: (
                      <Badge tone={detailGateEntry.status === 'grn_created' ? 'success' : detailGateEntry.status === 'verified' ? 'info' : 'danger'}>
                        {detailGateEntry.status === 'verified' ? 'Verified' : detailGateEntry.status === 'grn_created' ? 'GRN Created' : humanStatus(detailGateEntry.status)}
                      </Badge>
                    ),
                  },
                  { label: 'Entry Type', value: humanStatus(detailGateEntry.entryType) },
                  { label: 'Bill Number', value: detailGateEntry.billNumber },
                  { label: 'Bill Date', value: detailGateEntry.billDate ? new Date(detailGateEntry.billDate).toLocaleString() : '' },
                  { label: 'GRN Number', value: detailGateEntry.grnNumber },
                  { label: 'PO Number', value: detailGateEntry.poNumber },
                  { label: 'PO Ordered Qty', value: detailGateEntry.poOrderedQuantity || '' },
                  { label: 'Vendor', value: detailGateEntry.vendorName },
                  { label: 'Vendor Code', value: detailGateEntry.vendorCode },
                  { label: 'Vendor Contact', value: detailGateEntry.vendorContact },
                  { label: 'Material', value: humanStatus(detailGateEntry.materialType) },
                  { label: 'Quantity', value: detailGateEntry.quantity !== undefined && detailGateEntry.quantity !== null ? `${detailGateEntry.quantity} ${detailGateEntry.unit || ''}` : '' },
                  { label: 'Driver', value: detailGateEntry.driverName },
                  { label: 'Driver Phone', value: detailGateEntry.driverPhone },
                  { label: 'Vehicle Number', value: detailGateEntry.vehicleNumber },
                  { label: 'Entry Timing', value: detailGateEntry.entryTiming },
                  { label: 'Exit Timing', value: detailGateEntry.exitTiming },
                  { label: 'Accounts Email', value: detailGateEntry.accountsEmail },
                  { label: 'Verified By', value: detailGateEntry.verifiedBy?.name },
                  { label: 'Verified At', value: detailGateEntry.verifiedAt ? new Date(detailGateEntry.verifiedAt).toLocaleString() : '' },
                  { label: 'Logged On', value: detailGateEntry.createdAt ? new Date(detailGateEntry.createdAt).toLocaleString() : '' },
                  { label: 'Last Updated', value: detailGateEntry.updatedAt ? new Date(detailGateEntry.updatedAt).toLocaleString() : '' },
                  { label: 'Invoice', value: detailGateEntry.invoiceUrl ? invoiceCell(detailGateEntry) : '' },
                ]}
              />

              {/* Prose lives here rather than in the grid, so it can be read in
                  full instead of being clamped into a column. */}
              <NoteBlock label="Remarks / Notes" text={detailGateEntry.remarks} />
              <NoteBlock label="Material Description" text={detailGateEntry.materialDescription} />
              <NoteBlock label="PO Variance Remarks" text={detailGateEntry.poVarianceRemarks} />
            </>
          )}
        </Drawer>

        {/* ================================================ PLAN PRODUCTION */}
        <Dialog
          open={showPlanModal && !!selectedShortage}
          onClose={() => setShowPlanModal(false)}
          title={selectedShortage ? `Plan Production: ${selectedShortage.modelNumber}` : 'Plan Production'}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowPlanModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="plan-form" loading={submitting}>
                {submitting ? 'Submitting…' : 'Approve & Release Plan'}
              </Button>
            </>
          }
        >
          {selectedShortage && (
            <form id="plan-form" onSubmit={handlePlanShortage}>
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <Surface>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Shortage quantity</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--danger)' }}>
                    {selectedShortage.shortageMeters} meters
                  </div>
                  <SubText tone="var(--text-ghost)">Ref order: {selectedShortage.orderId?.orderNumber}</SubText>
                </Surface>
              </div>

              <Field
                label="Planned Shot Count"
                required
                hint="Use the AI estimate as a starting point, then adjust for your line."
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input
                    type="number"
                    required
                    placeholder="Number of injection shots needed"
                    value={planForm.plannedShots}
                    onChange={e => setPlanForm({ ...planForm, plannedShots: e.target.value })}
                    style={{ flex: '1 1 180px' }}
                  />
                  <Button size="sm" icon={<LuBot />} onClick={handleAskAI} disabled={aiLoading} loading={aiLoading}>
                    {aiLoading ? 'Calculating…' : 'Predict with AI'}
                  </Button>
                </div>
              </Field>
            </form>
          )}
        </Dialog>

        {/* ======================================== ADMIN EDIT SHORTAGE LOG */}
        <Dialog
          open={showShortageEditModal}
          onClose={() => setShowShortageEditModal(false)}
          title="Edit Shortage Task Entry"
          subtitle="Admin Only"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowShortageEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" form="shortage-edit-form" loading={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <form id="shortage-edit-form" onSubmit={handleSaveEditShortageLog}>
            <FormGrid>
              <Field label="Item / Product Name" required span="all">
                <Input
                  type="text"
                  required
                  value={shortageEditForm.itemName}
                  onChange={e => setShortageEditForm({ ...shortageEditForm, itemName: e.target.value })}
                />
              </Field>

              <Field label={`Shortage Quantity (${shortageEditForm.unit || 'pcs'})`} required>
                <Input
                  type="number"
                  required
                  min={1}
                  value={shortageEditForm.quantity}
                  onChange={e => setShortageEditForm({ ...shortageEditForm, quantity: Number(e.target.value) })}
                />
              </Field>

              <Field label="Assigned To" required>
                <Select
                  value={shortageEditForm.assignedTo}
                  onChange={e => setShortageEditForm({ ...shortageEditForm, assignedTo: e.target.value })}
                >
                  <option value="supervisor">Supervisor (Production Line)</option>
                  <option value="sales">Sales Officer (Purchase Sourcing)</option>
                  <option value="store_manager">Store Manager</option>
                  <option value="unassigned">Unassigned</option>
                </Select>
              </Field>

              <Field label="Status" required span="all">
                <Select
                  value={shortageEditForm.status}
                  onChange={e => setShortageEditForm({ ...shortageEditForm, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="ordered">Ordered</option>
                  <option value="completed">Completed</option>
                </Select>
              </Field>

              <Field label="Remarks" span="all">
                <Textarea
                  rows="2"
                  value={shortageEditForm.remarks}
                  onChange={e => setShortageEditForm({ ...shortageEditForm, remarks: e.target.value })}
                  placeholder="Notes…"
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ============================================== CONFIRM DIALOG */}
        <ConfirmDialog
          open={!!confirmState}
          onClose={closeConfirm}
          onConfirm={() => confirmState?.onConfirm && confirmState.onConfirm()}
          title={confirmState?.title || 'Are you sure?'}
          text={confirmState?.text}
          confirmLabel={confirmState?.confirmLabel || 'Confirm'}
          tone={confirmState?.tone || 'danger'}
        />
      </Page>
    </DashboardLayout>
  );
};

export default SupervisorDashboard;
