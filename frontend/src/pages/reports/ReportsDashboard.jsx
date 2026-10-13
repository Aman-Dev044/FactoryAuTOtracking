import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportsAPI, adminOrgAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import {
  LuFileSpreadsheet, LuDownload, LuRefreshCw,
  LuLayers, LuTruck, LuFactory, LuClipboardCheck, LuWarehouse, LuShoppingCart,
  LuFileText, LuCheck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import {
  Page, PageHeader, Section, Surface, Toolbar, ToolbarSpacer, SearchInput,
  ChipGroup, DensitySwitch, DataTable, Badge, Button, EmptyState, Field, Select,
} from '../../components/ui';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles (Full Comprehensive Report)' },
  { value: 'gate_guard', label: 'Gate Operations (Gate Guard)' },
  { value: 'supervisor', label: 'Production Management (Supervisor)' },
  { value: 'quality_checker', label: 'Quality Control (QC Checker)' },
  { value: 'store_manager', label: 'Store & Godown (Store Manager)' },
  { value: 'sales', label: 'Sales & Orders (Sales Officer)' }
];

/* Presentation metadata for the report-type picker cards. */
const REPORT_META = {
  all: { icon: <LuLayers />, tone: 'primary', name: 'Full Comprehensive Report', blurb: 'Every department merged into a single workbook.' },
  gate_guard: { icon: <LuTruck />, tone: 'blue', name: 'Gate Operations', blurb: 'Inward and outward gate passes, vehicles and drivers.' },
  supervisor: { icon: <LuFactory />, tone: 'orange', name: 'Production Management', blurb: 'Plans, WIP batches, shots produced and rejections.' },
  quality_checker: { icon: <LuClipboardCheck />, tone: 'violet', name: 'Quality Control', blurb: 'Inspections, pass / fail verdicts and QC remarks.' },
  store_manager: { icon: <LuWarehouse />, tone: 'green', name: 'Store & Godown', blurb: 'Stock levels, material issues and godown movement.' },
  sales: { icon: <LuShoppingCart />, tone: 'pink', name: 'Sales & Orders', blurb: 'Client orders, shortages and dispatch records.' },
};

const toneColors = (tone) =>
  tone === 'primary'
    ? { bg: 'var(--primary-soft)', fg: 'var(--primary)' }
    : { bg: 'var(--c-' + tone + '-soft)', fg: 'var(--c-' + tone + ')' };

