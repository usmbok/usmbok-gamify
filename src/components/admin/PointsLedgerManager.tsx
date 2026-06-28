import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen, Search, Filter, Pencil, Check, X, ChevronDown,
  Star, Zap, User, RefreshCw, Plus, Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

interface LedgerEntry {
  id: string;
  user_id: string;
  points_change: number;
  xp_change: number;
  reason: string | null;
  source_type: string | null;
  source_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
  profile?: { full_name: string | null; username: string | null } | null;
}

interface LedgerEditForm {
  points_change: number;
  xp_change: number;
  reason: string;
  source_type: string;
  admin_note: string;
}

interface CreateForm {
  user_id: string;
  points_change: number;
  xp_change: number;
  reason: string;
  source_type: string;
  admin_note: string;
}

const SOURCE_TYPES = [
  'activity', 'quest', 'challenge', 'badge', 'pulse', 'gift', 'manual', 'other',
];

const sourceColor = (s: string | null) => {
  switch (s) {
    case 'quest': return 'bg-blue-500/10 text-blue-500';
    case 'challenge': return 'bg-orange-500/10 text-orange-500';
    case 'badge': return 'bg-yellow-500/10 text-yellow-500';
    case 'pulse': return 'bg-cyan-500/10 text-cyan-500';
    case 'gift': return 'bg-pink-500/10 text-pink-500';
    case 'manual': return 'bg-slate-500/10 text-slate-400';
    case 'activity': return 'bg-green-500/10 text-green-500';
    default: return 'bg-secondary text-muted-foreground';
  }
};

const PAGE_SIZE = 50;

