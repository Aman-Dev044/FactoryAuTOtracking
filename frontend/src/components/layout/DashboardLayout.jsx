import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import { notificationAPI, adminOrgAPI, authAPI, uploadAPI } from '../../services/api';
import { getIndustryConfig } from '../../config/industryConfig';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { compressImage } from '../../services/compress';
import { CommandPalette } from '../ui';
import {
  LuHouse as HiOutlineHome,
  LuTruck as HiOutlineTruck,
  LuSettings2 as HiOutlineCog,
  LuClipboardCheck as HiOutlineClipboardCheck,
  LuBoxes as HiOutlineCube,
  LuShoppingCart as HiOutlineShoppingCart,
  LuChartColumn as HiOutlineChartBar,
  LuZap as HiOutlineLightningBolt,
  LuBell as HiOutlineBell,
  LuLogOut as HiOutlineLogout,
  LuSlidersHorizontal as HiOutlineAdjustments,
  LuUsers as HiOutlineUsers,
  LuFileChartColumn as HiOutlineDocumentReport,
  LuUsersRound as HiOutlineUserGroup,
  LuMenu as HiOutlineMenu,
  LuBuilding2 as HiOutlineOfficeBuilding,
  LuClipboardList as HiOutlineClipboardList,
  LuFileText as HiOutlineDocumentText,
  LuDatabase as HiOutlineDatabase,
  LuReceipt as HiOutlineReceiptTax,
  LuFactory, LuScanLine, LuShieldCheck, LuWarehouse, LuPackage,
  LuHandCoins, LuChartPie, LuShieldHalf, LuLayoutGrid, LuWrench, LuClipboardList,
  LuSearch, LuUpload, LuBuilding2,
} from 'react-icons/lu';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://localhost:9898`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const apiURL = process.env.REACT_APP_API_URL;
    if (apiURL) {
      const base = apiURL.endsWith('/api') ? apiURL : (apiURL.endsWith('/api/') ? apiURL.slice(0, -1) : `${apiURL}/api`);
      return `${base}${url}`;
    }
    if (window.location.port) {
      return `${window.location.protocol}//${window.location.hostname}:9898${url}`;
    } else {
      return `${window.location.origin}/api${url}`;
    }
  }
  return url;
};


