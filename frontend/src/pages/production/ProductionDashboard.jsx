import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { productionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LuPlus, LuLayoutGrid, LuList, LuRefreshCw, LuCircleCheck, LuClock,
  LuBoxes, LuCog, LuFlame, LuFlaskConical, LuArchive, LuPackage,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, DensitySwitch, DataTable, Dialog,
  Field, Input, Select, Badge, Button, EmptyState, Tabs,
} from '../../components/ui';

const STAGES = {
  shot_production: { label: 'Shot Production', color: 'var(--c-blue)', icon: <LuCog /> },
  inhaling: { label: 'Inhaling Process', color: 'var(--c-violet)', icon: <LuFlaskConical /> },
  boiling: { label: 'Boiling Process', color: 'var(--danger)', icon: <LuFlame /> },
  ready_for_assembly: { label: 'Ready (Prepared Shots)', color: 'var(--success)', icon: <LuArchive /> },
};

const emptyPlan = { modelNumber: '', plannedShots: '' };
const emptyWip = { planId: '', materialIssued: '' };
const emptyStage = { processedQty: '', rejectedQty: '', qcStatus: 'passed', remarks: '' };

const planStatusTone = (status) =>
  status === 'completed' ? 'success' : status === 'in_progress' ? 'warning' : 'neutral';

const ProductionDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('wip'); // 'planning' or 'wip'

  const [plans, setPlans] = useState([]);
  const [wipBatches, setWipBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);

  // Forms
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [wipForm, setWipForm] = useState(emptyWip);
  const [stageForm, setStageForm] = useState(emptyStage);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isSupervisor = ['super_admin', 'admin', 'supervisor', 'production_manager'].includes(user?.role);
  const isProduction = ['super_admin', 'admin', 'supervisor', 'production_manager', 'production'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, wipRes, statsRes] = await Promise.all([
        productionAPI.getPlans(),
        productionAPI.getWipBatches(),
        productionAPI.getStats()
      ]);
      setPlans(plansRes.data.data);
      setWipBatches(wipRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to load production data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Plan Creation
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planForm.modelNumber || !planForm.plannedShots) {
      toast.error('Fill required fields'); return;
    }
    setSubmitting(true);
    try {
      await productionAPI.createPlan(planForm);
      toast.success('Production plan created');
      setShowPlanModal(false);
      setPlanForm(emptyPlan);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Material Issue (Create WIP Batch)
  const handleIssueMaterial = async (e) => {
    e.preventDefault();
    if (!wipForm.planId || !wipForm.materialIssued) {
      toast.error('Select plan and enter material quantity'); return;
    }
    setSubmitting(true);
    try {
      await productionAPI.createWipBatch(wipForm);
      toast.success('Material issued & WIP batch created');
      setShowIssueModal(false);
      setWipForm(emptyWip);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue material');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Stage Update
  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setSubmitting(true);
    try {
      await productionAPI.updateWipStage(selectedBatch._id, stageForm);
      toast.success('Stage updated successfully');
      setShowStageModal(false);
      setSelectedBatch(null);
      setStageForm(emptyStage);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const openStageModal = (batch) => {
    setSelectedBatch(batch);
    setStageForm(emptyStage);
    setShowStageModal(true);
  };

  /* ------------------------------------------------------------- columns */
  const planColumns = [
    {
      key: 'modelNumber',
      header: 'Model No',
      primary: true,
      render: (p) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.modelNumber}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge tone={planStatusTone(p.status)}>{p.status.replace('_', ' ').toUpperCase()}</Badge>,
    },
    {
      key: 'progress',
      header: 'Progress',
      width: '32%',
      sortValue: (p) => (p.plannedShots ? p.completedShots / p.plannedShots : 0),
      render: (p) => {
        const percent = Math.min(100, Math.round((p.completedShots / p.plannedShots) * 100));
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
            <div
              style={{
                flex: 1,
                height: 6,
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                minWidth: 60,
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: percent === 100 ? 'var(--success)' : 'var(--primary)',
                  borderRadius: 'var(--radius-full)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {p.completedShots} / {p.plannedShots}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdBy',
      header: 'Created By',
      hideBelow: 1024,
      sortValue: (p) => p.createdBy?.name,
      render: (p) => p.createdBy?.name || '--',
    },
    {
      key: 'createdAt',
      header: 'Date',
      align: 'right',
      hideBelow: 860,
      sortValue: (p) => new Date(p.createdAt).getTime(),
      render: (p) => (
        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Production Dashboard">
      <Page>
        <PageHeader
          title="Production Floor"
          subtitle="Plans, material issues and work-in-progress batches across every processing stage."
          actions={
            <>
              <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchData}>Refresh</Button>
              {isSupervisor && (
                <>
                  <Button variant="primary" icon={<LuPlus />} onClick={() => setShowPlanModal(true)}>Create Plan</Button>
                  <Button variant="accent" icon={<LuBoxes />} onClick={() => setShowIssueModal(true)}>Issue Material</Button>
                </>
              )}
            </>
          }
        />

        {/* ------------------------------------------------------------- KPIs */}
        <StatRow>
          <StatTile label="Active Plans" value={stats?.activePlans ?? '--'} icon={<LuList />} tone="blue" />
          <StatTile label="WIP Batches" value={stats?.activeBatches ?? '--'} icon={<LuBoxes />} tone="violet" />
          <StatTile label="Nylon Issued Today (kg)" value={stats?.todayMaterialIssued ?? '--'} icon={<LuCog />} tone="orange" />
          <StatTile
            label="Completed Batches"
            value={wipBatches.filter(b => b.status === 'completed').length}
            icon={<LuCircleCheck />}
            tone="green"
          />
        </StatRow>

        {/* ------------------------------------------------------------- tabs */}
        <Toolbar>
          <Tabs
            items={[
              { key: 'wip', label: 'WIP Tracking (Kanban)', icon: <LuLayoutGrid />, count: wipBatches.length },
              { key: 'planning', label: 'Production Plans', icon: <LuList />, count: plans.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <ToolbarSpacer />
          {activeTab === 'planning' && (
            <div style={{ marginBottom: 16 }}>
              <DensitySwitch />
            </div>
          )}
        </Toolbar>

        {/* ---------------------------------------------------------- content */}
        {activeTab === 'planning' ? (
          <DataTable
            columns={planColumns}
            rows={plans}
            loading={loading}
            rowKey={(p) => p._id}
            empty={
              <EmptyState
                icon={<LuList />}
                title="No production plans yet"
                text="Create a plan to schedule shots for a model."
                action={
                  isSupervisor ? (
                    <Button variant="primary" icon={<LuPlus />} onClick={() => setShowPlanModal(true)}>
                      Create Plan
                    </Button>
                  ) : null
                }
              />
            }
          />
        ) : (
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              paddingBottom: 16,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {Object.entries(STAGES).map(([stageKey, stageInfo]) => {
              const stageBatches = wipBatches.filter(b => b.currentStage === stageKey && b.status !== 'qc_failed');
              return (
                <Surface
                  key={stageKey}
                  pad={false}
                  style={{
                    flex: '0 0 min(320px, 86vw)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '70vh',
                    background: 'var(--bg-subtle)',
                    borderColor: `color-mix(in srgb, ${stageInfo.color} 24%, transparent)`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: `1px solid color-mix(in srgb, ${stageInfo.color} 24%, transparent)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      background: `linear-gradient(to right, color-mix(in srgb, ${stageInfo.color} 10%, transparent), transparent)`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        color: stageInfo.color, fontWeight: 700,
                        fontSize: 'var(--fs-sm)', minWidth: 0,
                      }}
                    >
                      <span style={{ display: 'inline-flex', flexShrink: 0 }}>{stageInfo.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stageInfo.label}
                      </span>
                    </div>
                    <span
                      style={{
                        background: `color-mix(in srgb, ${stageInfo.color} 16%, transparent)`,
                        color: stageInfo.color,
                        padding: '2px 9px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {stageBatches.length}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      overflowY: 'auto',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {loading ? (
                      <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-ghost)', fontSize: 'var(--fs-sm)' }}>
                        Loading batches…
                      </div>
                    ) : stageBatches.length === 0 ? (
                      <EmptyState
                        icon={<LuPackage />}
                        title="No batches here"
                        text="Batches move in as the previous stage clears QC."
                      />
                    ) : stageBatches.map(b => (
                      <Surface key={b._id} className="kanban-card" style={{ padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)', fontWeight: 700 }}>
                            {b.batchNumber}
                          </span>
                          {b.status === 'completed' && (
                            <span style={{ color: 'var(--success)', display: 'inline-flex' }}><LuCircleCheck /></span>
                          )}
                        </div>

                        <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
                          {b.planId?.modelNumber || 'Unknown Model'}
                        </div>

                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                          Nylon Issued: <strong style={{ color: 'var(--text-primary)' }}>{b.materialIssued}kg</strong>
                        </div>

                        {isProduction && b.status === 'active' && stageKey !== 'ready_for_assembly' && (
                          <div style={{ marginTop: 10 }}>
                            <Button variant="primary" size="sm" block onClick={() => openStageModal(b)}>
                              Log Output & QC
                            </Button>
                          </div>
                        )}
                      </Surface>
                    ))}
                  </div>
                </Surface>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------- create plan form */}
        <Dialog
          open={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          title="Create Production Plan"
          subtitle="Schedules a target number of shots for one model."
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowPlanModal(false)}>Cancel</Button>
              <Button type="submit" form="create-plan-form" variant="primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Plan'}
              </Button>
            </>
          }
        >
          <form id="create-plan-form" onSubmit={handleCreatePlan}>
            <FormGrid>
              <Field label="Model Number" required span="all">
                <Input
                  placeholder="e.g. TRACKBELLS-2627.35..."
                  value={planForm.modelNumber}
                  onChange={e => setPlanForm({ ...planForm, modelNumber: e.target.value })}
                />
              </Field>
              <Field label="Planned Shots" required span="all">
                <Input
                  type="number"
                  placeholder="Target shots quantity"
                  value={planForm.plannedShots}
                  onChange={e => setPlanForm({ ...planForm, plannedShots: e.target.value })}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ---------------------------------------------- issue material form */}
        <Dialog
          open={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          title="Issue Material (Create WIP Batch)"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button type="submit" form="issue-material-form" variant="accent" disabled={submitting}>
                {submitting ? 'Issuing...' : 'Issue Material'}
              </Button>
            </>
          }
        >
          <form id="issue-material-form" onSubmit={handleIssueMaterial}>
            <FormGrid>
              <Field label="Select Production Plan" required span="all">
                <Select value={wipForm.planId} onChange={e => setWipForm({ ...wipForm, planId: e.target.value })}>
                  <option value="">-- Select Plan --</option>
                  {plans.filter(p => p.status !== 'completed').map(p => (
                    <option key={p._id} value={p._id}>{p.modelNumber} ({p.plannedShots - p.completedShots} shots remaining)</option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Nylon Issued (kg)"
                required
                span="all"
                hint="This will instantly deduct from Store Inventory and create a new WIP Batch."
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount in kg"
                  value={wipForm.materialIssued}
                  onChange={e => setWipForm({ ...wipForm, materialIssued: e.target.value })}
                />
              </Field>
            </FormGrid>
          </form>
        </Dialog>

        {/* ------------------------------------------- update stage (QC) form */}
        <Dialog
          open={showStageModal && !!selectedBatch}
          onClose={() => setShowStageModal(false)}
          title={`Log Output: ${STAGES[selectedBatch?.currentStage]?.label || ''}`}
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowStageModal(false)}>Cancel</Button>
              <Button type="submit" form="update-stage-form" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save & Continue'}
              </Button>
            </>
          }
        >
          {selectedBatch && (
            <>
              <Surface
                style={{
                  marginBottom: 16,
                  background: 'color-mix(in srgb, var(--c-blue) 7%, var(--bg-card))',
                  borderColor: 'color-mix(in srgb, var(--c-blue) 28%, transparent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone="info" icon={<LuClock />}>{selectedBatch.batchNumber}</Badge>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 'var(--fs-md)' }}>
                    {selectedBatch.planId?.modelNumber}
                  </span>
                </div>
              </Surface>

              <form id="update-stage-form" onSubmit={handleUpdateStage}>
                <FormGrid>
                  <Field label="Produced Output (Shots)" required>
                    <Input
                      type="number"
                      required
                      value={stageForm.processedQty}
                      onChange={e => setStageForm({ ...stageForm, processedQty: e.target.value })}
                    />
                  </Field>
                  <Field label="Rejected Output (Shots)" required>
                    <Input
                      type="number"
                      required
                      value={stageForm.rejectedQty}
                      onChange={e => setStageForm({ ...stageForm, rejectedQty: e.target.value })}
                    />
                  </Field>
                  <Field label="QC Status" required span="all">
                    <Select value={stageForm.qcStatus} onChange={e => setStageForm({ ...stageForm, qcStatus: e.target.value })}>
                      <option value="passed">Passed (Move to next stage)</option>
                      <option value="partial">Partial Pass</option>
                      <option value="failed">Failed (Lock batch)</option>
                    </Select>
                  </Field>
                  <Field label="Remarks" span="all">
                    <Input
                      placeholder="Optional notes"
                      value={stageForm.remarks}
                      onChange={e => setStageForm({ ...stageForm, remarks: e.target.value })}
                    />
                  </Field>
                </FormGrid>
              </form>
            </>
          )}
        </Dialog>
      </Page>
    </DashboardLayout>
  );
};

export default ProductionDashboard;