export function PointsLedgerManager() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [editTarget, setEditTarget] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState<LedgerEditForm>({
    points_change: 0, xp_change: 0, reason: '', source_type: 'manual', admin_note: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string | null; username: string | null }[]>([]);
  const [createForm, setCreateForm] = useState<CreateForm>({
    user_id: '', points_change: 0, xp_change: 0, reason: '', source_type: 'manual', admin_note: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('points_ledger')
      .select('*, profile:user_id(full_name, username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sourceFilter !== 'all') query = query.eq('source_type', sourceFilter);

    const { data, count } = await query;
    let filtered = (data || []) as LedgerEntry[];

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e =>
        (e.reason || '').toLowerCase().includes(s) ||
        (e.profile?.full_name || '').toLowerCase().includes(s) ||
        (e.profile?.username || '').toLowerCase().includes(s) ||
        (e.admin_note || '').toLowerCase().includes(s)
      );
    }

    setEntries(filtered);
    setTotal(count || 0);
    setLoading(false);
  }, [page, sourceFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (entry: LedgerEntry) => {
    setEditTarget(entry);
    setEditForm({
      points_change: entry.points_change,
      xp_change: entry.xp_change,
      reason: entry.reason || '',
      source_type: entry.source_type || 'manual',
      admin_note: entry.admin_note || '',
    });
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    setEditError(null);
    const { error } = await supabase
      .from('points_ledger')
      .update({
        points_change: editForm.points_change,
        xp_change: editForm.xp_change,
        reason: editForm.reason.trim() || null,
        source_type: editForm.source_type,
        admin_note: editForm.admin_note.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editTarget.id);
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditTarget(null);
    load();
  };

  const openCreate = async () => {
    if (allUsers.length === 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .order('full_name');
      setAllUsers(data || []);
    }
    setCreateForm({ user_id: '', points_change: 0, xp_change: 0, reason: '', source_type: 'manual', admin_note: '' });
    setCreateError(null);
    setCreateOpen(true);
  };

  const saveCreate = async () => {
    if (!createForm.user_id) { setCreateError('Select a user.'); return; }
    if (!createForm.reason.trim()) { setCreateError('Reason is required.'); return; }
    setSaving(true);
    setCreateError(null);
    const { error } = await supabase.from('points_ledger').insert({
      user_id: createForm.user_id,
      points_change: createForm.points_change,
      xp_change: createForm.xp_change,
      reason: createForm.reason.trim(),
      source_type: createForm.source_type,
      admin_note: createForm.admin_note.trim() || null,
    });
    setSaving(false);
    if (error) { setCreateError(error.message); return; }
    setCreateOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('points_ledger').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  const userName = (e: LedgerEntry) =>
    e.profile?.full_name || e.profile?.username || e.user_id.slice(0, 8);

  const totalPoints = entries.reduce((s, e) => s + e.points_change, 0);
  const totalXp = entries.reduce((s, e) => s + e.xp_change, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Points Transaction Log</h3>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Records</span>
          </div>
          <p className="text-3xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Points (this page)</span>
          </div>
          <p className={`text-3xl font-bold ${totalPoints >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
            {totalPoints >= 0 ? '+' : ''}{totalPoints.toLocaleString()}
          </p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">XP (this page)</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">+{totalXp.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by user, reason, or note..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); setPage(0); }}
            className="pl-9 pr-8 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary appearance-none"
          >
            <option value="all">All Types</option>
            {SOURCE_TYPES.map(t => (
              <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/60 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">XP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No transactions found</p>
                    </td>
                  </tr>
                ) : entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-xs truncate max-w-[120px]">{userName(entry)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs truncate">{entry.reason || '—'}</p>
                      {entry.admin_note && (
                        <p className="text-xs text-muted-foreground truncate italic mt-0.5">Note: {entry.admin_note}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sourceColor(entry.source_type)}`}>
                        {entry.source_type || 'activity'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${entry.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {entry.points_change >= 0 ? '+' : ''}{entry.points_change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-orange-500 font-medium">+{entry.xp_change}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString()}
                      {entry.updated_at && entry.updated_at !== entry.created_at && (
                        <span className="block text-xs text-primary/60">edited</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Transaction" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Change</label>
              <input
                type="number"
                value={editForm.points_change}
                onChange={e => setEditForm(f => ({ ...f, points_change: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Change</label>
              <input
                type="number"
                value={editForm.xp_change}
                onChange={e => setEditForm(f => ({ ...f, xp_change: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <input
              value={editForm.reason}
              onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source Type</label>
            <select
              value={editForm.source_type}
              onChange={e => setEditForm(f => ({ ...f, source_type: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              {SOURCE_TYPES.map(t => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Note</label>
            <textarea
              value={editForm.admin_note}
              onChange={e => setEditForm(f => ({ ...f, admin_note: e.target.value }))}
              rows={2}
              placeholder="Internal note about this edit..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Transaction Entry" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">User <span className="text-red-500">*</span></label>
            <select
              value={createForm.user_id}
              onChange={e => setCreateForm(f => ({ ...f, user_id: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Select user...</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.username || u.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Change</label>
              <input
                type="number"
                value={createForm.points_change}
                onChange={e => setCreateForm(f => ({ ...f, points_change: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Change</label>
              <input
                type="number"
                value={createForm.xp_change}
                onChange={e => setCreateForm(f => ({ ...f, xp_change: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason <span className="text-red-500">*</span></label>
            <input
              value={createForm.reason}
              onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Describe why points are being awarded or deducted"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source Type</label>
            <select
              value={createForm.source_type}
              onChange={e => setCreateForm(f => ({ ...f, source_type: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              {SOURCE_TYPES.map(t => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Note</label>
            <textarea
              value={createForm.admin_note}
              onChange={e => setCreateForm(f => ({ ...f, admin_note: e.target.value }))}
              rows={2}
              placeholder="Internal note (optional)..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={saveCreate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Entry
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Transaction">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Permanently delete this transaction record? This cannot be undone and will not adjust the user's current points balance.
          </p>
          <div className="bg-secondary rounded-lg p-3 text-sm">
            <p className="font-medium">{deleteTarget?.reason || 'Transaction'}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {deleteTarget && (deleteTarget.points_change >= 0 ? '+' : '')}{deleteTarget?.points_change} pts
              &nbsp;·&nbsp;{deleteTarget && new Date(deleteTarget.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
