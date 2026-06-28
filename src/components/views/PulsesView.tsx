import { useEffect, useState, useCallback } from 'react';
import {
  Radio, Plus, Search, Send, X, Star, Clock, CheckCircle,
  ChevronRight, Users, Flame, Lock, Lightbulb, Heart, MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';

interface PulseChoice {
  id: string;
  label: string;
  display_order: number;
  vote_count: number;
}

interface PulseVoteRecord {
  pulse_id: string;
  choice_id: string;
  comment: string | null;
  pulse_points_awarded: boolean;
}

interface Pulse {
  id: string;
  question: string;
  description: string | null;
  category: string;
  status: string;
  points_reward: number;
  submitted_by: string | null;
  closes_at: string | null;
  published_at: string | null;
  created_at: string;
  submitter?: { full_name: string | null; username: string | null } | null;
  choices?: PulseChoice[];
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'content', label: 'Content' },
  { value: 'platform', label: 'Platform' },
  { value: 'methodology', label: 'Methodology' },
  { value: 'community', label: 'Community' },
];

const PULSE_POINTS_PER_VOTE = 10;

export function PulsesView() {
  const { bypassUserId } = useBypass();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, PulseVoteRecord>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pulsePoints, setPulsePoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [votingId, setVotingId] = useState<string | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newPulse, setNewPulse] = useState({
    question: '',
    description: '',
    category: 'general',
    choices: ['', ''],
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<{ pulseId: string; choiceId: string } | null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [voteCommentError, setVoteCommentError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId(bypassUserId);
    setCurrentUserId(userId);

    const [pulsesRes, choicesRes, votesRes, profileRes] = await Promise.all([
      supabase
        .from('pulses')
        .select('*, submitter:submitted_by(full_name, username)')
        .in('status', ['published', 'closed'])
        .order('published_at', { ascending: false }),
      supabase.from('pulse_choices').select('*').order('display_order'),
      userId
        ? supabase.from('pulse_votes').select('pulse_id, choice_id, comment, pulse_points_awarded').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('profiles').select('pulse_points').eq('id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const choices = (choicesRes.data || []) as (PulseChoice & { pulse_id: string })[];
    const pulsesWithChoices: Pulse[] = (pulsesRes.data || []).map(p => ({
      ...p,
      choices: choices.filter(c => c.pulse_id === p.id),
    }));
    setPulses(pulsesWithChoices);

    const voteMap: Record<string, PulseVoteRecord> = {};
    for (const v of (votesRes.data || []) as PulseVoteRecord[]) {
      voteMap[v.pulse_id] = v;
    }
    setMyVotes(voteMap);

    if (profileRes.data) setPulsePoints(profileRes.data.pulse_points ?? 0);
    setLoading(false);
  }, [bypassUserId]);

  useEffect(() => { load(); }, [load]);

  const openVoteModal = (pulseId: string, choiceId: string) => {
    const existing = myVotes[pulseId];
    if (existing?.choice_id === choiceId) {
      handleRetractVote(pulseId, choiceId);
      return;
    }
    setPendingVote({ pulseId, choiceId });
    setVoteComment(existing?.comment || '');
    setVoteCommentError('');
  };

  const handleRetractVote = async (pulseId: string, _choiceId: string) => {
    if (!currentUserId || votingId) return;
    setVotingId(pulseId);
    const existing = myVotes[pulseId];
    await supabase.from('pulse_votes').delete().eq('pulse_id', pulseId).eq('user_id', currentUserId);
    setMyVotes(prev => { const n = { ...prev }; delete n[pulseId]; return n; });
    setPulses(prev => prev.map(p => p.id === pulseId ? {
      ...p,
      choices: p.choices?.map(c => c.id === existing?.choice_id ? { ...c, vote_count: Math.max(c.vote_count - 1, 0) } : c),
    } : p));
    setVotingId(null);
  };

  const confirmVote = async () => {
    if (!pendingVote || !currentUserId) return;
    if (!voteComment.trim()) {
      setVoteCommentError('A rationale comment is required to earn Pulse Points.');
      return;
    }
    setVoteCommentError('');
    setVotingId(pendingVote.pulseId);

    const { pulseId, choiceId } = pendingVote;
    const existing = myVotes[pulseId];

    if (existing) {
      await supabase.from('pulse_votes').delete().eq('pulse_id', pulseId).eq('user_id', currentUserId);
      setPulses(prev => prev.map(p => p.id === pulseId ? {
        ...p,
        choices: p.choices?.map(c => c.id === existing.choice_id ? { ...c, vote_count: Math.max(c.vote_count - 1, 0) } : c),
      } : p));
    }

    await supabase.from('pulse_votes').insert({
      pulse_id: pulseId,
      choice_id: choiceId,
      user_id: currentUserId,
      comment: voteComment.trim(),
      pulse_points_awarded: true,
    });

    if (!existing?.pulse_points_awarded) {
      await supabase.from('profiles').update({
        pulse_points: pulsePoints + PULSE_POINTS_PER_VOTE,
      }).eq('id', currentUserId);
      setPulsePoints(p => p + PULSE_POINTS_PER_VOTE);
    }

    setMyVotes(prev => ({
      ...prev,
      [pulseId]: { pulse_id: pulseId, choice_id: choiceId, comment: voteComment.trim(), pulse_points_awarded: true },
    }));
    setPulses(prev => prev.map(p => p.id === pulseId ? {
      ...p,
      choices: p.choices?.map(c => c.id === choiceId ? { ...c, vote_count: c.vote_count + 1 } : c),
    } : p));

    setPendingVote(null);
    setVoteComment('');
    setVotingId(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!newPulse.question.trim()) { setSubmitError('Question is required.'); return; }
    const validChoices = newPulse.choices.filter(c => c.trim());
    if (validChoices.length < 2) { setSubmitError('At least 2 answer choices are required.'); return; }
    if (!currentUserId) { setSubmitError('You must be signed in to submit a Pulse.'); return; }
    setSubmitting(true);

    const { data: pulse, error: pErr } = await supabase.from('pulses').insert({
      question: newPulse.question.trim(),
      description: newPulse.description.trim() || null,
      category: newPulse.category,
      submitted_by: currentUserId,
      status: 'draft',
    }).select('id').single();

    if (pErr || !pulse) { setSubmitError(pErr?.message || 'Failed to submit.'); setSubmitting(false); return; }

    const choiceInserts = validChoices.map((label, i) => ({
      pulse_id: pulse.id,
      label: label.trim(),
      display_order: i,
    }));
    await supabase.from('pulse_choices').insert(choiceInserts);

    setSubmitting(false);
    setSubmitOpen(false);
    setNewPulse({ question: '', description: '', category: 'general', choices: ['', ''] });
    await load();
  };

  const addChoice = () => {
    if (newPulse.choices.length < 6) setNewPulse(n => ({ ...n, choices: [...n.choices, ''] }));
  };

  const updateChoice = (i: number, val: string) => {
    setNewPulse(n => ({ ...n, choices: n.choices.map((c, idx) => idx === i ? val : c) }));
  };

  const removeChoice = (i: number) => {
    if (newPulse.choices.length <= 2) return;
    setNewPulse(n => ({ ...n, choices: n.choices.filter((_, idx) => idx !== i) }));
  };

  const totalVotes = (pulse: Pulse) => (pulse.choices || []).reduce((s, c) => s + c.vote_count, 0);

  const filtered = pulses.filter(p => {
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchSearch = !search.trim() || p.question.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered.find(p => p.status === 'published');
  const rest = filtered.filter(p => p !== featured);

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
            <Radio className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Pulses</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Community polls that shape the USMBOK reference. Vote with your rationale to earn <span className="text-pink-500 font-medium">Pulse Points</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentUserId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{pulsePoints}</span>
              <span className="text-xs text-muted-foreground">Pulse Points</span>
            </div>
          )}
          <button
            onClick={() => setSubmitOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Lightbulb className="w-4 h-4" /> Suggest a Pulse
          </button>
        </div>
      </div>

      <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl px-5 py-3 flex items-start gap-3">
        <Heart className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Earn Pulse Points</strong> — vote on any live Pulse and include your rationale. You earn <strong className="text-pink-600 dark:text-pink-400">{PULSE_POINTS_PER_VOTE} Pulse Points</strong> per vote with a comment. Pulse Points are separate from your main points balance and reflect your contribution to shaping USMBOK.
        </p>
      </div>

      {featured && (
        <FeaturedPulse
          pulse={featured}
          myVote={myVotes[featured.id] || null}
          isVoting={votingId === featured.id}
          onVote={(choiceId) => openVoteModal(featured.id, choiceId)}
          total={totalVotes(featured)}
        />
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pulses..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1 border border-border">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                catFilter === c.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map(pulse => {
            const myVote = myVotes[pulse.id] || null;
            const total = totalVotes(pulse);
            const isExpanded = expandedId === pulse.id;
            const closed = pulse.status === 'closed';

            return (
              <div key={pulse.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : pulse.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/10 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pulse.status === 'published' ? 'bg-green-500' : 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{pulse.question}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">{pulse.category}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {total} vote{total !== 1 ? 's' : ''}
                      </span>
                      {myVote && (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Voted
                          {myVote.pulse_points_awarded && <span className="text-pink-500 ml-1 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />+{PULSE_POINTS_PER_VOTE}</span>}
                        </span>
                      )}
                      {closed && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Closed
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 space-y-2 border-t border-border/50">
                    {pulse.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pulse.description}</p>
                    )}
                    {(pulse.choices || []).map(choice => {
                      const pct = total > 0 ? Math.round((choice.vote_count / total) * 100) : 0;
                      const chosen = myVote?.choice_id === choice.id;
                      const canVote = !closed && !!currentUserId;
                      return (
                        <button
                          key={choice.id}
                          onClick={() => canVote && openVoteModal(pulse.id, choice.id)}
                          disabled={!canVote || votingId === pulse.id}
                          className={`w-full text-left rounded-lg border transition-all ${
                            chosen
                              ? 'border-primary bg-primary/5'
                              : canVote
                              ? 'border-border hover:border-primary/40 hover:bg-accent/20'
                              : 'border-border opacity-75 cursor-default'
                          }`}
                        >
                          <div className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${chosen ? 'border-primary bg-primary' : 'border-border'}`}>
                                {chosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="text-sm font-medium">{choice.label}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{choice.vote_count}</span>
                              <span className="text-xs font-bold text-foreground w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="mx-4 mb-2 h-1 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${chosen ? 'bg-primary' : 'bg-muted-foreground/40'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                    {myVote?.comment && (
                      <div className="mt-3 flex items-start gap-2 bg-secondary/60 rounded-lg px-3 py-2 border border-border">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground italic">"{myVote.comment}"</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                      <span>{total} total vote{total !== 1 ? 's' : ''}</span>
                      {pulse.closes_at && pulse.status === 'published' && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Closes {new Date(pulse.closes_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <Radio className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No Pulses available right now.</p>
          <p className="text-sm text-muted-foreground mt-1">Suggest one and it may be published for the community!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        {[
          { label: 'Active Pulses', value: pulses.filter(p => p.status === 'published').length, icon: Flame, color: 'text-primary' },
          { label: 'Total Votes', value: pulses.reduce((s, p) => s + totalVotes(p), 0), icon: Users, color: 'text-blue-500' },
          { label: 'Closed Pulses', value: pulses.filter(p => p.status === 'closed').length, icon: CheckCircle, color: 'text-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {pendingVote && (() => {
        const pulse = pulses.find(p => p.id === pendingVote.pulseId);
        const choice = pulse?.choices?.find(c => c.id === pendingVote.choiceId);
        if (!pulse || !choice) return null;
        const hasExisting = !!myVotes[pendingVote.pulseId];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Cast Your Vote</h3>
                </div>
                <button onClick={() => setPendingVote(null)} className="p-1.5 rounded-lg hover:bg-accent">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-secondary rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Your selection</p>
                  <p className="font-semibold">{choice.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pulse.question}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Why did you choose this? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={voteComment}
                    onChange={e => { setVoteComment(e.target.value); setVoteCommentError(''); }}
                    rows={4}
                    placeholder="Share your rationale — your perspective helps shape the USMBOK reference..."
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                  />
                  {voteCommentError
                    ? <p className="text-xs text-red-500 mt-1">{voteCommentError}</p>
                    : <p className="text-xs text-muted-foreground mt-1">Your rationale is required. A comment earns you <span className="text-pink-500 font-medium">{PULSE_POINTS_PER_VOTE} Pulse Points</span>.</p>
                  }
                </div>

                {!hasExisting && (
                  <div className="flex items-center gap-2 bg-pink-500/5 border border-pink-500/20 rounded-lg px-4 py-3 text-sm">
                    <Heart className="w-4 h-4 text-pink-500 flex-shrink-0" />
                    <span className="text-muted-foreground">You will earn <strong className="text-pink-600 dark:text-pink-400">+{PULSE_POINTS_PER_VOTE} Pulse Points</strong> for this vote.</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={() => setPendingVote(null)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmVote}
                    disabled={!!votingId}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {votingId
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Heart className="w-4 h-4" />
                    }
                    {hasExisting ? 'Update Vote' : 'Submit Vote & Earn Points'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {submitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Suggest a Pulse</h3>
              </div>
              <button onClick={() => setSubmitOpen(false)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                Your Pulse idea will be reviewed by the USMBOK team before being published. You'll earn points when it goes live!
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Question <span className="text-red-500">*</span></label>
                <input
                  value={newPulse.question}
                  onChange={e => setNewPulse(n => ({ ...n, question: e.target.value }))}
                  placeholder="What should the community weigh in on?"
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Context / Description</label>
                <textarea
                  value={newPulse.description}
                  onChange={e => setNewPulse(n => ({ ...n, description: e.target.value }))}
                  rows={3}
                  placeholder="Add context or background for the question..."
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newPulse.category}
                  onChange={e => setNewPulse(n => ({ ...n, category: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Answer Choices <span className="text-red-500">*</span></label>
                  <span className="text-xs text-muted-foreground">{newPulse.choices.length}/6</span>
                </div>
                <div className="space-y-2">
                  {newPulse.choices.map((choice, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <input
                        value={choice}
                        onChange={e => updateChoice(i, e.target.value)}
                        placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      {newPulse.choices.length > 2 && (
                        <button onClick={() => removeChoice(i)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {newPulse.choices.length < 6 && (
                    <button onClick={addChoice} className="flex items-center gap-1.5 text-xs text-primary hover:underline py-1">
                      <Plus className="w-3.5 h-3.5" /> Add another choice
                    </button>
                  )}
                </div>
              </div>
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setSubmitOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">
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
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedPulse({
  pulse,
  myVote,
  isVoting,
  onVote,
  total,
}: {
  pulse: Pulse;
  myVote: PulseVoteRecord | null;
  isVoting: boolean;
  onVote: (choiceId: string) => void;
  total: number;
}) {
  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl overflow-hidden">
      <div className="absolute top-4 right-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="p-6 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured Pulse</span>
          <span className="text-xs text-muted-foreground capitalize ml-1">· {pulse.category}</span>
        </div>
        <h3 className="text-xl font-bold mb-2">{pulse.question}</h3>
        {pulse.description && (
          <p className="text-sm text-muted-foreground mb-4">{pulse.description}</p>
        )}
      </div>
      <div className="px-6 pb-6 space-y-2">
        {(pulse.choices || []).map(choice => {
          const pct = total > 0 ? Math.round((choice.vote_count / total) * 100) : 0;
          const chosen = myVote?.choice_id === choice.id;
          return (
            <button
              key={choice.id}
              onClick={() => !isVoting && onVote(choice.id)}
              disabled={isVoting}
              className={`w-full text-left rounded-xl border-2 transition-all duration-200 ${
                chosen
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-accent/20'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${chosen ? 'border-primary bg-primary' : 'border-border'}`}>
                    {chosen && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-semibold">{choice.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-muted-foreground">{choice.vote_count}</span>
                  <span className="text-sm font-bold w-10 text-right">{pct}%</span>
                </div>
              </div>
              <div className="mx-4 mb-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${chosen ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
        {myVote?.comment && (
          <div className="mt-2 flex items-start gap-2 bg-secondary/60 rounded-lg px-3 py-2 border border-border">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground italic">Your rationale: "{myVote.comment}"</p>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {total} vote{total !== 1 ? 's' : ''} cast
          </span>
          {myVote ? (
            <span className="flex items-center gap-1 text-primary font-medium">
              <CheckCircle className="w-3 h-3" /> Voted
              {myVote.pulse_points_awarded && <span className="ml-1 text-pink-500 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />+{10} pts</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-pink-400" /> Vote with a comment to earn Pulse Points</span>
          )}
        </div>
      </div>
      {pulse.closes_at && (
        <div className="px-6 py-3 border-t border-border/50 bg-secondary/20 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Closes {new Date(pulse.closes_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
