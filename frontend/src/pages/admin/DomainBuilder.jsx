import React, { useState, useEffect } from 'react';
import {
  LuDatabase, LuX, LuPlus, LuTrash2,
  LuSave, LuBuilding2, LuShieldCheck, LuLock, LuChevronDown, LuChevronRight,
} from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getSubIndustryOptions, getIndustryConfig } from '../../config/industryConfig';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useOrg } from '../../context/OrgContext';
import { useAuth } from '../../context/AuthContext';
import {
  Page, PageHeader, Surface, FormGrid, Field, Input, Select, Checkbox,
  Button, Badge, EmptyState,
} from '../../components/ui';

const DomainBuilder = () => {
  const { user } = useAuth();
  const { settings } = useOrg();
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  // Check if current user is platform super admin
  const isPlatformSuperAdmin = (user?.role === 'super_admin') || (user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL);
  const orgName = settings?.name || settings?.brandName || user?.organizationId?.name || 'Current Organization';
  const orgSubIndustryId = settings?.subIndustryId || user?.organizationId?.subIndustryId || 'drag_chain';

  const SUB_MODULES_MAP = {
    gateGuard: [
      { key: 'gateGuardFields', label: 'Log Inward Material' }
    ],
    storeManager: [
      { key: 'inventoryFields', label: 'Unified Inventory' },
      { key: 'dispatchFields', label: 'Dispatch & Shipping' },
      { key: 'sbsLogsFields', label: 'Shortage, Buy & Sales' },
      { key: 'qcVerificationFields', label: 'Quality Logs Verification' },
      { key: 'assignmentFields', label: 'Task Assignment' }
    ],
    supervisor: [
      { key: 'machineAutomationFields', label: 'Machine Automation' },
      { key: 'buildQueueFields', label: 'Product Build Queue' },
      { key: 'assignedTasksFields', label: 'Assigned Tasks' }
    ],
    qualityChecker: [
      { key: 'qualityFields', label: 'Quality Inspection' }
    ],
    sales: [
      { key: 'salesFields', label: 'Sales & Orders' }
    ]
  };

  // Create dynamic nested modules from actual menus, ignoring admin/setting ones
  const modules = (settings?.menus || [])
    .filter(m => !['users', 'organizations', 'settings'].includes(m.key))
    .map(m => ({
      key: m.key,
      label: m.label,
      subModules: SUB_MODULES_MAP[m.key] || [{ key: `${m.key}Fields`, label: m.label + ' Form' }]
    }));

  const initialModule = modules.length > 0 && modules[0].subModules.length > 0 ? { parent: modules[0].label, ...modules[0].subModules[0] } : null;

  const [activeModule, setActiveModule] = useState(initialModule);
  const [expandedMenu, setExpandedMenu] = useState(modules.length > 0 ? modules[0].key : '');
  const [schemaFields, setSchemaFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const allOptions = getSubIndustryOptions();

    if (isPlatformSuperAdmin) {
      // Platform Admin / Super Admin: Show all SaaS industries and domain templates
      setIndustries(allOptions);
    } else {
      // Organization Admin: Strictly show ONLY their own organization domain
      const myConfig = getIndustryConfig(orgSubIndustryId);
      const myIndustry = allOptions.find(ind => ind.id === orgSubIndustryId) || {
        id: orgSubIndustryId,
        label: settings?.subIndustry || myConfig?.label || 'Drag Chain',
        color: myConfig?.color || 'var(--c-orange)'
      };

      setIndustries([{
        ...myIndustry,
        label: `${orgName} (${myIndustry.label})`,
        rawLabel: myIndustry.label,
        orgName: orgName,
        isOrgSpecific: true
      }]);
    }
  }, [isPlatformSuperAdmin, orgSubIndustryId, orgName, settings]);

  const openIndustry = async (industry) => {
    setSelectedIndustry(industry);
    const initialMod = modules.length > 0 && modules[0].subModules.length > 0 ? { parent: modules[0].label, ...modules[0].subModules[0] } : null;
    setActiveModule(initialMod);
    if (modules.length > 0) setExpandedMenu(modules[0].key);
    if (initialMod) {
      await fetchSchema(industry.id, initialMod.key);
    }
  };

  const closeIndustry = () => {
    setSelectedIndustry(null);
    setSchemaFields([]);
  };

  const fetchSchema = async (industryId, moduleKey) => {
    setLoading(true);
    try {
      const res = await api.get(`/domain/schema/${industryId}`);
      // Find the specific module schema
      const moduleSchema = (res.data || []).find(s => s.moduleKey === moduleKey);
      if (moduleSchema) {
        setSchemaFields(moduleSchema.fields || []);
      } else {
        setSchemaFields([]);
      }
    } catch (error) {
      toast.error('Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = async (parentModule, subModule) => {
    setActiveModule({ parent: parentModule.label, ...subModule });
    if (selectedIndustry) {
      await fetchSchema(selectedIndustry.id, subModule.key);
    }
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenu(expandedMenu === menuKey ? '' : menuKey);
  };

  const handleAddField = () => {
    const newField = {
      key: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      placeholder: '',
      required: false,
      options: []
    };
    setSchemaFields([...schemaFields, newField]);
  };

  const handleRemoveField = (index) => {
    const updated = [...schemaFields];
    updated.splice(index, 1);
    setSchemaFields(updated);
  };

  const handleFieldChange = (index, key, value) => {
    const updated = [...schemaFields];
    updated[index][key] = value;
    setSchemaFields(updated);
  };

  const handleSaveSchema = async () => {
    if (!selectedIndustry || !activeModule) return;
    setSaving(true);
    try {
      // Clean up options if not select
      const cleanedFields = schemaFields.map(f => {
        if (f.type !== 'select' && f.type !== 'radio') {
          return { ...f, options: [] };
        }
        // Ensure options is an array
        let opts = f.options;
        if (typeof opts === 'string') {
          opts = opts.split(',').map(s => s.trim()).filter(s => s);
        }
        return { ...f, options: opts };
      });

      const moduleKey = activeModule.key || 'generalFields';
      await api.put(`/domain/schema/${selectedIndustry.id}/${moduleKey}`, { fields: cleanedFields });
      setSchemaFields(cleanedFields);
      toast.success(`Schema for ${activeModule.label} saved successfully!`);
    } catch (error) {
      toast.error('Failed to save schema');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------ industries */
  const industryPicker = (
    <>
      <PageHeader
        title={isPlatformSuperAdmin ? 'Global Domain Builder' : `Domain Builder — ${orgName}`}
        subtitle={
          isPlatformSuperAdmin
            ? 'Super Admin View: Select any industry to customize global default form schemas across all SaaS organizations.'
            : `Organization Admin View: Customize form structures and custom fields exclusively for ${orgName}.`
        }
        actions={
          isPlatformSuperAdmin ? (
            <Badge tone="info" icon={<LuShieldCheck />}>
              All Tenants Visible
            </Badge>
          ) : (
            <Badge tone="success" icon={<LuLock />}>
              Isolated Tenant Scope
            </Badge>
          )
        }
      />

      {/* Notice banner for Org Admin */}
      {!isPlatformSuperAdmin && (
        <Surface
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            marginBottom: 20,
            background: 'color-mix(in srgb, var(--primary) 7%, var(--bg-card))',
            borderColor: 'color-mix(in srgb, var(--primary) 26%, transparent)',
          }}
        >
          <LuBuilding2 style={{ fontSize: '1.3rem', color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-secondary)', lineHeight: 1.6, minWidth: 0 }}>
            You are viewing the custom domain for <strong style={{ color: 'var(--text-primary)' }}>{orgName}</strong> ({settings?.subIndustry || 'Drag Chain'}). Changes made here apply only to forms within your organization.
          </div>
        </Surface>
      )}

      {/* Industry / Organization Cards Grid */}
      {industries.length === 0 ? (
        <Surface style={{ padding: '48px 20px' }}>
          <EmptyState
            icon={<LuDatabase />}
            title="No domains available"
            text="No industry domain is configured for this account yet."
          />
        </Surface>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
          gap: 16,
        }}>
          {industries.map(ind => (
            <div
              key={ind.id}
              onClick={() => openIndustry(ind)}
              style={{ cursor: 'pointer', minWidth: 0 }}
            >
              <Surface
                style={{
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  minWidth: 0,
                  borderColor: ind.isOrgSpecific
                    ? `color-mix(in srgb, ${ind.color || 'var(--primary)'} 55%, transparent)`
                    : 'var(--border)',
                }}
              >
                <span style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: `color-mix(in srgb, ${ind.color} 13%, transparent)`,
                  color: ind.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}>
                  {ind.isOrgSpecific ? <LuBuilding2 /> : <LuDatabase />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--fs-md)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ind.label}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Domain ID: {ind.id}</span>
                    {ind.isOrgSpecific && (
                      <span style={{
                        fontSize: 'var(--fs-2xs)',
                        background: `color-mix(in srgb, ${ind.color} 15%, transparent)`,
                        color: ind.color,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                      }}>
                        Your Org
                      </span>
                    )}
                  </div>
                </div>
              </Surface>
            </div>
          ))}
        </div>
      )}
    </>
  );

  /* --------------------------------------------------------------- builder */
  const accent = selectedIndustry?.color || 'var(--primary)';

  const builder = selectedIndustry && (
    <>
      <PageHeader
        title={`${selectedIndustry.label} Builder`}
        subtitle="Custom Object Schema Configuration & Form Builder"
        actions={
          <>
            {!isPlatformSuperAdmin && (
              <Badge tone="success" icon={<LuLock />}>Org Scope</Badge>
            )}
            <Button
              variant="secondary"
              icon={<LuX />}
              title="Back to Industry / Org Selection"
              aria-label="Back to Industry / Org Selection"
              onClick={closeIndustry}
            />
          </>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Sidebar Modules */}
        <Surface style={{ flex: '1 1 240px', minWidth: 0, padding: 16, alignSelf: 'stretch' }}>
          <h4 style={{
            margin: '0 0 12px',
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-2xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Available Modules
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {modules.map(m => (
              <div key={m.key} style={{ minWidth: 0 }}>
                <button
                  onClick={() => toggleMenu(m.key)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    fontSize: 'var(--fs-base)',
                    fontWeight: 600,
                    background: expandedMenu === m.key ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
                    color: expandedMenu === m.key ? accent : 'var(--text-primary)',
                    borderLeft: expandedMenu === m.key ? `3px solid ${accent}` : '3px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
                  <span style={{ display: 'inline-flex', flexShrink: 0, opacity: 0.7 }}>
                    {expandedMenu === m.key ? <LuChevronDown /> : <LuChevronRight />}
                  </span>
                </button>
                {expandedMenu === m.key && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 16, marginTop: 4, gap: 2 }}>
                    {m.subModules.map(sub => (
                      <button
                        key={sub.key}
                        onClick={() => handleModuleChange(m, sub)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'inherit',
                          fontSize: 'var(--fs-sm)',
                          background: activeModule?.key === sub.key ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
                          color: activeModule?.key === sub.key ? accent : 'var(--text-secondary)',
                          fontWeight: activeModule?.key === sub.key ? 600 : 500,
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Surface>

        {/* Builder Area */}
        <Surface style={{ flex: '999 1 420px', minWidth: 0, padding: 20 }}>
          <div className="section-head" style={{ flexWrap: 'wrap' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
              {activeModule ? (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{activeModule.parent}</span>
                  <span style={{ color: 'var(--text-ghost)' }}>/</span>
                  <span>{activeModule.label}</span>
                </>
              ) : 'Form Fields Configuration'}
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" icon={<LuPlus />} onClick={handleAddField}>
                Add New Field
              </Button>
              <Button variant="primary" icon={<LuSave />} onClick={handleSaveSchema} loading={saving}>
                {saving ? 'Saving...' : 'Save Schema'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 'var(--fs-base)' }}>
              Loading Schema...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {schemaFields.length === 0 ? (
                <div style={{
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 16px',
                }}>
                  <EmptyState
                    icon={<LuDatabase />}
                    title="No custom fields yet"
                    text='No custom fields configured for this module yet. Click "Add New Field" to build your custom form.'
                    action={
                      <Button variant="primary" icon={<LuPlus />} onClick={handleAddField}>
                        Add New Field
                      </Button>
                    }
                  />
                </div>
              ) : (
                schemaFields.map((field, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 16,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: '999 1 300px', minWidth: 0 }}>
                      <FormGrid>
                        <Field label="Display Label" required>
                          <Input
                            value={field.label}
                            onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                            placeholder="e.g. Model Number"
                          />
                        </Field>

                        <Field label="Data Key (Unique)" required>
                          <Input
                            value={field.key}
                            onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                            placeholder="e.g. modelNumber"
                          />
                        </Field>

                        <Field label="Field Type" required>
                          <Select value={field.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value)}>
                            <option value="text">Short Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown (Select)</option>
                            <option value="radio">Radio Buttons</option>
                            <option value="checkbox">Checkbox</option>
                          </Select>
                        </Field>

                        <Field label="Placeholder text">
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                            placeholder="e.g. Enter value..."
                            disabled={field.type === 'checkbox' || field.type === 'radio'}
                          />
                        </Field>

                        {(field.type === 'select' || field.type === 'radio') && (
                          <Field label="Options (Comma separated)" span="all">
                            <Input
                              value={Array.isArray(field.options) ? field.options.join(', ') : field.options}
                              onChange={(e) => handleFieldChange(index, 'options', e.target.value)}
                              placeholder="e.g. Option 1, Option 2, Option 3"
                            />
                          </Field>
                        )}
                      </FormGrid>
                    </div>

                    <div style={{
                      flex: '1 1 140px',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      paddingTop: 24,
                    }}>
                      <Checkbox
                        label="Required"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<LuTrash2 />}
                        onClick={() => handleRemoveField(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Surface>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <Page>
        {!selectedIndustry ? industryPicker : builder}
      </Page>
    </DashboardLayout>
  );
};

export default DomainBuilder;
