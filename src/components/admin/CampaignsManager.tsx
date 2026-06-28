import { useEffect, useState } from 'react';
import { Calendar, Plus, Pencil, Trash2, Check, X, Star, Zap, Flame, TrendingUp, Award, Search, ImageOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { IconPickerModal, IconPreviewButton } from '../ui/IconPickerModal';
import type { Campaign, CampaignType } from '../../types/database';

interface CampaignForm {
  name: string;
  description: string;
  objective_description: string;
  campaign_type: CampaignType;
  start_date: string;
  end_date: string;
  early_target_date: string;
  points_multiplier: number;
  xp_multiplier: number;
  early_completion_multiplier: number;
  early_completion_bonus_points: number;
  is_active: boolean;
  icon_url: string;
  icon_size: number;
}

const emptyForm: CampaignForm = {
  name: '',
  description: '',
  objective_description: '',
  campaign_type: 'points_boost',
  start_date: '',
  end_date: '',
  early_target_date: '',
  points_multiplier: 1.5,
  xp_multiplier: 1.5,
  early_completion_multiplier: 2.0,
  early_completion_bonus_points: 250,
  is_active: true,
  icon_url: '',
  icon_size: 40,
};

const CAMPAIGN_TYPES: CampaignType[] = ['points_boost', 'xp_sprint', 'early_bird', 'streak', 'milestone'];

const typeConfig: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  points_boost: { label: 'Points Boost', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', Icon: Star },
  xp_sprint: { label: 'XP Sprint', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', Icon: Zap },
  early_bird: { label: 'Early Bird', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', Icon: TrendingUp },
  streak: { label: 'Streak', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', Icon: Flame },
  milestone: { label: 'Milestone', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20', Icon: Award },
};

function toInputDate(iso: string | null) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

export function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').order('start_date', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, start_date: new Date().toISOString().split('T')[0] });
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Campaign) => {
    const ec = c as Campaign & { icon_url?: string; icon_size?: number };
    setForm({
      name: c.name,
      description: c.description || '',
      objective_description: c.objective_description || '',
      campaign_type: c.campaign_type,
      start_date: toInputDate(c.start_date),
      end_date: toInputDate(c.end_date),
      early_target_date: toInputDate(c.early_target_date),
      points_multiplier: c.points_multiplier,
      xp_multiplier: c.xp_multiplier,
      early_completion_multiplier: c.early_completion_multiplier,
      early_completion_bonus_points: c.early_completion_bonus_points,
      is_active: c.is_active,
      icon_url: ec.icon_url ?? '',
      icon_size: ec.icon_size ?? 40,
    });
    setEditTarget(c);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required.'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      objective_description: form.objective_description || null,
      campaign_type: form.campaign_type,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      early_target_date: form.early_target_date ? new Date(form.early_target_date).toISOString() : null,
      points_multiplier: form.points_multiplier,
      xp_multiplier: form.xp_multiplier,
      early_completion_multiplier: form.early_completion_multiplier,
      early_completion_bonus_points: form.early_completion_bonus_points,
      is_active: form.is_active,
      icon_url: form.icon_url || null,
      icon_size: form.icon_size,
    };

    try {
      if (editTarget) {
        const { error: err } = await supabase.from('campaigns').update(payload).eq('id', editTarget.id);
        if (err) throw err;
        await supabase.from('scheduled_events')
          .update({ start_date: payload.start_date, end_date: payload.end_date })
          .eq('campaign_id', editTarget.id);
      } else {
        const { data: inserted, error: err } = await supabase.from('campaigns').insert(payload).select().maybeSingle();
        if (err) throw err;
        if (inserted) {
          await supabase.from('scheduled_events').insert({
            event_type: 'campaign',
            campaign_id: inserted.id,
            start_date: payload.start_date,
            end_date: payload.end_date,
            timezone: 'UTC',
            auto_activate: true,
            auto_close: true,
            is_active: true,
          });
        }
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
    await supabase.from('scheduled_events').delete().eq('campaign_id', deleteTarget.id);
    await supabase.from('campaigns').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setSaving(false);
    await load();
  };

  const toggleActive = async (c: Campaign) => {
    await supabase.from('campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
    await load();
  };

  const filtered = campaigns.filter(c => {
    const matchSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || c.campaign_type === typeFilter;
    return matchSearch && matchType;
  });

  const now = new Date();
  const statusOf = (c: Campaign) => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    if (!c.is_active) return 'inactive';
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'live';
  };

  const statusBadge: Record<string, string> = {
    live: 'bg-green-500/10 text-green-600 dark:text-green-400',
    upcoming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ended: 'bg-secondary text-muted-foreground',
    inactive: 'bg-red-500/10 text-red-500',
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-2xl font-bold">Campaign Scheduler</h3>
          <p className="text-sm text-muted-foreground">{campaigns.length} campaigns — {campaigns.filter(c => statusOf(c) === 'live').length} currently live</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm">
          <Plus className="w-4 h-4" />Create Campaign
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
          <option value="all">All Types</option>
          {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const cfg = typeConfig[c.campaign_type] || typeConfig.points_boost;
            const CIcon = cfg.Icon;
            const status = statusOf(c);
            const ec = c as Campaign & { icon_url?: string; icon_size?: number };
            return (
              <div key={c.id} className={`p-4 border rounded-xl hover:shadow-sm transition-all ${cfg.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                    {ec.icon_url ? (
                      <img
                        src={ec.icon_url}
                        alt=""
                        className="object-contain"
                        style={{ width: Math.min(ec.icon_size ?? 40, 36), height: Math.min(ec.icon_size ?? 40, 36) }}
                      />
                    ) : (
                      <CIcon className={`w-4 h-4 ${cfg.color} opacity-50`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{c.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusBadge[status]}`}>{status}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border`}>{cfg.label}</span>
                    </div>
                    {c.objective_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{c.objective_description}</p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Star className="w-3 h-3" />{c.points_multiplier}x pts</span>
                      <span className="flex items-center gap-1 text-orange-500 font-semibold"><Zap className="w-3 h-3" />{c.xp_multiplier}x XP</span>
                      {c.early_completion_bonus_points > 0 && (
                        <span className={`flex items-center gap-1 font-semibold ${cfg.color}`}><Flame className="w-3 h-3" />+{c.early_completion_bonus_points} early bonus</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(c)} className={`p-1.5 rounded transition-colors text-muted-foreground ${c.is_active ? 'hover:text-red-500 hover:bg-red-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`} title={c.is_active ? 'Deactivate' : 'Activate'}>
                      {c.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-white/20 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Campaign' : 'Create Campaign'} size="lg">
        <div className="space-y-5">
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
              <label className="block text-sm font-medium mb-1">Campaign Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value as CampaignType }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
                {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{typeConfig[t]?.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />Active</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Objective <span className="text-muted-foreground text-xs">(shown to participants)</span></label>
              <textarea value={form.objective_description} onChange={e => setForm(f => ({ ...f, objective_description: e.target.value }))} rows={2} placeholder="e.g. Submit at least one innovation idea or complete 3 knowledge-share activities." className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Base Reward Multipliers</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Points Multiplier</label>
                <input type="number" step="0.1" min="1" value={form.points_multiplier} onChange={e => setForm(f => ({ ...f, points_multiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">XP Multiplier</label>
                <input type="number" step="0.1" min="1" value={form.xp_multiplier} onChange={e => setForm(f => ({ ...f, xp_multiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          <div className="border border-orange-500/20 bg-orange-500/5 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400"><Zap className="w-4 h-4" />Motivational Accelerator (Early Completion)</h4>
            <p className="text-xs text-muted-foreground">If a participant completes the objective before the early target date, they earn this bonus on top of the base multiplier.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Early Deadline</label>
                <input type="date" value={form.early_target_date} onChange={e => setForm(f => ({ ...f, early_target_date: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bonus Multiplier</label>
                <input type="number" step="0.5" min="1" value={form.early_completion_multiplier} onChange={e => setForm(f => ({ ...f, early_completion_multiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bonus Points</label>
                <input type="number" step="50" min="0" value={form.early_completion_bonus_points} onChange={e => setForm(f => ({ ...f, early_completion_bonus_points: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Campaign" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete campaign <strong className="text-foreground">{deleteTarget?.name}</strong> and its scheduled event? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
