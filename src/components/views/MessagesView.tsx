import { useEffect, useState, useCallback } from 'react';
import {
  Mail, MailOpen, AlertCircle, ArrowUpCircle, Inbox,
  Clock, CheckCheck, Reply, Send, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';

interface MessageItem {
  id: string;
  message_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'alert';
  send_type: string;
  allow_reply: boolean;
  sender_name: string | null;
  sender_id: string | null;
  sender_is_admin: boolean;
}

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Mail },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: ArrowUpCircle },
  alert: { label: 'Alert', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertCircle },
};

type FilterType = 'all' | 'unread' | 'read';

export function MessagesView() {
  const { bypassUserId } = useBypass();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showReply, setShowReply] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(bypassUserId);
    setCurrentUserId(userId);
    if (!userId) { setLoading(false); return; }

    const { data } = await supabase
      .from('admin_message_recipients')
      .select('id, message_id, is_read, read_at, created_at, message:message_id(subject, body, priority, send_type, allow_reply, sent_by, created_at)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const senderIds = [...new Set((data as any[]).map(r => r.message?.sent_by).filter(Boolean))];
    let senderMap: Record<string, string> = {};
    let adminIds = new Set<string>();
    if (senderIds.length > 0) {
      const [{ data: senders }, { data: adminRoles }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username').in('id', senderIds),
        supabase.from('user_roles').select('user_id').eq('role', 'admin').in('user_id', senderIds),
      ]);
      for (const s of (senders || [])) {
        senderMap[s.id] = s.full_name || s.username || 'System';
      }
      for (const r of (adminRoles || [])) {
        adminIds.add(r.user_id);
      }
    }

    const items: MessageItem[] = (data as any[]).map(r => ({
      id: r.id,
      message_id: r.message_id,
      is_read: r.is_read,
      read_at: r.read_at,
      created_at: r.created_at,
      subject: r.message?.subject || '(No subject)',
      body: r.message?.body || '',
      priority: r.message?.priority || 'normal',
      send_type: r.message?.send_type || 'individual',
      allow_reply: r.message?.allow_reply ?? false,
      sender_name: r.message?.sent_by ? (senderMap[r.message.sent_by] || 'System') : 'System',
      sender_id: r.message?.sent_by || null,
      sender_is_admin: r.message?.sent_by ? adminIds.has(r.message.sent_by) : false,
    }));

    setMessages(items);
    setLoading(false);
  }, [bypassUserId]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (item: MessageItem) => {
    if (item.is_read) return;
    await supabase.from('admin_message_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', item.id);
    setMessages(prev => prev.map(m => m.id === item.id ? { ...m, is_read: true } : m));
  };

  const openMessage = async (item: MessageItem) => {
    setSelected(item);
    setShowReply(false);
    setReplySubject(`Re: ${item.subject}`);
    setReplyBody('');
    setReplySuccess(false);
    setReplyError(null);
    await markRead(item);
  };

  const closeModal = () => {
    setSelected(null);
    setShowReply(false);
    setReplySuccess(false);
    setReplyError(null);
  };

  const markAllRead = async () => {
    if (!currentUserId) return;
    const unreadIds = messages.filter(m => !m.is_read).map(m => m.id);
    if (unreadIds.length === 0) return;
    await supabase.from('admin_message_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
  };

  const sendReply = async () => {
    if (!selected || !currentUserId || !replyBody.trim()) return;
    if (!selected.sender_id) {
      setReplyError('Cannot reply — the sender has no reachable inbox.');
      return;
    }
    setReplySending(true);
    setReplyError(null);
    try {
      const { data: msg, error: msgErr } = await supabase
        .from('admin_messages')
        .insert({
          subject: replySubject.trim() || `Re: ${selected.subject}`,
          body: replyBody.trim(),
          priority: 'normal',
          send_type: 'individual',
          target_user_id: selected.sender_id,
          sent_by: currentUserId,
        })
        .select('id')
        .single();

      if (msgErr || !msg) {
        setReplyError(msgErr?.message || 'Failed to send reply.');
        setReplySending(false);
        return;
      }

      const { error: recErr } = await supabase
        .from('admin_message_recipients')
        .insert({ message_id: msg.id, recipient_id: selected.sender_id });

      if (recErr) {
        setReplyError(recErr.message || 'Reply sent but failed to deliver.');
        setReplySending(false);
        return;
      }

      setReplySuccess(true);
      setShowReply(false);
    } catch {
      setReplyError('An unexpected error occurred.');
    } finally {
      setReplySending(false);
    }
  };

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.is_read;
    if (filter === 'read') return m.is_read;
    return true;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Mail className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Messages</h2>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">{unreadCount}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Platform messages and important notifications from the admin team.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 border border-border w-fit">
        {([
          { id: 'all', label: `All (${messages.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'read', label: `Read (${messages.length - unreadCount})` },
        ] as { id: FilterType; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">
            {filter === 'unread' ? 'No unread messages' : filter === 'read' ? 'No read messages' : 'Your inbox is empty'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Platform messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const pc = PRIORITY_CONFIG[item.priority];
            const PriorityIcon = pc.icon;
            return (
              <button
                key={item.id}
                onClick={() => openMessage(item)}
                className={`w-full text-left bg-card border rounded-xl px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all ${
                  !item.is_read ? 'border-primary/30 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${pc.color}`}>
                    <PriorityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${pc.color}`}>
                        {pc.label}
                      </span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className={`font-semibold text-sm mb-0.5 ${!item.is_read ? 'text-foreground' : 'text-foreground/80'}`}>
                      {item.subject}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{item.sender_name} &middot; {new Date(item.created_at).toLocaleDateString()}</span>
                      {item.is_read && item.read_at && (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCheck className="w-3 h-3" /> Read {new Date(item.read_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {item.is_read
                      ? <MailOpen className="w-4 h-4 text-muted-foreground" />
                      : <Mail className="w-4 h-4 text-primary" />
                    }
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <MailOpen className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Message</h3>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${PRIORITY_CONFIG[selected.priority].color}`}>
                  {PRIORITY_CONFIG[selected.priority].label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(selected.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">From</p>
                <p className="font-semibold">{selected.sender_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Subject</p>
                <p className="text-lg font-bold">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Message</p>
                <div className="bg-secondary rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                  {selected.body}
                </div>
              </div>

              {replySuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 dark:text-green-400 text-sm font-medium">
                  <CheckCheck className="w-4 h-4 flex-shrink-0" />
                  Reply sent to {selected.sender_name}
                </div>
              )}

              {showReply && !replySuccess && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary border-b border-border">
                    <Reply className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Reply to {selected.sender_name}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
                      <input
                        type="text"
                        value={replySubject}
                        onChange={e => setReplySubject(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Message</label>
                      <textarea
                        rows={4}
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder={`Write your reply to ${selected.sender_name}...`}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
                      />
                    </div>
                    {replyError && (
                      <p className="text-xs text-red-500">{replyError}</p>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setShowReply(false); setReplyError(null); }}
                        className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendReply}
                        disabled={replySending || !replyBody.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {replySending ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {replySending ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
              {selected.sender_is_admin && selected.sender_id && selected.send_type === 'individual' && selected.allow_reply && !replySuccess ? (
                <button
                  onClick={() => { setShowReply(v => !v); setReplyError(null); }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
                    showReply
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Reply className="w-4 h-4" />
                  {showReply ? 'Hide Reply' : 'Reply'}
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={closeModal}
                className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
