import { useEffect, useState, useRef } from 'react';
import { Trophy, Plus, Pencil, Trash2, Check, X, Search, Star, Zap, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { IconPickerModal, IconPreviewButton } from '../ui/IconPickerModal';
import type { Challenge } from '../../types/database';

interface Community { id: string; name: string; color: string; }

function CommunityMultiSelect({
  communities,
  selected,
  onChange,
}: {
  communities: Community[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const selectedCommunities = communities.filter(c => selected.includes(c.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary flex items-center gap-2 text-left"
      >
        <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
          {selectedCommunities.length === 0 ? (
            <span className="text-muted-foreground">All users (no restriction)</span>
          ) : (
            selectedCommunities.map(c => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400"
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#888' }} />
                {c.name}
                <button
                  type="button"
                  onMouseDown={e => { e.stopPropagation(); toggle(c.id); }}
                  className="ml-0.5 hover:text-sky-800 dark:hover:text-sky-200"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && communities.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {communities.map(c => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/40 transition-colors text-left ${isSelected ? 'bg-sky-500/5' : ''}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#888' }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  target_community_ids: string[];
  icon_url: string;
  icon_size: number;
}

const emptyForm: ChallengeForm = {
  name: '',
  description: '',
  challenge_type: 'individual',
  points_reward: 200,
  xp_reward: 300,
  is_active: true,
  duration_days: 7,
  start_date: '',
  end_date: '',
  target_community_ids: [],
  icon_url: '',
  icon_size: 40,
};

const typeColors: Record<string, string> = {
  individual: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  team: 'bg-green-500/10 text-green-600 dark:text-green-400',
  department: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  community: 'bg-red-500/10 text-red-500',
  time_based: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  seasonal: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
};

const CHALLENGE_TYPES = ['individual', 'team', 'department', 'community', 'time_based', 'seasonal'];

export function ChallengesManager() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Challenge | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    load();
    supabase.from('communities').select('id, name, color').order('name').then(({ data }) => setCommunities(data || []));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('challenges').select('*').order('name');
    setChallenges(data || []);
    setLoading(false);
  };

  const toDateInput = (iso: string | null) => iso ? iso.substring(0, 10) : '';

  const openCreate = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Challenge) => {
    const ec = c as Challenge & { target_community_ids?: string[]; icon_url?: string; icon_size?: number };
    setForm({
      name: c.name,
      description: c.description || '',
      challenge_type: c.challenge_type,
      points_reward: c.points_reward,
      xp_reward: c.xp_reward,
      is_active: c.is_active,
      duration_days: c.duration_days || 7,
      start_date: toDateInput(c.start_date),
      end_date: toDateInput(c.end_date),
      target_community_ids: ec.target_community_ids ?? [],
      icon_url: ec.icon_url ?? '',
      icon_size: ec.icon_size ?? 40,
    });
    setEditTarget(c);
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
      challenge_type: form.challenge_type,
      points_reward: form.points_reward,
      xp_reward: form.xp_reward,
      is_active: form.is_active,
      duration_days: form.duration_days,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      target_community_ids: form.target_community_ids,
      icon_url: form.icon_url || null,
      icon_size: form.icon_size,
    };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('challenges').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('challenges').insert(payload);
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
      await supabase.from('challenges').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const filtered = challenges.filter(c => {
    const matchSearch = !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || c.challenge_type === typeFilter;
    return matchSearch && matchType;
  });

  const typeCounts = CHALLENGE_TYPES.reduce((acc, t) => {
    acc[t] = challenges.filter(c => c.challenge_type === t).length;
    return acc;
  }, {} as Record<string, number>);

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
        <h3 className="text-2xl font-bold">Challenge Management</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold">{challenges.length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Active</span>
          </div>
          <p className="text-3xl font-bold">{challenges.filter(c => c.is_active).length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex flex-wrap gap-1 mt-1">
            {CHALLENGE_TYPES.map(t => (
              <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full ${typeColors[t]}`}>
                {t.replace('_', ' ')}: {typeCounts[t]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search challenges..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          {CHALLENGE_TYPES.map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(c => {
          const ec = c as Challenge & { icon_url?: string; icon_size?: number };
          return (
          <div key={c.id} className="border border-border rounded-xl p-5 hover:bg-accent/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                {ec.icon_url ? (
                  <img
                    src={ec.icon_url}
                    alt=""
                    className="object-contain"
                    style={{ width: Math.min(ec.icon_size ?? 40, 40), height: Math.min(ec.icon_size ?? 40, 40) }}
                  />
                ) : (
                  <Trophy className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-semibold text-foreground">{c.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[c.challenge_type] || ''}`}>
                    {c.challenge_type.replace('_', ' ')}
                  </span>
                  {!c.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Inactive</span>
                  )}
                  {((c as Challenge & { target_community_ids?: string[] }).target_community_ids?.length ?? 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {(c as Challenge & { target_community_ids?: string[] }).target_community_ids!.length} {(c as Challenge & { target_community_ids?: string[] }).target_community_ids!.length === 1 ? 'community' : 'communities'}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-yellow-500 font-medium">
                    <Star className="w-3 h-3" /> {c.points_reward} pts
                  </span>
                  <span className="flex items-center gap-1 text-orange-500 font-medium">
                    <Zap className="w-3 h-3" /> {c.xp_reward} XP
                  </span>
                  {c.duration_days && (
                    <span className="text-muted-foreground">{c.duration_days}d duration</span>
                  )}
                  {c.start_date && (
                    <span className="text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString()} – {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'ongoing'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No challenges found{search ? ` matching "${search}"` : ''}</p>
          </div>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Challenge' : 'Create Challenge'}>
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
                placeholder="Challenge name"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={form.challenge_type}
                onChange={e => setForm(f => ({ ...f, challenge_type: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {CHALLENGE_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (days)</label>
              <input
                type="number"
                min={1}
                value={form.duration_days}
                onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
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
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" /> Target Communities
              <span className="text-xs text-muted-foreground font-normal ml-1">— leave empty to target all users</span>
            </label>
            <CommunityMultiSelect
              communities={communities}
              selected={form.target_community_ids}
              onChange={ids => setForm(f => ({ ...f, target_community_ids: ids }))}
            />
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
              {editTarget ? 'Save Changes' : 'Create Challenge'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Challenge">
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
