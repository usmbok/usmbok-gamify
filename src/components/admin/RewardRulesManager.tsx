import { useEffect, useState } from 'react';
import { Gift, Plus, Pencil, Trash2, Check, X, Zap, Star, ImageOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { IconPickerModal, IconPreviewButton } from '../ui/IconPickerModal';
import type { ActivityType, Badge } from '../../types/database';

interface RewardRule {
  id: string;
  activity_type_id: string | null;
  condition: Record<string, unknown> | null;
  points_multiplier: number;
  xp_multiplier: number;
  badge_id: string | null;
  is_active: boolean;
  created_at: string;
  activity_type?: { name: string } | null;
  badge?: { name: string } | null;
}

interface RuleForm {
  activity_type_id: string;
  points_multiplier: number;
  xp_multiplier: number;
  badge_id: string;
  is_active: boolean;
  icon_url: string;
  icon_size: number;
}

const emptyForm: RuleForm = {
  activity_type_id: '',
  points_multiplier: 1,
  xp_multiplier: 1,
  badge_id: '',
  is_active: true,
  icon_url: '',
  icon_size: 40,
};

export function RewardRulesManager() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RewardRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RewardRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [rulesRes, typesRes, badgesRes] = await Promise.all([
      supabase
        .from('reward_rules')
        .select('*, activity_type:activity_types(name), badge:badges(name)')
        .order('created_at'),
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

  const openEdit = (rule: RewardRule) => {
    const er = rule as RewardRule & { icon_url?: string; icon_size?: number };
    setForm({
      activity_type_id: rule.activity_type_id || '',
      points_multiplier: rule.points_multiplier,
      xp_multiplier: rule.xp_multiplier,
      badge_id: rule.badge_id || '',
      is_active: rule.is_active,
      icon_url: er.icon_url ?? '',
      icon_size: er.icon_size ?? 40,
    });
    setEditTarget(rule);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.activity_type_id) { setError('Activity type is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      activity_type_id: form.activity_type_id,
      points_multiplier: form.points_multiplier,
      xp_multiplier: form.xp_multiplier,
      badge_id: form.badge_id || null,
      is_active: form.is_active,
      icon_url: form.icon_url || null,
      icon_size: form.icon_size,
    };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('reward_rules').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('reward_rules').insert(payload);
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await supabase.from('reward_rules').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: RewardRule) => {
    await supabase.from('reward_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Reward Rules</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Define multipliers for points and XP awarded when users complete specific activity types. Multipliers stack with base rewards.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Rules</span>
          </div>
          <p className="text-3xl font-bold">{rules.length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Active</span>
          </div>
          <p className="text-3xl font-bold">{rules.filter(r => r.is_active).length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">With Badge Reward</span>
          </div>
          <p className="text-3xl font-bold">{rules.filter(r => r.badge_id).length}</p>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">No reward rules configured yet</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const er = rule as RewardRule & { icon_url?: string; icon_size?: number };
            return (
            <div key={rule.id} className="border border-border rounded-xl p-5 hover:bg-accent/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                  {er.icon_url ? (
                    <img
                      src={er.icon_url}
                      alt=""
                      className="object-contain"
                      style={{ width: Math.min(er.icon_size ?? 40, 36), height: Math.min(er.icon_size ?? 40, 36) }}
                    />
                  ) : (
                    <ImageOff className="w-4 h-4 text-muted-foreground/25" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-foreground">
                      {rule.activity_type?.name || 'Unknown Activity'}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {rule.badge?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        Badge: {rule.badge.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      <Star className="w-3 h-3" /> {rule.points_multiplier}x points
                    </span>
                    <span className="flex items-center gap-1 text-orange-500 font-medium">
                      <Zap className="w-3 h-3" /> {rule.xp_multiplier}x XP
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(rule)}
                    className={`p-2 rounded-lg transition-colors text-xs font-medium ${rule.is_active ? 'hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500' : 'hover:bg-green-500/10 text-muted-foreground hover:text-green-500'}`}
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {rule.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(rule)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ); })}
        </div>
      )}

      {iconPickerOpen && (
        <IconPickerModal
          currentUrl={form.icon_url || null}
          currentSize={form.icon_size}
          onSelect={(sel) => setForm(f => ({ ...f, icon_url: sel.url, icon_size: sel.size }))}
          onClose={() => setIconPickerOpen(false)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Reward Rule' : 'Add Reward Rule'}>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium mb-1">Icon</label>
              <IconPreviewButton
                iconUrl={form.icon_url || null}
                iconSize={form.icon_size}
                onOpen={() => setIconPickerOpen(true)}
                onClear={() => setForm(f => ({ ...f, icon_url: '', icon_size: 40 }))}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-1">Activity Type <span className="text-red-500">*</span></label>
              <select
                value={form.activity_type_id}
                onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select activity type...</option>
                {activityTypes.map(at => (
                  <option key={at.id} value={at.id}>{at.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.points_multiplier}
                onChange={e => setForm(f => ({ ...f, points_multiplier: parseFloat(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">e.g. 1.5 = 50% bonus</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.xp_multiplier}
                onChange={e => setForm(f => ({ ...f, xp_multiplier: parseFloat(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">e.g. 2.0 = double XP</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Badge Reward (optional)</label>
            <select
              value={form.badge_id}
              onChange={e => setForm(f => ({ ...f, badge_id: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="">No badge reward</option>
              {badges.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="rounded"
            />
            Active
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Add Rule'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Reward Rule">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this reward rule for <strong className="text-foreground">{deleteTarget?.activity_type?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" />Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
