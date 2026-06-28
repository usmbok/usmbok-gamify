import { useEffect, useState } from 'react';
import { Target, Plus, Pencil, Trash2, Check, X, Star, Zap, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../admin/Modal';
import type { ProjectQuest } from '../../types/database';

interface Props { projectId: string; }

interface QuestForm {
  name: string;
  description: string;
  narrative: string;
  status: 'active' | 'inactive' | 'completed' | 'expired';
  points_reward: number;
  xp_reward: number;
  is_daily: boolean;
  is_weekly: boolean;
  start_date: string;
  end_date: string;
}

const emptyForm: QuestForm = { name: '', description: '', narrative: '', status: 'active', points_reward: 100, xp_reward: 150, is_daily: false, is_weekly: false, start_date: '', end_date: '' };

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  inactive: 'bg-secondary text-muted-foreground',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  expired: 'bg-red-500/10 text-red-500',
};

export function ProjectQuestsPanel({ projectId }: Props) {
  const [quests, setQuests] = useState<ProjectQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectQuest | null>(null);
  const [form, setForm] = useState<QuestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectQuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('project_quests').select('*').eq('project_id', projectId).order('name');
    setQuests(data || []);
    setLoading(false);
  };

  const toDate = (iso: string | null) => iso ? iso.substring(0, 10) : '';

  const openCreate = () => { setForm(emptyForm); setEditTarget(null); setError(null); setModalOpen(true); };
  const openEdit = (q: ProjectQuest) => {
    setForm({ name: q.name, description: q.description || '', narrative: q.narrative || '', status: q.status, points_reward: q.points_reward, xp_reward: q.xp_reward, is_daily: q.is_daily, is_weekly: q.is_weekly, start_date: toDate(q.start_date), end_date: toDate(q.end_date) });
    setEditTarget(q); setError(null); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name required.'); return; }
    setSaving(true); setError(null);
    const payload = { name: form.name, description: form.description, narrative: form.narrative, status: form.status, points_reward: form.points_reward, xp_reward: form.xp_reward, is_daily: form.is_daily, is_weekly: form.is_weekly, start_date: form.start_date || null, end_date: form.end_date || null };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('project_quests').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('project_quests').insert({ ...payload, project_id: projectId });
        if (err) throw err;
      }
      setModalOpen(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await supabase.from('project_quests').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null); setSaving(false); await load();
  };

  const filtered = statusFilter === 'all' ? quests : quests.filter(q => q.status === statusFilter);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-semibold text-lg">Quest Builder</h4>
          <p className="text-sm text-muted-foreground">{quests.length} quests — {quests.filter(q => q.status === 'active').length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:border-primary">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
            <Plus className="w-3.5 h-3.5" />Add Quest
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm mb-3">No quests yet</p>
          <button onClick={openCreate} className="text-sm text-primary hover:underline">Create the first quest</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <div key={q.id} className="p-4 border border-border rounded-xl hover:bg-accent/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm">{q.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[q.status]}`}>{q.status}</span>
                    {q.is_daily && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">Daily</span>}
                    {q.is_weekly && <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">Weekly</span>}
                  </div>
                  {q.description && <p className="text-xs text-muted-foreground line-clamp-1">{q.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium"><Star className="w-3 h-3" />{q.points_reward} pts</span>
                    <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><Zap className="w-3 h-3" />{q.xp_reward} XP</span>
                    {q.start_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{new Date(q.start_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteTarget(q)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Quest' : 'Create Quest'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <input type="number" min={0} value={form.points_reward} onChange={e => setForm(f => ({ ...f, points_reward: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP</label>
              <input type="number" min={0} value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as QuestForm['status'] }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_daily} onChange={e => setForm(f => ({ ...f, is_daily: e.target.checked }))} />Daily Quest</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_weekly} onChange={e => setForm(f => ({ ...f, is_weekly: e.target.checked }))} />Weekly Quest</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Quest" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete quest <strong className="text-foreground">{deleteTarget?.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
