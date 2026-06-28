import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Radio, Plus, Search, Check, X, Pencil, Trash2,
  Users, Star, ChevronDown, ChevronUp, Clock, AlertCircle, ImageOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import { IconPickerModal, IconPreviewButton } from '../ui/IconPickerModal';

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

interface PulseChoice {
  id?: string;
  label: string;
  display_order: number;
  vote_count: number;
}

interface Pulse {
  id: string;
  question: string;
  description: string | null;
  category: string;
  status: string;
  points_reward: number;
  admin_notes: string | null;
  closes_at: string | null;
  published_at: string | null;
  created_at: string;
  submitted_by: string | null;
  target_community_ids?: string[] | null;
  submitter?: { full_name: string | null; username: string | null } | null;
  choices?: PulseChoice[];
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { value: 'under_review', label: 'Under Review', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'published', label: 'Published', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500/10 text-slate-500' },
  { value: 'archived', label: 'Archived', color: 'bg-secondary text-muted-foreground' },
];

const CATEGORIES = ['general', 'content', 'platform', 'methodology', 'community'];

const statusColor = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-secondary text-muted-foreground';
const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

type PulseForm = {
  question: string;
  description: string;
  category: string;
  status: string;
  points_reward: number;
  admin_notes: string;
  closes_at: string;
  choices: { id?: string; label: string; display_order: number }[];
  target_community_ids: string[];
  icon_url: string;
  icon_size: number;
};

const emptyForm: PulseForm = {
  question: '',
  description: '',
  category: 'general',
  status: 'under_review',
  points_reward: 50,
  admin_notes: '',
  closes_at: '',
  choices: [{ label: '', display_order: 0 }, { label: '', display_order: 1 }],
  target_community_ids: [],
  icon_url: '',
  icon_size: 40,
};

export function PulsesManager() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Pulse | null>(null);
  const [form, setForm] = useState<PulseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pulse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pulsesRes, choicesRes] = await Promise.all([
      supabase
        .from('pulses')
        .select('*, submitter:submitted_by(full_name, username)')
        .order('created_at', { ascending: false }),
      supabase.from('pulse_choices').select('*').order('display_order'),
    ]);

    const choices = (choicesRes.data || []) as (PulseChoice & { pulse_id: string })[];
    const pulsesWithChoices: Pulse[] = (pulsesRes.data || []).map(p => ({
      ...p,
      choices: choices.filter(c => c.pulse_id === p.id),
    }));
    setPulses(pulsesWithChoices);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('communities').select('id, name, color').order('name').then(({ data }) => setCommunities(data || []));
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (pulse: Pulse, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const p = pulse as Pulse & { icon_url?: string; icon_size?: number };
    setForm({
      question: pulse.question,
      description: pulse.description || '',
      category: pulse.category,
      status: pulse.status,
      points_reward: pulse.points_reward,
      admin_notes: pulse.admin_notes || '',
      closes_at: pulse.closes_at ? pulse.closes_at.substring(0, 10) : '',
      choices: (pulse.choices || []).map(c => ({ id: c.id, label: c.label, display_order: c.display_order })),
      target_community_ids: pulse.target_community_ids ?? [],
      icon_url: p.icon_url ?? '',
      icon_size: p.icon_size ?? 40,
    });
    setEditTarget(pulse);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.question.trim()) { setFormError('Question is required.'); return; }
    const validChoices = form.choices.filter(c => c.label.trim());
    if (validChoices.length < 2) { setFormError('At least 2 answer choices are required.'); return; }
    setSaving(true);

    const pulsePayload = {
      question: form.question.trim(),
      description: form.description.trim() || null,
      category: form.category,
      status: form.status,
      points_reward: form.points_reward,
      admin_notes: form.admin_notes.trim() || null,
      closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
      target_community_ids: form.target_community_ids,
      icon_url: form.icon_url || null,
      icon_size: form.icon_size,
    };

    try {
      let pulseId: string;

      if (editTarget) {
        const { error } = await supabase.from('pulses').update(pulsePayload).eq('id', editTarget.id);
        if (error) throw error;
        pulseId = editTarget.id;

        await supabase.from('pulse_choices').delete().eq('pulse_id', pulseId);
      } else {
        const { data, error } = await supabase.from('pulses').insert(pulsePayload).select('id').single();
        if (error || !data) throw error || new Error('Failed to create pulse');
        pulseId = data.id;
      }

      const choiceInserts = validChoices.map((c, i) => ({
        pulse_id: pulseId,
        label: c.label.trim(),
        display_order: i,
        vote_count: 0,
      }));
      const { error: cErr } = await supabase.from('pulse_choices').insert(choiceInserts);
      if (cErr) throw cErr;

      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('pulses').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    await load();
  };

  const quickStatus = async (pulse: Pulse, newStatus: string) => {
    await supabase.from('pulses').update({
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : pulse.published_at,
    }).eq('id', pulse.id);
    await load();
  };

  const addChoice = () => {
    if (form.choices.length < 6) {
      setForm(f => ({ ...f, choices: [...f.choices, { label: '', display_order: f.choices.length }] }));
    }
  };

  const updateChoice = (i: number, val: string) => {
    setForm(f => ({ ...f, choices: f.choices.map((c, idx) => idx === i ? { ...c, label: val } : c) }));
  };

  const removeChoice = (i: number) => {
    if (form.choices.length <= 2) return;
    setForm(f => ({ ...f, choices: f.choices.filter((_, idx) => idx !== i) }));
  };

  const totalVotes = (p: Pulse) => (p.choices || []).reduce((s, c) => s + c.vote_count, 0);

  const filtered = pulses.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search.trim() || p.question.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    total: pulses.length,
    draft: pulses.filter(p => p.status === 'draft').length,
    review: pulses.filter(p => p.status === 'under_review').length,
    published: pulses.filter(p => p.status === 'published').length,
  };

  const submitterName = (p: Pulse) => p.submitter?.full_name || p.submitter?.username || 'Admin';

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
        <h3 className="text-2xl font-bold">Pulses Management</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Create Pulse
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'text-primary', icon: Radio },
          { label: 'Drafts', value: counts.draft, color: 'text-yellow-500', icon: AlertCircle },
          { label: 'Under Review', value: counts.review, color: 'text-blue-500', icon: Clock },
          { label: 'Published', value: counts.published, color: 'text-green-500', icon: Check },
        ].map(s => (
          <div key={s.label} className="bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pulses..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No pulses found</p>
          </div>
        )}
        {filtered.map(pulse => {
          const isExpanded = expandedId === pulse.id;
          const total = totalVotes(pulse);
          const ep = pulse as Pulse & { icon_url?: string; icon_size?: number };
          return (
            <div key={pulse.id} className="border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : pulse.id)}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden mt-0.5">
                  {ep.icon_url ? (
                    <img
                      src={ep.icon_url}
                      alt=""
                      className="object-contain"
                      style={{ width: Math.min(ep.icon_size ?? 40, 36), height: Math.min(ep.icon_size ?? 40, 36) }}
                    />
                  ) : (
                    <ImageOff className="w-4 h-4 text-muted-foreground/25" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-sm">{pulse.question}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(pulse.status)}`}>
                      {statusLabel(pulse.status)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground capitalize">
                      {pulse.category}
                    </span>
                    {(pulse.target_community_ids?.length ?? 0) > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {pulse.target_community_ids!.length} {pulse.target_community_ids!.length === 1 ? 'community' : 'communities'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>by {submitterName(pulse)}</span>
                    <span>{new Date(pulse.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {total} votes
                    </span>
                    {pulse.points_reward > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        <Star className="w-3 h-3" /> +{pulse.points_reward} pts to submitter
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {pulse.status === 'under_review' && (
                    <button
                      onClick={e => { e.stopPropagation(); quickStatus(pulse, 'published'); }}
                      className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {pulse.status === 'published' && (
                    <button
                      onClick={e => { e.stopPropagation(); quickStatus(pulse, 'closed'); }}
                      className="px-2 py-1 rounded text-xs bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 font-medium transition-colors"
                    >
                      Close
                    </button>
                  )}
                  <button
                    onClick={e => openEdit(pulse, e)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(pulse); }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3 bg-secondary/20 space-y-3">
                  {pulse.description && (
                    <p className="text-sm text-muted-foreground">{pulse.description}</p>
                  )}
                  <div className="space-y-1.5">
                    {(pulse.choices || []).map(choice => {
                      const pct = total > 0 ? Math.round((choice.vote_count / total) * 100) : 0;
                      return (
                        <div key={choice.id || choice.display_order} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-5 flex-shrink-0">
                            {String.fromCharCode(65 + choice.display_order)}.
                          </span>
                          <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          <span className="text-xs font-medium w-24 truncate">{choice.label}</span>
                          <span className="text-xs text-muted-foreground">{choice.vote_count}</span>
                        </div>
                      );
                    })}
                  </div>
                  {pulse.admin_notes && (
                    <p className="text-xs text-muted-foreground bg-card rounded px-3 py-2 border border-border border-l-2 border-l-primary/40">
                      {pulse.admin_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {iconPickerOpen && (
        <IconPickerModal
          currentUrl={form.icon_url || null}
          currentSize={form.icon_size}
          onSelect={(sel) => setForm(f => ({ ...f, icon_url: sel.url, icon_size: sel.size }))}
          onClose={() => setIconPickerOpen(false)}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Pulse' : 'Create Pulse'} size="lg">
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
              <label className="block text-sm font-medium mb-1">Question <span className="text-red-500">*</span></label>
              <input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="What should the community weigh in on?"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description / Context</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Points to Submitter</label>
              <input
                type="number"
                min={0}
                value={form.points_reward}
                onChange={e => setForm(f => ({ ...f, points_reward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Closes On</label>
            <input
              type="date"
              value={form.closes_at}
              onChange={e => setForm(f => ({ ...f, closes_at: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Answer Choices <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">{form.choices.length}/6</span>
            </div>
            <div className="space-y-2">
              {form.choices.map((choice, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-muted-foreground w-5">{String.fromCharCode(65 + i)}.</span>
                  <input
                    value={choice.label}
                    onChange={e => updateChoice(i, e.target.value)}
                    placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                  {form.choices.length > 2 && (
                    <button onClick={() => removeChoice(i)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {form.choices.length < 6 && (
                <button onClick={addChoice} className="flex items-center gap-1.5 text-xs text-primary hover:underline py-1">
                  <Plus className="w-3.5 h-3.5" /> Add choice
                </button>
              )}
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

          <div>
            <label className="block text-sm font-medium mb-1">Admin Notes</label>
            <textarea
              value={form.admin_notes}
              onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
              rows={2}
              placeholder="Internal notes (not shown to users)..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Pulse'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Pulse">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Delete <strong className="text-foreground">"{deleteTarget?.question}"</strong>? All votes will be lost. This cannot be undone.
          </p>
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
