import { useEffect, useState, useCallback } from 'react';
import {
  Send, Search, Eye, Trash2, Users, Radio as BroadcastIcon,
  User, Filter, X, AlertCircle, Mail,
  CheckCheck, Clock, Download, MessageSquareReply,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { useBypass } from '../../contexts/BypassContext';
import { ADMIN_PROFILE_ID } from '../../contexts/BypassContext';

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  email?: string | null;
}

interface Community {
  id: string;
  name: string;
  member_count: number;
}

interface AdminMessage {
  id: string;
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'alert';
  send_type: 'individual' | 'community' | 'broadcast';
  target_user_id: string | null;
  target_community_id: string | null;
  sent_by: string | null;
  created_at: string;
}

interface RecipientRow {
  id: string;
  message_id: string;
  recipient_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient?: { full_name: string | null; username: string | null } | null;
  message?: AdminMessage | null;
}

interface FlatRow {
  recipientId: string;
  recipientName: string;
  message: AdminMessage;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  alert: { label: 'Alert', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
};

export function MessagingManager() {
  const { bypassMode, bypassUserId } = useBypass();
  const [rows, setRows] = useState<FlatRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<FlatRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMessage | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    broadcast: false,
    sendType: 'individual' as 'individual' | 'community' | 'broadcast',
    targetUserId: '',
    targetCommunityId: '',
    priority: 'normal' as 'normal' | 'high' | 'alert',
    subject: '',
    body: '',
    allowReply: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [recipientsRes, profilesRes, communitiesRes] = await Promise.all([
      supabase
        .from('admin_message_recipients')
        .select('*, recipient:recipient_id(full_name, username), message:message_id(*)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('id, full_name, username').order('full_name').limit(200),
      supabase.from('communities').select('id, name, member_count').eq('is_active', true).order('name'),
    ]);

    const flat: FlatRow[] = ((recipientsRes.data || []) as RecipientRow[])
      .filter(r => r.message)
      .map(r => ({
        recipientId: r.recipient_id,
        recipientName: r.recipient?.full_name || r.recipient?.username || r.recipient_id,
        message: r.message as AdminMessage,
        is_read: r.is_read,
        read_at: r.read_at,
        created_at: r.created_at,
      }));

    setRows(flat);
    setProfiles(profilesRes.data || []);
    setCommunities(communitiesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    setSendError('');
    if (!form.subject.trim()) { setSendError('Subject is required.'); return; }
    if (!form.body.trim()) { setSendError('Message body is required.'); return; }
    if (form.sendType === 'individual' && !form.targetUserId) { setSendError('Please select a recipient.'); return; }
    if (form.sendType === 'community' && !form.targetCommunityId) { setSendError('Please select a community.'); return; }
    setSending(true);

    let senderId: string | null = null;
    if (bypassMode) {
      senderId = bypassUserId ?? ADMIN_PROFILE_ID;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      senderId = user?.id ?? null;
    }

    const { data: msg, error: msgErr } = await supabase.from('admin_messages').insert({
      subject: form.subject.trim(),
      body: form.body.trim(),
      priority: form.priority,
      send_type: form.sendType,
      target_user_id: form.sendType === 'individual' ? form.targetUserId : null,
      target_community_id: form.sendType === 'community' ? form.targetCommunityId : null,
      sent_by: senderId,
      allow_reply: form.sendType === 'individual' ? form.allowReply : false,
    }).select('id').single();

    if (msgErr || !msg) { setSendError(msgErr?.message || 'Failed to create message.'); setSending(false); return; }

    let recipientIds: string[] = [];

    if (form.sendType === 'individual') {
      recipientIds = [form.targetUserId];
    } else if (form.sendType === 'community') {
      const { data: members } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', form.targetCommunityId);
      recipientIds = (members || []).map((m: { user_id: string }) => m.user_id);
    } else {
      const { data: all } = await supabase.from('profiles').select('id');
      recipientIds = (all || []).map((p: { id: string }) => p.id);
    }

    if (recipientIds.length > 0) {
      const inserts = recipientIds.map(rid => ({ message_id: msg.id, recipient_id: rid }));
      await supabase.from('admin_message_recipients').insert(inserts);
    }

    setSending(false);
    setComposeOpen(false);
    setForm({
      broadcast: false, sendType: 'individual', targetUserId: '', targetCommunityId: '',
      priority: 'normal', subject: '', body: '', allowReply: false,
    });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('admin_messages').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    await load();
  };

  const filtered = rows.filter(r => {
    if (search.trim() && !r.message.subject.toLowerCase().includes(search.toLowerCase()) && !r.recipientName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== 'all' && r.message.priority !== filterPriority) return false;
    if (filterStatus === 'read' && !r.is_read) return false;
    if (filterStatus === 'unread' && r.is_read) return false;
    if (dateFrom && r.created_at < dateFrom) return false;
    if (dateTo && r.created_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  const totalMessages = rows.length;
  const readCount = rows.filter(r => r.is_read).length;
  const unreadCount = rows.filter(r => !r.is_read).length;
  const broadcastCount = rows.filter(r => r.message.send_type === 'broadcast').length;

  const exportCSV = () => {
    const header = 'Date,Recipient,Subject,Priority,Status\n';
    const body = filtered.map(r =>
      `${new Date(r.created_at).toLocaleDateString()},"${r.recipientName}","${r.message.subject}",${r.message.priority},${r.is_read ? 'Read' : 'Unread'}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'messages.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Messaging Administration</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Send and manage messages to users</p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" /> Compose Message
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: totalMessages, icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Read Messages', value: readCount, icon: CheckCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Unread Messages', value: unreadCount, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Broadcast Messages', value: broadcastCount, icon: BroadcastIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="alert">Alert</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {rows.length} messages</p>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export to CSV
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_1fr_90px_90px_80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 border-b border-border bg-secondary/40">
          <span>Date</span>
          <span>Recipient</span>
          <span>Subject</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((row, i) => {
              const pc = PRIORITY_CONFIG[row.message.priority];
              return (
                <div key={`${row.message.id}-${row.recipientId}-${i}`} className="grid grid-cols-[90px_1fr_1fr_90px_90px_80px] items-center px-5 py-3.5 hover:bg-accent/20 transition-colors">
                  <span className="text-sm text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
                  <span className="text-sm font-medium truncate pr-3">{row.recipientName}</span>
                  <span className="text-sm truncate pr-3">{row.message.subject}</span>
                  <span>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${pc.color}`}>
                      {pc.label}
                    </span>
                  </span>
                  <span>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${row.is_read ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                      {row.is_read ? 'Read' : 'Unread'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewRow(row)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(row.message)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Compose Message" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Send To</label>
            <div className="flex gap-2">
              {([
                { id: 'individual', label: 'Individual', icon: User },
                { id: 'community', label: 'Community', icon: Users },
                { id: 'broadcast', label: 'Broadcast (All)', icon: BroadcastIcon },
              ] as { id: 'individual' | 'community' | 'broadcast'; label: string; icon: React.ElementType }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, sendType: t.id }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.sendType === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.sendType === 'individual' && (
            <div>
              <label className="block text-sm font-medium mb-1">Recipient <span className="text-red-500">*</span></label>
              <select
                value={form.targetUserId}
                onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select a user...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.username || p.id}</option>
                ))}
              </select>
            </div>
          )}

          {form.sendType === 'community' && (
            <div>
              <label className="block text-sm font-medium mb-1">Community <span className="text-red-500">*</span></label>
              <select
                value={form.targetCommunityId}
                onChange={e => setForm(f => ({ ...f, targetCommunityId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select a community...</option>
                {communities.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.member_count} members)</option>
                ))}
              </select>
            </div>
          )}

          {form.sendType === 'broadcast' && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <BroadcastIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
              This message will be sent to all users in the system.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'normal' | 'high' | 'alert' }))}
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="alert">Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject <span className="text-red-500">*</span></label>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Message subject..."
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message Body <span className="text-red-500">*</span></label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Write your message..."
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {form.sendType === 'individual' && (
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, allowReply: !f.allowReply }))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                form.allowReply
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border hover:border-border/80 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquareReply className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <p className={`text-sm font-medium ${form.allowReply ? 'text-primary' : 'text-foreground'}`}>Allow Recipient to Reply</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recipient can send a direct reply back to you</p>
                </div>
              </div>
              <div className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${form.allowReply ? 'bg-primary' : 'bg-border'}`}
                style={{ width: '40px', height: '22px' }}>
                <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${form.allowReply ? 'translate-x-5' : 'translate-x-0.5'}`}
                  style={{ width: '18px', height: '18px', top: '2px', left: form.allowReply ? '20px' : '2px', transition: 'left 0.15s' }} />
              </div>
            </button>
          )}

          {sendError && <p className="text-sm text-red-500">{sendError}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setComposeOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              Send Message
            </button>
          </div>
        </div>
      </Modal>

      {previewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Message Preview</h3>
              </div>
              <button onClick={() => setPreviewRow(null)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${PRIORITY_CONFIG[previewRow.message.priority].color}`}>
                  {PRIORITY_CONFIG[previewRow.message.priority].label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(previewRow.created_at).toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${previewRow.is_read ? 'text-green-500' : 'text-orange-500'}`}>
                  {previewRow.is_read ? 'Read' : 'Unread'}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">To</p>
                <p className="font-semibold">{previewRow.recipientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Subject</p>
                <p className="font-semibold">{previewRow.message.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Message</p>
                <div className="bg-secondary rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{previewRow.message.body}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Message" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground">Delete this message and remove it from all recipients' inboxes? This cannot be undone.</p>
          <div className="bg-secondary rounded-lg px-4 py-3">
            <p className="font-medium text-sm">{deleteTarget?.subject}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
