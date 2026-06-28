import { useEffect, useState, useCallback } from 'react';
import {
  Lightbulb, ThumbsUp, Plus, Search, Filter, Crown, Medal,
  ChevronUp, CheckCircle, Clock, Eye, Flame, Star, X, Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';

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

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'platform', label: 'Platform' },
  { value: 'quests', label: 'Quests' },
  { value: 'challenges', label: 'Challenges' },
  { value: 'ux', label: 'UX / Design' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  under_review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  accepted: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  implemented: 'bg-green-500/10 text-green-600 dark:text-green-400',
  declined: 'bg-red-500/10 text-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  accepted: 'Accepted',
  implemented: 'Implemented',
  declined: 'Declined',
};

export function IdeasView() {
  const { bypassUserId } = useBypass();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'platform' });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(bypassUserId);
    setCurrentUserId(userId);

    const [ideasRes, votesRes] = await Promise.all([
      supabase
        .from('ideas')
        .select('*, submitter:submitted_by(full_name, username)')
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: false }),
      userId
        ? supabase.from('idea_votes').select('idea_id').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
    ]);

    setIdeas(ideasRes.data || []);
    setMyVotes(new Set((votesRes.data || []).map((v: { idea_id: string }) => v.idea_id)));
    setLoading(false);
  }, [bypassUserId]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (idea: Idea) => {
    if (!currentUserId || votingId) return;
    setVotingId(idea.id);
    const alreadyVoted = myVotes.has(idea.id);

    if (alreadyVoted) {
      await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', currentUserId);
      setMyVotes(prev => { const s = new Set(prev); s.delete(idea.id); return s; });
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, vote_count: Math.max(i.vote_count - 1, 0) } : i));
    } else {
      await supabase.from('idea_votes').insert({ idea_id: idea.id, user_id: currentUserId });
      setMyVotes(prev => new Set([...prev, idea.id]));
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, vote_count: i.vote_count + 1 } : i));
    }
    setVotingId(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!newIdea.title.trim()) { setSubmitError('Title is required.'); return; }
    if (!currentUserId) { setSubmitError('You must be signed in to submit an idea.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('ideas').insert({
      title: newIdea.title.trim(),
      description: newIdea.description.trim() || null,
      category: newIdea.category,
      submitted_by: currentUserId,
      status: 'open',
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitOpen(false);
    setNewIdea({ title: '', description: '', category: 'platform' });
    await load();
  };

  const filtered = ideas.filter(idea => {
    const matchCat = categoryFilter === 'all' || idea.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || idea.status === statusFilter;
    const matchSearch = !search.trim() || idea.title.toLowerCase().includes(search.toLowerCase()) || idea.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  const sortedByVotes = [...filtered].sort((a, b) => b.vote_count - a.vote_count);

  const topThree = sortedByVotes.slice(0, 3);
  const rest = sortedByVotes.slice(3);

  const rankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    return <Medal className="w-5 h-5 text-amber-600" />;
  };

  const submitterName = (idea: Idea) =>
    idea.submitter?.full_name || idea.submitter?.username || 'Anonymous';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Lightbulb className="w-8 h-8 text-yellow-500" />
            <h2 className="text-3xl font-bold">Ideas Board</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Submit ideas to improve USMBOK. Vote up the best ones — top ideas earn rewards and become real challenges.
          </p>
        </div>
        <button
          onClick={() => setSubmitOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Submit Idea
        </button>
      </div>

      {topThree.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Top Ideas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((idea, i) => {
              const voted = myVotes.has(idea.id);
              return (
                <div
                  key={idea.id}
                  className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                    i === 0
                      ? 'border-yellow-400/40 bg-yellow-400/5'
                      : i === 1
                      ? 'border-slate-400/30 bg-slate-400/5'
                      : 'border-amber-600/30 bg-amber-600/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rankIcon(i)}
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status] || ''}`}>
                      {STATUS_LABELS[idea.status] || idea.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base leading-snug mb-1">{idea.title}</h4>
                    {idea.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground">{submitterName(idea)}</span>
                    <button
                      onClick={() => handleVote(idea)}
                      disabled={!currentUserId || votingId === idea.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        voted
                          ? 'bg-primary text-primary-foreground shadow-md scale-105'
                          : 'bg-secondary hover:bg-primary/10 hover:text-primary border border-border'
                      }`}
                    >
                      <ChevronUp className="w-4 h-4" />
                      {idea.vote_count}
                    </button>
                  </div>
                  {idea.points_awarded > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-yellow-500 font-medium">
                      <Star className="w-3 h-3" /> +{idea.points_awarded} pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ideas..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-secondary/30">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {filtered.length} idea{filtered.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-muted-foreground ml-1">ranked by votes</span>
        </div>

        {sortedByVotes.length === 0 ? (
          <div className="py-20 text-center">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No ideas yet. Be the first to submit one!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rest.map((idea, idx) => {
              const voted = myVotes.has(idea.id);
              const rank = idx + 4;
              return (
                <div key={idea.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/20 transition-colors">
                  <span className="w-8 text-center text-sm font-bold text-muted-foreground flex-shrink-0">
                    {rank}
                  </span>
                  <button
                    onClick={() => handleVote(idea)}
                    disabled={!currentUserId || votingId === idea.id}
                    className={`flex flex-col items-center gap-0.5 w-12 flex-shrink-0 py-1.5 rounded-lg transition-all ${
                      voted
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    <ChevronUp className="w-5 h-5" />
                    <span className="text-xs font-bold">{idea.vote_count}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="font-semibold text-sm">{idea.title}</h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status] || ''}`}>
                        {STATUS_LABELS[idea.status] || idea.status}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-secondary rounded-full text-muted-foreground capitalize">
                        {idea.category}
                      </span>
                    </div>
                    {idea.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{idea.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {submitterName(idea)} · {new Date(idea.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {idea.points_awarded > 0 && (
                      <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                        <Star className="w-3 h-3" /> +{idea.points_awarded}
                      </span>
                    )}
                    {idea.linked_challenge_id && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <CheckCircle className="w-3 h-3" /> Challenge
                      </span>
                    )}
                    {idea.status === 'under_review' && (
                      <span className="flex items-center gap-1 text-xs text-yellow-500">
                        <Eye className="w-3 h-3" />
                      </span>
                    )}
                    {idea.status === 'implemented' && (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        {[
          { label: 'Total Ideas', value: ideas.length, icon: Lightbulb, color: 'text-yellow-500' },
          { label: 'Total Votes Cast', value: ideas.reduce((s, i) => s + i.vote_count, 0), icon: ThumbsUp, color: 'text-primary' },
          { label: 'Implemented', value: ideas.filter(i => i.status === 'implemented').length, icon: CheckCircle, color: 'text-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {submitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold text-lg">Submit an Idea</h3>
              </div>
              <button onClick={() => setSubmitOpen(false)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  value={newIdea.title}
                  onChange={e => setNewIdea(n => ({ ...n, title: e.target.value }))}
                  placeholder="Summarise your idea in a sentence"
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newIdea.description}
                  onChange={e => setNewIdea(n => ({ ...n, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the problem it solves or how it would work..."
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newIdea.category}
                  onChange={e => setNewIdea(n => ({ ...n, category: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setSubmitOpen(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                  Submit Idea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
