import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API, { orderAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LuPlus, LuShoppingCart, LuCircleAlert, LuRefreshCw, LuCircleCheck, LuTruck,
  LuTriangleAlert, LuZap, LuPencil, LuTrash2, LuFileDown, LuPackage,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, DensitySwitch, DataTable, Dialog, ConfirmDialog,
  Field, Input, Badge, Button, EmptyState, Tabs,
} from '../../components/ui';

/* End-to-end workflow strip — presentation only. */
const WORKFLOW_STEPS = [
  { step: 1, label: 'Sales (Lead/PI)', hint: 'Quote & PI Issued', fg: 'var(--primary)', bg: 'var(--primary-soft)' },
  { step: 2, label: 'Confirmed Order', hint: 'SO Approved & Linked', fg: 'var(--c-violet)', bg: 'var(--c-violet-soft)' },
  { step: 3, label: '(Store) Assembly', hint: 'Assemble Chain + Proof', fg: 'var(--warning)', bg: 'var(--warning-soft)' },
  { step: 4, label: 'Box Packing', hint: 'Boxes + Weights + Labels', fg: 'var(--c-blue)', bg: 'var(--c-blue-soft)' },
  { step: 5, label: 'Logistics Dispatch', hint: 'LR + Invoice + Outward Pass', fg: 'var(--success)', bg: 'var(--success-soft)' },
];

const orderStatusTone = (status) =>
  status === 'dispatched' ? 'success' : status === 'shortage' ? 'danger' : 'warning';

const OrderDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'shortages'

  const [orders, setOrders] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState(null);

  // Forms
  const todayStr = new Date().toISOString().split('T')[0];
  const [orderForm, setOrderForm] = useState({ clientName: '', modelNumber: '', orderQuantity: '', deliveryDate: todayStr });
  const [planForm, setPlanForm] = useState({ plannedShots: '' });

  const [selectedShortage, setSelectedShortage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const isSales = ['super_admin', 'admin', 'sales'].includes(user?.role);
  const isSupervisor = ['super_admin', 'admin', 'supervisor', 'production_manager'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, shortRes, statsRes] = await Promise.all([
        orderAPI.getOrders(),
        orderAPI.getShortages(),
        orderAPI.getStats()
      ]);
      setOrders(ordRes.data.data);
      setShortages(shortRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await orderAPI.createOrder(orderForm);
      if (res.data.shortage > 0) {
        toast.error(`Shortage Detected: ${res.data.shortage} meters short!`, { duration: 5000 });
      } else {
        toast.success('Order created successfully. Stock is available!');
      }
      setShowOrderModal(false);
      setOrderForm({ clientName: '', modelNumber: '', orderQuantity: '', deliveryDate: todayStr });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleDispatch = async (orderId) => {
    try {
      await orderAPI.dispatchOrder(orderId);
      toast.success('Order dispatched & stock deducted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch order');
    }
  };

  const handleDownloadPDF = async (pdfUrl, filename) => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-toast' });
      const response = await API.get(pdfUrl, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!', { id: 'pdf-toast' });
    } catch (error) {
      toast.error('Failed to download PDF', { id: 'pdf-toast' });
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

  /* ------------------------------------------------------------- columns */
  const orderColumns = [
    {
      key: 'orderNumber',
      header: 'Order ID',
      primary: true,
      render: (ord) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {ord.orderNumber}
        </span>
      ),
    },
    { key: 'clientName', header: 'Client' },
    { key: 'modelNumber', header: 'Model', hideBelow: 1024 },
    {
      key: 'orderQuantity',
      header: 'Qty (Meters)',
      align: 'right',
      render: (ord) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ord.orderQuantity}m</span>,
    },
    {
      key: 'deliveryDate',
      header: 'Delivery By',
      hideBelow: 860,
      sortValue: (ord) => new Date(ord.deliveryDate).getTime(),
      render: (ord) => new Date(ord.deliveryDate).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ord) => <Badge tone={orderStatusTone(ord.status)}>{ord.status.toUpperCase()}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (ord) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="xs"
            icon={<LuFileDown />}
            title="Download PDF"
            aria-label="Download PDF"
            onClick={() => handleDownloadPDF(ord.pdfUrl || `/orders/${ord._id}/pdf`, `SalesOrder_${ord.orderNumber}.pdf`)}
          />
          {ord.status === 'ready' && (
            <Button variant="accent" size="xs" icon={<LuTruck />} onClick={() => setDispatchTarget(ord._id)}>
              Dispatch
            </Button>
          )}
          {user?.role === 'super_admin' && (
            <>
              <Button
                variant="ghost"
                size="xs"
                icon={<LuPencil />}
                title="Edit Order"
                aria-label="Edit Order"
                onClick={() => toast('Edit feature coming soon')}
              />
              <Button
                variant="ghost"
                size="xs"
                icon={<LuTrash2 />}
                title="Delete Order"
                aria-label="Delete Order"
                onClick={() => toast('Delete feature coming soon')}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  const shortageColumns = [
    {
      key: 'refOrder',
      header: 'Ref Order',
      primary: true,
      sortValue: (s) => s.orderId?.orderNumber,
      render: (s) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {s.orderId?.orderNumber}
        </span>
      ),
    },
    { key: 'modelNumber', header: 'Model' },
    {
      key: 'shortageMeters',
      header: 'Shortage',
      align: 'right',
      render: (s) => <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{s.shortageMeters}m</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge tone={s.status === 'pending_planning' ? 'danger' : 'success'}>
          {s.status.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'plannedShots',
      header: 'Planned Shots',
      align: 'right',
      hideBelow: 860,
      render: (s) => (s.plannedShots > 0 ? s.plannedShots : '--'),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (s) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {s.status === 'pending_planning' && isSupervisor && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                setSelectedShortage(s);
                setShowPlanModal(true);
              }}
            >
              Plan Production
            </Button>
          )}
          {user?.role === 'super_admin' && (
            <Button
              variant="ghost"
              size="xs"
              icon={<LuTrash2 />}
              title="Delete Shortage"
              aria-label="Delete Shortage"
              onClick={() => toast('Delete feature coming soon')}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Order & Shortage Management">
      <Page>
        <PageHeader
          title="Orders & Shortages"
          subtitle="Sales orders from enquiry to dispatch, with live godown shortage alerts."
          actions={
            <>
              <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchData}>Refresh</Button>
              {isSales && activeTab === 'orders' && (
                <Button variant="primary" icon={<LuPlus />} onClick={() => setShowOrderModal(true)}>
                  Create Order
                </Button>
              )}
            </>
          }
        />

        {/* -------------------------------------- 5-step end-to-end workflow */}
        <Surface className="order-flow" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
            }}
          >
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 'var(--radius-full)',
                    background: s.bg, color: s.fg, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--fs-sm)', fontWeight: 800, flexShrink: 0,
                  }}
                >
                  {s.step}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', color: s.fg }}>{s.label}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>{s.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        {/* ------------------------------------------------------------- KPIs */}
        <StatRow>
          <StatTile label="Total Orders" value={stats?.totalOrders ?? '--'} icon={<LuShoppingCart />} tone="blue" />
          <StatTile label="Pending / Ready" value={stats?.pendingOrders ?? '--'} icon={<LuCircleCheck />} tone="green" />
          <StatTile label="Shortage (Difference)" value={stats?.shortageOrders ?? '--'} icon={<LuCircleAlert />} tone="red" />
          <StatTile label="Dispatched" value={stats?.dispatchedOrders ?? '--'} icon={<LuTruck />} tone="violet" />
        </StatRow>

        {/* ------------------------------------------------------------- tabs */}
        <Toolbar>
          <Tabs
            items={[
              { key: 'orders', label: 'Sales Orders', icon: <LuShoppingCart />, count: orders.length },
              { key: 'shortages', label: 'Difference / Shortage Reports', icon: <LuTriangleAlert />, count: shortages.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <ToolbarSpacer />
          <div style={{ marginBottom: 16 }}>
            <DensitySwitch />
          </div>
        </Toolbar>

        {/* ---------------------------------------------------------- content */}
        {activeTab === 'orders' ? (
          <DataTable
            columns={orderColumns}
            rows={orders}
            loading={loading}
            rowKey={(ord) => ord._id}
            empty={
              <EmptyState
                icon={<LuPackage />}
                title="No orders found"
                text="Sales orders will appear here as soon as they are raised."
              />
            }
          />
        ) : (
          <Section title="Production Shortage Alerts (Difference Report)">
            <Surface
              style={{
                marginBottom: 12,
                borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)',
                background: 'color-mix(in srgb, var(--danger) 6%, var(--bg-card))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ color: 'var(--danger)', fontSize: '1.1rem', display: 'inline-flex', flexShrink: 0 }}>
                  <LuTriangleAlert />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)' }}>
                    Orders that exceed Godown inventory
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                    Supervisors must plan shots for these before dispatch can proceed.
                  </p>
                </div>
              </div>
            </Surface>

            <DataTable
              columns={shortageColumns}
              rows={shortages}
              loading={loading}
              rowKey={(s) => s._id}
              empty={
                <EmptyState
                  icon={<LuCircleCheck />}
                  title="No active shortages"
                  text="Every open order is fully covered by godown stock."
                />
              }
            />
          </Section>
        )}

        {/* ------------------------------------------------ create order form */}
        <Dialog
          open={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          title="Create Sales Order"
          subtitle="Stock availability is checked the moment the order is saved."
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button type="submit" form="create-order-form" variant="primary" disabled={submitting}>
                {submitting ? 'Checking Stock...' : 'Create Order'}
              </Button>
            </>
          }
        >
          <form id="create-order-form" onSubmit={handleCreateOrder}>
            <FormGrid>
              <Field label="Client Name" required span="all">
                <Input
                  required
                  placeholder="e.g. Acme Corp"
                  value={orderForm.clientName}
                  onChange={e => setOrderForm({ ...orderForm, clientName: e.target.value })}
                />
              </Field>
              <Field label="Model Number" required span="all">
                <Input
                  required
                  placeholder="e.g. STR-DRG-2627.35..."
                  value={orderForm.modelNumber}
                  onChange={e => setOrderForm({ ...orderForm, modelNumber: e.target.value })}
                />
              </Field>
              <Field label="Quantity (Meters)" required>
                <Input
                  type="number"
                  required
                  value={orderForm.orderQuantity}
                  onChange={e => setOrderForm({ ...orderForm, orderQuantity: e.target.value })}
                />
              </Field>
              <Field label="Delivery Date" required>
                <Input
                  type="date"
                  required
                  value={orderForm.deliveryDate}
                  onChange={e => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ------------------------------------------------- plan production */}
        <Dialog
          open={showPlanModal && !!selectedShortage}
          onClose={() => setShowPlanModal(false)}
          title="Plan Production for Shortage"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowPlanModal(false)}>Cancel</Button>
              <Button type="submit" form="plan-shortage-form" variant="accent" disabled={submitting}>
                {submitting ? 'Planning...' : 'Generate Plan'}
              </Button>
            </>
          }
        >
          {selectedShortage && (
            <>
              <Surface
                style={{
                  marginBottom: 16,
                  borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)',
                  background: 'color-mix(in srgb, var(--danger) 6%, var(--bg-card))',
                }}
              >
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedShortage.modelNumber}</div>
                <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                  Shortage: {selectedShortage.shortageMeters} meters
                </div>
              </Surface>

              <form id="plan-shortage-form" onSubmit={handlePlanShortage}>
                <FormGrid>
                  <Field
                    label="Convert meters to shots (target shots)"
                    required
                    span="all"
                    hint="This will instantly generate a new Production Plan in the Production Module for the factory floor to execute."
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <Input
                          type="number"
                          required
                          placeholder="Calculate required shots for this shortage"
                          value={planForm.plannedShots}
                          onChange={e => setPlanForm({ ...planForm, plannedShots: e.target.value })}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<LuZap />}
                        onClick={handleAskAI}
                        disabled={aiLoading}
                      >
                        {aiLoading ? 'Thinking...' : 'Ask AI'}
                      </Button>
                    </div>
                  </Field>
                </FormGrid>
              </form>
            </>
          )}
        </Dialog>

        {/* --------------------------------------------------- dispatch guard */}
        <ConfirmDialog
          open={!!dispatchTarget}
          onClose={() => setDispatchTarget(null)}
          onConfirm={() => {
            const id = dispatchTarget;
            setDispatchTarget(null);
            handleDispatch(id);
          }}
          title="Dispatch this order?"
          text="Are you sure you want to dispatch this order? This will permanently deduct stock."
          confirmLabel="Dispatch order"
        />
      </Page>
    </DashboardLayout>
  );
};

export default OrderDashboard;
