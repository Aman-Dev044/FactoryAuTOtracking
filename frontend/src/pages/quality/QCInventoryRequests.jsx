import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import {
  LuClipboardCheck, LuCheck, LuX, LuRefreshCw,
  LuMessagesSquare, LuClock, LuPackage, LuMapPin, LuCircleCheck, LuCircleX,
  LuEye,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, DensitySwitch,
  DataTable, Dialog, Drawer, Tabs,
  Field, Input, Select, Textarea,
  Button, Badge, EmptyState,
} from '../../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

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

const QCInventoryRequests = () => {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [qcFilter, setQcFilter] = useState('pending'); // 'pending', 'completed'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // QC Decision Modal
  const [showDecideModal, setShowDecideModal] = useState(false);
  const [qcAction, setQcAction] = useState('approve'); // 'approve', 'reject'
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [approvedQuantity, setApprovedQuantity] = useState('');
  const [approvedUnit, setApprovedUnit] = useState('kg');

  // Presentation-only: record detail overlay (prose lives here, not in a column)
  const [detailItem, setDetailItem] = useState(null);

  const fetchQCRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationsAPI.getInventory();
      setAllItems(res.data.data);
    } catch (err) {
      toast.error('Failed to load QC requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const requests = allItems.filter(item => {
    if (qcFilter === 'pending') {
      return item.qualityStatus === 'sent_for_qc';
    } else {
      return ['verified', 'rejected'].includes(item.qualityStatus);
    }
  });

  useEffect(() => {
    fetchQCRequests();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('inventory_updated', fetchQCRequests);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchQCRequests, user?.organizationId]);

  const openDecideModal = (item, action) => {
    setSelectedItem(item);
    setQcAction(action);
    setRemarks(action === 'approve' ? 'Quality check passed. Item verified.' : '');
    setApprovedQuantity(Math.floor(item.quantity));
    setApprovedUnit(item.unit || 'kg');
    setShowDecideModal(true);
  };

  const handleLogDecision = async (e) => {
    e.preventDefault();
    if (qcAction === 'reject' && !remarks.trim()) {
      toast.error('Please enter discrepancy remarks for rejection');
      return;
    }

    if (qcAction === 'approve') {
      const appQty = Number(approvedQuantity);
      if (isNaN(appQty) || appQty <= 0) {
        toast.error('Please specify a valid approved product quantity');
        return;
      }
      if (!Number.isInteger(appQty)) {
        toast.error('Approved product quantity must be a whole number (no decimals)');
        return;
      }
      if (appQty > selectedItem.quantity) {
        toast.error(`Approved product quantity cannot exceed the original quantity (${selectedItem.quantity})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const isApproved = qcAction === 'approve';
      const payload = {
        qualityStatus: isApproved ? 'verified' : 'rejected',
        qcRemarks: remarks.trim() || (isApproved ? 'Quality check passed. Item verified.' : 'Rejected.')
      };

      if (isApproved) {
        payload.quantity = Number(approvedQuantity);
        payload.unit = approvedUnit;
      }

      await operationsAPI.updateInventoryItem(selectedItem._id, payload);

      if (isApproved) {
        toast.success(`QC Approved: "${selectedItem.name}" is now marked verified!`);
      } else {
        toast.error(`QC Rejected: "${selectedItem.name}" has been flagged.`);
      }
      setShowDecideModal(false);
      fetchQCRequests();
    } catch (err) {
      toast.error('Failed to log quality check decision');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = requests.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase())
  );

  /* ------------------------------------------------------------- counters */
  const pendingCount = allItems.filter(i => i.qualityStatus === 'sent_for_qc').length;
  const passedCount = allItems.filter(i => i.qualityStatus === 'verified').length;
  const rejectedCount = allItems.filter(i => i.qualityStatus === 'rejected').length;
  const historyCount = passedCount + rejectedCount;

  /* --------------------------------------------------------------- columns */
  const sharedColumns = [
    {
      key: 'name',
      header: 'Item / Material',
      primary: true,
      render: (item) => item.name,
    },
    {
      key: 'type',
      header: 'Stock Type',
      hideBelow: 900,
      render: (item) => (
        <Badge>{(item.type || '').replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Billed Qty',
      align: 'right',
      sortValue: (item) => Number(item.quantity) || 0,
      render: (item) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {item.quantity}{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{item.unit}</span>
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      hideBelow: 768,
      render: (item) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
          <LuMapPin style={{ color: 'var(--text-ghost)' }} /> {item.location}
        </span>
      ),
    },
    {
      key: 'specs',
      header: 'Specifications',
      clamp: true,
      hideBelow: 1100,
      sortValue: (item) => item.size || item.description || '',
      render: (item) => (
        <span style={{ color: 'var(--text-muted)' }}>
          {item.size || item.description || 'Standard Specs'}
        </span>
      ),
    },
  ];

  const pendingColumns = [
    ...sharedColumns,
    {
      key: 'qcRequestedAt',
      header: 'Requested',
      hideBelow: 1280,
      render: (item) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
          <LuClock /> {formatDate(item.qcRequestedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'QC Actions',
      sortable: false,
      align: 'right',
      render: (item) => (
        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {/* Clamped cells hide their tail — this opens the full record. */}
          <Button
            size="xs"
            variant="ghost"
            icon={<LuEye />}
            title="View full details"
            onClick={() => setDetailItem(item)}
          >
            View
          </Button>
          <Button
            size="sm"
            icon={<LuCheck />}
            title="Approve Quality (Verify)"
            onClick={() => openDecideModal(item, 'approve')}
            style={{
              minHeight: 36,
              color: 'var(--success)',
              borderColor: 'color-mix(in srgb, var(--success) 35%, transparent)',
              background: 'var(--success-soft)',
            }}
          >
            Verify
          </Button>
          <Button
            size="sm"
            icon={<LuX />}
            title="Reject / Flag Issues"
            onClick={() => openDecideModal(item, 'reject')}
            style={{
              minHeight: 36,
              color: 'var(--danger)',
              borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)',
              background: 'var(--danger-soft)',
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const completedColumns = [
    ...sharedColumns,
    {
      key: 'qualityStatus',
      header: 'QC Status',
      render: (item) => (
        <Badge
          tone={item.qualityStatus === 'verified' ? 'success' : 'danger'}
          icon={item.qualityStatus === 'verified' ? <LuCircleCheck /> : <LuCircleX />}
        >
          {item.qualityStatus === 'verified' ? 'Passed' : 'Rejected'}
        </Badge>
      ),
    },
    /* QC remarks are free prose of any length, so they are not a grid column —
       they live in the record's detail view, behind the row's View action. */
    {
      key: 'updatedAt',
      header: 'Audit Date',
      hideBelow: 1280,
      render: (item) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
          <LuClock /> {formatDate(item.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
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

  const isApprove = qcAction === 'approve';

  return (
    <DashboardLayout pageTitle="QC Inventory Requests">
      <Page>
        <PageHeader
          title="QC Audit Inspections Queue"
          subtitle="Verify newly arrived or manufactured inventory items flagged by Store Managers."
          actions={
            <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchQCRequests}>
              Refresh List
            </Button>
          }
        />

        <StatRow>
          <StatTile label="Awaiting QC" value={pendingCount} icon={<LuClipboardCheck />} tone="amber" />
          <StatTile label="Passed" value={passedCount} icon={<LuCircleCheck />} tone="green" />
          <StatTile label="Rejected" value={rejectedCount} icon={<LuCircleX />} tone="red" />
          <StatTile label="Items Tracked" value={allItems.length} icon={<LuPackage />} tone="blue" />
        </StatRow>

        <Tabs
          value={qcFilter}
          onChange={setQcFilter}
          items={[
            { key: 'pending', label: 'Pending Verification', icon: <LuClipboardCheck />, count: pendingCount },
            { key: 'completed', label: 'Inspection History', icon: <LuCircleCheck />, count: historyCount },
          ]}
        />

        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search by item name or location…"
            onChange={setSearch}
          />
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        <DataTable
          columns={qcFilter === 'pending' ? pendingColumns : completedColumns}
          rows={filteredRequests}
          loading={loading}
          pageSize={15}
          empty={
            <EmptyState
              icon={<LuClipboardCheck />}
              title={qcFilter === 'pending' ? 'No Pending QC Requests' : 'No Inspection History'}
              text={
                qcFilter === 'pending'
                  ? 'All materials and items are currently verified.'
                  : 'Items verified or rejected by you will appear here.'
              }
            />
          }
        />

        {/* ===== INSPECTION RECORD DETAIL DRAWER ===== */}
        <Drawer
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={detailItem?.name || 'Inspection Record'}
          subtitle={detailItem?.modelNumber || undefined}
          footer={<Button variant="cancel" onClick={() => setDetailItem(null)}>Close</Button>}
        >
          {detailItem && (
            <>
              <DescList
                items={[
                  { label: 'Stock Type', value: <Badge>{(detailItem.type || '').replace('_', ' ')}</Badge> },
                  { label: 'Billed Qty', value: `${detailItem.quantity ?? 0} ${detailItem.unit || ''}` },
                  { label: 'Maintained Qty', value: detailItem.minStock || detailItem.maintainedQuantity ? `${detailItem.minStock || detailItem.maintainedQuantity} ${detailItem.unit || ''}` : '' },
                  { label: 'Unit Price', value: detailItem.unitPrice || '' },
                  { label: 'Location', value: detailItem.location },
                  { label: 'Warehouse', value: detailItem.warehouseLocation },
                  { label: 'Almirah', value: detailItem.almirah },
                  { label: 'Rack / Shelf', value: detailItem.rack },
                  { label: 'Size', value: detailItem.size },
                  { label: 'Series', value: detailItem.series },
                  { label: 'Design Type', value: detailItem.designType },
                  { label: 'Radius', value: detailItem.radius },
                  { label: 'VS', value: detailItem.vs },
                  { label: 'HS', value: detailItem.hs },
                  { label: 'SR', value: detailItem.sr },
                  { label: 'QC Status', value: humanStatus(detailItem.qualityStatus) },
                  { label: 'QC Requested', value: detailItem.qcRequestedAt ? new Date(detailItem.qcRequestedAt).toLocaleString() : '' },
                  { label: 'Production Status', value: humanStatus(detailItem.productionStatus) },
                  { label: 'Assigned Supervisor', value: detailItem.assignedSupervisor },
                  { label: 'Added On', value: detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString() : '' },
                  { label: 'Audit Date', value: detailItem.updatedAt ? new Date(detailItem.updatedAt).toLocaleString() : '' },
                ]}
              />

              {/* Prose lives here rather than in the grid, so it can be read in
                  full instead of being clamped into a column. */}
              <NoteBlock label="QC Remarks" text={detailItem.qcRemarks} />
              <NoteBlock label="Store Remark" text={detailItem.storeRemarks} />
              <NoteBlock label="PM Remark" text={detailItem.pmRemarks} />
              <NoteBlock label="Specifications" text={detailItem.description} />
            </>
          )}
        </Drawer>

        {/* ===== QC DECISION DIALOG ===== */}
        <Dialog
          open={showDecideModal && !!selectedItem}
          onClose={() => setShowDecideModal(false)}
          title={isApprove ? 'QC Verification & Approval' : 'QC Rejection & Remarks'}
          subtitle={selectedItem ? selectedItem.name : undefined}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowDecideModal(false)}>Cancel</Button>
              <Button
                variant={isApprove ? 'success' : 'danger'}
                form="qc-decision-form"
                type="submit"
                loading={submitting}
                icon={isApprove ? <LuCheck /> : <LuX />}
              >
                {isApprove
                  ? (submitting ? 'Verifying...' : 'Confirm QC Verification')
                  : (submitting ? 'Rejecting...' : 'Confirm QC Rejection')}
              </Button>
            </>
          }
        >
          {selectedItem && (
            <form id="qc-decision-form" onSubmit={handleLogDecision}>
              <div
                style={{
                  background: isApprove
                    ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                    : 'color-mix(in srgb, var(--danger) 8%, transparent)',
                  border: `1px solid ${isApprove
                    ? 'color-mix(in srgb, var(--success) 22%, transparent)'
                    : 'color-mix(in srgb, var(--danger) 22%, transparent)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: 'var(--sp-5)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <span style={{ color: isApprove ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem', display: 'flex' }}>
                  {isApprove ? <LuCircleCheck /> : <LuMessagesSquare />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedItem.name}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    Qty: {selectedItem.quantity} {selectedItem.unit} · Location: {selectedItem.location}
                  </div>
                </div>
              </div>

              {isApprove && (
                <FormGrid style={{ marginBottom: 'var(--sp-4)' }}>
                  <Field label="Approved Product Quantity" required>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max={Math.floor(selectedItem.quantity)}
                      required
                      value={approvedQuantity}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setApprovedQuantity('');
                          return;
                        }
                        let num = Math.floor(Number(val));
                        if (num < 1) num = 1;
                        if (num > selectedItem.quantity) num = Math.floor(selectedItem.quantity);
                        setApprovedQuantity(num);
                      }}
                      onKeyPress={e => {
                        if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter approved amount"
                    />
                  </Field>
                  <Field label="Stock Unit" required>
                    <Select
                      value={approvedUnit}
                      onChange={e => setApprovedUnit(e.target.value)}
                    >
                      <option value="kg">kg</option>
                      <option value="pcs">pcs</option>
                      <option value="meters">meters</option>
                      <option value="liters">liters</option>
                      <option value="bags">bags</option>
                      <option value="boxes">boxes</option>
                    </Select>
                  </Field>
                </FormGrid>
              )}

              <Field
                label={isApprove ? 'Approval / Inspection Remarks' : 'Discrepancy / Damage Remarks'}
                required={!isApprove}
              >
                <Textarea
                  required={!isApprove}
                  rows="3"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder={isApprove
                    ? 'Specify verification details (e.g. physical dimensions verified, count is exact)...'
                    : 'Specify why the item failed quality control checks (e.g. physical damage, missing count, incorrect gauge)...'}
                />
              </Field>
            </form>
          )}
        </Dialog>
      </Page>
    </DashboardLayout>
  );
};

export default QCInventoryRequests;
