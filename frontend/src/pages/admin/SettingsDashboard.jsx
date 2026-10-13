import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import {
  LuShieldCheck as IconShield, LuLock as IconLock, LuGlobe,
  LuPalette, LuLayoutList, LuWarehouse, LuPlus, LuX, LuBan,
  LuBuilding2, LuArchive, LuLayers, LuRotateCcw, LuSave, LuMapPin,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { COUNTRY_LIST, getCountryDetails } from '../../config/countryConfig';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Tabs, DataTable, Field, Input, Select, Button, EmptyState,
} from '../../components/ui';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Org Admin' },
  { value: 'gate_guard', label: 'Gate Guard' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'quality_checker', label: 'Quality Checker' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'sales', label: 'Sales Officer' }
];

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

/* -------------------------------------------------------------- UI helpers */

/** Two-up layout that collapses to one column on narrow viewports. */
const twoCol = {
  display: 'grid',
  gap: 'var(--sp-5)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
  alignItems: 'start',
};

const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    aria-label={label}
    onClick={onChange}
    style={{
      width: 40, height: 22, flexShrink: 0, padding: 0, cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--bg-subtle)',
      border: `1px solid ${checked ? 'var(--primary)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-full)', position: 'relative',
      transition: 'var(--transition-fast)',
    }}
  >
    <span
      style={{
        position: 'absolute', top: 2, left: checked ? 19 : 2,
        width: 16, height: 16, borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--on-primary)' : 'var(--text-ghost)',
        transition: 'left 0.2s ease',
      }}
    />
  </button>
);

/** One policy switch with its explanation. */
const SettingRow = ({ title, description, checked, onChange }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--sp-4)', padding: 'var(--sp-3) 0',
      borderBottom: '1px solid var(--border-light)',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 2, lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} label={title} />
  </div>
);

/** Removable pill list used by the warehouse catalogues. */
const TagList = ({ items, icon, tone, onRemove, emptyText }) => {
  if (!items || items.length === 0) {
    return <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-ghost)' }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item) => (
        <span
          key={item}
          className="badge"
          style={{
            background: `color-mix(in srgb, var(--c-${tone}) 12%, transparent)`,
            borderColor: `color-mix(in srgb, var(--c-${tone}) 30%, transparent)`,
            color: 'var(--text-primary)',
            gap: 6,
          }}
        >
          <span style={{ color: `var(--c-${tone})`, display: 'inline-flex' }}>{icon}</span>
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item}`}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center',
            }}
          >
            <LuX />
          </button>
        </span>
      ))}
    </div>
  );
};

/** Text input + add button used by every catalogue block. */
const AddRow = ({ placeholder, value, onChange, onAdd, addLabel }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
      style={{ flex: '1 1 220px', minWidth: 0 }}
    />
    <Button variant="primary" icon={<LuPlus />} onClick={onAdd}>{addLabel}</Button>
  </div>
);

