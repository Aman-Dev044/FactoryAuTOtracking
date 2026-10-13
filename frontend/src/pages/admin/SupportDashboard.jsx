import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supportAPI } from '../../services/api';
import {
  LuMail, LuPhone, LuClock, LuCircleCheck, LuReply,
  LuMessageSquare, LuRefreshCw, LuInbox, LuSend, LuTicket,
  LuEye,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import {
  Page, PageHeader, Section, Surface, StatRow, StatTile, DescList,
  Toolbar, ToolbarSpacer, SearchInput, ChipGroup,
  DataTable, Drawer, Dialog,
  Field, Textarea,
  Button, Badge, EmptyState,
} from '../../components/ui';

/** Status is a two-state machine on the server: pending → replied. */
const statusTone = (status) => (status === 'pending' ? 'warning' : 'success');
const statusLabel = (status) => (status === 'pending' ? 'Pending Reply' : 'Replied');

const SupportDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reply Modal/Inline State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Presentation-only list state — never reaches the API. */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTicket, setDetailTicket] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.getTickets();
      setTickets(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error('Please enter a response content');
      return;
    }

    setSubmitting(true);
    try {
      await supportAPI.replyTicket(activeTicket._id, replyText);
      toast.success('Reply email sent successfully!');
      setReplyText('');
      setActiveTicket(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const openReply = (ticket) => {
    setActiveTicket(ticket);
    setReplyText('');
  };

  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const repliedCount = tickets.length - pendingCount;

  const q = search.trim().toLowerCase();
  const visibleTickets = tickets.filter((t) => {
    if (statusFilter === 'pending' && t.status !== 'pending') return false;
    if (statusFilter === 'replied' && t.status === 'pending') return false;
    if (!q) return true;
    return [t.name, t.email, t.mobile, t.concern]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const columns = [
    {
      key: 'name',
      header: 'Requester',
      primary: true,
      render: (t) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
          <a
            href={`mailto:${t.email}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textDecoration: 'none',
            }}
          >
            <LuMail /> {t.email}
          </a>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Contact',
      hideBelow: 900,
      render: (t) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <LuPhone style={{ color: 'var(--text-ghost)' }} /> {t.mobile || '—'}
        </span>
      ),
    },
    {
      key: 'concern',
      header: 'Concern',
      clamp: true,
      hideBelow: 640,
      sortable: false,
      render: (t) => (
        <span
          title={t.concern}
          style={{
            display: 'block', maxWidth: 360, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {t.concern}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      hideBelow: 1100,
      render: (t) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
          <LuClock /> {new Date(t.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge tone={statusTone(t.status)} icon={t.status === 'pending' ? <LuClock /> : <LuCircleCheck />}>
          {statusLabel(t.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      sortable: false,
      render: (t) =>
        t.status === 'pending' ? (
          <span style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
            {/* The concern column is clamped, so give it an explicit way out. */}
            <Button
              size="xs"
              variant="ghost"
              icon={<LuEye />}
              title="View full concern"
              onClick={(e) => { e.stopPropagation(); setDetailTicket(t); }}
            />
            <Button
              size="xs"
              variant="primary"
              icon={<LuReply />}
              onClick={(e) => { e.stopPropagation(); openReply(t); }}
            >
              Write Reply
            </Button>
          </span>
        ) : (
          <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetailTicket(t); }}>
            View
          </Button>
        ),
    },
  ];

  return (
    <DashboardLayout pageTitle="Help & Support Operations">
      <Page>
        <PageHeader
          title="User Inquiries & Support Tickets"
          subtitle="Review issues, concerns, and questions logged by users, and reply to their email address directly using SMTP."
          actions={
            <Button variant="secondary" icon={<LuRefreshCw />} onClick={fetchTickets} disabled={loading}>
              Refresh
            </Button>
          }
        />

        <StatRow>
          <StatTile label="Total Tickets" value={tickets.length} icon={<LuTicket />} tone="primary" />
          <StatTile label="Pending Reply" value={pendingCount} icon={<LuClock />} tone="amber" />
          <StatTile label="Replied" value={repliedCount} icon={<LuCircleCheck />} tone="green" />
        </StatRow>

        <Section>
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or concern…" />
            <ChipGroup
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { key: 'all', label: 'All', count: tickets.length },
                { key: 'pending', label: 'Pending', count: pendingCount },
                { key: 'replied', label: 'Replied', count: repliedCount },
              ]}
            />
            <ToolbarSpacer />
          </Toolbar>

          <DataTable
            columns={columns}
            rows={visibleTickets}
            loading={loading}
            onRowClick={(t) => setDetailTicket(t)}
            empty={
              <EmptyState
                icon={<LuInbox />}
                title="No Support Tickets Found"
                text="All customer queries and support issues have been resolved."
              />
            }
          />
        </Section>

        {/* Ticket detail */}
        <Drawer
          open={!!detailTicket}
          onClose={() => setDetailTicket(null)}
          title={detailTicket?.name}
          subtitle={detailTicket?.email}
          footer={
            detailTicket?.status === 'pending' ? (
              <Button
                variant="primary"
                icon={<LuReply />}
                onClick={() => { const t = detailTicket; setDetailTicket(null); openReply(t); }}
              >
                Write Reply
              </Button>
            ) : null
          }
        >
          {detailTicket && (
            <>
              <DescList
                items={[
                  {
                    label: 'Status',
                    value: (
                      <Badge tone={statusTone(detailTicket.status)}>{statusLabel(detailTicket.status)}</Badge>
                    ),
                  },
                  { label: 'Email', value: detailTicket.email },
                  { label: 'Mobile', value: detailTicket.mobile },
                  { label: 'Received', value: new Date(detailTicket.createdAt).toLocaleString() },
                  {
                    label: 'Replied at',
                    value: detailTicket.repliedAt ? new Date(detailTicket.repliedAt).toLocaleString() : '',
                  },
                ]}
              />

              <Section title="User Concern">
                <Surface>
                  <p style={{
                    margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.65,
                    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                  }}>
                    {detailTicket.concern}
                  </p>
                </Surface>
              </Section>

              {detailTicket.status === 'replied' && (
                <Section title="Support Response">
                  <Surface
                    style={{
                      background: 'color-mix(in srgb, var(--success) 8%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--success) 26%, transparent)',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                      fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: '0.4px',
                      textTransform: 'uppercase', color: 'var(--success)',
                    }}>
                      <LuCircleCheck /> Sent {detailTicket.repliedAt ? new Date(detailTicket.repliedAt).toLocaleString() : ''}
                    </div>
                    <p style={{
                      margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.65,
                      color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                    }}>
                      {detailTicket.replyText}
                    </p>
                  </Surface>
                </Section>
              )}
            </>
          )}
        </Drawer>

        {/* Reply Modal */}
        <Dialog
          open={!!activeTicket}
          onClose={() => setActiveTicket(null)}
          title={activeTicket ? `Reply to ${activeTicket.name}` : 'Reply'}
          subtitle={activeTicket ? `Sent immediately to ${activeTicket.email} using SMTP.` : undefined}
          footer={
            <>
              <Button variant="cancel" onClick={() => setActiveTicket(null)}>Cancel</Button>
              <Button
                type="submit"
                form="support-reply-form"
                variant="primary"
                icon={<LuSend />}
                loading={submitting}
              >
                {submitting ? 'Sending…' : 'Send Back'}
              </Button>
            </>
          }
        >
          {activeTicket && (
            <>
              <Surface style={{ marginBottom: 'var(--sp-4)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                  fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.4px',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  <LuMessageSquare /> Original message
                </div>
                <p style={{
                  margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.6,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                }}>
                  {activeTicket.concern}
                </p>
              </Surface>

              <form id="support-reply-form" onSubmit={handleReplySubmit}>
                <Field label="Your Response" required hint="The user receives this as an email reply.">
                  <Textarea
                    required
                    rows={6}
                    placeholder="Type your response here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </Field>
              </form>
            </>
          )}
        </Dialog>
      </Page>
    </DashboardLayout>
  );
};

export default SupportDashboard;
