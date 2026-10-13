import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminOrgAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { getCountryDetails } from '../config/countryConfig';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

const OrgContext = createContext(null);

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};

const defaultSettings = {
  brandName: 'TrackBells ERP',
  brandSubtitle: 'Factory Automation',
  logo: '/logo.png',
  themeColor: 'var(--primary)',
  footerText: 'Powered by Cyberbells ITES services pvt ltd',
  menus: [
    { key: 'gateGuard', label: 'Gate Operations', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'gate_guard'] },
    { key: 'productionManager', label: 'Production Manager', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'supervisor', 'production_manager'] },
    { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'quality_checker'] },
    { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'store_manager'] },
    { key: 'dispatch', label: 'Dispatch & Shipping', icon: 'HiOutlineTruck', path: '/dispatch', visible: true, roles: ['super_admin', 'dispatch', 'dispatch_manager', 'store_manager'] },
    { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'sales'] },
    { key: 'purchase', label: 'Purchase & Procurement', icon: 'HiOutlineClipboardList', path: '/finance', visible: true, roles: ['super_admin', 'purchase_manager', 'purchase_user', 'store_manager'] },
    { key: 'reports', label: 'Analytics & Reports', icon: 'HiOutlineDocumentText', path: '/reports', visible: true, roles: ['super_admin', 'admin', 'gate_guard', 'supervisor', 'production_manager', 'quality_checker', 'store_manager', 'sales', 'purchase_manager', 'purchase_user', 'dispatch'] },
    { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'optionalFeature', label: 'Optional Feature', icon: 'HiOutlineLightningBolt', path: '/optional-feature', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'organizations', label: 'SaaS Tenants', icon: 'HiOutlineOfficeBuilding', path: '/admin/organizations', visible: true, roles: ['super_admin'] },
    { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'support', label: 'Help & Support', icon: 'HiOutlineDocumentReport', path: '/admin/support', visible: true, roles: ['super_admin'] }
  ]
};

export const OrgProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  /**
   * Applies the tenant's brand colour as a derived palette.
   *
   * It writes a stylesheet (not inline styles on <html>) so that the
   * [data-theme="dark"] block can still override the light values — inline
   * styles on the root element would win over every theme rule and freeze the
   * UI at one brand shade in both themes.
   */
  const applyThemeColor = (color) => {
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;

    const toRgb = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const toHex = ({ r, g, b }) =>
      `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;

    // Mix towards black (amount < 0) or white (amount > 0), -1..1
    const shade = (hex, amount) => {
      const { r, g, b } = toRgb(hex);
      const t = amount < 0 ? 0 : 255;
      const p = Math.abs(amount);
      return toHex({ r: r + (t - r) * p, g: g + (t - g) * p, b: b + (t - b) * p });
    };

    const rgba = (hex, a) => {
      const { r, g, b } = toRgb(hex);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    // Relative luminance -> pick readable text colour on top of the brand fill
    const onColor = (hex) => {
      const { r, g, b } = toRgb(hex);
      const lin = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      return L > 0.55 ? '#0f172a' : '#ffffff';
    };

    try {
      // Light theme: use the brand colour as given.
      const lightBase = color;
      const lightDark = shade(color, -0.18);
      const lightLight = shade(color, 0.35);

      // Dark theme: lift the brand colour so it stays legible on dark surfaces.
      const darkBase = shade(color, 0.22);
      const darkDark = color;
      const darkLight = shade(color, 0.5);

      const css = `
:root {
  --primary: ${lightBase};
  --primary-dark: ${lightDark};
  --primary-light: ${lightLight};
  --primary-soft: ${rgba(lightBase, 0.09)};
  --primary-glow: ${rgba(lightBase, 0.08)};
  --on-primary: ${onColor(lightBase)};
  --accent: ${lightBase};
  --accent-dark: ${lightDark};
  --accent-light: ${lightLight};
  --border-primary: ${rgba(lightBase, 0.35)};
  --border-accent: ${rgba(lightBase, 0.35)};
  --ring-focus: 0 0 0 3px ${rgba(lightBase, 0.16)};
  --shadow-glow: 0 0 0 3px ${rgba(lightBase, 0.12)};
}
[data-theme="dark"] {
  --primary: ${darkBase};
  --primary-dark: ${darkDark};
  --primary-light: ${darkLight};
  --primary-soft: ${rgba(darkBase, 0.16)};
  --primary-glow: ${rgba(darkBase, 0.18)};
  --on-primary: ${onColor(darkBase)};
  --accent: ${darkBase};
  --accent-dark: ${darkDark};
  --accent-light: ${darkLight};
  --border-primary: ${rgba(darkBase, 0.42)};
  --border-accent: ${rgba(darkBase, 0.42)};
  --ring-focus: 0 0 0 3px ${rgba(darkBase, 0.28)};
  --shadow-glow: 0 0 0 3px ${rgba(darkBase, 0.22)};
}`;

      let tag = document.getElementById('org-brand-theme');
      if (!tag) {
        tag = document.createElement('style');
        tag.id = 'org-brand-theme';
        document.head.appendChild(tag);
      }
      tag.textContent = css;
    } catch (e) {
      console.error('Error applying custom theme colors:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await adminOrgAPI.getSettings();
      if (res.data && res.data.success) {
        const orgData = res.data.data;
        if (orgData && orgData.logo === '🏭') {
          orgData.logo = '/logo.png';
        }
        setSettings(orgData);
        applyThemeColor(orgData.themeColor);
      }
    } catch (error) {
      console.error('Failed to fetch organization settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let socket;
    if (isAuthenticated && user?.organizationId) {
      fetchSettings();

      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('org_country_updated', () => {
        fetchSettings();
      });
    } else {
      setSettings(defaultSettings);
      applyThemeColor(defaultSettings.themeColor);
      setLoading(false);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, user?.organizationId]);

  const countrySpecs = getCountryDetails(settings?.country || 'India');
  const currencySymbol = settings?.currencySymbol || countrySpecs.symbol;
  const currency = settings?.currency || countrySpecs.currency;
  const taxName = settings?.taxName || countrySpecs.taxName;
  const taxRate = settings?.taxRate !== undefined ? settings.taxRate : countrySpecs.taxRate;
  const country = settings?.country || countrySpecs.country;

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const updateSettings = async (newSettings) => {
    const res = await adminOrgAPI.updateSettings(newSettings);
    if (res.data && res.data.success) {
      setSettings(res.data.data);
      applyThemeColor(res.data.data.themeColor);
      return res.data.data;
    }
    throw new Error('Failed to update organization settings');
  };

  return (
    <OrgContext.Provider value={{
      settings,
      loading,
      country,
      currency,
      currencySymbol,
      taxName,
      taxRate,
      formatCurrency,
      reloadSettings: fetchSettings,
      updateSettings
    }}>
      {children}
    </OrgContext.Provider>
  );
};
