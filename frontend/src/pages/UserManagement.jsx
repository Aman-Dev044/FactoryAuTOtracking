import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import {
  LuPlus, LuPencil, LuTrash2, LuRefreshCw, LuUsers, LuShieldCheck,
  LuBan, LuEye, LuEyeOff, LuUserCheck, LuUserX,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, FormGrid, DescList,
  Toolbar, ToolbarSpacer, SearchInput, Chip, DensitySwitch,
  DataTable, Drawer, Dialog, ConfirmDialog,
  Field, Input, Select, Checkbox,
  Button, Badge, EmptyState, Pager,
} from '../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

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


const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'var(--danger)', emoji: '👑' },
  { value: 'admin', label: 'Admin', color: 'var(--c-orange)', emoji: '🛡️' },
  { value: 'assembly_user', label: 'Assembly User', color: 'var(--warning)', emoji: '🔧' },
  { value: 'assembly_manager', label: 'Assembly Manager', color: 'var(--warning)', emoji: '🛠️' },
  { value: 'dispatch', label: 'Dispatch Officer', color: 'var(--c-cyan)', emoji: '🚚' },
  { value: 'dispatch_manager', label: 'Dispatch Manager', color: 'var(--c-blue)', emoji: '📦' },
  { value: 'gate_guard', label: 'Security Guard', color: 'var(--c-cyan)', emoji: '💂' },
  { value: 'supervisor', label: 'Supervisor', color: 'var(--c-violet)', emoji: '👷' },
  { value: 'production_manager', label: 'Production Manager', color: 'var(--success)', emoji: '⚙️' },
  { value: 'store_manager', label: 'Store Manager', color: 'var(--success)', emoji: '📦' },
  { value: 'sales', label: 'Sales Executive', color: 'var(--c-blue)', emoji: '🛒' },
  { value: 'quality_checker', label: 'Quality Checker', color: 'var(--c-violet)', emoji: '📋' },
  { value: 'purchase_manager', label: 'Purchase Manager', color: 'var(--c-pink)', emoji: '💼' },
  { value: 'purchase_user', label: 'Purchase User', color: 'var(--c-violet)', emoji: '🛍️' },
  { value: 'user', label: 'User (Custom)', color: 'var(--text-ghost)', emoji: '👤' },
];

const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[14] || ROLES[0];

/** Super admins render differently depending on whether they own the platform. */
const getRoleDisplay = (u) => {
  const roleInfo = getRoleInfo(u?.role);
  if (u?.role === 'super_admin') {
    if (u.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL) {
      return { label: 'Platform Admin', color: 'var(--c-blue)', emoji: '👑' };
    }
    return { label: 'Org Admin', color: 'var(--c-orange)', emoji: '🏢' };
  }
  return { label: roleInfo.label, color: roleInfo.color, emoji: roleInfo.emoji };
};

const PERMISSIONS = [
  { value: 'assembly', label: 'Assembly Line & Packaging' },
  { value: 'assembly_user', label: 'Assembly User' },
  { value: 'assembly_manager', label: 'Assembly Manager' },
  { value: 'dispatch', label: 'Dispatch & Shipping' },
  { value: 'gate_guard', label: 'Security Guard' },
  { value: 'supervisor', label: 'Supervisor (Production Line)' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'sales', label: 'Sales & Pipeline' },
  { value: 'quality_checker', label: 'Quality Checker' },
  { value: 'purchase_manager', label: 'Purchase Manager' },
  { value: 'purchase_user', label: 'Purchase User' },
  { value: 'purchase', label: 'Purchase & Procurement Hub' },
  { value: 'finance', label: 'Finance & Invoices' }
];

const emptyForm = {
  name: '', email: '', password: '', phone: '', department: '', role: 'user', permissions: [],
  orgName: '', orgIndustry: 'Manufacturing', orgAddress: ''
};

const INDUSTRIES = ['Manufacturing', 'Logistics', 'Automotive', 'Electronics', 'Textiles', 'Other'];

/* Role colour interpolation — role colours are data-driven, so they are mixed
   from the role token rather than picked from a fixed badge tone. */
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Small coloured pill used for the role column and the detail drawer. */
const RolePill = ({ display }) => (
  <span
    className="badge"
    style={{
      background: tint(display.color, 10),
      borderColor: tint(display.color, 26),
      color: display.color,
    }}
  >
    <span aria-hidden="true">{display.emoji}</span>
    {display.label}
  </span>
);