const SettingsDashboard = () => {
  const { user } = useAuth();
  const { settings, updateSettings, reloadSettings } = useOrg();
  const isDragChain = user?.organizationId?.subIndustry === 'Drag Chain' || !user?.organizationId?.subIndustry;

  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'super_admin' || user.role === 'admin')) {
      setActiveTab('security');
    } else {
      setActiveTab('branding');
    }
  }, [user]);

  // 1. Security & Compliance states
  const [securitySettings, setSecuritySettings] = useState({
    disableScreenshots: true,
    requireBiometric: true,
    restrictCrossDepartment: true,
    allowMobileApp: false
  });

  // 2. Branding states
  const [brandName, setBrandName] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');
  const [logo, setLogo] = useState('');
  const [themeColor, setThemeColor] = useState('var(--primary)');
  const [footerText, setFooterText] = useState('');

  // 3. Sidebar Menus states
  const [menus, setMenus] = useState([]);

  // 4. Country & Regional Tax states
  const [selectedCountry, setSelectedCountry] = useState('India');

  // 5. Warehouse Physical Storage Structure states (Locations, Almirahs, Racks)
  const [warehouses, setWarehouses] = useState([]);
  const [almirahs, setAlmirahs] = useState([]);
  const [racks, setRacks] = useState([]);

  const [newWarehouse, setNewWarehouse] = useState('');
  const [newAlmirah, setNewAlmirah] = useState('');
  const [newRack, setNewRack] = useState('');

  // 6. Product Specs & Catalog Config states (Item Types, Units, Models, Inner Width, Radii)
  const [itemTypes, setItemTypes] = useState([]);
  const [stockUnits, setStockUnits] = useState([]);
  const [modelNumbers, setModelNumbers] = useState([]);
  const [innerSizes, setInnerSizes] = useState([]);
  const [bendingRadii, setBendingRadii] = useState([]);

  const [newItemType, setNewItemType] = useState('');
  const [newStockUnit, setNewStockUnit] = useState('');
  const [newModelNumber, setNewModelNumber] = useState('');
  const [newInnerSize, setNewInnerSize] = useState('');
  const [newBendingRadius, setNewBendingRadius] = useState('');

  useEffect(() => {
    if (settings) {
      setSelectedCountry(settings.country || 'India');
      setBrandName(settings.brandName || '');
      setBrandSubtitle(settings.brandSubtitle || '');
      setLogo(settings.logo || '');
      setThemeColor(settings.themeColor || 'var(--primary)');
      setFooterText(settings.footerText || '');
      setMenus(settings.menus ? JSON.parse(JSON.stringify(settings.menus)) : []);

      setSecuritySettings({
        disableScreenshots: settings.disableScreenshots !== undefined ? settings.disableScreenshots : true,
        requireBiometric: settings.requireBiometric !== undefined ? settings.requireBiometric : true,
        restrictCrossDepartment: settings.restrictCrossDepartment !== undefined ? settings.restrictCrossDepartment : true,
        allowMobileApp: settings.allowMobileApp !== undefined ? settings.allowMobileApp : false
      });

      setWarehouses(settings.warehouses || []);
      setAlmirahs(settings.almirahs || []);
      setRacks(settings.racks || []);
    }
  }, [settings]);

  const handleSaveCountry = async () => {
    const specs = getCountryDetails(selectedCountry);
    const msg = `🌐 Confirm Country & Currency Switch:\n\nSwitching organization country to ${specs.country} will instantly update:\n- Currency: ${specs.currency} (${specs.symbol})\n- Tax: ${specs.taxName} (${specs.taxRate}%)\n\nAll real-time user sessions will be updated immediately. Proceed?`;
    if (!window.confirm(msg)) return;

    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        country: selectedCountry
      });
      toast.success(`Country switched to ${specs.country}! Currency (${specs.symbol}) and ${specs.taxName} (${specs.taxRate}%) updated globally.`);
    } catch (err) {
      toast.error('Failed to update organization country');
    } finally {
      setSaving(false);
    }
  };

  const handleSecurityToggle = (key) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSecurity = async () => {
    const confirmMessage = "⚠️ Security Policy Update:\n\nSaving these updated policies will invalidate all active Android & iOS mobile sessions. Users logged in via the mobile app will be forced to re-login to sync these policies.\n\nDo you want to proceed?";
    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        disableScreenshots: securitySettings.disableScreenshots,
        requireBiometric: securitySettings.requireBiometric,
        restrictCrossDepartment: securitySettings.restrictCrossDepartment,
        allowMobileApp: securitySettings.allowMobileApp
      });
      toast.success('Global security policies applied successfully! All mobile sessions expired.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update security policies');
    } finally {
      setSaving(false);
    }
  };

  // Menu Handlers
  const handleMenuLabelChange = (index, val) => {
    const updated = [...menus];
    updated[index].label = val;
    setMenus(updated);
  };

  const handleMenuVisibilityToggle = (index) => {
    const updated = [...menus];
    updated[index].visible = !updated[index].visible;
    setMenus(updated);
  };

  const handleRoleToggle = (index, roleVal) => {
    const updated = [...menus];
    const rolesArray = updated[index].roles || [];
    if (rolesArray.includes(roleVal)) {
      updated[index].roles = rolesArray.filter(r => r !== roleVal);
    } else {
      updated[index].roles = [...rolesArray, roleVal];
    }
    setMenus(updated);
  };

  const handleSaveConfig = async () => {
    const confirmMessage = "⚠️ Branding Configuration Update:\n\nSaving these configuration changes will invalidate all active Android & iOS mobile sessions. Users logged in via the mobile app will be forced to re-login to synchronize layout updates.\n\nDo you want to proceed?";
    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    try {
      await updateSettings({
        brandName,
        brandSubtitle,
        logo,
        themeColor,
        footerText,
        menus
      });
      toast.success('Organization configuration updated successfully! All mobile sessions expired.');
      reloadSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update configurations');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Are you sure you want to reset all branding settings and menus to defaults?')) return;
    setBrandName('TrackBells ERP');
    setBrandSubtitle('Factory Automation');
    setLogo('/logo.png');
    setThemeColor('var(--primary)');
    setFooterText('Powered by Cyberbells ITES services pvt ltd');
    setMenus([
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
    ]);
  };

  const handleAddWarehouse = () => {
    if (!newWarehouse.trim()) return;
    if (warehouses.includes(newWarehouse.trim())) {
      toast.error('Warehouse location already exists');
      return;
    }
    setWarehouses([...warehouses, newWarehouse.trim()]);
    setNewWarehouse('');
  };

  const handleRemoveWarehouse = (item) => {
    setWarehouses(warehouses.filter(w => w !== item));
  };

  const handleAddAlmirah = () => {
    if (!newAlmirah.trim()) return;
    if (almirahs.includes(newAlmirah.trim())) {
      toast.error('Almirah already exists');
      return;
    }
    setAlmirahs([...almirahs, newAlmirah.trim()]);
    setNewAlmirah('');
  };

  const handleRemoveAlmirah = (item) => {
    setAlmirahs(almirahs.filter(a => a !== item));
  };

  const handleAddRack = () => {
    if (!newRack.trim()) return;
    if (racks.includes(newRack.trim())) {
      toast.error('Rack / Shelf already exists');
      return;
    }
    setRacks([...racks, newRack.trim()]);
    setNewRack('');
  };

  const handleRemoveRack = (item) => {
    setRacks(racks.filter(r => r !== item));
  };

  const handleSaveWarehouseStructure = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        warehouses,
        almirahs,
        racks
      });
      toast.success('Warehouse Physical Storage Structure updated in real-time!');
      reloadSettings();
    } catch (err) {
      toast.error('Failed to update Warehouse structure settings');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Product Specs Catalog
  const handleAddItemType = () => {
    if (!newItemType.trim()) return;
    const val = newItemType.trim().toLowerCase().replace(/\s+/g, '_');
    if (itemTypes.includes(val)) { toast.error('Item Type already exists'); return; }
    setItemTypes([...itemTypes, val]);
    setNewItemType('');
  };
  const handleRemoveItemType = (val) => setItemTypes(itemTypes.filter(t => t !== val));

  const handleAddStockUnit = () => {
    if (!newStockUnit.trim()) return;
    const val = newStockUnit.trim().toLowerCase();
    if (stockUnits.includes(val)) { toast.error('Stock Unit already exists'); return; }
    setStockUnits([...stockUnits, val]);
    setNewStockUnit('');
  };
  const handleRemoveStockUnit = (val) => setStockUnits(stockUnits.filter(u => u !== val));

  const handleAddModelNumber = () => {
    if (!newModelNumber.trim()) return;
    const val = newModelNumber.trim();
    if (modelNumbers.includes(val)) { toast.error('Model Number already exists'); return; }
    setModelNumbers([...modelNumbers, val]);
    setNewModelNumber('');
  };
  const handleRemoveModelNumber = (val) => setModelNumbers(modelNumbers.filter(m => m !== val));

  const handleAddInnerSize = () => {
    if (!newInnerSize.trim()) return;
    const val = newInnerSize.trim();
    if (innerSizes.includes(val)) { toast.error('Inner Width/Size already exists'); return; }
    setInnerSizes([...innerSizes, val]);
    setNewInnerSize('');
  };
  const handleRemoveInnerSize = (val) => setInnerSizes(innerSizes.filter(s => s !== val));

  const handleAddBendingRadius = () => {
    if (!newBendingRadius.trim()) return;
    const val = newBendingRadius.trim();
    if (bendingRadii.includes(val)) { toast.error('Bending Radius already exists'); return; }
    setBendingRadii([...bendingRadii, val]);
    setNewBendingRadius('');
  };
  const handleRemoveBendingRadius = (val) => setBendingRadii(bendingRadii.filter(r => r !== val));

  const handleSaveProductSpecs = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        itemTypes,
        stockUnits,
        modelNumbers,
        innerSizes,
        bendingRadii
      });
      toast.success('Product Specifications & Catalogs updated in real-time!');
      reloadSettings();
    } catch (err) {
      toast.error('Failed to update Product Specs settings');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <DashboardLayout pageTitle="Settings">
        <Page>
          <Surface>
            <EmptyState
              icon={<LuBan />}
              title="Access Denied"
              text="Only the Organization Admin can access configuration settings."
            />
          </Surface>
        </Page>
      </DashboardLayout>
    );
  }

  const isLogoImage = !!logo && (logo.startsWith('http') || logo.startsWith('/') || logo.startsWith('data:'));
  const countrySpecs = getCountryDetails(selectedCountry);

  const tabItems = [
    ...((user?.role === 'super_admin' || user?.role === 'admin')
      ? [{ key: 'security', label: 'Security & Compliance', icon: <IconShield /> }]
      : []),
    ...(isDragChain
      ? [{ key: 'warehouse_structure', label: 'Warehouse Structure', icon: <LuWarehouse /> }]
      : []),
    { key: 'branding', label: 'Branding & Theme', icon: <LuPalette /> },
    { key: 'country', label: 'Country & Tax', icon: <LuGlobe /> },
    { key: 'menus', label: 'Sidebar & Menu Access', icon: <LuLayoutList /> },
  ];

  const menuColumns = [
    {
      key: 'key',
      header: 'Menu Identifier',
      primary: true,
      render: (menu) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{menu.key}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>Path: {menu.path}</div>
        </div>
      ),
    },
    {
      key: 'label',
      header: 'Display Label',
      sortable: false,
      render: (menu) => (
        <Input
          value={menu.label}
          onChange={(e) => handleMenuLabelChange(menus.findIndex(m => m.key === menu.key), e.target.value)}
          style={{ maxWidth: 220 }}
          aria-label={`Label for ${menu.key}`}
        />
      ),
    },
    {
      key: 'visible',
      header: 'Visibility',
      align: 'right',
      sortable: false,
      render: (menu) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ToggleSwitch
            checked={menu.visible}
            onChange={() => handleMenuVisibilityToggle(menus.findIndex(m => m.key === menu.key))}
            label={`Show ${menu.label}`}
          />
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Workspace Configuration">
      <Page>
        <PageHeader
          title="Workspace Configuration"
          subtitle="Branding, security policies, regional tax and navigation for this organization."
        />

        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

        {/* TAB: WAREHOUSE & PHYSICAL STORAGE STRUCTURE */}
        {activeTab === 'warehouse_structure' && (
          <>
            <Section
              title="Warehouse & Physical Storage Structure"
              actions={
                <Button variant="primary" icon={<LuSave />} onClick={handleSaveWarehouseStructure} disabled={saving}>
                  {saving ? 'Saving Structure…' : 'Save Storage Structure'}
                </Button>
              }
            >
              <Surface>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
                  Configure physical Warehouse Locations, Almirahs / Cupboards, and Racks / Shelves (S.No)
                  available across Godowns &amp; Factory Floors.
                </p>
              </Surface>
            </Section>

            <Section title="1. Warehouse Locations (Godowns & Storage Areas)">
              <Surface>
                <AddRow
                  placeholder="Enter Warehouse Name (e.g. Central Store, Godown B)…"
                  value={newWarehouse}
                  onChange={setNewWarehouse}
                  onAdd={handleAddWarehouse}
                  addLabel="Add Location"
                />
                <TagList
                  items={warehouses}
                  icon={<LuMapPin />}
                  tone="orange"
                  onRemove={handleRemoveWarehouse}
                  emptyText="No warehouse locations configured yet."
                />
              </Surface>
            </Section>

            <Section title="2. Almirah / Cupboards Catalog">
              <Surface>
                <AddRow
                  placeholder="Enter Almirah Name (e.g. ALMIRAH-19, CUPBOARD-B)…"
                  value={newAlmirah}
                  onChange={setNewAlmirah}
                  onAdd={handleAddAlmirah}
                  addLabel="Add Almirah"
                />
                <TagList
                  items={almirahs}
                  icon={<LuArchive />}
                  tone="blue"
                  onRemove={handleRemoveAlmirah}
                  emptyText="No almirahs or cupboards configured yet."
                />
              </Surface>
            </Section>

            <Section title="3. Rack / Shelf (S.No) Catalog">
              <Surface>
                <AddRow
                  placeholder="Enter Rack / Shelf Name (e.g. S.No 1, Shelf 4A)…"
                  value={newRack}
                  onChange={setNewRack}
                  onAdd={handleAddRack}
                  addLabel="Add Rack/Shelf"
                />
                <TagList
                  items={racks}
                  icon={<LuLayers />}
                  tone="green"
                  onRemove={handleRemoveRack}
                  emptyText="No racks or shelves configured yet."
                />
              </Surface>
            </Section>
          </>
        )}

        {/* TAB: SECURITY & COMPLIANCE */}
        {activeTab === 'security' && (user?.role === 'super_admin' || user?.role === 'admin') && (
          <Section
            title="Security Settings"
            actions={
              <Button variant="primary" icon={<IconLock />} onClick={handleSaveSecurity} disabled={saving}>
                {saving ? 'Saving…' : 'Save Policies'}
              </Button>
            }
          >
            <Surface>
              <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--text-muted)', fontSize: 'var(--fs-base)' }}>
                Manage organization-wide device and compliance parameters.
              </p>

              <SettingRow
                title="Disable Screenshots (Mobile App)"
                description="Enables FLAG_SECURE on mobile nodes to prevent visual data leaks."
                checked={securitySettings.disableScreenshots}
                onChange={() => handleSecurityToggle('disableScreenshots')}
              />
              <SettingRow
                title="Require Biometric Login"
                description="Enforce face/fingerprint authentication on mobile scanner nodes."
                checked={securitySettings.requireBiometric}
                onChange={() => handleSecurityToggle('requireBiometric')}
              />
              <SettingRow
                title="Strict Department Isolation"
                description="Prevent roles from accessing other department logs (e.g. sales views supervisor logs)."
                checked={securitySettings.restrictCrossDepartment}
                onChange={() => handleSecurityToggle('restrictCrossDepartment')}
              />
              <SettingRow
                title="Enable Mobile App Access"
                description="Permit employee connections via React Native application endpoints."
                checked={securitySettings.allowMobileApp}
                onChange={() => handleSecurityToggle('allowMobileApp')}
              />
            </Surface>
          </Section>
        )}

        {/* TAB: COUNTRY & CURRENCY TAX REGION */}
        {activeTab === 'country' && (
          <Section title="Organization Country & Currency Tax Region">
            <Surface>
              <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text-muted)', fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
                Changing country automatically updates currency symbols, tax rates (GST, VAT, Sales Tax),
                and price calculations across all user sessions in real-time.
              </p>

              <FormGrid>
                <Field label="Select Organization Country" required span={2}>
                  <Select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    options={COUNTRY_LIST.map((c) => ({ value: c, label: c }))}
                  />
                </Field>
                <Field label="Apply">
                  <Button
                    variant="primary"
                    icon={<LuGlobe />}
                    onClick={handleSaveCountry}
                    disabled={saving}
                    block
                  >
                    {saving ? 'Switching…' : 'Switch Country & Sync'}
                  </Button>
                </Field>
              </FormGrid>
            </Surface>

            <div style={{ marginTop: 'var(--sp-5)' }}>
              <StatRow>
                <StatTile
                  label="Country"
                  value={`${countrySpecs.country} (${countrySpecs.code})`}
                  icon={<LuGlobe />}
                  tone="primary"
                />
                <StatTile label="Currency Code" value={countrySpecs.currency} icon={<LuBuilding2 />} tone="blue" />
                <StatTile label="Currency Symbol" value={countrySpecs.symbol} icon={<LuPalette />} tone="violet" />
                <StatTile
                  label="Tax Type & Rate"
                  value={`${countrySpecs.taxName} (${countrySpecs.taxRate}%)`}
                  icon={<IconShield />}
                  tone="green"
                />
              </StatRow>
            </div>
          </Section>
        )}

        {/* TAB: BRANDING & THEME */}
        {activeTab === 'branding' && (
          <div style={twoCol}>
            <Section
              title="Organization Branding"
              actions={
                <Button variant="primary" icon={<LuSave />} onClick={handleSaveConfig} disabled={saving}>
                  {saving ? 'Updating…' : 'Apply Branding'}
                </Button>
              }
            >
              <Surface>
                <FormGrid>
                  <Field label="Brand Name" required>
                    <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. TrackBells ERP" required />
                  </Field>
                  <Field label="Brand Subtitle">
                    <Input value={brandSubtitle} onChange={(e) => setBrandSubtitle(e.target.value)} placeholder="e.g. Factory Automation" />
                  </Field>

                  <Field label="Logo (Emoji or Image URL)" required span={2} hint="Paste an image URL, or type a single emoji.">
                    <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="e.g. 🏭 or https://..." required />
                  </Field>

                  <Field label="Primary Color" required hint="The whole palette is derived from this colour.">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={themeColor}
                        onChange={e => setThemeColor(e.target.value)}
                        aria-label="Primary brand colour"
                        style={{
                          width: 44, height: 36, padding: 0, cursor: 'pointer',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-input)',
                        }}
                      />
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {themeColor}
                      </span>
                    </div>
                  </Field>

                  <Field label="Footer Copyright Text" span={2}>
                    <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. Powered by Cyberbells ITES..." />
                  </Field>
                </FormGrid>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--sp-5)' }}>
                  <Button variant="secondary" icon={<LuRotateCcw />} onClick={handleResetDefaults}>
                    Reset Defaults
                  </Button>
                </div>
              </Surface>
            </Section>

            {/* Preview Panel */}
            <Section title="Live Preview">
              <Surface>
                <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-ghost)', marginBottom: 10 }}>
                  Sidebar header
                </div>
                <div style={{
                  background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', padding: 'var(--sp-4)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: isLogoImage && !logo.includes('logo.png') ? 'var(--bg-card)' : themeColor,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'var(--on-primary)',
                    padding: isLogoImage && !logo.includes('logo.png') ? 4 : 0,
                  }}>
                    {isLogoImage ? (
                      <img src={getImageUrl(logo)} alt="Logo" style={{ maxHeight: 32, maxWidth: 32, borderRadius: 2, objectFit: 'contain' }} />
                    ) : (
                      logo || '🏭'
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: 'var(--fs-md)', fontWeight: 700 }}>
                      {brandName || 'TrackBells ERP'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      {brandSubtitle || 'Factory Automation'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-ghost)', margin: 'var(--sp-5) 0 10px' }}>
                  UI accent colour
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{ background: themeColor, borderColor: themeColor }}
                    onClick={() => toast.success(`This is a preview of the Primary Button with theme color ${themeColor}`)}
                  >
                    Primary Button
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ color: themeColor, borderColor: themeColor }}
                    onClick={() => toast.success(`This is a preview of the Outline Button with theme color ${themeColor}`)}
                  >
                    Outline Button
                  </button>
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${themeColor} 13%, transparent)`,
                      borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
                      color: themeColor,
                      cursor: 'pointer',
                    }}
                    onClick={() => toast.success('This is a preview of the Badge/Status color')}
                  >
                    Active Status
                  </span>
                </div>

                <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-ghost)', margin: 'var(--sp-5) 0 10px' }}>
                  Footer
                </div>
                <div style={{
                  background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', padding: 'var(--sp-4)',
                  textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)',
                }}>
                  <div>© 2026 {brandName || 'TrackBells'}</div>
                  <div style={{ marginTop: 4, fontWeight: 600, color: themeColor }}>
                    {footerText || 'Powered by Cyberbells ITES services pvt ltd'}
                  </div>
                </div>
              </Surface>
            </Section>
          </div>
        )}

        {/* TAB: SIDEBAR & MENU CONFIGURATOR */}
        {activeTab === 'menus' && (
          <Section
            title="App Navigation Configuration"
            actions={
              <>
                <Button variant="secondary" icon={<LuRotateCcw />} onClick={handleResetDefaults}>
                  Reset Defaults
                </Button>
                <Button variant="primary" icon={<LuSave />} onClick={handleSaveConfig} disabled={saving}>
                  {saving ? 'Saving…' : 'Apply Sidebar Settings'}
                </Button>
              </>
            }
          >
            <Surface style={{ marginBottom: 'var(--sp-4)' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
                Rename menus, show/hide them globally, and configure which teams see which links.
              </p>
            </Surface>

            <DataTable
              columns={menuColumns}
              rows={menus}
              rowKey={(m) => m.key}
              paginate={false}
              empty={<EmptyState icon={<LuLayoutList />} title="No menus configured" text="Reset to defaults to restore the standard navigation." />}
            />
          </Section>
        )}
      </Page>
    </DashboardLayout>
  );
};

export default SettingsDashboard;
