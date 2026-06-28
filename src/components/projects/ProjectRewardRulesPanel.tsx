import { useEffect, useState } from 'react';
import { Gift, Plus, Pencil, Trash2, Check, X, Star, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../admin/Modal';
import type { ProjectRewardRule, ActivityType, Badge } from '../../types/database';

interface Props { projectId: string; }

interface RuleForm {
  activity_type_id: string;
  points_multiplier: number;
  xp_multiplier: number;
  badge_id: string;
  is_active: boolean;
}

const emptyForm: RuleForm = { activity_type_id: '', points_multiplier: 1.0, xp_multiplier: 1.0, badge_id: '', is_active: true };

export function ProjectRewardRulesPanel({ projectId }: Props) {
  const [rules, setRules] = useState<ProjectRewardRule[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [badges, setBadges] = useState<Pick<Badge, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectRewardRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRewardRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    setLoading(true);
    const [rulesRes, typesRes, badgesRes] = await Promise.all([
      supabase.from('project_reward_rules').select('*, activity_type:activity_types(name), badge:badges(name)').eq('project_id', projectId).order('created_at'),
      supabase.from('activity_types').select('*').order('name'),
      supabase.from('badges').select('id, name').order('name'),
    ]);
    setRules(rulesRes.data || []);
    setActivityTypes(typesRes.data || []);
    setBadges(badgesRes.data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, activity_type_id: activityTypes[0]?.id || '' });
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (r: ProjectRewardRule) => {
    setForm({ activity_type_id: r.activity_type_id || '', points_multiplier: r.points_multiplier, xp_multiplier: r.xp_multiplier, badge_id: r.badge_id || '', is_active: r.is_active });
    setEditTarget(r);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.activity_type_id) { setError('Activity type is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = { activity_type_id: form.activity_type_id, points_multiplier: form.points_multiplier, xp_multiplier: form.xp_multiplier, badge_id: form.badge_id || null, is_active: form.is_active };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('project_reward_rules').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('project_reward_rules').insert({ ...payload, project_id: projectId });
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await supabase.from('project_reward_rules').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setSaving(false);
    await load();
  };

  const toggleActive = async (r: ProjectRewardRule) => {
    await supabase.from('project_reward_rules').update({ is_active: !r.is_active }).eq('id', r.id);
    await load();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-lg">Reward Rules</h4>
          <p className="text-sm text-muted-foreground">Points and XP multipliers per activity type</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
          <Plus className="w-3.5 h-3.5" />Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Gift className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm mb-3">No reward rules configured yet</p>
          <button onClick={openCreate} className="text-sm text-primary hover:underline">Add the first rule</button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-4 border border-border rounded-xl hover:bg-accent/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{r.activity_type?.name || 'Unknown Activity'}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'}`}>{r.is_active ? 'Active' : 'Off'}</span>
                  {r.badge?.name && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">+{r.badge.name}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium"><Star className="w-3 h-3" />{r.points_multiplier}x pts</span>
                  <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><Zap className="w-3 h-3" />{r.xp_multiplier}x XP</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(r)} className={`p-1.5 rounded text-muted-foreground ${r.is_active ? 'hover:text-orange-500 hover:bg-orange-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}>{r.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}</button>
                <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Reward Rule' : 'Add Reward Rule'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Activity Type <span className="text-red-500">*</span></label>
            <select value={form.activity_type_id} onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
              <option value="">Select...</option>
              {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Points Multiplier</label>
              <input type="number" step="0.1" min="0.1" value={form.points_multiplier} onChange={e => setForm(f => ({ ...f, points_multiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Multiplier</label>
              <input type="number" step="0.1" min="0.1" value={form.xp_multiplier} onChange={e => setForm(f => ({ ...f, xp_multiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Badge Reward (optional)</label>
            <select value={form.badge_id} onChange={e => setForm(f => ({ ...f, badge_id: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
              <option value="">No badge</option>
              {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />Active
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Rule" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete reward rule for <strong className="text-foreground">{deleteTarget?.activity_type?.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
