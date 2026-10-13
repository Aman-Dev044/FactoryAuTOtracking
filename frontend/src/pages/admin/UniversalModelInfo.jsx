import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import toast from 'react-hot-toast';
import {
  LuPencil, LuTrash2, LuPlus, LuRefreshCw, LuDatabase,
  LuPackage, LuWarehouse, LuListFilter,
} from 'react-icons/lu';
import {
  Page, PageHeader, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Drawer, Dialog, Field, Input, Select,
  Button, Badge, EmptyState, Pager,
} from '../../components/ui';

const BLANK_ROW = {
  modelNumber: '', pitch: '', ratePerMeter: '', innerSize: '', radius: '',
  designType: 'OP', linksPerMeter: '', description: '',
  hs: 'N/A', vs: 'N/A', sr: 'N/A', outerSize: '',
  unit: 'pcs', name: 'Nylon Drag Chain', type: 'finished_good',
  warehouseLocation: 'N/A', almirahCatalog: 'N/A', rackShelfCatalog: 'N/A'
};

/** Columns drive the grid, the add dialog and the edit drawer alike. */
const COLUMNS = [
  { key: 'modelNumber',   label: 'Model No.',            width: '150px', primary: true },
  { key: 'pitch',         label: 'Pitch (mm)',           width: '110px', align: 'right' },
  { key: 'ratePerMeter',  label: 'Rate / M (₹)',         width: '120px', align: 'right' },
  { key: 'linksPerMeter', label: 'NO. OF LINKS / METER', width: '150px', align: 'right', hideBelow: 640 },
  { key: 'innerSize',     label: 'Inner width',          width: '120px' },
  { key: 'radius',        label: 'Bending Radius',       width: '130px', hideBelow: 640 },
  { key: 'designType',    label: 'Open/Close/Semi close', width: '170px' },
  { key: 'description',   label: 'Description',          width: '220px', hideBelow: 640 },
  { key: 'warehouseLocation', label: 'Warehouse Locations', width: '180px', hideBelow: 640 },
  { key: 'almirahCatalog', label: 'Almirah / Cupboards Catalog', width: '200px', hideBelow: 640 },
  { key: 'rackShelfCatalog', label: 'Rack / Shelf (S.No) Catalog', width: '200px', hideBelow: 640 },
];

const DESIGN_TONES = { OP: 'info', CP: 'success', SM: 'warning' };

const Dash = () => <span style={{ color: 'var(--text-ghost)' }}>—</span>;

const SendToInventoryModal = ({ template, onClose, onConfirm }) => {
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirm(template._id, { quantity: qty, unitPrice: price });
      onClose();
    } catch {
      // error already toasted
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Send to Store Inventory"
      subtitle={`${template.modelNumber} · ${template.innerSize || '—'} | ${template.radius || '—'}`}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="success" onClick={handleSend} loading={sending} icon={<LuPackage />}>
            {sending ? 'Sending...' : 'Confirm & Add to Stock'}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-base)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Adding <strong style={{ color: 'var(--primary)' }}>{template.modelNumber}</strong>{' '}
        ({template.innerSize || '—'} | {template.radius || '—'}) to Store Inventory.
      </p>
      <FormGrid>
        <Field label="Quantity">
          <Input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Unit Price (₹)">
          <Input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} />
        </Field>
      </FormGrid>
    </Dialog>
  );
};

