import { useEffect, useState } from 'react';
import { Trophy, Plus, Pencil, Trash2, Check, X, Star, Zap, Users, User, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../admin/Modal';
import type { ProjectChallenge } from '../../types/database';

interface Props { projectId: string; }

interface ChallengeForm {
  name: string;
  description: string;
  challenge_type: string;
  points_reward: number;
  xp_reward: number;
  is_active: boolean;
  duration_days: number;
  start_date: string;
  end_date: string;
}

const emptyForm: ChallengeForm = { name: '', description: '', challenge_type: 'individual', points_reward: 200, xp_reward: 300, is_active: true, duration_days: 7, start_date: '', end_date: '' };

const TYPES = ['individual', 'team', 'department', 'community', 'time_based', 'seasonal'];

const typeConfig: Record<string, { color: string; Icon: React.ElementType }> = {
  individual: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', Icon: User },
  team: { color: 'bg-green-500/10 text-green-600 dark:text-green-400', Icon: Users },
  department: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', Icon: Building2 },
  community: { color: 'bg-red-500/10 text-red-500', Icon: Users },
  time_based: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', Icon: Trophy },
  seasonal: { color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', Icon: Trophy },
};

export function ProjectChallengesPanel({ projectId }: Props) {
  const [challenges, setChallenges] = useState<ProjectChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectChallenge | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('project_challenges').select('*').eq('project_id', projectId).order('name');
    setChallenges(data || []);
    setLoading(false);
  };

  const toDate = (iso: string | null) => iso ? iso.substring(0, 10) : '';
  const openCreate = () => { setForm(emptyForm); setEditTarget(null); setError(null); setModalOpen(true); };
  const openEdit = (c: ProjectChallenge) => {
    setForm({ name: c.name, description: c.description || '', challenge_type: c.challenge_type, points_reward: c.points_reward, xp_reward: c.xp_reward, is_active: c.is_active, duration_days: c.duration_days || 7, start_date: toDate(c.start_date), end_date: toDate(c.end_date) });
    setEditTarget(c); setError(null); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name required.'); return; }
    setSaving(true); setError(null);
    const payload = { name: form.name, description: form.description, challenge_type: form.challenge_type, points_reward: form.points_reward, xp_reward: form.xp_reward, is_active: form.is_active, duration_days: form.duration_days, start_date: form.start_date || null, end_date: form.end_date || null };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('project_challenges').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('project_challenges').insert({ ...payload, project_id: projectId });
        if (err) throw err;
      }
      setModalOpen(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await supabase.from('project_challenges').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null); setSaving(false); await load();
  };

  const filtered = typeFilter === 'all' ? challenges : challenges.filter(c => c.challenge_type === typeFilter);

  const typeCounts = TYPES.reduce((acc, t) => { acc[t] = challenges.filter(c => c.challenge_type === t).length; return acc; }, {} as Record<string, number>);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-semibold text-lg">Challenge Management</h4>
          <p className="text-sm text-muted-foreground">{challenges.length} challenges across {TYPES.filter(t => typeCounts[t] > 0).length} types</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:border-primary">
            <option value="all">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
            <Plus className="w-3.5 h-3.5" />Add Challenge
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TYPES.filter(t => typeCounts[t] > 0).map(t => {
          const cfg = typeConfig[t];
          const TypeIcon = cfg.Icon;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${cfg.color} ${typeFilter === t ? 'ring-2 ring-offset-1 ring-primary/30' : ''}`}
            >
              <TypeIcon className="w-3 h-3" />
              {t.replace('_', ' ')} ({typeCounts[t]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm mb-3">No challenges yet</p>
          <button onClick={openCreate} className="text-sm text-primary hover:underline">Create the first challenge</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const cfg = typeConfig[c.challenge_type] || typeConfig.individual;
            const TypeIcon = cfg.Icon;
            return (
              <div key={c.id} className="p-4 border border-border rounded-xl hover:bg-accent/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm">{c.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.color}`}>{c.challenge_type.replace('_', ' ')}</span>
                      {!c.is_active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">Inactive</span>}
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium"><Star className="w-3 h-3" />{c.points_reward} pts</span>
                      <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><Zap className="w-3 h-3" />{c.xp_reward} XP</span>
                      {c.duration_days && <span className="text-xs text-muted-foreground">{c.duration_days}d</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Challenge' : 'Create Challenge'}>
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
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.challenge_type} onChange={e => setForm(f => ({ ...f, challenge_type: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (days)</label>
              <input type="number" min={1} value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
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
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />Active</label>
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Challenge" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete challenge <strong className="text-foreground">{deleteTarget?.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
