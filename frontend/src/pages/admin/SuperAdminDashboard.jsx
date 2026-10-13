import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  LuUsers, LuTruck, LuMessageSquare, LuShieldCheck,
  LuSatellite, LuRefreshCw, LuInbox, LuClipboardCheck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile,
  DataTable, Button, Badge, EmptyState,
} from '../../components/ui';

/* Chart chrome shared by every plot so both themes read correctly. */
const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };
const TOOLTIP_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
};

const buildStatusTone = (status) =>
  status === 'pending' ? 'warning'
    : status === 'processing' ? 'info'
      : status === 'shortage_reported' ? 'danger'
        : 'success';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSuperStats();
      setStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load global ERP analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Super Admin Central Control">
        <Page>
          <PageHeader
            title="Global SaaS Platform Control"
            subtitle="Real-time aggregated statistics across all factory operations, workflows, and communication modules."
          />
          <Surface>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--sp-4)', minHeight: '40vh', color: 'var(--text-muted)',
            }}>
              <div className="spinner" />
              <span style={{ fontSize: 'var(--fs-base)' }}>Compiling global database metrics…</span>
            </div>
          </Surface>
        </Page>
      </DashboardLayout>
    );
  }

  // Graphical Data Preparation
  const volumeData = [
    { name: 'Gate Entry', count: stats.totalGateEntries, color: 'var(--c-blue)' },
    { name: 'Quality Audits', count: stats.totalQcLogs, color: 'var(--c-red)' },
    { name: 'Build Jobs', count: stats.totalBuildJobs, color: 'var(--c-green)' },
    { name: 'Shortages', count: stats.totalShortages, color: 'var(--c-orange)' },
    { name: 'Email Queries', count: stats.totalTickets, color: 'var(--c-violet)' }
  ];

  const userData = [
    { name: 'Admin/SuperAdmins', value: stats.totalAdmins },
    { name: 'Staff Users', value: Math.max(0, stats.totalUsers - stats.totalAdmins) },
  ];

  const staffUsers = Math.max(0, stats.totalUsers - stats.totalAdmins);
  const pendingTickets = stats.recentTickets.filter((t) => t.status === 'pending').length;
  const pct = (n) => Math.round((n / Math.max(1, stats.totalUsers)) * 100);

  const twoCol = {
    display: 'grid',
    gap: 'var(--sp-5)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    alignItems: 'start',
  };

  const ticketColumns = [
    {
      key: 'name',
      header: 'Requester',
      primary: true,
      render: (t) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>,
    },
    {
      key: 'concern',
      header: 'Concern',
      clamp: true,
      sortable: false,
      render: (t) => (
        <span title={t.concern} style={{ color: 'var(--text-secondary)' }}>
          {t.concern.substring(0, 60)}{t.concern.length > 60 ? '…' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (t) => (
        <Badge tone={t.status === 'pending' ? 'warning' : 'success'}>
          {t.status === 'pending' ? 'Pending' : 'Replied'}
        </Badge>
      ),
    },
  ];

  const buildColumns = [
    {
      key: 'productName',
      header: 'Product Model',
      primary: true,
      render: (job) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</span>,
    },
    {
      key: 'orderQuantity',
      header: 'Target Qty',
      align: 'right',
      render: (job) => <span style={{ fontWeight: 600 }}>{job.orderQuantity} pcs</span>,
    },
    {
      key: 'machine',
      header: 'Assignee Machine',
      hideBelow: 640,
      sortValue: (job) => job.machineId?.name || job.machineName || '',
      render: (job) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {job.machineId?.name || job.machineName || 'Allocating…'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (job) => <Badge tone={buildStatusTone(job.status)}>{job.status}</Badge>,
    },
  ];

  return (
    <DashboardLayout pageTitle="Platform Executive Dashboard">
      <Page>
        <PageHeader
          title="Global SaaS Platform Control"
          subtitle="Real-time aggregated statistics across all factory operations, workflows, and communication modules."
          actions={
            <>
              <Badge tone="info" icon={<LuSatellite />}>Live Synchronized</Badge>
              <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchStats}>
                Refresh
              </Button>
            </>
          }
        />

        <StatRow>
          <StatTile
            label="Total Administrators"
            value={stats.totalAdmins}
            icon={<LuShieldCheck />}
            tone="blue"
            hint="Active platform & org admins"
          />
          <StatTile
            label="Total System Users"
            value={stats.totalUsers}
            icon={<LuUsers />}
            tone="violet"
            hint="All accounts across tenants"
          />
          <StatTile
            label="Help & Support Queries"
            value={stats.totalTickets}
            icon={<LuMessageSquare />}
            tone="orange"
            hint={`${pendingTickets} awaiting reply`}
          />
          <StatTile
            label="Inward Gate Entries"
            value={stats.totalGateEntries}
            icon={<LuTruck />}
            tone="green"
            hint="Logged across all plants"
          />
        </StatRow>

        {/* Charts & Graphical Section */}
        <div style={twoCol}>
          <Section title="Operations Registry Volume">
            <Surface>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      stroke="var(--border)"
                      tickLine={false}
                      interval={0}
                      height={48}
                      angle={-18}
                      textAnchor="end"
                    />
                    <YAxis tick={AXIS_TICK} stroke="var(--border)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]}>
                      {volumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Surface>
          </Section>

          <Section title="User Role Distribution">
            <Surface>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="var(--bg-card)"
                    >
                      <Cell fill="var(--c-violet)" />
                      <Cell fill="var(--c-blue)" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--sp-4)', fontSize: 'var(--fs-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 'var(--radius-full)', background: 'var(--c-violet)' }} />
                    Administrators
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {stats.totalAdmins} ({pct(stats.totalAdmins)}%)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 'var(--radius-full)', background: 'var(--c-blue)' }} />
                    Staff Users
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {staffUsers} ({pct(staffUsers)}%)
                  </strong>
                </div>
              </div>
            </Surface>
          </Section>
        </div>

        {/* Detailed Recent Entries Grids */}
        <div style={twoCol}>
          <Section title="Recent Support Concerns">
            <DataTable
              columns={ticketColumns}
              rows={stats.recentTickets}
              paginate={false}
              maxHeight="320px"
              empty={<EmptyState icon={<LuInbox />} title="No tickets registered." />}
            />
          </Section>

          <Section title="Recent Production Build Jobs">
            <DataTable
              columns={buildColumns}
              rows={stats.recentBuilds}
              paginate={false}
              maxHeight="320px"
              empty={<EmptyState icon={<LuClipboardCheck />} title="No build jobs created yet." />}
            />
          </Section>
        </div>
      </Page>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