const MODULE_TONE = {
  'Gate Operations': 'blue',
  'Production Management': 'orange',
  'Quality Control': 'purple',
  'Store & Inventory': 'green',
  'Sales & Orders': 'info',
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const getFirstDayOfMonthString = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

const ReportsDashboard = () => {
  const { user } = useAuth();
  const { currencySymbol, formatCurrency } = useOrg();

  // Filters state
  const [dateMode, setDateMode] = useState('single'); // 'single' or 'range'
  const [singleDate, setSingleDate] = useState(getTodayString());
  const [startDate, setStartDate] = useState(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [targetRole, setTargetRole] = useState('all');
  const [targetOrgId, setTargetOrgId] = useState('all');
  const [search, setSearch] = useState('');

  // Data & Pagination state
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Organizations list for SuperAdmin
  const [organizations, setOrganizations] = useState([]);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  // Load organizations for SuperAdmin dropdown
  useEffect(() => {
    if (isSuperAdmin) {
      adminOrgAPI.getAll()
        .then(res => {
          if (res.data && res.data.success) {
            setOrganizations(res.data.data || []);
          }
        })
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const fetchReports = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = {
        dateMode,
        singleDate: dateMode === 'single' ? singleDate : '',
        startDate: dateMode === 'range' ? startDate : '',
        endDate: dateMode === 'range' ? endDate : '',
        targetRole: isAdmin ? targetRole : user?.role,
        targetOrgId: isSuperAdmin ? targetOrgId : '',
        page: targetPage,
        limit: 20,
        search
      };

      const res = await reportsAPI.getData(params);
      if (res.data && res.data.success) {
        setReports(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
        setPage(res.data.currentPage || 1);
      }
    } catch (err) {
      toast.error('Failed to load report logs');
    } finally {
      setLoading(false);
    }
  }, [dateMode, singleDate, startDate, endDate, targetRole, targetOrgId, search, isAdmin, isSuperAdmin, user?.role]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const [exporting, setExporting] = useState(false);

  const handleExportXLSX = async () => {
    const params = {
      dateMode,
      singleDate: dateMode === 'single' ? singleDate : '',
      startDate: dateMode === 'range' ? startDate : '',
      endDate: dateMode === 'range' ? endDate : '',
      targetRole: isAdmin ? targetRole : user?.role,
      targetOrgId: isSuperAdmin ? targetOrgId : ''
    };

    setExporting(true);
    const toastId = toast.loading('Generating Professional Excel Report (.xlsx)...');
    try {
      const response = await reportsAPI.exportXLSX(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `ERP_Report_${(isAdmin ? targetRole : (user?.role || 'ALL')).toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report. Please try again.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const getModuleTone = (module) => MODULE_TONE[module] || 'neutral';

  const isNegativeStatus = (status) =>
    !!status && (status.toLowerCase().includes('reject') || status.toLowerCase().includes('out'));

  const columns = [
    {
      key: 'refNo',
      header: 'Ref / Pass No',
      primary: true,
      render: (item) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
          {item.refNo}
        </span>
      ),
    },
    {
      key: 'module',
      header: 'Department / Module',
      render: (item) => <Badge tone={getModuleTone(item.module)}>{item.module}</Badge>,
    },
    {
      key: 'title',
      header: 'Details & Title',
      clamp: true,
      render: (item) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
          {item.subtitle && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{item.subtitle}</div>
          )}
        </div>
      ),
    },
    { key: 'detail', header: 'Metrics / Operator', hideBelow: 1180 },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge tone={isNegativeStatus(item.status) ? 'danger' : 'success'}>{item.status}</Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date & Time',
      align: 'right',
      hideBelow: 900,
      render: (item) => (
        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {new Date(item.date).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Analytics & Reports">
      <Page>
        <PageHeader
          title="Factory Operational Reports"
          subtitle="Generate, filter, and export formal Excel (.xlsx) reports across all departments."
          actions={
            <>
              <Button variant="secondary" icon={<LuRefreshCw />} onClick={() => fetchReports(page)} disabled={loading}>
                Refresh
              </Button>
              <Button variant="primary" icon={<LuDownload />} onClick={handleExportXLSX} disabled={exporting}>
                {exporting ? 'Generating Excel...' : 'Export to Excel (.xlsx)'}
              </Button>
            </>
          }
        />

        {/* ------------------------------------------------- report type picker */}
        {isAdmin && (
          <Section title="Report Type">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 12,
              }}
            >
              {ROLE_OPTIONS.map((r) => {
                const meta = REPORT_META[r.value] || REPORT_META.all;
                const colors = toneColors(meta.tone);
                const active = targetRole === r.value;
                return (
                  <div
                    key={r.value}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    title={r.label}
                    onClick={() => setTargetRole(r.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setTargetRole(r.value);
                      }
                    }}
                    style={{ cursor: 'pointer', borderRadius: 'var(--radius-lg)', minWidth: 0 }}
                  >
                    <Surface
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        borderColor: active ? 'var(--primary)' : 'var(--border)',
                        background: active
                          ? 'color-mix(in srgb, var(--primary) 6%, var(--bg-card))'
                          : 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-md)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: colors.bg, color: colors.fg, flexShrink: 0, fontSize: '1rem',
                          }}
                        >
                          {meta.icon}
                        </span>
                        <span
                          style={{
                            fontWeight: 700, color: 'var(--text-primary)',
                            fontSize: 'var(--fs-md)', minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {meta.name}
                        </span>
                        {active && (
                          <span style={{ marginLeft: 'auto', color: 'var(--primary)', display: 'inline-flex' }}>
                            <LuCheck />
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {meta.blurb}
                      </p>

                      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                        {active ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<LuFileSpreadsheet />}
                            disabled={exporting}
                            onClick={(e) => { e.stopPropagation(); handleExportXLSX(); }}
                          >
                            {exporting ? 'Generating…' : 'Export .xlsx'}
                          </Button>
                        ) : (
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>
                            Select to filter &amp; export
                          </span>
                        )}
                      </div>
                    </Surface>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ------------------------------------------------------------ filters */}
        <Toolbar>
          <Field label="Date mode">
            <ChipGroup
              items={[{ key: 'single', label: 'Single date' }, { key: 'range', label: 'Date range' }]}
              value={dateMode}
              onChange={setDateMode}
            />
          </Field>

          {dateMode === 'single' ? (
            <div style={{ width: 170 }}>
              <Field label="Select date">
                <input
                  type="date"
                  className="field-control"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <>
              <div style={{ width: 170 }}>
                <Field label="From date">
                  <input
                    type="date"
                    className="field-control"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ width: 170 }}>
                <Field label="To date">
                  <input
                    type="date"
                    className="field-control"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {isSuperAdmin && (
            <div style={{ width: 230, minWidth: 0 }}>
              <Field label="Organization tenant">
                <Select value={targetOrgId} onChange={e => setTargetOrgId(e.target.value)}>
                  <option value="all">All Organizations (Global Master)</option>
                  {organizations.map(org => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <ToolbarSpacer />

          <div style={{ width: 268, minWidth: 0 }}>
            <Field label="Search keywords">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Ref no, vehicle, model, item…"
              />
            </Field>
          </div>

          <div style={{ marginTop: 20 }}>
            <DensitySwitch />
          </div>
        </Toolbar>

        {/* --------------------------------------------------------- report log */}
        <Section
          title="Filtered Report Logs"
          actions={
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              {totalCount} entries · page {page} of {totalPages}
            </span>
          }
        >
          <DataTable
            columns={columns}
            rows={reports}
            loading={loading}
            paginate={false}
            rowKey={(item, i) => item.id || i}
            empty={
              <EmptyState
                icon={<LuFileText />}
                title="No report logs found"
                text="Try adjusting your date range, role filter, or search terms."
              />
            }
          />

          {/* ALWAYS VISIBLE PAGINATION FOOTER */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={20}
            onPageChange={fetchReports}
          />
        </Section>
      </Page>
    </DashboardLayout>
  );
};

export default ReportsDashboard;
