import { useEffect, useState, useMemo } from 'react';
import { Target, Plus, Pencil, Trash2, Check, X, Search, Calendar, Star, Zap, ChevronRight, ArrowRight, ArrowLeft, Link2, Users, ImageOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { IconPickerModal, IconPreviewButton } from '../ui/IconPickerModal';
import type { Quest } from '../../types/database';

interface Community { id: string; name: string; color: string; }

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
  predecessor_quest_ids: string[];
  successor_quest_ids: string[];
  notify_on_assign: boolean;
  notify_deeplink: boolean;
  target_community_ids: string[];
  icon_url: string;
  icon_size: number;
}

const emptyForm: QuestForm = {
  name: '',
  description: '',
  narrative: '',
  status: 'active',
  points_reward: 100,
  xp_reward: 150,
  is_daily: false,
  is_weekly: false,
  start_date: '',
  end_date: '',
  predecessor_quest_ids: [],
  successor_quest_ids: [],
  notify_on_assign: true,
  notify_deeplink: true,
  target_community_ids: [],
  icon_url: '',
  icon_size: 40,
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  inactive: 'bg-secondary text-muted-foreground',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  expired: 'bg-red-500/10 text-red-500',
};

export function QuestsManager() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Quest | null>(null);
  const [form, setForm] = useState<QuestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    load();
    supabase.from('communities').select('id, name, color').order('name').then(({ data }) => setCommunities(data || []));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quests')
      .select('*, predecessor:predecessor_quest_id(id, name), successor:successor_quest_id(id, name)')
      .order('name');
    setQuests(data || []);
    setLoading(false);
  };

  const toDateInput = (iso: string | null) => iso ? iso.substring(0, 10) : '';

  const openCreate = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (quest: Quest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const q = quest as Quest & {
      predecessor_quest_id?: string | null;
      successor_quest_id?: string | null;
      predecessor_quest_ids?: string[] | null;
      successor_quest_ids?: string[] | null;
      notify_on_assign?: boolean;
      notify_deeplink?: boolean;
      target_community_ids?: string[];
      icon_url?: string;
      icon_size?: number;
    };
    setForm({
      name: quest.name,
      description: quest.description || '',
      narrative: quest.narrative || '',
      status: quest.status,
      points_reward: quest.points_reward,
      xp_reward: quest.xp_reward,
      is_daily: quest.is_daily || false,
      is_weekly: quest.is_weekly || false,
      start_date: toDateInput(quest.start_date),
      end_date: toDateInput(quest.end_date),
      predecessor_quest_ids: q.predecessor_quest_ids ?? (q.predecessor_quest_id ? [q.predecessor_quest_id] : []),
      successor_quest_ids: q.successor_quest_ids ?? (q.successor_quest_id ? [q.successor_quest_id] : []),
      notify_on_assign: q.notify_on_assign ?? true,
      notify_deeplink: q.notify_deeplink ?? true,
      target_community_ids: q.target_community_ids ?? [],
      icon_url: q.icon_url ?? '',
      icon_size: q.icon_size ?? 40,
    });
    setEditTarget(quest);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      narrative: form.narrative,
      status: form.status,
      points_reward: form.points_reward,
      xp_reward: form.xp_reward,
      is_daily: form.is_daily,
      is_weekly: form.is_weekly,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      predecessor_quest_id: form.predecessor_quest_ids[0] || null,
      successor_quest_id: form.successor_quest_ids[0] || null,
      predecessor_quest_ids: form.predecessor_quest_ids,
      successor_quest_ids: form.successor_quest_ids,
      notify_on_assign: form.notify_on_assign,
      notify_deeplink: form.notify_deeplink,
      target_community_ids: form.target_community_ids,
      icon_url: form.icon_url || null,
      icon_size: form.icon_size,
    };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('quests').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('quests').insert(payload);
        if (err) throw err;
      }
      setModalOpen(false);
      if (selectedQuest?.id === editTarget?.id) setSelectedQuest(null);
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
      await supabase.from('quests').delete().eq('id', deleteTarget.id);
      if (selectedQuest?.id === deleteTarget.id) setSelectedQuest(null);
      setDeleteTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const filtered = quests.filter(q => {
    const matchSearch = !search.trim() ||
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: quests.length,
    active: quests.filter(q => q.status === 'active').length,
    daily: quests.filter(q => q.is_daily).length,
    weekly: quests.filter(q => q.is_weekly).length,
  };

  const questOptions = useMemo(() =>
    quests.map(q => ({ id: q.id, name: q.name })),
    [quests]
  );

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
        <h3 className="text-2xl font-bold">Quest Management</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Quest
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Quests', value: counts.total, color: 'text-primary', icon: Target },
          { label: 'Active', value: counts.active, color: 'text-green-500', icon: Check },
          { label: 'Daily', value: counts.daily, color: 'text-blue-500', icon: Calendar },
          { label: 'Weekly', value: counts.weekly, color: 'text-orange-500', icon: Calendar },
        ].map(stat => (
          <div key={stat.label} className="bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-sm font-medium">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quests..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className={`space-y-2 transition-all duration-200 ${selectedQuest ? 'flex-1' : 'w-full'}`}>
          {filtered.map(quest => {
            const isSelected = selectedQuest?.id === quest.id;
            const eq = quest as Quest & { icon_url?: string; icon_size?: number };
            return (
              <div
                key={quest.id}
                onClick={() => setSelectedQuest(isSelected ? null : quest)}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-accent/20 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                    {eq.icon_url ? (
                      <img
                        src={eq.icon_url}
                        alt=""
                        className="object-contain"
                        style={{ width: Math.min(eq.icon_size ?? 40, 36), height: Math.min(eq.icon_size ?? 40, 36) }}
                      />
                    ) : (
                      <ImageOff className="w-4 h-4 text-muted-foreground/25" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="font-semibold text-foreground">{quest.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[quest.status] || ''}`}>
                        {quest.status}
                      </span>
                      {quest.is_daily && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">Daily</span>
                      )}
                      {quest.is_weekly && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">Weekly</span>
                      )}
                      {((quest as Quest & { predecessor_quest_id?: string | null }).predecessor_quest_id ||
                        (quest as Quest & { successor_quest_id?: string | null }).successor_quest_id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" /> Linked
                        </span>
                      )}
                      {((quest as Quest & { target_community_ids?: string[] }).target_community_ids?.length ?? 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {(quest as Quest & { target_community_ids?: string[] }).target_community_ids!.length} {(quest as Quest & { target_community_ids?: string[] }).target_community_ids!.length === 1 ? 'community' : 'communities'}
                        </span>
                      )}
                    </div>
                    {quest.description && !selectedQuest && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{quest.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        <Star className="w-3 h-3" /> {quest.points_reward} pts
                      </span>
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <Zap className="w-3 h-3" /> {quest.xp_reward} XP
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={e => openEdit(quest, e)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(quest); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No quests found{search ? ` matching "${search}"` : ''}</p>
            </div>
          )}
        </div>

        {selectedQuest && (
          <QuestDetailPanel
            quest={selectedQuest}
            quests={quests}
            onEdit={() => openEdit(selectedQuest)}
            onClose={() => setSelectedQuest(null)}
          />
        )}
      </div>

      {iconPickerOpen && (
        <IconPickerModal
          currentUrl={form.icon_url || null}
          currentSize={form.icon_size}
          onSelect={(sel) => setForm(f => ({ ...f, icon_url: sel.url, icon_size: sel.size }))}
          onClose={() => setIconPickerOpen(false)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Quest' : 'Create Quest'}>
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
              <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Quest name"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Narrative</label>
            <textarea
              value={form.narrative}
              onChange={e => setForm(f => ({ ...f, narrative: e.target.value }))}
              rows={2}
              placeholder="Story or narrative text for this quest"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Reward</label>
              <input
                type="number"
                min={0}
                value={form.points_reward}
                onChange={e => setForm(f => ({ ...f, points_reward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Reward</label>
              <input
                type="number"
                min={0}
                value={form.xp_reward}
                onChange={e => setForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as QuestForm['status'] }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_daily}
                  onChange={e => setForm(f => ({ ...f, is_daily: e.target.checked }))}
                  className="rounded"
                />
                Daily Quest
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_weekly}
                  onChange={e => setForm(f => ({ ...f, is_weekly: e.target.checked }))}
                  className="rounded"
                />
                Weekly Quest
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Quest Sequence Links</span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" /> Predecessor Quests
                  <span className="ml-auto text-xs text-muted-foreground font-normal">Multi-select</span>
                </label>
                <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto bg-secondary/30">
                  {questOptions.filter(q => q.id !== editTarget?.id).map(q => (
                    <label key={q.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.predecessor_quest_ids.includes(q.id)}
                        onChange={e => setForm(f => ({
                          ...f,
                          predecessor_quest_ids: e.target.checked
                            ? [...f.predecessor_quest_ids, q.id]
                            : f.predecessor_quest_ids.filter(id => id !== q.id),
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">{q.name}</span>
                    </label>
                  ))}
                  {questOptions.filter(q => q.id !== editTarget?.id).length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">No other quests available.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Quests that must be completed before this one unlocks.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> Successor Quests
                  <span className="ml-auto text-xs text-muted-foreground font-normal">Multi-select</span>
                </label>
                <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto bg-secondary/30">
                  {questOptions.filter(q => q.id !== editTarget?.id).map(q => (
                    <label key={q.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.successor_quest_ids.includes(q.id)}
                        onChange={e => setForm(f => ({
                          ...f,
                          successor_quest_ids: e.target.checked
                            ? [...f.successor_quest_ids, q.id]
                            : f.successor_quest_ids.filter(id => id !== q.id),
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">{q.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Quests that unlock after this one is completed.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Target Communities</span>
              <span className="ml-auto text-xs text-muted-foreground font-normal">Optional — leave empty for all users</span>
            </div>
            <div className="p-3">
              {communities.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-2">No communities configured yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {communities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.target_community_ids.includes(c.id)}
                        onChange={e => setForm(f => ({
                          ...f,
                          target_community_ids: e.target.checked
                            ? [...f.target_community_ids, c.id]
                            : f.target_community_ids.filter(id => id !== c.id),
                        }))}
                        className="rounded"
                      />
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#888' }} />
                      <span className="text-sm truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {form.target_community_ids.length > 0 && (
                <p className="text-xs text-sky-600 dark:text-sky-400 mt-2 px-1">
                  Targeted at {form.target_community_ids.length} {form.target_community_ids.length === 1 ? 'community' : 'communities'}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Notification Settings</span>
            </div>
            <div className="p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_on_assign}
                  onChange={e => setForm(f => ({ ...f, notify_on_assign: e.target.checked }))}
                  className="rounded mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Notify user when assigned</p>
                  <p className="text-xs text-muted-foreground">Send in-app notification when this quest is assigned to a user.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_deeplink}
                  onChange={e => setForm(f => ({ ...f, notify_deeplink: e.target.checked }))}
                  className="rounded mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Include deep link in notification</p>
                  <p className="text-xs text-muted-foreground">Notification will contain a "View Quest" link that takes the user directly to this quest in the app.</p>
                </div>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Quest'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Quest">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This cannot be undone.
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

function QuestDetailPanel({
  quest,
  quests,
  onEdit,
  onClose,
}: {
  quest: Quest;
  quests: Quest[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const q = quest as Quest & {
    predecessor_quest_id?: string | null;
    successor_quest_id?: string | null;
    predecessor?: { id: string; name: string } | null;
    successor?: { id: string; name: string } | null;
  };

  const predecessor = q.predecessor
    ? q.predecessor
    : q.predecessor_quest_id
    ? quests.find(x => x.id === q.predecessor_quest_id)
    : null;

  const successor = q.successor
    ? q.successor
    : q.successor_quest_id
    ? quests.find(x => x.id === q.successor_quest_id)
    : null;

  return (
    <div className="w-80 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col sticky top-4 self-start">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
        <span className="text-sm font-semibold">Quest Details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-base leading-tight">{quest.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[quest.status] || ''}`}>
              {quest.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quest.is_daily && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">Daily</span>}
            {quest.is_weekly && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">Weekly</span>}
          </div>
        </div>

        {quest.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-foreground">{quest.description}</p>
          </div>
        )}

        {quest.narrative && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Narrative</p>
            <p className="text-sm text-foreground italic">{quest.narrative}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary rounded-lg p-3 text-center">
            <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{quest.points_reward}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-center">
            <Zap className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{quest.xp_reward}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
        </div>

        {(quest.start_date || quest.end_date) && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Schedule</p>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {quest.start_date ? new Date(quest.start_date).toLocaleDateString() : '—'}
                {' – '}
                {quest.end_date ? new Date(quest.end_date).toLocaleDateString() : 'ongoing'}
              </span>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Quest Sequence
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {predecessor ? (
                <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded text-xs font-medium truncate">{predecessor.name}</span>
              ) : (
                <span className="text-muted-foreground text-xs">No predecessor — starts a sequence</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {successor ? (
                <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded text-xs font-medium truncate">{successor.name}</span>
              ) : (
                <span className="text-muted-foreground text-xs">No successor — ends a sequence</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Quest
        </button>
      </div>
    </div>
  );
}