// Role-based menu configuration
const getMenuForRole = (role, email, permissions = []) => {
  const allMenus = {
    dashboard: { icon: <HiOutlineHome />, label: 'Tracker Dashboard', path: '/dashboard' },
    gateGuard: { icon: <HiOutlineTruck />, label: 'Gate Operations', path: '/gate-guard' },
    productionManager: { icon: <HiOutlineCog />, label: 'Production Manager', path: '/supervisor' },

    qualityChecker: { icon: <HiOutlineClipboardCheck />, label: 'Quality Control', path: '/quality' },
    storeManager: { icon: <HiOutlineCube />, label: 'Store & Godown', path: '/store' },
    assembly: { icon: <HiOutlineCog />, label: 'Assembly Line (Step 7-9)', path: '/assembly' },
    dispatch: { icon: <HiOutlineTruck />, label: 'Dispatch & Shipping', path: '/dispatch' },
    sales: { icon: <HiOutlineShoppingCart />, label: 'Sales & Orders', path: '/sales' },
    invoiceGenerator: { icon: <HiOutlineReceiptTax />, label: 'Bill & Invoice Generator', path: '/invoice-generator' },
    finance: { icon: <HiOutlineClipboardList />, label: 'Purchase & Procurement', path: '/finance' },
    domainBuilder: { icon: <HiOutlineDatabase />, label: 'Domain Builder', path: '/domain-builder' },
    users: { icon: <HiOutlineUsers />, label: 'User Management', path: '/users' },
    organizations: { icon: <HiOutlineOfficeBuilding />, label: 'SaaS Tenants', path: '/admin/organizations' },
    reports: { icon: <HiOutlineDocumentText />, label: 'Reports & Export', path: '/reports' },
    settings: { icon: <HiOutlineAdjustments />, label: 'Settings', path: '/settings' },
    support: { icon: <HiOutlineDocumentReport />, label: 'Help & Support', path: '/admin/support' },
  };

  // Define what each role can see
  const roleMenus = {
    super_admin: [
      { section: 'Enterprise', items: ['dashboard', 'users', 'support'] },
      { section: 'Gate Log', items: ['gateGuard'] },
      { section: 'Production', items: ['productionManager'] },
      { section: 'QC Inspection', items: ['qualityChecker'] },
      { section: 'Store Operations', items: ['storeManager'] },
      { section: 'Assembly & Dispatch', items: ['assembly', 'dispatch'] },
      { section: 'Sales Log', items: ['sales', 'invoiceGenerator'] },
      { section: 'Finance', items: ['finance'] },
      { section: 'Reports & Export', items: ['reports'] },
      { section: 'Platform', items: ['domainBuilder', 'settings'] }
    ],
    admin: [
      { section: 'Enterprise', items: ['dashboard', 'users'] },
      { section: 'Gate Log', items: ['gateGuard'] },
      { section: 'Production', items: ['productionManager'] },
      { section: 'QC Inspection', items: ['qualityChecker'] },
      { section: 'Store Operations', items: ['storeManager'] },
      { section: 'Assembly & Dispatch', items: ['assembly', 'dispatch'] },
      { section: 'Sales Log', items: ['sales', 'invoiceGenerator'] },
      { section: 'Finance', items: ['finance'] },
      { section: 'Reports & Export', items: ['reports'] },
      { section: 'Platform', items: ['domainBuilder', 'settings'] }
    ],
    gate_guard: [
      { section: 'Gate Log', items: ['gateGuard'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    supervisor: [
      { section: 'Production', items: ['productionManager'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    production_manager: [
      { section: 'Production', items: ['productionManager'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    quality_checker: [
      { section: 'QC Inspection', items: ['qualityChecker'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    store_manager: [
      { section: 'Store Operations', items: ['storeManager'] },
      { section: 'Assembly & Dispatch', items: ['assembly', 'dispatch'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    assembly: [
      { section: 'Assembly Line', items: ['assembly'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    assembly_user: [
      { section: 'Assembly Line', items: ['assembly'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    assembly_manager: [
      { section: 'Assembly Line', items: ['assembly'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    dispatch: [
      { section: 'Dispatch & Shipping', items: ['dispatch', 'assembly'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    dispatch_manager: [
      { section: 'Dispatch & Shipping', items: ['dispatch', 'assembly'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    sales: [
      { section: 'Sales Log', items: ['sales', 'invoiceGenerator'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    purchase_manager: [
      { section: 'Purchase & Procurement', items: ['finance'] },
      { section: 'Reports & Export', items: ['reports'] }
    ],
    purchase_user: [
      { section: 'Purchase & Procurement', items: ['finance'] },
      { section: 'Reports & Export', items: ['reports'] }
    ]
  };

  let menuConfig = roleMenus[role];

  // For regular 'user' role with custom permissions:
  if (role === 'user' && permissions && permissions.length > 0) {
    const userItems = ['dashboard'];
    if (permissions.includes('gate_guard')) userItems.push('gateGuard');
    if (permissions.includes('supervisor')) userItems.push('supervisor');
    if (permissions.includes('quality_checker')) userItems.push('qualityChecker');
    if (permissions.includes('store_manager')) userItems.push('storeManager');
    if (permissions.includes('assembly') || permissions.includes('assembly_user') || permissions.includes('assembly_manager')) userItems.push('assembly');
    if (permissions.includes('dispatch')) userItems.push('dispatch');
    if (permissions.includes('sales')) userItems.push('sales');
    if (permissions.includes('purchase') || permissions.includes('purchase_manager') || permissions.includes('purchase_user') || permissions.includes('finance')) userItems.push('finance');
    menuConfig = [{ section: 'Workspace', items: userItems }];
  }

  if (!menuConfig) {
    menuConfig = [{ section: 'Main', items: ['dashboard'] }];
  }

  return menuConfig.map(section => ({
    section: section.section,
    items: section.items.map(key => allMenus[key]).filter(Boolean)
  }));
};


const ICON_MAP = {
  HiOutlineHome: <HiOutlineHome />,
  HiOutlineTruck: <HiOutlineTruck />,
  HiOutlineCog: <HiOutlineCog />,
  HiOutlineClipboardCheck: <HiOutlineClipboardCheck />,
  HiOutlineCube: <HiOutlineCube />,
  HiOutlineShoppingCart: <HiOutlineShoppingCart />,
  HiOutlineChartBar: <HiOutlineChartBar />,
  HiOutlineLightningBolt: <HiOutlineLightningBolt />,
  HiOutlineBell: <HiOutlineBell />,
  HiOutlineLogout: <HiOutlineLogout />,
  HiOutlineAdjustments: <HiOutlineAdjustments />,
  HiOutlineUsers: <HiOutlineUsers />,
  HiOutlineDocumentReport: <HiOutlineDocumentReport />,
  HiOutlineUserGroup: <HiOutlineUserGroup />,
  HiOutlineMenu: <HiOutlineMenu />,
  HiOutlineOfficeBuilding: <HiOutlineOfficeBuilding />,
  HiOutlineClipboardList: <HiOutlineClipboardList />,
  HiOutlineDocumentText: <HiOutlineDocumentText />,
  HiOutlineDatabase: <HiOutlineDatabase />
};

// One rail icon per menu section produced by the pipeline below.
const SECTION_ICONS = {
  'Enterprise': <LuLayoutGrid />,
  'Gate Log': <LuScanLine />,
  'Production': <LuFactory />,
  'QC Inspection': <LuShieldCheck />,
  'Store Operations': <LuWarehouse />,
  'Assembly & Dispatch': <LuPackage />,
  'Dispatch & Shipping': <LuPackage />,
  'Assembly Line': <LuWrench />,
  'Sales Log': <LuHandCoins />,
  'Purchase & Procurement': <LuClipboardList />,
  'Finance': <LuHandCoins />,
  'Reports & Export': <LuChartPie />,
  'Platform': <LuShieldHalf />,
  'Drag Chain Tools': <LuWrench />,
  'Notifications': <HiOutlineBell />,
  'General': <LuLayoutGrid />,
};

// The rail is only 76px wide, so section names are shortened for the label.
// The full name still shows as the button's tooltip and as the panel heading.
const RAIL_LABELS = {
  'Enterprise': 'Home',
  'Gate Log': 'Gate',
  'Production': 'Production',
  'QC Inspection': 'Quality',
  'Store Operations': 'Store',
  'Assembly & Dispatch': 'Dispatch',
  'Dispatch & Shipping': 'Dispatch',
  'Assembly Line': 'Assembly',
  'Sales Log': 'Sales',
  'Purchase & Procurement': 'Purchase',
  'Finance': 'Finance',
  'Reports & Export': 'Reports',
  'Platform': 'Platform',
  'Drag Chain Tools': 'Tools',
  'Notifications': 'Alerts',
  'General': 'More',
};

const railLabel = (section) => RAIL_LABELS[section] || section;

// Which rail module a role lands on. Mirrors the role switch in Dashboard.jsx,
// which decides what /dashboard actually renders.
const ROLE_SECTION = {
  super_admin: 'Enterprise',
  admin: 'Enterprise',
  gate_guard: 'Gate Log',
  supervisor: 'Production',
  production_manager: 'Production',
  quality_checker: 'QC Inspection',
  store_manager: 'Store Operations',
  sales: 'Sales Log',
  purchase_manager: 'Purchase & Procurement',
  purchase_user: 'Purchase & Procurement',
  assembly: 'Assembly Line',
  assembly_user: 'Assembly Line',
  assembly_manager: 'Assembly Line',
  dispatch: 'Dispatch & Shipping',
  dispatch_manager: 'Dispatch & Shipping',
};

const ROLE_LABELS = {
  super_admin: 'Platform Admin',
  admin: 'Organisation Admin',
  gate_guard: 'Gate Guard',
  supervisor: 'Supervisor',
  production_manager: 'Production Manager',
  quality_checker: 'Quality Checker',
  store_manager: 'Store Manager',
  assembly: 'Assembly Operator',
  assembly_user: 'Assembly User',
  assembly_manager: 'Assembly Manager',
  sales: 'Sales Officer',
  purchase_manager: 'Purchase Manager',
  purchase_user: 'Purchase Officer',
  dispatch: 'Dispatch Officer',
  dispatch_manager: 'Dispatch Manager'
};

// Role accents reference design-system tokens (not raw hex) so every badge
// re-tints correctly in dark mode. Each name has a matching --c-<name>-soft.
const ROLE_ACCENTS = {
  super_admin: 'blue',
  admin: 'violet',
  gate_guard: 'cyan',
  supervisor: 'green',
  assembly: 'amber',
  assembly_user: 'amber',
  assembly_manager: 'orange',
  production_manager: 'green',
  quality_checker: 'red',
  store_manager: 'amber',
  sales: 'violet',
  purchase_manager: 'pink',
  purchase_user: 'pink',
  dispatch: 'cyan',
  dispatch_manager: 'blue'
};

const accentVar = (role) => `var(--c-${ROLE_ACCENTS[role] || 'slate'})`;
const accentSoftVar = (role) => `var(--c-${ROLE_ACCENTS[role] || 'slate'}-soft)`;

const DashboardLayout = ({ children, pageTitle = 'Dashboard' }) => {
  const { user, setUser, logout, isReverificationRequired, setIsReverificationRequired } = useAuth();
  const { settings } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const prevNotifCount = useRef(0);
  const bellRef = useRef(null);

  // Profile State
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl-K opens the palette anywhere except while typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const t = e.target;
        const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (typing) return;
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const profileRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // Remembers how far the user had scrolled the contextual panel.
  const panelNavRef = useRef(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('panel-scroll');
    if (saved && panelNavRef.current) {
      panelNavRef.current.scrollTop = parseInt(saved, 10);
    }
  }, []);

  const handlePanelScroll = (e) => {
    sessionStorage.setItem('panel-scroll', e.target.scrollTop);
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedFile);

      const uploadRes = await uploadAPI.uploadFile(formData);
      if (uploadRes.data && uploadRes.data.success) {
        const fileUrl = uploadRes.data.fileUrl;
        
        // Update user profile in backend
        const updateRes = await authAPI.updateProfile({ profileImage: fileUrl });
        if (updateRes.data && updateRes.data.success) {
          // Update user in context
          const updatedUser = { ...user, profileImage: fileUrl };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success('Profile image updated successfully!');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload profile image');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Superadmin Org Selection State
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(localStorage.getItem('selectedOrgId') || '');

  useEffect(() => {
    const fetchOrgs = async () => {
      // Only platform admin can fetch all orgs. Regular org super_admins should NOT call this.
      const platformAdminEmail = process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;
      if (user?.role === 'super_admin' && user?.email === platformAdminEmail) {
        try {
          const res = await adminOrgAPI.getAll();
          setOrgs(res.data.data || []);
        } catch (err) {
          console.error('Failed to load organizations for superadmin selector', err);
        }
      }
    };
    fetchOrgs();
  }, [user]);

  const handleOrgChange = (e) => {
    const orgId = e.target.value;
    setSelectedOrgId(orgId);
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
    window.location.reload();
  };

  const isPlatformPage = ['/admin/organizations', '/settings', '/dashboard'].includes(location.pathname);
  const needsOrgSelection = user?.role === 'super_admin' && !user?.organizationId && !selectedOrgId && !isPlatformPage;

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const playSound = () => {
    // Use Web Audio API beep for reliable cross-browser sound without external file
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log(e); }
  };

  const fetchNotifications = async () => {
    try {
      // Superadmin fetches from their specific endpoint, others from normal endpoint
      const res = user?.role === 'super_admin' 
        ? await notificationAPI.getSuperadminNotifications(1, 20)
        : await notificationAPI.getNotifications(1, 20);
        
      const notifs = res.data.data;
      setNotifications(notifs);
      
      const unreadCount = notifs.filter(n => !n.isRead).length;
      if (unreadCount > prevNotifCount.current) {
        playSound(); // Play sound if new unread appears
      }
      prevNotifCount.current = unreadCount;
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll every 20s as fallback

    let socket;
    if (user?.organizationId || user?.role === 'super_admin') {
      socket = io(SOCKET_URL, { withCredentials: true });
      
      socket.on('connect', () => {
        if (user?.role === 'super_admin') {
          socket.emit('join_superadmin');
        } else if (user?.organizationId) {
          socket.emit('join_org', user.organizationId);
          if (user?.role) {
            socket.emit('join_role_room', { orgId: user.organizationId, role: user.role });
          }
        }
      });

      const refresh = () => {
        fetchNotifications();
      };

      // Listen for the new universal notification event
      socket.on('new_notification', (newNotif) => {
        // Prepend new notification for immediate feedback, then fetch to sync
        setNotifications(prev => {
          // Avoid duplicates
          if (prev.find(n => n._id === newNotif._id)) return prev;
          return [newNotif, ...prev];
        });
        playSound();
        prevNotifCount.current += 1;
      });

      socket.on('build_updated', refresh);
      socket.on('inventory_updated', refresh);
      socket.on('quality_updated', refresh);
      socket.on('machine_updated', refresh);
      socket.on('gate_entry_updated', refresh);
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.organizationId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch (e) { }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
      setShowNotifPanel(false);
    } catch (e) { }
  };

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifPanel(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfilePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellRef, profileRef]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDisplayName = (name) => {
    if (!name) return 'User';
    if (settings?.brandName) {
      return name
        .replace(/STR-DRG/gi, settings.brandName)
        .replace(/StarConnect/gi, settings.brandName)
        .replace(/TrackBells/gi, settings.brandName);
    }
    return name;
  };

  const getUserInitials = (name) => {
    const displayName = getDisplayName(name);
    if (!displayName) return 'U';
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Base default operational menus to guarantee full admin sidebar functionality
  const defaultMenuItems = [
    { key: 'dashboard', label: 'Tracker Dashboard', icon: 'HiOutlineHome', path: '/dashboard', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'gateGuard', label: 'Gate entries', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'admin', 'gate_guard'] },
    { key: 'productionManager', label: 'Production Manager', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'admin', 'supervisor', 'production_manager'] },
    { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'admin', 'quality_checker'] },
    { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'admin', 'store_manager'] },
    { key: 'dispatch', label: 'Dispatch & Shipping', icon: 'HiOutlineTruck', path: '/dispatch', visible: true, roles: ['super_admin', 'admin', 'dispatch', 'dispatch_manager', 'store_manager'] },
    { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'admin', 'sales'] },
    { key: 'purchase', label: 'Purchase & Procurement', icon: 'HiOutlineClipboardList', path: '/finance', visible: true, roles: ['super_admin', 'admin', 'purchase_manager', 'purchase_user', 'store_manager'] },
    { key: 'reports', label: 'Analytics & Reports', icon: 'HiOutlineDocumentText', path: '/reports', visible: true, roles: ['super_admin', 'admin', 'gate_guard', 'supervisor', 'production_manager', 'quality_checker', 'store_manager', 'sales', 'purchase_manager', 'purchase_user', 'dispatch', 'user'] },
    { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'domainBuilder', label: 'Domain Builder', icon: 'HiOutlineDatabase', path: '/domain-builder', visible: true, roles: ['super_admin', 'admin'] },
  ];

  // Dynamically compile menu items based on organization settings database config
  let rawMenus = [...(settings?.menus || [])].filter(m => m.key !== 'orders' && m.key !== 'supervisor');

  // Always guarantee reports menu exists for ALL roles
  const reportsMenu = rawMenus.find(m => m.key === 'reports');
  const allSystemRoles = ['super_admin', 'admin', 'gate_guard', 'supervisor', 'production_manager', 'quality_checker', 'store_manager', 'sales', 'purchase_manager', 'purchase_user', 'dispatch', 'user'];
  if (!reportsMenu) {
    rawMenus.push({
      key: 'reports',
      label: 'Analytics & Reports',
      icon: 'HiOutlineDocumentText',
      path: '/reports',
      visible: true,
      roles: allSystemRoles
    });
  } else {
    reportsMenu.visible = true;
    reportsMenu.roles = Array.from(new Set([...(reportsMenu.roles || []), ...allSystemRoles]));
  }

  // Notifications is available to every role, gate guards included.
  const notifRoles = ['super_admin', 'admin', 'supervisor', 'production_manager', 'quality_checker', 'store_manager', 'sales', 'purchase_manager', 'purchase_user', 'dispatch', 'dispatch_manager', 'assembly', 'assembly_user', 'assembly_manager', 'gate_guard', 'user'];
  const notifMenu = rawMenus.find(m => m.key === 'notifications');
  if (!notifMenu) {
    rawMenus.push({
      key: 'notifications',
      label: 'Notifications',
      icon: 'HiOutlineBell',
      path: '/notifications',
      visible: true,
      roles: notifRoles
    });
  } else {
    notifMenu.visible = true;
    notifMenu.roles = Array.from(new Set([...(notifMenu.roles || []), ...notifRoles]));
  }
  
  // Guarantee all default operational menus exist in rawMenus
  defaultMenuItems.forEach(defItem => {
    const existingIndex = rawMenus.findIndex(m => m.key === defItem.key);
    if (existingIndex === -1) {
      rawMenus.push(defItem);
    } else {
      rawMenus[existingIndex] = {
        ...rawMenus[existingIndex],
        visible: rawMenus[existingIndex].visible !== false,
        roles: Array.from(new Set([...(rawMenus[existingIndex].roles || []), ...defItem.roles]))
      };
    }
  });

  // Always ensure dashboard menu is at the very top of the sidebar for super_admin and admin
  if (['super_admin', 'admin'].includes(user?.role)) {
    const dashIndex = rawMenus.findIndex(m => m.key === 'dashboard');
    if (dashIndex > -1) {
      const [dash] = rawMenus.splice(dashIndex, 1);
      rawMenus.unshift(dash);
    }
  }

  // Ensure productionManager is always placed directly after gateGuard (Gate Operations)
  const gateGuardIdx = rawMenus.findIndex(m => m.key === 'gateGuard');
  const pmIdx = rawMenus.findIndex(m => m.key === 'productionManager');
  if (gateGuardIdx > -1 && pmIdx > -1 && pmIdx !== gateGuardIdx + 1) {
    const [pmItem] = rawMenus.splice(pmIdx, 1);
    rawMenus.splice(gateGuardIdx + 1, 0, pmItem);
  }


  // Always ensure support menu is present in the list for platform admin
  if (user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL && !rawMenus.some(m => m.key === 'support')) {
    rawMenus.push({
      key: 'support',
      label: 'Help & Support',
      icon: 'HiOutlineDocumentReport',
      path: '/admin/support',
      visible: true,
      roles: ['super_admin']
    });
  }

  const hasOrdersAccess = ['super_admin', 'admin', 'sales'].includes(user?.role) || (user?.role === 'user' && user?.permissions?.includes('orders'));
  const hasFinanceAccess = ['super_admin', 'admin', 'purchase_manager', 'purchase_user', 'sales', 'store_manager'].includes(user?.role) || (user?.role === 'user' && (user?.permissions?.includes('finance') || user?.permissions?.includes('purchase') || user?.permissions?.includes('purchase_user') || user?.permissions?.includes('purchase_manager')));
  const hasInvoiceAccess = ['super_admin', 'admin', 'sales', 'store_manager'].includes(user?.role) || (user?.role === 'user' && (user?.permissions?.includes('finance') || user?.permissions?.includes('store')));

  // Inject Finance & Purchase menu dynamically if not present for authorized roles
  if (hasFinanceAccess) {
    const finMenu = rawMenus.find(m => m.key === 'finance' || m.key === 'purchase');
    if (finMenu) {
      if (finMenu.roles) {
        ['purchase_manager', 'purchase_user', 'store_manager', 'user'].forEach(r => {
          if (!finMenu.roles.includes(r)) finMenu.roles.push(r);
        });
      }
    } else {
      rawMenus.push({
        key: 'purchase',
        label: 'Purchase & Procurement',
        icon: 'HiOutlineClipboardList',
        path: '/finance',
        visible: true,
        roles: ['super_admin', 'admin', 'purchase_manager', 'purchase_user', 'store_manager', 'user']
      });
    }
  }

  // Inject Invoice Generator menu dynamically if not present for authorized roles
  if (hasInvoiceAccess) {
    const genMenu = rawMenus.find(m => m.key === 'invoiceGenerator');
    if (genMenu) {
      if (genMenu.roles) {
        ['sales', 'store_manager', 'user'].forEach(r => {
          if (!genMenu.roles.includes(r)) genMenu.roles.push(r);
        });
      }
    } else {
      rawMenus.push({
        key: 'invoiceGenerator',
        label: 'Invoice Generator',
        icon: 'HiOutlineDocumentText',
        path: '/invoice-generator',
        visible: true,
        roles: ['super_admin', 'admin', 'sales', 'store_manager', 'user']
      });
    }
  }

  // Module key → sidebar item key mapping
  const MODULE_TO_MENU_KEY = {
    gate: 'gateInward',
    production: 'productionManager',
    quality: 'qualityChecker',
    store: 'storeManager',
    dispatch: 'dispatch',
    sales: 'sales',
    finance: 'finance',
    purchase: 'purchase',
    reports: 'reports',
    hr: 'users',
  };

  // Determine enabledModules from org (from login context) or industryConfig
  const orgEnabledModules = user?.organizationId?.enabledModules;
  const orgSubIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const industryEnabledModules = getIndustryConfig(orgSubIndustryId).enabledModules;
  // Use org-specific overrides if set, otherwise fall back to industry defaults
  const effectiveEnabledModules = (orgEnabledModules && orgEnabledModules.length > 0)
    ? orgEnabledModules
    : industryEnabledModules;

  // Inject Drag Chain-specific menu items dynamically
  const isDragChainSidebar = orgSubIndustryId === 'drag_chain';
  if (isDragChainSidebar && !rawMenus.find(m => m.key === 'universalModelInfo')) {
    rawMenus.push({
      key: 'universalModelInfo',
      label: 'Universal Model Info',
      icon: 'HiOutlineDatabase',
      path: '/universal-model-info',
      visible: true,
      roles: ['admin']
    });
  }

  const activeMenus = rawMenus
    .filter(item => {
      // 1. Must be marked visible globally
      if (item.visible === false) return false;
      
      // Platform-level menus only visible to platform admin
      if (['organizations', 'support'].includes(item.key)) {
        return user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;
      }

      // Hard safeguard: Gate operations is never visible to quality checkers
      if (['gateGuard', 'gateInward', 'gateOutward'].includes(item.key) && user?.role === 'quality_checker') return false;


      // MODULE TOGGLING: Hide sidebar items for modules not enabled for this org's industry
      // Always show core items (dashboard, users, settings, organizations, support, notifications, invoiceGenerator, purchase) regardless
      const coreItems = ['dashboard', 'users', 'settings', 'organizations', 'support', 'invoiceGenerator', 'notifications', 'purchase', 'finance'];
      if (!coreItems.includes(item.key)) {
        // Find which module key this sidebar item corresponds to
        const matchedModule = Object.entries(MODULE_TO_MENU_KEY).find(([modKey, menuKey]) => 
          menuKey === item.key || 
          (modKey === 'gate' && ['gateGuard', 'gateInward', 'gateOutward'].includes(item.key)) ||
          (modKey === 'finance' && ['finance', 'purchase', 'invoiceGenerator'].includes(item.key)) ||
          (modKey === 'dispatch' && ['dispatch'].includes(item.key)) ||
          (modKey === 'sales' && ['sales', 'orders'].includes(item.key)) ||
          (modKey === 'production' && ['productionManager', 'supervisor'].includes(item.key))
        )?.[0];
        if (matchedModule && !effectiveEnabledModules.includes(matchedModule)) {
          return false; // This module is disabled for this organization's industry
        }
      }
      // Drag Chain-only menu items: show only for drag chain
      if (item.key === 'universalModelInfo') {
        return isDragChainSidebar && user?.role === 'admin';
      }

      // 2. Role access check
      if (item.roles && item.roles.length > 0) {
        // Platform admin and Organisation admin get access to everything
        if (['super_admin', 'admin'].includes(user?.role)) return true;
        
        // Custom permissions check for 'user' role
        if (user?.role === 'user' && user?.permissions) {
          const permMap = {
            gateGuard: 'gate_guard',
            gateInward: 'gate_guard',
            gateOutward: 'gate_guard',
            supervisor: 'supervisor',
            qualityChecker: 'quality_checker',
            qcInventoryRequests: 'quality_checker',
            storeManager: 'store_manager',
            dispatch: 'dispatch',
            sales: 'sales',
            orders: 'sales',
            finance: 'finance',
            purchase: 'purchase',
            invoiceGenerator: 'finance',
          };
          const reqPerm = permMap[item.key];
          if (reqPerm) {
            if (reqPerm === 'finance' || reqPerm === 'purchase') {
              return user.permissions.includes('finance') || user.permissions.includes('purchase') || user.permissions.includes('purchase_manager') || user.permissions.includes('purchase_user');
            }
            return user.permissions.includes(reqPerm);
          }
        }

        return item.roles.includes(user?.role);
      }
      return true;
    });

  // Group menus by section dynamically
  const menuItems = [];
  activeMenus.forEach(item => {
    // Notifications always gets its own rail entry, whatever a stored menu
    // config says — burying it inside Enterprise put its unread dot on "Home".
    let sectionName = item.key === 'notifications' ? 'Notifications' : item.section;
    if (!sectionName) {
      if (['dashboard', 'users'].includes(item.key)) sectionName = 'Enterprise';
      else if (['gateGuard', 'gateInward', 'gateOutward'].includes(item.key)) sectionName = 'Gate Log';
      else if (['supervisor', 'productionManager'].includes(item.key)) sectionName = 'Production';
      else if (['qualityChecker', 'qcInventoryRequests'].includes(item.key)) sectionName = 'QC Inspection';
      else if (item.key === 'storeManager') sectionName = 'Store Operations';
      else if (item.key === 'dispatch') sectionName = 'Dispatch & Shipping';
      else if (['sales', 'orders'].includes(item.key)) sectionName = 'Sales Log';
      else if (['purchase', 'finance', 'invoiceGenerator'].includes(item.key)) sectionName = 'Purchase & Procurement';
      else if (['organizations', 'settings'].includes(item.key)) sectionName = 'Platform';
      else if (item.key === 'universalModelInfo') sectionName = 'Drag Chain Tools';
      else sectionName = 'General';
    }

    let sect = menuItems.find(s => s.section === sectionName);
    if (!sect) {
      sect = { section: sectionName, items: [] };
      menuItems.push(sect);
    }
    
    // Resolve icon component from string name
    const iconComponent = ICON_MAP[item.icon] || <HiOutlineHome />;
    
    sect.items.push({
      ...item,
      badge: item.key === 'notifications' && unreadCount > 0 ? `${unreadCount}` : item.badge,
      icon: iconComponent
    });
  });

  // Explicit Section Ordering: Place Gate Log above General
  const SECTION_ORDER = [
    'Enterprise',
    'Gate Log',
    'Production',
    'QC Inspection',
    'Store Operations',
    'Dispatch & Shipping',
    'Sales Log',
    'Purchase & Procurement',
    'Finance',
    'Platform',
    'Drag Chain Tools',
    'Notifications',
    'General'
  ];

  menuItems.sort((a, b) => {
    const idxA = SECTION_ORDER.indexOf(a.section);
    const idxB = SECTION_ORDER.indexOf(b.section);
    const orderA = idxA === -1 ? 999 : idxA;
    const orderB = idxB === -1 ? 999 : idxB;
    return orderA - orderB;
  });

  let roleLabel = ROLE_LABELS[user?.role] || 'User';
  if (user?.role === 'super_admin') {
    roleLabel = user.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL ? 'Platform Admin' : 'Organisation Admin';
  }
  const roleColor = accentVar(user?.role);
  const roleSoft = accentSoftVar(user?.role);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await adminOrgAPI.reverifyOTP({ otp });
      toast.success('Reverification successful!');
      setIsReverificationRequired(false);
      window.location.reload(); // Refresh to clear state and fetch data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await adminOrgAPI.resendReverifyOTP();
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  const activeSectionIndex = (() => {
    // /dashboard renders the signed-in role's own workspace (Dashboard.jsx is a
    // role router), so the rail must highlight that role's module — not
    // "Enterprise", which merely happens to own the /dashboard path.
    if (location.pathname === '/dashboard') {
      const own = ROLE_SECTION[user?.role];
      if (own) {
        const i = menuItems.findIndex((s) => s.section === own);
        if (i !== -1) return i;
      }
    }

    const exact = menuItems.findIndex((s) =>
      s.items.some((i) => i.path === location.pathname)
    );
    if (exact !== -1) return exact;
    const partial = menuItems.findIndex((s) =>
      s.items.some((i) => i.path !== '/' && location.pathname.startsWith(i.path))
    );
    return partial !== -1 ? partial : 0;
  })();

  const [railIndex, setRailIndex] = useState(activeSectionIndex);
  useEffect(() => { setRailIndex(activeSectionIndex); }, [activeSectionIndex]);

  if (isReverificationRequired) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '40px', textAlign: 'center', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: '3rem', color: 'var(--danger)', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Reverification Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Your organization's access has been temporarily suspended pending verification.
            Please click "Send OTP" to email your Organization Admin, then enter the code to unlock your workspace.
          </p>

          <form onSubmit={handleVerifyOTP}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter 6-digit OTP" 
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              required
              style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', marginBottom: '16px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '12px' }} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify OTP & Unlock'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleResendOTP}>
                Send OTP
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }


  /* ---------------------------------------------------------------- shell */
  // The rail shows one entry per menu section; the panel shows that section's
  // items. Sections come from the role/permission pipeline above unchanged.
  const activeSection = menuItems[railIndex] || menuItems[0];
  const panelItems = activeSection?.items || [];
  const showPanel = panelItems.length > 1;

  const go = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // ⌘K entries: every screen this user can actually reach, plus quick actions.
  const commands = [
    ...menuItems.flatMap((s) =>
      s.items.map((i) => ({
        key: `nav-${i.key}`,
        group: s.section,
        label: i.label,
        icon: i.icon,
        run: () => go(i.path),
      }))
    ),
    {
      key: 'act-logout',
      group: 'Actions',
      label: 'Log out',
      icon: <HiOutlineLogout />,
      run: handleLogout,
    },
  ];

  const crumbSection = activeSection?.section;
  const crumbPage =
    panelItems.find((i) => i.path === location.pathname)?.label || pageTitle;

  return (
    <div className={`shell${isMobileMenuOpen ? ' nav-open' : ''}`}>
      <div className="shell-backdrop" onClick={() => setIsMobileMenuOpen(false)} />

      {/* ------------------------------------------------------ icon rail */}
      <nav className="rail" aria-label="Modules">
        <div
          className="rail-logo"
          onClick={() => go('/dashboard')}
          title={settings?.brandName || 'TrackBells ERP'}
        >
          {settings?.logo && /^(https?:|\/|data:|blob:)/.test(settings.logo) ? (
            <img
              src={settings.logo.includes('logo.png') ? '/logo_icon.png' : getImageUrl(settings.logo)}
              alt=""
            />
          ) : (
            <LuFactory />
          )}
        </div>

        <div className="rail-scroll">
          {menuItems.map((s, idx) => {
            const badged = s.items.some((i) => i.badge);
            return (
              <button
                key={s.section}
                className={`rail-item${idx === railIndex ? ' active' : ''}`}
                // Native tooltip: a CSS one would be clipped by the rail's
                // own scroll container, which is why hovering showed nothing.
                title={s.section}
                aria-label={s.section}
                aria-current={idx === railIndex ? 'true' : undefined}
                onClick={() => {
                  setRailIndex(idx);
                  // Single-item sections have no panel, so navigate straight there.
                  if (s.items.length === 1) go(s.items[0].path);
                }}
              >
                {SECTION_ICONS[s.section] || <LuLayoutGrid />}
                <span className="rail-label">{railLabel(s.section)}</span>
                {badged && <span className="rail-dot" />}
              </button>
            );
          })}
        </div>

        <div className="rail-footer">
          <button
            className="rail-item compact"
            title="Log out"
            onClick={handleLogout}
            aria-label="Log out"
            style={{ color: 'var(--danger)' }}
          >
            <HiOutlineLogout />
          </button>
        </div>
      </nav>

      {/* ---------------------------------------------- contextual panel */}
      {panelItems.length > 0 && (
        <aside className={`panel${showPanel ? '' : ' panel-solo'}`} aria-label={`${activeSection.section} navigation`}>
          <div className="panel-header">
            <span className="brand-name">{settings?.brandName || 'TrackBells ERP'}</span>
          </div>

          <div className="panel-nav" ref={panelNavRef} onScroll={handlePanelScroll}>
            <div className="panel-group-title">{activeSection.section}</div>
            {panelItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.key === 'gateGuard' &&
                  ['/gate-guard', '/gate-inward', '/gate-outward'].includes(location.pathname));
              return (
                <button
                  key={item.key}
                  className={`panel-item${active ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
                  onClick={() => !item.disabled && go(item.path)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="badge danger">{item.badge}</span>}
                </button>
              );
            })}
          </div>

          <div className="panel-footer">
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 'var(--radius-md)',
                background: roleSoft,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 'var(--fs-2xs)', fontWeight: 700, color: roleColor,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------ main column */}
      <div className={`shell-main${showPanel ? '' : ' no-panel'}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <HiOutlineMenu />
            </button>
            <div className="crumbs">
              {crumbSection && (
                <>
                  <span className="hide-on-mobile">{crumbSection}</span>
                  <span className="sep hide-on-mobile">/</span>
                </>
              )}
              <span className="crumb-current">{crumbPage}</span>
            </div>
          </div>

          <div className="topbar-right">
            <button className="cmdk-trigger" onClick={() => setPaletteOpen(true)}>
              <LuSearch />
              <span>Search…</span>
              <kbd>⌘K</kbd>
            </button>

            {user?.role === 'super_admin' &&
              user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL && (
                <select
                  className="field-control hide-on-mobile"
                  value={selectedOrgId}
                  onChange={handleOrgChange}
                  style={{ width: 'auto', maxWidth: 190, height: 30 }}
                  aria-label="Select organization"
                >
                  <option value="">All organizations</option>
                  {orgs.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              )}

            {user?.role !== 'gate_guard' && (
              <button
                className="icon-btn"
                onClick={() => go('/notifications')}
                title={unreadCount > 0 ? `${unreadCount} unread` : 'Notifications'}
                aria-label="Notifications"
              >
                <HiOutlineBell />
                {unreadCount > 0 && <span className="dot-badge" />}
              </button>
            )}

            <div className="profile-wrapper" ref={profileRef}>
              <button
                className="icon-btn"
                onClick={() => setShowProfilePanel(!showProfilePanel)}
                aria-label="Profile"
                style={{ padding: 0 }}
              >
                <span
                  style={{
                    width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                    background: roleColor, color: '#fff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--fs-2xs)', fontWeight: 700, overflow: 'hidden',
                  }}
                >
                  {user?.profileImage ? (
                    <img
                      src={getImageUrl(user.profileImage)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getUserInitials(user?.name)
                  )}
                </span>
              </button>

              {showProfilePanel && (
                <div className="notification-dropdown" style={{ width: 288 }}>
                  <div
                    className="notif-header"
                    style={{ flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 16px' }}
                  >
                    <span
                      style={{
                        width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                        background: roleColor, color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem', fontWeight: 700, overflow: 'hidden',
                      }}
                    >
                      {user?.profileImage ? (
                        <img
                          src={getImageUrl(user.profileImage)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getUserInitials(user?.name)
                      )}
                    </span>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProfileImageChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingProfile}
                    >
                      <LuUpload /> {uploadingProfile ? 'Uploading…' : 'Change photo'}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 'var(--fs-md)' }}>{getDisplayName(user?.name)}</h4>
                      <span
                        className="badge"
                        style={{ marginTop: 5, background: roleSoft, color: roleColor, borderColor: 'transparent' }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="notif-body" style={{ padding: 16 }}>
                    <dl className="dl">
                      <dt>Email</dt>
                      <dd>{user?.email}</dd>
                      {user?.phone && (<><dt>Mobile</dt><dd>{user.phone}</dd></>)}
                      {!['super_admin', 'admin'].includes(user?.role) && user?.organizationId?.name && (
                        <><dt>Organization</dt><dd>{user.organizationId.name}</dd></>
                      )}
                    </dl>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
                    <button className="btn btn-secondary btn-block" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                      <HiOutlineLogout /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {needsOrgSelection ? (
          <div className="page">
            <div className="surface surface-pad" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
              <div className="empty-icon" style={{ margin: '0 auto 12px' }}><LuBuilding2 /></div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', color: 'var(--text-primary)', marginBottom: 8 }}>
                Select an organization to manage
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-base)', lineHeight: 1.6, marginBottom: 18 }}>
                You are signed in as the platform Super Admin. Choose an organization to view and manage its records.
              </p>
              {orgs.length > 0 && (
                <select
                  className="field-control"
                  value={selectedOrgId}
                  onChange={handleOrgChange}
                  style={{ maxWidth: 280, margin: '0 auto', textAlign: 'center' }}
                >
                  <option value="">Choose organization…</option>
                  {orgs.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};

export default DashboardLayout;
