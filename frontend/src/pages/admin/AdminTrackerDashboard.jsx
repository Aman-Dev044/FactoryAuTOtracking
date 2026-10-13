import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI, orderAPI, dispatchAPI, salesPipelineAPI } from '../../services/api';

import {
  LuTruck, LuCog, LuFactory, LuBoxes, LuPackage, LuCreditCard, LuHourglass,
  LuCircleCheck, LuCircleX, LuRefreshCw, LuActivity, LuUser, LuPhone,
  LuTriangleAlert, LuChartPie, LuWarehouse,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

import {
  Page, PageHeader, Section, Surface, StatRow, StatTile,
  DataTable, Badge, Button, EmptyState, Skeleton,
} from '../../components/ui';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://localhost:6465`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

/* ------------------------------------------------------------------ chart theme */
/* Every chart reads the token layer so it stays legible in light and dark. */
const CHART_GRID = 'var(--border-light)';
const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };
const AXIS_LINE = { stroke: 'var(--border)' };

const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 700, marginBottom: 2 },
  itemStyle: { color: 'var(--text-secondary)' },
  cursor: { fill: 'color-mix(in srgb, var(--primary) 8%, transparent)' },
};

const legendFormatter = (value) => (
  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>
);

/* Two-up chart grid that collapses cleanly at 360px. */
const twoUp = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
  gap: 'var(--sp-4)',
  alignItems: 'start',
};

const CHART_HEIGHT = 272;