export default function UniversalModelInfo() {
  const { user } = useAuth();
  const { settings } = useOrg();
  const subIndustryId = user?.organizationId?.subIndustryId || 'drag_chain';
  const isDragChain = subIndustryId === 'drag_chain';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState(BLANK_ROW);
  const [addingSaving, setAddingSaving] = useState(false);
  const [sendModal, setSendModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(t =>
      (t.modelNumber && t.modelNumber.toLowerCase().includes(q)) ||
      (t.innerSize && t.innerSize.toLowerCase().includes(q)) ||
      (t.radius && t.radius.toLowerCase().includes(q)) ||
      (t.designType && t.designType.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.warehouseLocation && t.warehouseLocation.toLowerCase().includes(q)) ||
      (t.almirahCatalog && t.almirahCatalog.toLowerCase().includes(q)) ||
      (t.rackShelfCatalog && t.rackShelfCatalog.toLowerCase().includes(q))
    );
  }, [templates, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationsAPI.getProductTemplates();
      setTemplates(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load model catalogue');
    } finally {
      setLoading(false);
    }
  }, []);

  // Without this the catalogue never loaded: `loading` started true and only a
  // manual Refresh (or a save) ever cleared it, so the grid sat on skeletons.
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);


  const startEdit = (t) => { setEditingId(t._id); setEditForm({ ...t }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await operationsAPI.updateProductTemplate(editingId, editForm);
      toast.success('Model updated successfully');
      setEditingId(null);
      await fetchTemplates();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this model entry permanently?')) return;
    setDeletingId(id);
    try {
      await operationsAPI.deleteProductTemplate(id);
      toast.success('Model deleted');
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddRow = async () => {
    if (!newRow.modelNumber.trim()) { toast.error('Model Number is required'); return; }
    setAddingSaving(true);
    try {
      await operationsAPI.createProductTemplate(newRow);
      toast.success('New model added');
      setShowAddRow(false);
      setNewRow({ ...BLANK_ROW });
      await fetchTemplates();
    } catch {
      toast.error('Failed to add model');
    } finally {
      setAddingSaving(false);
    }
  };

  const handleSendToInventory = async (id, data) => {
    await operationsAPI.sendTemplateToInventory(id, data);
    toast.success('Sent to Store Inventory!');
  };

  /* --------------------------------------------------- shared form control */
  /** One control per column, reused by the add dialog and the edit drawer. */
  const renderControl = (col, value, set, withNA) => {
    if (col.key === 'designType') {
      return (
        <Select value={value} onChange={e => set(e.target.value)}>
          <option value="OP">OP (Open)</option>
          <option value="CP">CP (Closed)</option>
          <option value="SM">SM (Semi)</option>
          {withNA && <option value="N/A">N/A</option>}
        </Select>
      );
    }
    if (col.key === 'warehouseLocation') {
      return (
        <Select value={value || 'N/A'} onChange={e => set(e.target.value)}>
          <option value="N/A">N/A</option>
          {(settings?.warehouses || []).map(w => <option key={w} value={w}>{w}</option>)}
        </Select>
      );
    }
    if (col.key === 'almirahCatalog') {
      return (
        <Select value={value || 'N/A'} onChange={e => set(e.target.value)}>
          <option value="N/A">N/A</option>
          {(settings?.almirahs || []).map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
      );
    }
    if (col.key === 'rackShelfCatalog') {
      return (
        <Select value={value || 'N/A'} onChange={e => set(e.target.value)}>
          <option value="N/A">N/A</option>
          {(settings?.racks || []).map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      );
    }
    return (
      <Input value={value || ''} placeholder={col.label} onChange={e => set(e.target.value)} />
    );
  };

  /* ----------------------------------------------------------- grid schema */
  const pageStart = (page - 1) * ITEMS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const rows = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const gridColumns = [
    {
      key: '_index',
      header: '#',
      width: '52px',
      sortable: false,
      hideBelow: 900,
      render: (_row, i) => (
        <span style={{ color: 'var(--text-ghost)', fontSize: 'var(--fs-xs)' }}>{pageStart + i + 1}</span>
      ),
    },
    ...COLUMNS.map(col => ({
      key: col.key,
      header: col.label,
      width: col.width,
      align: col.align,
      primary: col.primary,
      hideBelow: col.hideBelow,
      sortable: false,
      render: (t) => {
        if (col.key === 'modelNumber') {
          return t.modelNumber
            ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700 }}>{t.modelNumber}</span>
            : <Dash />;
        }
        if (col.key === 'designType') {
          return t.designType
            ? <Badge tone={DESIGN_TONES[t.designType] || 'neutral'}>{t.designType}</Badge>
            : <Dash />;
        }
        return t[col.key] || <Dash />;
      },
    })),
    {
      key: '_actions',
      header: 'Actions',
      width: '230px',
      sortable: false,
      render: (t) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="xs"
            icon={<LuPencil />}
            title="Edit"
            aria-label="Edit model"
            onClick={() => startEdit(t)}
          />
          <Button
            variant="danger"
            size="xs"
            icon={<LuTrash2 />}
            title="Delete"
            aria-label="Delete model"
            disabled={deletingId === t._id}
            onClick={() => handleDelete(t._id)}
          />
          <Button
            variant="success"
            size="xs"
            icon={<LuPackage />}
            title="Send to Store Inventory"
            onClick={() => setSendModal(t)}
          >
            Send to Inventory
          </Button>
        </div>
      ),
    },
  ];

  if (!isDragChain) {
    return (
      <DashboardLayout>
        <Page>
          <Surface style={{ padding: 'clamp(32px, 8vw, 72px) 20px' }}>
            <EmptyState
              icon={<LuDatabase />}
              title="Universal Model Info unavailable"
              text="Universal Model Info is only available for Drag Chain organizations."
            />
          </Surface>
        </Page>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {sendModal && (
        <SendToInventoryModal
          template={sendModal}
          onClose={() => setSendModal(null)}
          onConfirm={handleSendToInventory}
        />
      )}

      <Page>
        <PageHeader
          title="Universal Model Info"
          subtitle="Complete drag chain model catalogue — edit, delete, or push directly to Store Inventory."
          actions={
            <>
              <Button
                variant="secondary"
                icon={<LuRefreshCw />}
                title="Refresh"
                aria-label="Refresh catalogue"
                onClick={fetchTemplates}
              />
              <Button
                variant="primary"
                icon={<LuPlus />}
                onClick={() => { setShowAddRow(true); setNewRow({ ...BLANK_ROW }); }}
              >
                Add Model
              </Button>
            </>
          }
        />

        <StatRow>
          <StatTile label="Model Entries" value={templates.length} icon={<LuDatabase />} tone="blue" />
          <StatTile label="Matching Filter" value={filtered.length} icon={<LuListFilter />} tone="violet" />
          <StatTile
            label="Warehouse Locations"
            value={(settings?.warehouses || []).length}
            icon={<LuWarehouse />}
            tone="teal"
          />
        </StatRow>

        <Toolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by model no., size, radius, VS, HS, SR…"
          />
          <ToolbarSpacer />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={gridColumns}
          rows={rows}
          loading={loading}
          paginate={false}
          empty={
            <EmptyState
              icon={<LuDatabase />}
              title="No models found"
              text='Click "Add Model" to get started.'
              action={
                <Button
                  variant="primary"
                  icon={<LuPlus />}
                  onClick={() => { setShowAddRow(true); setNewRow({ ...BLANK_ROW }); }}
                >
                  Add Model
                </Button>
              }
            />
          }
        />

        {!loading && filtered.length > 0 && (
          <div
            className="grid-foot"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginTop: 'var(--sp-3)',
            }}
          >
            <span>
              Total: <strong style={{ color: 'var(--text-primary)' }}>{templates.length}</strong> model entries
              {search && <span> (Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> results for "{search}")</span>}
            </span>
            <Pager page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        )}

        {/* ===== ADD MODEL ===== */}
        <Dialog
          open={showAddRow}
          onClose={() => setShowAddRow(false)}
          size="lg"
          title="Add Model"
          subtitle="A new entry in the drag chain model catalogue."
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowAddRow(false)} disabled={addingSaving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddRow} loading={addingSaving}>
                {addingSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          }
        >
          <FormGrid>
            {COLUMNS.map(col => (
              <Field
                key={col.key}
                label={col.label}
                required={col.key === 'modelNumber'}
                span={col.key === 'description' ? 'all' : undefined}
              >
                {renderControl(
                  col,
                  newRow[col.key],
                  (v) => setNewRow(p => ({ ...p, [col.key]: v })),
                  false
                )}
              </Field>
            ))}
          </FormGrid>
        </Dialog>

        {/* ===== EDIT MODEL ===== */}
        <Drawer
          open={!!editingId}
          onClose={cancelEdit}
          wide
          title={editForm.modelNumber || 'Edit Model'}
          subtitle="Update the catalogue entry and save your changes."
          footer={
            <>
              <Button variant="cancel" onClick={cancelEdit} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit} loading={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          }
        >
          <FormGrid>
            {COLUMNS.map(col => (
              <Field
                key={col.key}
                label={col.label}
                span={col.key === 'description' ? 'all' : undefined}
              >
                {renderControl(
                  col,
                  editForm[col.key] || '',
                  (v) => setEditForm(p => ({ ...p, [col.key]: v })),
                  true
                )}
              </Field>
            ))}
          </FormGrid>
        </Drawer>
      </Page>
    </DashboardLayout>
  );
}
