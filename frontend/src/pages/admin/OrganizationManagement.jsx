import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminOrgAPI } from '../../services/api';
import {
  LuBuilding2, LuCircleCheck, LuCircleX, LuPlus, LuShieldCheck,
  LuTrash2, LuEye, LuEyeOff, LuClock,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup,
  DataTable, Dialog, ConfirmDialog,
  Field, Input, Select, Textarea,
  Button, Badge, EmptyState,
} from '../../components/ui';

const INDUSTRIES = ['Manufacturing', 'Logistics', 'Retail', 'Other'];

const statusTone = (status) =>
  status === 'approved' ? 'success' : status === 'declined' ? 'danger' : 'warning';

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Forms
  const [remark, setRemark] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '', industry: 'Manufacturing', address: '',
    adminName: '', adminEmail: '', adminPhone: '', adminPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* Presentation-only list + confirmation state — never reaches the API. */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchOrganizations();
    const intervalId = setInterval(() => {
      fetchOrganizations();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await adminOrgAPI.getAll();
      setOrganizations(res.data.data);
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminOrgAPI.approve(id);
      toast.success('Workspace approved successfully!');
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    }
  };

  const openDeclineModal = (org) => {
    setSelectedOrg(org);
    setRemark('');
    setShowDeclineModal(true);
  };

  const handleForceReverify = async (id) => {
    try {
      await adminOrgAPI.forceReverify(id);
      toast.success('Reverification enforced successfully. OTP sent to admin.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enforce reverification');
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    if (!remark) return toast.error('Please enter a remark');

    try {
      await adminOrgAPI.decline(selectedOrg._id, remark);
      toast.success('Workspace declined');
      setShowDeclineModal(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Decline failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminOrgAPI.delete(id);
      toast.success('Organization deleted successfully');
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete organization');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminOrgAPI.create(createForm);
      toast.success('Organization created & auto-approved successfully!');
      setShowCreateModal(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------ confirmation launchers */
  const confirmApprove = (org) =>
    setConfirmAction({
      title: 'Approve this workspace?',
      text: `${org.name} will be activated and its admin gains access immediately.`,
      confirmLabel: 'Approve',
      tone: 'success',
      run: () => handleApprove(org._id),
    });

  const confirmReverify = (org) =>
    setConfirmAction({
      title: 'Enforce reverification?',
      text: `All users of ${org.name} will be locked out until the Admin enters the OTP.`,
      confirmLabel: 'Force Reverify',
      tone: 'warning',
      run: () => handleForceReverify(org._id),
    });

  const confirmDelete = (org) =>
    setConfirmAction({
      title: 'Delete this organization?',
      text: `${org.name} will be permanently deleted. This action cannot be undone and will delete all associated users.`,
      confirmLabel: 'Delete Permanently',
      tone: 'danger',
      run: () => handleDelete(org._id),
    });

  /* --------------------------------------------------------------- derived */
  const counts = {
    all: organizations.length,
    pending: organizations.filter((o) => o.status === 'pending').length,
    approved: organizations.filter((o) => o.status === 'approved').length,
    declined: organizations.filter((o) => o.status === 'declined').length,
  };

  const q = search.trim().toLowerCase();
  const visibleOrgs = organizations.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!q) return true;
    return [o.name, o.industry, o.subIndustry, o.address, o.owner?.name, o.owner?.email, o.contactEmail]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const columns = [
    {
      key: 'name',
      header: 'Organization Name',
      primary: true,
      render: (org) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.name}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            {org.address || 'No Address'}
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
      hideBelow: 900,
      render: (org) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-secondary)' }}>{org.industry}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-ghost)' }}>
            {org.subIndustry || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Admin Details',
      clamp: true,
      hideBelow: 1100,
      sortValue: (org) => org.owner?.name || '',
      render: (org) =>
        org.owner ? (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)' }}>{org.owner.name}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{org.owner.email}</div>
          </div>
        ) : (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)' }}>Org Admin</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              {org.contactEmail || `admin@${org.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
            </div>
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (org) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <Badge tone={statusTone(org.status)}>{org.status.toUpperCase()}</Badge>
          {org.status === 'declined' && org.declineRemark && (
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--danger)', maxWidth: 200 }}>
              {org.declineRemark}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'lastVerifiedAt',
      header: 'Last Verified',
      hideBelow: 1280,
      render: (org) => (
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
          {org.lastVerifiedAt
            ? new Date(org.lastVerifiedAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (org) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {org.status === 'pending' && (
            <>
              <Button size="xs" variant="success" icon={<LuCircleCheck />} onClick={() => confirmApprove(org)}>
                Approve
              </Button>
              <Button size="xs" variant="secondary" icon={<LuCircleX />} onClick={() => openDeclineModal(org)}>
                Decline
              </Button>
            </>
          )}
          {org.status === 'approved' && (
            <Button size="xs" variant="secondary" icon={<LuShieldCheck />} onClick={() => confirmReverify(org)}>
              Force Reverify
            </Button>
          )}
          <Button size="xs" variant="danger" icon={<LuTrash2 />} onClick={() => confirmDelete(org)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout pageTitle="SaaS Tenants Management">
      <Page>
        <PageHeader
          title="Platform Organizations"
          subtitle="Approve, decline, or manually create new tenant workspaces."
          actions={
            <Button variant="primary" icon={<LuPlus />} onClick={() => setShowCreateModal(true)}>
              Create Tenant
            </Button>
          }
        />

        <StatRow>
          <StatTile label="Total Tenants" value={counts.all} icon={<LuBuilding2 />} tone="primary" />
          <StatTile label="Pending Approval" value={counts.pending} icon={<LuClock />} tone="amber" />
          <StatTile label="Approved" value={counts.approved} icon={<LuCircleCheck />} tone="green" />
          <StatTile label="Declined" value={counts.declined} icon={<LuCircleX />} tone="red" />
        </StatRow>

        <Section>
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search organization, industry or admin…" />
            <ChipGroup
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'pending', label: 'Pending', count: counts.pending },
                { key: 'approved', label: 'Approved', count: counts.approved },
                { key: 'declined', label: 'Declined', count: counts.declined },
              ]}
            />
            <ToolbarSpacer />
          </Toolbar>

          <DataTable
            columns={columns}
            rows={visibleOrgs}
            loading={loading}
            empty={
              <EmptyState
                icon={<LuBuilding2 />}
                title="No organizations found."
                text="New tenant sign-ups land here for approval."
              />
            }
          />
        </Section>

        {/* Decline Modal */}
        <Dialog
          open={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          title="Decline Workspace"
          subtitle={selectedOrg?.name}
          size="sm"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowDeclineModal(false)}>Cancel</Button>
              <Button type="submit" form="org-decline-form" variant="danger" icon={<LuCircleX />}>
                Decline
              </Button>
            </>
          }
        >
          <form id="org-decline-form" onSubmit={handleDecline}>
            <Field label="Reason for Decline" required hint="The user receives this remark by email.">
              <Textarea
                placeholder="Explain why the application is declined."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                required
              />
            </Field>
          </form>
        </Dialog>

        {/* Create Modal */}
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Tenant"
          subtitle="The workspace is auto-approved and its admin can sign in right away."
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button
                type="submit"
                form="org-create-form"
                variant="primary"
                icon={<LuPlus />}
                loading={submitting}
              >
                {submitting ? 'Creating…' : 'Create Tenant'}
              </Button>
            </>
          }
        >
          <form id="org-create-form" onSubmit={handleCreate}>
            <Section title="1. Factory Details">
              <Surface>
                <FormGrid>
                  <Field label="Organization Name" required span={2}>
                    <Input
                      placeholder="e.g. Northline Industries"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Industry">
                    <Select
                      value={createForm.industry}
                      onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                      options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                    />
                  </Field>
                  <Field label="Address">
                    <Input
                      placeholder="Plant / office address"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    />
                  </Field>
                </FormGrid>
              </Surface>
            </Section>

            <Section title="2. Admin Details">
              <Surface>
                <FormGrid>
                  <Field label="Admin Name" required>
                    <Input
                      placeholder="Full name"
                      required
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </Field>
                  <Field label="Admin Email" required>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      required
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    />
                  </Field>
                  <Field label="Admin Phone">
                    <Input
                      placeholder="Contact number"
                      value={createForm.adminPhone}
                      onChange={(e) => setCreateForm({ ...createForm, adminPhone: e.target.value })}
                    />
                  </Field>
                  <Field label="Password" required hint="Minimum 6 characters.">
                    <div style={{ position: 'relative' }}>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Temporary password"
                        required
                        minLength={6}
                        value={createForm.adminPassword}
                        onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                        style={{ paddingRight: 38 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--text-muted)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0,
                        }}
                      >
                        {showPassword ? <LuEyeOff /> : <LuEye />}
                      </button>
                    </div>
                  </Field>
                </FormGrid>
              </Surface>
            </Section>
          </form>
        </Dialog>

        {/* Destructive / state-changing confirmations */}
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            const action = confirmAction;
            setConfirmAction(null);
            if (action) action.run();
          }}
          title={confirmAction?.title}
          text={confirmAction?.text}
          confirmLabel={confirmAction?.confirmLabel}
          tone={confirmAction?.tone}
        />
      </Page>
    </DashboardLayout>
  );
};

export default OrganizationManagement;
