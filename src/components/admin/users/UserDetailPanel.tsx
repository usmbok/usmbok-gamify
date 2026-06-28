import { useState, useEffect } from 'react';
import { X, User, Shield, Star, Zap, Trophy, Target, Award, Pencil, KeyRound, UserCheck, Activity, ChevronDown, ChevronUp, Plus, Trash2, Check, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ROLE_RANK } from '../../../contexts/ImpersonationContext';

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  current_level: number;
  total_points: number;
  total_xp: number;
  reputation_score: number;
  department: string | null;
  industry_sector: string | null;
  created_at: string;
  updated_at: string;
  role?: string;
}

interface Props {
  user: UserProfile;
  currentAdminRole: string;
  onClose: () => void;
  onEdit: () => void;
  onImpersonate: () => void;
  onPasswordReset: () => void;
}

const SOURCE_TYPES = ['activity', 'quest', 'challenge', 'badge', 'pulse', 'gift', 'manual', 'other'];

const sourceColor = (s: string | null) => {
  switch (s) {
    case 'quest': return 'bg-blue-500/10 text-blue-500';
    case 'challenge': return 'bg-orange-500/10 text-orange-500';
    case 'badge': return 'bg-yellow-500/10 text-yellow-500';
    case 'pulse': return 'bg-cyan-500/10 text-cyan-500';
    case 'gift': return 'bg-pink-500/10 text-pink-500';
    case 'manual': return 'bg-slate-500/10 text-slate-400';
    case 'activity': return 'bg-green-500/10 text-green-500';
    default: return 'bg-secondary text-muted-foreground';
  }
};

interface ActivityEntry {
  id: string;
  points_change: number;
  xp_change: number;
  reason: string | null;
  source_type: string | null;
  admin_note: string | null;
  updated_at: string | null;
  created_at: string;
}

interface BadgeEntry {
  id: string;
  earned_at: string;
  badge: { name: string; description: string | null; icon_url: string | null } | null;
}

interface QuestEntry {
  id: string;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
  quest: { name: string } | null;
}

interface ChallengeEntry {
  id: string;
  is_completed: boolean;
  started_at: string;
  quest: { name: string } | null;
}

interface CommunityEntry {
  id: string;
  role: string;
  joined_at: string;
  community: { id: string; name: string; color: string } | null;
}

type DetailTab = 'overview' | 'activity' | 'badges' | 'quests' | 'communities';