/** Section + Surface wrapper that owns the fixed chart height, skeleton and empty state. */
const ChartCard = ({ title, actions, loading, isEmpty, emptyIcon, emptyTitle, emptyText, children }) => (
  <Section title={title} actions={actions}>
    <Surface>
      <div style={{ width: '100%', height: CHART_HEIGHT, minWidth: 0 }}>
        {loading ? (
          <Skeleton w="100%" h={CHART_HEIGHT} radius="var(--radius-md)" />
        ) : isEmpty ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </Surface>
  </Section>
);

const donutProps = {
  cx: '50%',
  cy: '50%',
  innerRadius: 58,
  outerRadius: 82,
  paddingAngle: 4,
  dataKey: 'value',
  stroke: 'var(--bg-card)',
  strokeWidth: 2,
};

const AdminTrackerDashboard = () => {
  const { user } = useAuth();


  const [totalGateCount, setTotalGateCount] = useState(0);
  const [machines, setMachines] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [qcLogs, setQcLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  const [orderShortages, setOrderShortages] = useState([]);
  const [dispatchStats, setDispatchStats] = useState({ assemble: 0, hold: 0, packing: 0, dispatched: 0 });
  const [pipelineStats, setPipelineStats] = useState({ overdue: 0, pendingApproval: 0 });
  const [pendingSalesOrders, setPendingSalesOrders] = useState([]);

  const [loading, setLoading] = useState(true);


  const fetchTrackerData = useCallback(async () => {
    try {
      const [gateRes, machRes, buildRes, invRes, qcRes, sbsRes, shortRes, dispRes, pipeRes, pendingOrdersRes] = await Promise.all([
        gateEntryAPI.getAll({ limit: 10 }),
        operationsAPI.getMachines(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getInventory(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales(),
        orderAPI.getShortages(),
        dispatchAPI.getStats().catch(() => ({ data: { data: {} } })),
        salesPipelineAPI.getStats().catch(() => ({ data: { data: {} } })),
        salesPipelineAPI.getAll({ stage: 'sales_order', approvalStatus: 'pending' }).catch(() => ({ data: { data: [] } }))
      ]);
      setTotalGateCount(gateRes.data.pagination?.total || gateRes.data.data.length);
      setMachines(machRes.data.data);
      setBuildJobs(buildRes.data.data);
      setInventory(invRes.data.data);
      setQcLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
      setOrderShortages(shortRes.data.data);
      setDispatchStats(dispRes.data.data || {});
      setPipelineStats(pipeRes.data.data || {});
      setPendingSalesOrders(pendingOrdersRes.data.data || []);

    } catch (err) {
      toast.error('Failed to update dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApproveSalesOrder = async (id) => {
    try {
      await salesPipelineAPI.approve(id);
      toast.success('✅ Sales Order Approved successfully!');
      fetchTrackerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve Sales Order');
    }
  };

  const handleRejectSalesOrder = async (id) => {
    const reason = window.prompt('Enter rejection reason (will be visible to Sales rep):');
    if (reason === null) return;
    try {
      await salesPipelineAPI.reject(id, reason.trim() || 'Pricing or Terms rejected by Admin');
      toast.error('❌ Sales Order Rejected');
      fetchTrackerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject Sales Order');
    }
  };

  useEffect(() => {
    fetchTrackerData();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('gate_entry_updated', fetchTrackerData);
      socket.on('build_updated', fetchTrackerData);
      socket.on('inventory_updated', fetchTrackerData);
      socket.on('quality_updated', fetchTrackerData);
      socket.on('machine_updated', fetchTrackerData);
      socket.on('communication_updated', fetchTrackerData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchTrackerData, user?.organizationId]);

  // Aggregate Stats
  const activeMachines = machines.filter(m => m.status === 'working').length;
  const brokenMachines = machines.filter(m => m.status === 'broken').length;
  const totalStockCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0);
  const activeBuildOrders = buildJobs.filter(j => ['pending', 'processing'].includes(j.status)).length;
  const shortageOrders = buildJobs.filter(j => j.status === 'shortage_reported').length;

  const inventoryValue = inventory.reduce((acc, it) => acc + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
  const dispatchInProgress = (dispatchStats.assemble || 0) + (dispatchStats.packing || 0);
  const dispatchPending = dispatchInProgress + (dispatchStats.hold || 0);
  const awaitingApproval = pipelineStats.pendingApproval || pendingSalesOrders.length || 0;

  // Recharts Data Sets
  const registryVolumeData = [
    { name: 'Gate Logs', count: totalGateCount, color: 'var(--c-blue)' },
    { name: 'Quality Audits', count: qcLogs.length, color: 'var(--success)' },
    { name: 'Production Runs', count: buildJobs.length, color: 'var(--c-violet)' },
    { name: 'Shortage Flags', count: sbsLogs.filter(l => l.type === 'shortage').length, color: 'var(--danger)' }
  ];

  const machineryStatusData = [
    { name: 'Working', value: machines.filter(m => m.status === 'working').length, color: 'var(--success)' },
    { name: 'Broken', value: machines.filter(m => m.status === 'broken').length, color: 'var(--danger)' },
    { name: 'Idle/Other', value: machines.filter(m => !['working', 'broken'].includes(m.status)).length, color: 'var(--text-muted)' }
  ].filter(d => d.value > 0);

  const wipStagesData = [
    { name: 'Pending', value: buildJobs.filter(j => j.status === 'pending').length, color: 'var(--warning)' },
    { name: 'Processing', value: buildJobs.filter(j => j.status === 'processing').length, color: 'var(--c-blue)' },
    { name: 'Completed', value: buildJobs.filter(j => j.status === 'completed').length, color: 'var(--success)' },
    { name: 'Shortages', value: buildJobs.filter(j => j.status === 'shortage_reported').length, color: 'var(--danger)' }
  ].filter(d => d.value > 0);

  const topInventoryData = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(item => ({
      name: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
      quantity: item.quantity
    }));

  const qcInspectionData = [
    { name: 'Inspected', value: qcLogs.filter(l => l.qcType === 'inspected').length, color: 'var(--success)' },
    { name: 'Damaged', value: qcLogs.filter(l => l.qcType === 'damaged').length, color: 'var(--danger)' },
    { name: 'Missed', value: qcLogs.filter(l => l.qcType === 'missed').length, color: 'var(--warning)' }
  ].filter(d => d.value > 0);

  const sourcingStatusData = [
    { name: 'Pending', value: sbsLogs.filter(l => l.status === 'pending').length, color: 'var(--danger)' },
    { name: 'Assigned', value: sbsLogs.filter(l => l.status === 'assigned').length, color: 'var(--c-blue)' },
    { name: 'Sourced', value: sbsLogs.filter(l => l.status === 'completed' || l.status === 'ordered').length, color: 'var(--success)' }
  ].filter(d => d.value > 0);

  /* ------------------------------------------------------------- tile value */
  const metric = (v) => (loading ? <Skeleton w={72} h={26} radius="var(--radius-sm)" /> : v);

  /* --------------------------------------------------- sales order columns */
  const salesOrderColumns = [
    {
      key: 'customerName',
      header: 'Customer & Rep',
      primary: true,
      render: (so) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{so.customerName}</div>
          {so.salesPersonName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>
              <LuUser /> {so.salesPersonName}
            </div>
          )}
          {so.customerContact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              <LuPhone /> {so.customerContact}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'ref',
      header: 'SO Ref #',
      sortValue: (so) => so.salesOrderNumber || so.customerPoNumber || so.quotationNumber || 'SO-NEW',
      render: (so) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
          {so.salesOrderNumber || so.customerPoNumber || so.quotationNumber || 'SO-NEW'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Order Items / Specs',
      clamp: true,
      sortable: false,
      hideBelow: 1100,
      render: (so) => {
        const cfg = so.items?.[0]?.dragChainConfig || so.dragChainConfig || {};
        if (cfg.modelNumber || cfg.series) {
          return (
            <div style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.modelNumber || cfg.series}</span>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                {[cfg.width && `W: ${cfg.width}`, cfg.radius && `R: ${cfg.radius}`, cfg.numberOfLinks && `${cfg.numberOfLinks} links`].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--primary)' }}>
                Qty: {cfg.quantity || 1} m
              </div>
            </div>
          );
        }
        if (so.items && so.items.length > 0) {
          return (
            <div style={{ minWidth: 0 }}>
              {so.items.map((it, idx) => (
                <div key={idx} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{it.modelNumber}</strong> — {it.quantity} {it.unit || 'pcs'}
                </div>
              ))}
            </div>
          );
        }
        return <span style={{ color: 'var(--text-ghost)' }}>—</span>;
      },
    },
    {
      key: 'grandTotal',
      header: 'Grand Total',
      align: 'right',
      sortValue: (so) => so.grandTotal || so.totalAmount || 0,
      render: (so) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          ₹{(so.grandTotal || so.totalAmount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Credit Terms',
      hideBelow: 1280,
      sortValue: (so) => so.creditDays || 0,
      render: (so) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-secondary)' }}>{so.creditDays ? `${so.creditDays} days` : 'Immediate'}</div>
          {so.creditDueDate && (
            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
              Due {new Date(so.creditDueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (so) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="success"
            icon={<LuCircleCheck />}
            onClick={() => handleApproveSalesOrder(so._id)}
            title="Approve Sales Order"
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<LuCircleX />}
            onClick={() => handleRejectSalesOrder(so._id)}
            title="Reject Sales Order"
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  /* ----------------------------------------------------- shortage columns */
  const shortageColumns = [
    {
      key: 'orderNumber',
      header: 'Ref Order',
      primary: true,
      sortValue: (s) => s.orderId?.orderNumber || '',
      render: (s) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.orderId?.orderNumber || 'N/A'}</span>
      ),
    },
    {
      key: 'modelNumber',
      header: 'Model Number',
      render: (s) => <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.modelNumber}</span>,
    },
    {
      key: 'shortageMeters',
      header: 'Shortage Qty',
      align: 'right',
      sortValue: (s) => s.shortageMeters || 0,
      render: (s) => (
        <span style={{ fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
          {s.shortageMeters}m
        </span>
      ),
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
      hideBelow: 900,
      sortValue: (s) => s.plannedShots || 0,
      render: (s) => (
        <span style={{ color: s.plannedShots > 0 ? 'var(--text-secondary)' : 'var(--text-ghost)' }}>
          {s.plannedShots > 0 ? `${s.plannedShots} shots` : 'Not Planned'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date Flagged',
      hideBelow: 1100,
      sortValue: (s) => new Date(s.createdAt).getTime(),
      render: (s) => (
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
          {new Date(s.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Enterprise Real-Time Pipeline Tracker">
      <Page>
        <PageHeader
          title="Pipeline Tracker"
          subtitle="Live view across gate inward, machinery, production, inventory, quality and sales approvals."
          actions={
            <>
              <Badge tone="info" icon={<LuActivity />}>Live</Badge>
              <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchTrackerData} loading={loading}>
                Refresh
              </Button>
            </>
          }
        />

        {/* ------------------------------------------------------------ KPIs */}
        <StatRow>
          <StatTile
            label="Inward Gate Logs"
            value={metric(totalGateCount)}
            icon={<LuTruck />}
            tone="blue"
            hint="Shipments logged at the gate"
          />
          <StatTile
            label="Machinery Modules"
            value={metric(machines.length)}
            icon={<LuCog />}
            tone="green"
            hint={`${activeMachines} active · ${brokenMachines} in repair`}
          />
          <StatTile
            label="Production Build Jobs"
            value={metric(buildJobs.length)}
            icon={<LuFactory />}
            tone="violet"
            hint={`${activeBuildOrders} in line · ${shortageOrders} short`}
          />
          <StatTile
            label="Inventory Units"
            value={metric(totalStockCount)}
            icon={<LuBoxes />}
            tone="orange"
            hint={`₹${inventoryValue.toLocaleString('en-IN')} total value`}
          />
          <StatTile
            label="Dispatch Pending"
            value={metric(dispatchPending)}
            icon={<LuPackage />}
            tone="cyan"
            hint={`${dispatchInProgress} in progress`}
          />
          <StatTile
            label="Payment Overdue"
            value={metric(pipelineStats.overdue || 0)}
            icon={<LuCreditCard />}
            tone="red"
            hint="Credit due / overdue accounts"
          />
          <StatTile
            label="Awaiting Approval"
            value={metric(awaitingApproval)}
            icon={<LuHourglass />}
            tone="amber"
            hint="Sales orders needing admin action"
          />
        </StatRow>

        {/* ---------------------------------------------------------- charts */}
        <div style={twoUp}>
          <ChartCard
            title="Production WIP Stages"
            loading={loading}
            isEmpty={wipStagesData.length === 0}
            emptyIcon={<LuFactory />}
            emptyTitle="No active production runs"
            emptyText="Build jobs will appear here once production starts."
          >
            <PieChart>
              <Pie data={wipStagesData} {...donutProps}>
                {wipStagesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_PROPS} cursor={false} />
              <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} formatter={legendFormatter} />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Operations Registry Volume"
            loading={loading}
            isEmpty={false}
          >
            <BarChart data={registryVolumeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} height={38} minTickGap={4} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]} maxBarSize={54}>
                {registryVolumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>

        <div style={twoUp}>
          <ChartCard
            title="Machinery Health & Status"
            loading={loading}
            isEmpty={machineryStatusData.length === 0}
            emptyIcon={<LuCog />}
            emptyTitle="No machinery registered"
            emptyText="Register machinery modules to track their health here."
          >
            <PieChart>
              <Pie data={machineryStatusData} {...donutProps}>
                {machineryStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_PROPS} cursor={false} />
              <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} formatter={legendFormatter} />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Top Inventory Stock"
            loading={loading}
            isEmpty={topInventoryData.length === 0}
            emptyIcon={<LuWarehouse />}
            emptyTitle="No inventory data"
            emptyText="Stocked items will be ranked here once inventory is recorded."
          >
            <BarChart data={topInventoryData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={AXIS_TICK} tickLine={false} axisLine={false} width={104} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="quantity" name="Qty" fill="var(--c-orange)" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ChartCard>
        </div>

        <div style={twoUp}>
          <ChartCard
            title="Quality Audit Outcomes"
            loading={loading}
            isEmpty={qcInspectionData.length === 0}
            emptyIcon={<LuChartPie />}
            emptyTitle="No inspections logged"
            emptyText="Quality audit results will be summarised here."
          >
            <PieChart>
              <Pie data={qcInspectionData} {...donutProps}>
                {qcInspectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_PROPS} cursor={false} />
              <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} formatter={legendFormatter} />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Shortage & Sourcing Registry"
            loading={loading}
            isEmpty={sourcingStatusData.length === 0}
            emptyIcon={<LuTriangleAlert />}
            emptyTitle="No sourcing activity"
            emptyText="Shortage and sourcing logs will be charted here."
          >
            <BarChart data={sourcingStatusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} height={38} minTickGap={4} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="value" name="Logs" radius={[6, 6, 0, 0]} maxBarSize={54}>
                {sourcingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>

        {/* ------------------------------ Sales orders awaiting admin approval */}
        <Section
          title="Sales Orders Awaiting Approval"
          actions={
            pendingSalesOrders.length > 0 ? (
              <Badge tone="warning" icon={<LuHourglass />}>{pendingSalesOrders.length} Pending</Badge>
            ) : (
              <Badge tone="success" icon={<LuCircleCheck />}>All clear</Badge>
            )
          }
        >
          <DataTable
            columns={salesOrderColumns}
            rows={pendingSalesOrders}
            loading={loading}
            pageSize={10}
            rowKey={(r) => r._id}
            empty={
              <EmptyState
                icon={<LuCircleCheck />}
                title="All sales orders reviewed"
                text="Every submitted sales order has been approved or rejected."
              />
            }
          />
        </Section>

        {/* ---------------------------------------- Client order shortages */}
        <Section
          title="Client Order Shortages"
          actions={
            orderShortages.length > 0 ? (
              <Badge tone="danger" icon={<LuTriangleAlert />}>{orderShortages.length} Open</Badge>
            ) : null
          }
        >
          <DataTable
            columns={shortageColumns}
            rows={orderShortages}
            loading={loading}
            pageSize={10}
            rowKey={(r) => r._id}
            empty={
              <EmptyState
                icon={<LuPackage />}
                title="No active shortages"
                text="Difference reports against client orders will show up here."
              />
            }
          />
        </Section>
      </Page>
    </DashboardLayout>
  );
};

export default AdminTrackerDashboard;
