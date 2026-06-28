import { useEffect, useState, useCallback } from 'react';
import {
  Lightbulb, ChevronUp, Search, Check, X, Pencil, Star,
  Trophy, ExternalLink, AlertCircle, Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string | null;
  category: string;
  status: string;
  vote_count: number;
  points_awarded: number;
  linked_challenge_id: string | null;
  admin_notes: string | null;
  created_at: string;
  submitter?: { full_name: string | null; username: string | null } | null;
}

interface Challenge {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { value: 'accepted', label: 'Accepted', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { value: 'implemented', label: 'Implemented', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500/10 text-red-500' },
];

const statusColor = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-secondary text-muted-foreground';
const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

export function IdeasManager() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editTarget, setEditTarget] = useState<Idea | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'open',
    admin_notes: '',
    points_awarded: 0,
    linked_challenge_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [convertTarget, setConvertTarget] = useState<Idea | null>(null);
  const [convertForm, setConvertForm] = useState({ name: '', description: '', points_reward: 200, xp_reward: 300, challenge_type: 'individual' });
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ideasRes, challengesRes] = await Promise.all([
      supabase
        .from('ideas')
        .select('*, submitter:submitted_by(full_name, username)')
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('challenges').select('id, name').eq('is_active', true).order('name'),
    ]);
    setIdeas(ideasRes.data || []);
    setChallenges(challengesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (idea: Idea) => {
    setEditTarget(idea);
    setEditForm({
      status: idea.status,
      admin_notes: idea.admin_notes || '',
      points_awarded: idea.points_awarded,
      linked_challenge_id: idea.linked_challenge_id || '',
    });
    setEditError(null);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    setEditError(null);
    const { error } = await supabase
      .from('ideas')
      .update({
        status: editForm.status,
        admin_notes: editForm.admin_notes || null,
        points_awarded: editForm.points_awarded,
        linked_challenge_id: editForm.linked_challenge_id || null,
      })
      .eq('id', editTarget.id);
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditTarget(null);
    await load();
  };

  const openConvert = (idea: Idea) => {
    setConvertTarget(idea);
    setConvertForm({
      name: idea.title,
      description: idea.description || '',
      points_reward: 200,
      xp_reward: 300,
      challenge_type: 'community',
    });
    setConvertError(null);
  };

  const handleConvert = async () => {
    if (!convertTarget || !convertForm.name.trim()) { setConvertError('Challenge name is required.'); return; }
    setConverting(true);
    setConvertError(null);
    const { data: newChallenge, error: cErr } = await supabase
      .from('challenges')
      .insert({
        name: convertForm.name,
        description: convertForm.description || null,
        challenge_type: convertForm.challenge_type,
        points_reward: convertForm.points_reward,
        xp_reward: convertForm.xp_reward,
        is_active: true,
        objective: {},
      })
      .select('id')
      .single();
    if (cErr || !newChallenge) { setConvertError(cErr?.message || 'Failed to create challenge.'); setConverting(false); return; }

    const { error: uErr } = await supabase
      .from('ideas')
      .update({ status: 'implemented', linked_challenge_id: newChallenge.id })
      .eq('id', convertTarget.id);
    setConverting(false);
    if (uErr) { setConvertError(uErr.message); return; }
    setConvertTarget(null);
    await load();
  };

  const filtered = ideas.filter(i => {
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchSearch = !search.trim() || i.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    total: ideas.length,
    open: ideas.filter(i => i.status === 'open').length,
    review: ideas.filter(i => i.status === 'under_review').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
  };

  const submitterName = (i: Idea) => i.submitter?.full_name || i.submitter?.username || 'Anonymous';

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
        <h3 className="text-2xl font-bold">Ideas Management</h3>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Ideas', value: counts.total, color: 'text-primary', icon: Lightbulb },
          { label: 'Open', value: counts.open, color: 'text-blue-500', icon: Filter },
          { label: 'Under Review', value: counts.review, color: 'text-yellow-500', icon: AlertCircle },
          { label: 'Implemented', value: counts.implemented, color: 'text-green-500', icon: Check },
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
            placeholder="Search ideas..."
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
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No ideas found</p>
          </div>
        )}
        {filtered.map((idea, idx) => (
          <div key={idea.id} className="border border-border rounded-xl p-4 hover:bg-accent/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 w-12 flex-shrink-0">
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-lg font-bold text-primary">{idea.vote_count}</span>
                <span className="text-xs text-muted-foreground">votes</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                  <h4 className="font-semibold text-foreground">{idea.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(idea.status)}`}>
                    {statusLabel(idea.status)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground capitalize">
                    {idea.category}
                  </span>
                </div>
                {idea.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>by {submitterName(idea)}</span>
                  <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                  {idea.points_awarded > 0 && (
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      <Star className="w-3 h-3" /> +{idea.points_awarded} pts awarded
                    </span>
                  )}
                  {idea.linked_challenge_id && (
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <Trophy className="w-3 h-3" /> Challenge linked
                    </span>
                  )}
                </div>
                {idea.admin_notes && (
                  <p className="mt-2 text-xs text-muted-foreground bg-secondary rounded px-2 py-1 border-l-2 border-primary/40">
                    {idea.admin_notes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openConvert(idea)}
                  title="Convert to Challenge"
                  className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openEdit(idea)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Review Idea">
        <div className="space-y-4">
          {editTarget && (
            <div className="bg-secondary rounded-lg p-4">
              <p className="font-semibold">{editTarget.title}</p>
              {editTarget.description && <p className="text-sm text-muted-foreground mt-1">{editTarget.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">{editTarget.vote_count} votes · by {submitterName(editTarget)}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Points Awarded to Submitter</label>
            <input
              type="number"
              min={0}
              value={editForm.points_awarded}
              onChange={e => setEditForm(f => ({ ...f, points_awarded: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Reward points granted to the person who submitted this idea.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Link to Existing Challenge</label>
            <select
              value={editForm.linked_challenge_id}
              onChange={e => setEditForm(f => ({ ...f, linked_challenge_id: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="">— None —</option>
              {challenges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Notes</label>
            <textarea
              value={editForm.admin_notes}
              onChange={e => setEditForm(f => ({ ...f, admin_notes: e.target.value }))}
              rows={3}
              placeholder="Internal notes or feedback for the submitter..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!convertTarget} onClose={() => setConvertTarget(null)} title="Convert Idea to Challenge">
        <div className="space-y-4">
          {convertTarget && (
            <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground">
              Converting: <strong className="text-foreground">{convertTarget.title}</strong> ({convertTarget.vote_count} votes)
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Challenge Name <span className="text-red-500">*</span></label>
            <input
              value={convertForm.name}
              onChange={e => setConvertForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={convertForm.description}
              onChange={e => setConvertForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Reward</label>
              <input
                type="number"
                min={0}
                value={convertForm.points_reward}
                onChange={e => setConvertForm(f => ({ ...f, points_reward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Reward</label>
              <input
                type="number"
                min={0}
                value={convertForm.xp_reward}
                onChange={e => setConvertForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Challenge Type</label>
            <select
              value={convertForm.challenge_type}
              onChange={e => setConvertForm(f => ({ ...f, challenge_type: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="community">Community</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="department">Department</option>
            </select>
          </div>
          {convertError && <p className="text-sm text-red-500">{convertError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setConvertTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleConvert}
              disabled={converting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {converting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trophy className="w-4 h-4" />}
              Create Challenge
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