export function UserDetailPanel({ user, currentAdminRole, onClose, onEdit, onImpersonate, onPasswordReset }: Props) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [quests, setQuests] = useState<QuestEntry[]>([]);
  const [communities, setCommunities] = useState<CommunityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [allCommunities, setAllCommunities] = useState<{ id: string; name: string; color: string }[]>([]);
  const [addingCommunity, setAddingCommunity] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    points_change: number; xp_change: number; reason: string; source_type: string; admin_note: string;
  }>({ points_change: 0, xp_change: 0, reason: '', source_type: 'manual', admin_note: '' });
  const [savingEntry, setSavingEntry] = useState(false);

  const canImpersonate = (ROLE_RANK[currentAdminRole] ?? 1) >= (ROLE_RANK[user.role || 'user'] ?? 1);

  useEffect(() => {
    loadTabData(tab);
  }, [tab, user.id]);

  const loadTabData = async (t: DetailTab) => {
    setLoading(true);
    if (t === 'activity') {
      const { data } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setActivity(data || []);
    } else if (t === 'badges') {
      const { data } = await supabase
        .from('user_badges')
        .select('*, badge:badge_id(name, description, icon_url)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      setBadges(data || []);
    } else if (t === 'quests') {
      const { data } = await supabase
        .from('user_quest_progress')
        .select('*, quest:quest_id(name)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      setQuests(data || []);
    } else if (t === 'communities') {
      const [memberships, allComms] = await Promise.all([
        supabase
          .from('community_members')
          .select('*, community:community_id(id, name, color)')
          .eq('user_id', user.id),
        supabase.from('communities').select('id, name, color').eq('is_active', true).order('name'),
      ]);
      setCommunities(memberships.data || []);
      setAllCommunities(allComms.data || []);
    }
    setLoading(false);
  };

  const addToCommunity = async () => {
    if (!selectedCommunityId) return;
    await supabase.from('community_members').insert({
      community_id: selectedCommunityId,
      user_id: user.id,
      join_method: 'manual',
    });
    setAddingCommunity(false);
    setSelectedCommunityId('');
    loadTabData('communities');
  };

  const removeFromCommunity = async (membershipId: string) => {
    await supabase.from('community_members').delete().eq('id', membershipId);
    loadTabData('communities');
  };

  const openEditEntry = (e: ActivityEntry) => {
    setEditingEntryId(e.id);
    setEditForm({
      points_change: e.points_change,
      xp_change: e.xp_change,
      reason: e.reason || '',
      source_type: e.source_type || 'manual',
      admin_note: e.admin_note || '',
    });
  };

  const saveEditEntry = async () => {
    if (!editingEntryId) return;
    setSavingEntry(true);
    await supabase
      .from('points_ledger')
      .update({
        points_change: editForm.points_change,
        xp_change: editForm.xp_change,
        reason: editForm.reason.trim() || null,
        source_type: editForm.source_type,
        admin_note: editForm.admin_note.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingEntryId);
    setSavingEntry(false);
    setEditingEntryId(null);
    loadTabData('activity');
  };

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'quests', label: 'Quests', icon: Target },
    { id: 'communities', label: 'Communities', icon: Trophy },
  ];

  const initials = (user.full_name || user.username || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-96 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col sticky top-4 self-start max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40 flex-shrink-0">
        <span className="text-sm font-semibold">User Details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{user.full_name || user.username || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.username}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.role === 'admin' ? 'bg-red-500/10 text-red-500' :
                user.role === 'moderator' ? 'bg-orange-500/10 text-orange-500' :
                'bg-secondary text-muted-foreground'
              }`}>
                {user.role || 'user'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                L{user.current_level}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Star className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold">{user.total_points.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pts</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Zap className="w-3.5 h-3.5 text-orange-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold">{user.total_xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Shield className="w-3.5 h-3.5 text-cyan-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold">{user.reputation_score}</p>
            <p className="text-xs text-muted-foreground">Rep</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-3">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit User
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onPasswordReset}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors border border-border"
            >
              <KeyRound className="w-3 h-3" /> Reset Password
            </button>
            {canImpersonate ? (
              <button
                onClick={onImpersonate}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors border border-amber-500/20"
              >
                <UserCheck className="w-3 h-3" /> Impersonate
              </button>
            ) : (
              <button
                disabled
                title="Cannot impersonate a user with higher access"
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium cursor-not-allowed opacity-50 border border-border"
              >
                <UserCheck className="w-3 h-3" /> Impersonate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: user.full_name },
                  { label: 'Username', value: user.username },
                  { label: 'Department', value: user.department },
                  { label: 'Industry Sector', value: user.industry_sector },
                  { label: 'Member Since', value: new Date(user.created_at).toLocaleDateString() },
                  { label: 'Last Updated', value: new Date(user.updated_at).toLocaleDateString() },
                ].map(row => row.value ? (
                  <div key={row.label} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{row.label}</span>
                    <span className="text-xs font-medium text-right">{row.value}</span>
                  </div>
                ) : null)}
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-1.5">
                {activity.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs text-muted-foreground">No transactions recorded yet.</p>
                  </div>
                ) : activity.map(e => (
                  <div key={e.id} className="rounded-lg border border-border/50 overflow-hidden">
                    {editingEntryId === e.id ? (
                      <div className="p-2 space-y-2 bg-secondary/30">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-0.5 block">Points</label>
                            <input
                              type="number"
                              value={editForm.points_change}
                              onChange={ev => setEditForm(f => ({ ...f, points_change: parseInt(ev.target.value) || 0 }))}
                              className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-0.5 block">XP</label>
                            <input
                              type="number"
                              value={editForm.xp_change}
                              onChange={ev => setEditForm(f => ({ ...f, xp_change: parseInt(ev.target.value) || 0 }))}
                              className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-0.5 block">Reason</label>
                          <input
                            value={editForm.reason}
                            onChange={ev => setEditForm(f => ({ ...f, reason: ev.target.value }))}
                            className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-0.5 block">Source Type</label>
                          <select
                            value={editForm.source_type}
                            onChange={ev => setEditForm(f => ({ ...f, source_type: ev.target.value }))}
                            className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none focus:border-primary"
                          >
                            {SOURCE_TYPES.map(t => (
                              <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-0.5 block">Admin Note</label>
                          <input
                            value={editForm.admin_note}
                            onChange={ev => setEditForm(f => ({ ...f, admin_note: ev.target.value }))}
                            placeholder="Internal note..."
                            className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex gap-1.5 justify-end pt-1">
                          <button
                            onClick={() => setEditingEntryId(null)}
                            className="px-2 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditEntry}
                            disabled={savingEntry}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            {savingEntry ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-2 hover:bg-secondary/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className="text-xs text-foreground truncate">{e.reason || 'Activity'}</p>
                            <span className={`text-xs px-1.5 py-0 rounded-full font-medium capitalize flex-shrink-0 ${sourceColor(e.source_type)}`}>
                              {e.source_type || 'activity'}
                            </span>
                          </div>
                          {e.admin_note && (
                            <p className="text-xs text-muted-foreground italic truncate">Note: {e.admin_note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="text-right mr-1">
                            <p className={`text-xs font-semibold ${e.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {e.points_change >= 0 ? '+' : ''}{e.points_change} pts
                            </p>
                            <p className="text-xs text-muted-foreground">+{e.xp_change} XP</p>
                          </div>
                          <button
                            onClick={() => openEditEntry(e)}
                            className="p-1 rounded hover:bg-accent text-transparent group-hover:text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'badges' && (
              <div className="space-y-1.5">
                {badges.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No badges earned yet.</p>
                ) : badges.map(b => (
                  <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      {b.badge?.icon_url ? (
                        <img src={b.badge.icon_url} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <Award className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{b.badge?.name || 'Badge'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.earned_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'quests' && (
              <div className="space-y-1.5">
                {quests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No quest activity yet.</p>
                ) : quests.map(q => (
                  <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50">
                    <Target className={`w-3.5 h-3.5 flex-shrink-0 ${q.is_completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{q.quest?.name || 'Quest'}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.is_completed ? `Completed ${new Date(q.completed_at!).toLocaleDateString()}` : `Started ${new Date(q.started_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${q.is_completed ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                      {q.is_completed ? 'Done' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'communities' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">MEMBERSHIPS</span>
                  <button
                    onClick={() => setAddingCommunity(!addingCommunity)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    {addingCommunity ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    Add
                  </button>
                </div>

                {addingCommunity && (
                  <div className="flex gap-1.5 mb-2">
                    <select
                      value={selectedCommunityId}
                      onChange={e => setSelectedCommunityId(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="">Select community...</option>
                      {allCommunities
                        .filter(c => !communities.some(m => m.community?.id === c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                      onClick={addToCommunity}
                      disabled={!selectedCommunityId}
                      className="px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                )}

                {communities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Not a member of any community yet.</p>
                ) : communities.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 group">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.community?.color || '#3b82f6' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.community?.name || 'Community'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role} · {new Date(m.joined_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => removeFromCommunity(m.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-transparent group-hover:text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