const Avatar = ({ name, image, color, size = 30, radius = 'var(--radius-md)' }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: color ? tint(color, 22) : 'var(--primary)',
      color: color || 'var(--on-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size > 48 ? 'var(--fs-xl)' : 'var(--fs-sm)',
      fontWeight: 700,
      flexShrink: 0,
      overflow: 'hidden',
    }}
  >
    {image ? (
      <img src={getImageUrl(image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      (name?.charAt(0) || 'U').toUpperCase()
    )}
  </span>
);

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { settings } = useOrg();

  const getDisplayName = (name) => {
    if (!name) return 'User';
    if (settings?.brandName) {
      return name
        .replace(/STR-DRG/gi, settings.brandName)
        .replace(/StarConnect/gi, settings.brandName)
        .replace(/TrackBells/gi, settings.brandName);
    }
    return name;
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newPermissions, setNewPermissions] = useState([]);

  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '', email: '', phone: '', department: '' });

  // Presentation-only state: detail drawer + delete confirmation
  const [viewUser, setViewUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterRole]);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data.data);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('Fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.createUser(formData);
      toast.success(`${getRoleInfo(formData.role).label} account created!`);
      setShowModal(false);
      setFormData(emptyForm);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setEditData({ id: u._id, name: u.name, email: u.email, phone: u.phone || '', department: u.department || '', profileImage: u.profileImage || '' });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.name || !editData.email) {
      toast.error('Name and Email are required');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.updateUser(editData.id, editData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async () => {
    if (!newRole || !selectedUser) return;
    try {
      await adminAPI.updateRole(selectedUser._id, newRole, newRole === 'user' ? newPermissions : []);
      toast.success(`Role updated to ${getRoleInfo(newRole).label}`);
      setShowRoleModal(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role update failed');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await adminAPI.toggleStatus(userId);
      toast.success(res.data.message);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status toggle failed');
    }
  };

  const handleDelete = async (userId) => {
    setDeleteTarget(null);
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setNewPermissions(u.permissions || []);
    setShowRoleModal(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

  /* ------------------------------------------------ permission predicates */
  const canDelete = (u) => (
    ((currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && u.role !== 'super_admin') ||
    (currentUser?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL)
  );

  const assignableRoles = ROLES.filter(r => {
    if (r.value === 'super_admin') return false;
    if (currentUser?.role === 'admin' && r.value === 'admin') return false;
    return true;
  });

  /* ------------------------------------------------------- role chip row */
  const roleChips = (() => {
    if (!stats?.roleDistribution) return null;
    const processedDistribution = [];
    let adminSum = 0;
    stats.roleDistribution.forEach(rd => {
      if (rd._id === 'super_admin' || rd._id === 'admin') {
        adminSum += rd.count;
      } else {
        processedDistribution.push(rd);
      }
    });
    if (adminSum > 0) {
      // Find the index to place it, let's keep Admins first by unshifting it
      processedDistribution.unshift({ _id: 'super_admin,admin', count: adminSum });
    }
    return processedDistribution;
  })();

  /* -------------------------------------------------------- grid columns */
  const columns = [
    {
      key: 'name',
      header: 'User',
      primary: true,
      sortValue: (u) => u.name || '',
      render: (u) => {
        const display = getRoleDisplay(u);
        const isCurrentUser = u._id === currentUser?._id;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
            <Avatar name={u.name} image={u.profileImage} color={display.color} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getDisplayName(u.name)}
                {isCurrentUser && (
                  <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', fontWeight: 500 }}> (You)</span>
                )}
              </span>
              <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.email}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      key: 'organization',
      header: 'Organization',
      hideBelow: 1180,
      sortValue: (u) => u.organizationId?.name || '',
      render: (u) => (
        <span style={{ color: 'var(--text-primary)' }}>{u.organizationId?.name || '--'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (u) => getRoleDisplay(u).label,
      render: (u) => <RolePill display={getRoleDisplay(u)} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideBelow: 900,
      sortValue: (u) => u.phone || '',
      render: (u) => u.phone || '--',
    },
    {
      key: 'isActive',
      header: 'Status',
      sortValue: (u) => (u.isActive ? 1 : 0),
      render: (u) => (
        <Badge tone={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      hideBelow: 1040,
      sortValue: (u) => (u.lastLogin ? new Date(u.lastLogin).getTime() : 0),
      render: (u) => <span style={{ color: 'var(--text-muted)' }}>{formatDate(u.lastLogin)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      width: '1%',
      render: (u) => {
        const isCurrentUser = u._id === currentUser?._id;
        if (isCurrentUser) return <span style={{ color: 'var(--text-ghost)' }}>--</span>;
        return (
          <span
            style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Row click opens the record too, but that isn't discoverable. */}
            <button className="icon-btn" title="View full details" aria-label="View details"
              style={{ color: 'var(--text-muted)' }} onClick={() => setViewUser(u)}>
              <LuEye />
            </button>
            <button className="icon-btn" title="Edit User" aria-label="Edit user"
              style={{ color: 'var(--c-blue)' }} onClick={() => openEditModal(u)}>
              <LuPencil />
            </button>
            <button className="icon-btn" title="Change Role" aria-label="Change role"
              style={{ color: 'var(--c-violet)' }} onClick={() => openRoleModal(u)}>
              <LuShieldCheck />
            </button>
            <button
              className="icon-btn"
              title={u.isActive ? 'Deactivate' : 'Activate'}
              aria-label={u.isActive ? 'Deactivate user' : 'Activate user'}
              style={{ color: u.isActive ? 'var(--c-orange)' : 'var(--success)' }}
              onClick={() => handleToggleStatus(u._id)}
            >
              {u.isActive ? <LuBan /> : <LuShieldCheck />}
            </button>
            {canDelete(u) && (
              <button className="icon-btn" title="Delete" aria-label="Delete user"
                style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(u)}>
                <LuTrash2 />
              </button>
            )}
          </span>
        );
      },
    },
  ];

  const viewDisplay = viewUser ? getRoleDisplay(viewUser) : null;
  const rangeStart = pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const permissionGrid = (selected, onToggle) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--sp-2)' }}>
      {PERMISSIONS.map(p => (
        <Checkbox
          key={p.value}
          label={p.label}
          checked={selected.includes(p.value)}
          onChange={(e) => onToggle(p.value, e.target.checked)}
        />
      ))}
    </div>
  );

  return (
    <DashboardLayout pageTitle="User Management">
      <Page>
        <PageHeader
          title="User Management"
          subtitle="Create accounts, assign roles and control who can reach each module."
          actions={
            <Button
              variant="primary"
              icon={<LuPlus />}
              onClick={() => { setFormData(emptyForm); setShowModal(true); }}
            >
              Create User
            </Button>
          }
        />

        {/* Stats */}
        <StatRow>
          <StatTile label="Total Users" value={stats?.totalUsers ?? '--'} icon={<LuUsers />} tone="blue" />
          <StatTile label="Active" value={stats?.activeUsers ?? '--'} icon={<LuUserCheck />} tone="green" />
          <StatTile label="Inactive" value={stats?.inactiveUsers ?? '--'} icon={<LuUserX />} tone="orange" />
          <StatTile label="Roles" value={stats?.roleDistribution?.length ?? '--'} icon={<LuShieldCheck />} tone="violet" />
        </StatRow>

        {/* Role Distribution */}
        {roleChips && roleChips.length > 0 && (
          <Section title="Roles in Use">
            <div className="chip-group">
              <Chip
                active={!filterRole}
                onClick={() => { setFilterRole(''); setPagination(p => ({ ...p, page: 1 })); }}
              >
                All roles
              </Chip>
              {roleChips.map((rd, i) => {
                let info = getRoleInfo(rd._id);
                if (rd._id === 'super_admin,admin') {
                  info = { value: 'super_admin,admin', label: 'Admins', emoji: '🏢', color: 'var(--c-orange)' };
                }
                const active = filterRole === rd._id;
                return (
                  <button
                    key={i}
                    className={`chip${active ? ' active' : ''}`}
                    onClick={() => { setFilterRole(rd._id); setPagination(p => ({ ...p, page: 1 })); }}
                    style={{
                      color: info.color,
                      background: active ? tint(info.color, 12) : undefined,
                      borderColor: active ? tint(info.color, 32) : undefined,
                    }}
                  >
                    <span aria-hidden="true">{info.emoji}</span>
                    {info.label}
                    <span
                      className="chip-count"
                      style={{ background: tint(info.color, 14), color: info.color }}
                    >
                      {rd.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Toolbar */}
        <Toolbar>
          <SearchInput
            value={search}
            placeholder="Search name, email, phone…"
            onChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }}
          />
          <Select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ height: 32, width: 180, cursor: 'pointer' }}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="super_admin,admin">🏢 Admins</option>
            {ROLES.filter(r => r.value !== 'super_admin' && r.value !== 'admin').map(r => (
              <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="sm"
            icon={<LuRefreshCw />}
            onClick={() => { setSearch(''); setFilterRole(''); }}
          >
            Reset
          </Button>
          <ToolbarSpacer />
          <DensitySwitch />
        </Toolbar>

        {/* Users table */}
        <DataTable
          columns={columns}
          rows={users}
          loading={loading}
          paginate={false}
          onRowClick={(u) => setViewUser(u)}
          empty={
            <EmptyState
              icon={<LuUsers />}
              title="No users found"
              text="No account matches the current search or role filter."
              action={
                <Button variant="primary" icon={<LuPlus />} onClick={() => { setFormData(emptyForm); setShowModal(true); }}>
                  Create User
                </Button>
              }
            />
          }
        />

        {!loading && pagination.total > 0 && (
          <div
            className="grid-foot"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginTop: 'var(--sp-3)',
            }}
          >
            <span>Showing {rangeStart}–{rangeEnd} of {pagination.total}</span>
            <Pager
              page={pagination.page}
              pageCount={pagination.pages || 1}
              onChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
            />
          </div>
        )}

        {/* ===== DETAIL DRAWER ===== */}
        <Drawer
          open={!!viewUser}
          onClose={() => setViewUser(null)}
          title={viewUser ? getDisplayName(viewUser.name) : ''}
          subtitle={viewUser?.email}
          footer={
            viewUser && viewUser._id !== currentUser?._id ? (
              <>
                <Button
                  variant="secondary"
                  icon={<LuPencil />}
                  onClick={() => { const u = viewUser; setViewUser(null); openEditModal(u); }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  icon={<LuShieldCheck />}
                  onClick={() => { const u = viewUser; setViewUser(null); openRoleModal(u); }}
                >
                  Change Role
                </Button>
              </>
            ) : null
          }
        >
          {viewUser && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
                <Avatar
                  name={viewUser.name}
                  image={viewUser.profileImage}
                  color={viewDisplay.color}
                  size={56}
                  radius="var(--radius-lg)"
                />
                <div style={{ minWidth: 0 }}>
                  <RolePill display={viewDisplay} />
                  <div style={{ marginTop: 'var(--sp-2)' }}>
                    <Badge tone={viewUser.isActive ? 'success' : 'danger'}>
                      {viewUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <DescList
                items={[
                  { label: 'Email', value: viewUser.email },
                  { label: 'Organization', value: viewUser.organizationId?.name || '--' },
                  { label: 'Phone', value: viewUser.phone || '--' },
                  { label: 'Department', value: viewUser.department || '--' },
                  { label: 'Last Login', value: formatDate(viewUser.lastLogin) },
                  { label: 'Created', value: formatDate(viewUser.createdAt) },
                ]}
              />

              {viewUser.role === 'user' && (
                <div style={{ marginTop: 'var(--sp-5)' }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                    Module permissions
                  </div>
                  {viewUser.permissions?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                      {viewUser.permissions.map((p) => (
                        <Badge key={p} tone="info">
                          {PERMISSIONS.find(x => x.value === p)?.label || p}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-ghost)' }}>No modules assigned.</div>
                  )}
                </div>
              )}
            </>
          )}
        </Drawer>

        {/* ===== CREATE USER DIALOG ===== */}
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Create New User"
          subtitle="Set up an account and decide what it can reach."
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" icon={<LuPlus />} loading={submitting} onClick={handleCreateUser}>
                {submitting ? 'Creating…' : 'Create User'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateUser}>
            <FormGrid>
              <Field label="Full Name" required>
                <Input
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
              <Field label="Password" required hint="Minimum 6 characters.">
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 chars"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30 }}
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </button>
                </div>
              </Field>
              <Field label="Phone">
                <Input
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Field>
              <Field label="Role" required span="all">
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, permissions: e.target.value === 'user' ? [] : formData.permissions })}
                  style={{ cursor: 'pointer' }}
                >
                  {assignableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                  ))}
                </Select>
              </Field>
            </FormGrid>

            {formData.role === 'admin' && (
              <Surface
                style={{
                  marginTop: 'var(--sp-4)',
                  background: 'var(--c-orange-soft)',
                  borderColor: tint('var(--c-orange)', 24),
                  boxShadow: 'none',
                }}
              >
                <h4 style={{ margin: 0, fontSize: 'var(--fs-md)', color: 'var(--c-orange)', fontWeight: 700 }}>
                  🏢 Organization Details
                </h4>
                <p style={{ margin: '4px 0 var(--sp-4)', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Fill these to create a new organization/workspace. Leave blank to add to your current organization.
                </p>
                <FormGrid>
                  <Field label="Organization Name" span="all">
                    <Input
                      placeholder="Enter organization name"
                      value={formData.orgName}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    />
                  </Field>
                  <Field label="Industry">
                    <Select
                      value={formData.orgIndustry}
                      onChange={(e) => setFormData({ ...formData, orgIndustry: e.target.value })}
                      style={{ cursor: 'pointer' }}
                    >
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Address">
                    <Input
                      placeholder="Organization address"
                      value={formData.orgAddress}
                      onChange={(e) => setFormData({ ...formData, orgAddress: e.target.value })}
                    />
                  </Field>
                </FormGrid>
              </Surface>
            )}

            {formData.role === 'user' && (
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Field label="Permissions (select modules)">
                  {permissionGrid(formData.permissions, (value, checked) => {
                    const newPerms = checked
                      ? [...formData.permissions, value]
                      : formData.permissions.filter(x => x !== value);
                    setFormData({ ...formData, permissions: newPerms });
                  })}
                </Field>
              </div>
            )}

            <div
              style={{
                marginTop: 'var(--sp-4)',
                padding: 'var(--sp-3) var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                background: tint(formData.role === 'admin' ? 'var(--c-orange)' : 'var(--c-blue)', 9),
                border: `1px solid ${tint(formData.role === 'admin' ? 'var(--c-orange)' : 'var(--c-blue)', 22)}`,
                color: formData.role === 'admin' ? 'var(--c-orange)' : 'var(--c-blue)',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.6,
              }}
            >
              {formData.role === 'admin'
                ? '🛡️ Admin — will have full access to all modules. Fill Organization Details to make this user an Org Admin (Super Admin).'
                : '👤 User — will only access the checked modules above.'}
            </div>

            <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
          </form>
        </Dialog>

        {/* ===== CHANGE ROLE DIALOG ===== */}
        <Dialog
          open={showRoleModal && !!selectedUser}
          onClose={() => setShowRoleModal(false)}
          title="Change Role"
          subtitle="Roles decide which modules this account can open."
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button variant="primary" icon={<LuShieldCheck />} onClick={handleRoleChange}>Update Role</Button>
            </>
          }
        >
          {selectedUser && (
            <>
              <Surface style={{ marginBottom: 'var(--sp-5)', background: 'var(--bg-subtle)', boxShadow: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <Avatar
                    name={selectedUser.name}
                    image={selectedUser.profileImage}
                    color={getRoleDisplay(selectedUser).color}
                    size={40}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 'var(--fs-md)' }}>
                      {getDisplayName(selectedUser.name)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{selectedUser.email}</div>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <span
                    className="badge"
                    style={{
                      background: tint(getRoleInfo(selectedUser.role).color, 10),
                      borderColor: tint(getRoleInfo(selectedUser.role).color, 26),
                      color: getRoleInfo(selectedUser.role).color,
                    }}
                  >
                    Current: {getRoleInfo(selectedUser.role).label}
                  </span>
                </div>
              </Surface>

              <Field label="Select base role">
                <Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {assignableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.emoji} &nbsp; {r.label}</option>
                  ))}
                </Select>
              </Field>

              {newRole === 'user' && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <Field label="Assign permissions">
                    {permissionGrid(newPermissions, (value, checked) => {
                      const newPerms = checked
                        ? [...newPermissions, value]
                        : newPermissions.filter(x => x !== value);
                      setNewPermissions(newPerms);
                    })}
                  </Field>
                </div>
              )}
            </>
          )}
        </Dialog>

        {/* ===== EDIT USER DIALOG ===== */}
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Profile"
          subtitle="Update User Details and Contact Info"
          size="lg"
          footer={
            <>
              <Button variant="cancel" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={handleEditSubmit}>
                {submitting ? 'Saving Changes…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <Surface style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)', background: 'var(--bg-subtle)', boxShadow: 'none' }}>
            <Avatar name={editData.name} image={editData.profileImage} size={56} radius="var(--radius-lg)" />
            <div style={{ minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: 'var(--fs-md)', color: 'var(--text-primary)', fontWeight: 700 }}>
                {getDisplayName(editData.name) || 'User'}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                {editData.email}
              </p>
            </div>
          </Surface>

          <form onSubmit={handleEditSubmit}>
            <FormGrid>
              <Field label="Full Name" required>
                <Input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email Address" required>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </Field>
              <Field label="Department">
                <Input
                  type="text"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                />
              </Field>
            </FormGrid>
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
          </form>
        </Dialog>

        {/* ===== DELETE CONFIRMATION ===== */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && handleDelete(deleteTarget._id)}
          title="Delete this user?"
          text={`Permanently delete ${deleteTarget ? getDisplayName(deleteTarget.name) : 'this user'}? This cannot be undone.`}
          confirmLabel="Delete User"
        />
      </Page>
    </DashboardLayout>
  );
};

export default UserManagement;
