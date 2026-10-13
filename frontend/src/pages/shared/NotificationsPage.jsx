import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import {
  LuBell,
  LuChevronDown,
  LuChevronUp,
  LuCheckCheck,
  LuBuilding2,
  LuMailOpen,
} from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Pagination from '../../components/common/Pagination';
import {
  Page, PageHeader, Surface, DescList, Badge, Button, EmptyState, Skeleton,
} from '../../components/ui';

/* ------------------------------------------------------------- helpers */
const typeLabel = (type) => (type ? String(type).replace(/_/g, ' ') : 'General Alert');

const typeTone = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('reject') || t.includes('fail') || t.includes('short') || t.includes('alert')) return 'danger';
  if (t.includes('approv') || t.includes('complet') || t.includes('verified') || t.includes('success')) return 'success';
  if (t.includes('pending') || t.includes('due') || t.includes('warn')) return 'warning';
  return 'neutral';
};

const timeAgo = (value) => {
  const d = new Date(value);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [expandedId, setExpandedId] = useState(null);

  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const res = user?.role === 'super_admin'
        ? await notificationAPI.getSuperadminNotifications(page, 10)
        : await notificationAPI.getNotifications(page, 10);

      setNotifications(res.data.data);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchNotifications(newPage);
      setExpandedId(null);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (notification) => {
    const isExpanding = expandedId !== notification._id;
    setExpandedId(isExpanding ? notification._id : null);
    if (isExpanding && !notification.isRead) {
      handleMarkRead(notification._id);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout pageTitle="Notifications">
      <Page>
        <PageHeader
          title="Notifications Center"
          subtitle="Real-time Activity Logs and System Alerts"
          actions={
            <>
              {unreadCount > 0 && <Badge tone="info">{unreadCount} unread</Badge>}
              <Button variant="secondary" icon={<LuCheckCheck />} onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            </>
          }
        />

        {loading ? (
          <Surface pad={false} style={{ overflow: 'hidden' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 18px',
                  borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none',
                }}
              >
                <Skeleton w={40} h={40} radius="var(--radius-md)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton w="42%" h={11} />
                  <div style={{ height: 8 }} />
                  <Skeleton w="72%" h={9} />
                </div>
              </div>
            ))}
          </Surface>
        ) : notifications.length === 0 ? (
          <Surface>
            <EmptyState
              icon={<LuMailOpen />}
              title="No notifications yet"
              text="You're all caught up — new activity and system alerts will land here."
            />
          </Surface>
        ) : (
          <Surface pad={false} style={{ overflow: 'hidden' }}>
            {notifications.map((n, idx) => {
              const isExpanded = expandedId === n._id;
              const orgColor = n.organization?.color || 'var(--c-blue)';
              return (
                <div
                  key={n._id}
                  style={{
                    background: !n.isRead
                      ? 'color-mix(in srgb, var(--primary) 6%, transparent)'
                      : 'transparent',
                    borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  {/* ------------------------------------------- summary row */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(n);
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      userSelect: 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 38, height: 38, borderRadius: 'var(--radius-md)',
                        background: !n.isRead ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: !n.isRead ? 'var(--on-primary)' : 'var(--text-muted)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.05rem', flexShrink: 0,
                      }}
                    >
                      <LuBell />
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span
                          style={{
                            fontSize: 'var(--fs-md)',
                            fontWeight: !n.isRead ? 700 : 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {n.title}
                        </span>

                        <Badge tone={typeTone(n.type)}>
                          <span style={{ textTransform: 'capitalize' }}>{typeLabel(n.type)}</span>
                        </Badge>

                        {!n.isRead && <Badge tone="info">New</Badge>}

                        {user?.role === 'super_admin' && n.organization && (
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: `color-mix(in srgb, ${orgColor} 13%, transparent)`,
                              color: orgColor,
                              padding: '2px 8px', borderRadius: 'var(--radius-full)',
                              fontWeight: 700, fontSize: 'var(--fs-2xs)',
                            }}
                          >
                            <LuBuilding2 /> {n.organization.name}
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--fs-sm)',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          whiteSpace: isExpanded ? 'normal' : 'nowrap',
                          overflow: isExpanded ? 'visible' : 'hidden',
                          textOverflow: isExpanded ? 'clip' : 'ellipsis',
                        }}
                      >
                        {n.message}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 'var(--fs-xs)',
                          color: 'var(--text-ghost)',
                          whiteSpace: 'nowrap',
                        }}
                        title={new Date(n.createdAt).toLocaleString()}
                      >
                        {timeAgo(n.createdAt)}
                      </span>

                      <span
                        style={{
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: 4,
                        }}
                        aria-hidden="true"
                      >
                        {isExpanded ? <LuChevronUp /> : <LuChevronDown />}
                      </span>
                    </div>
                  </div>

                  {/* ------------------------------------- expanded details */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px 16px' }}>
                      <div
                        style={{
                          background: 'var(--bg-subtle)',
                          padding: 14,
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--fs-base)',
                          lineHeight: 1.6,
                          color: 'var(--text-primary)',
                          marginBottom: 12,
                        }}
                      >
                        {n.message}
                      </div>

                      <DescList
                        items={[
                          { label: 'Timestamp', value: new Date(n.createdAt).toLocaleString() },
                          {
                            label: 'Event type',
                            value: <span style={{ textTransform: 'capitalize' }}>{typeLabel(n.type)}</span>,
                          },
                          n.actionBy
                            ? {
                                label: 'Triggered by',
                                value: (
                                  <>
                                    {n.actionBy.name}{' '}
                                    <span style={{ color: 'var(--text-muted)' }}>({n.actionBy.role})</span>
                                  </>
                                ),
                              }
                            : null,
                          user?.role === 'super_admin' && n.organization
                            ? {
                                label: 'Organization',
                                value: <span style={{ color: orgColor, fontWeight: 600 }}>{n.organization.name}</span>,
                              }
                            : null,
                        ].filter(Boolean)}
                      />

                      {n.metadata && Object.keys(n.metadata).length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <span
                            style={{
                              fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-muted)',
                              display: 'block', marginBottom: 6, textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}
                          >
                            Attached metadata
                          </span>
                          <pre
                            style={{
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--c-cyan)',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--fs-xs)',
                              margin: 0,
                              overflowX: 'auto',
                              maxWidth: '100%',
                            }}
                          >
                            {JSON.stringify(n.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls (10 per page) */}
            {pagination.pages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit || 10}
                onPageChange={handlePageChange}
              />
            )}
          </Surface>
        )}
      </Page>
    </DashboardLayout>
  );
};

export default NotificationsPage;
