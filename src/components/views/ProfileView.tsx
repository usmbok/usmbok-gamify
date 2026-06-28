import { useEffect, useState } from 'react';
import {
  User, Star, Zap, Award, Target, Trophy, Shield, CheckCircle, Clock,
  TrendingUp, LogOut, Briefcase, Building, KeyRound, Eye, EyeOff,
  Users, ChevronDown, ChevronUp, Radio, Gift, BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import { CommunitySelector } from '../profile/CommunitySelector';
import type { Profile, Badge, BadgeConstellation, Quest, Challenge, UserQuestProgress, UserChallengeProgress } from '../../types/database';

interface UserBadgeWithDetails {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge & { constellation: BadgeConstellation | null };
}

interface QuestWithProgress extends Quest {
  progress: UserQuestProgress | null;
}

interface ChallengeWithProgress extends Challenge {
  progress: UserChallengeProgress | null;
}

interface PulseVoteWithDetails {
  id: string;
  pulse_id: string;
  created_at: string;
  comment: string | null;
  pulse: {
    id: string;
    question: string;
    category: string;
    status: string;
    points_reward: number;
  };
  choice: {
    id: string;
    choice_text: string;
  } | null;
}

const THEME_GRADIENTS: Record<string, string> = {
  innovation: 'from-orange-400 to-red-500',
  customer_service: 'from-blue-400 to-cyan-500',
  collaboration: 'from-green-400 to-emerald-500',
  learning: 'from-purple-400 to-blue-500',
  quality: 'from-yellow-400 to-orange-500',
  efficiency: 'from-red-400 to-pink-500',
  mentorship: 'from-teal-400 to-green-500',
  analytics: 'from-blue-500 to-indigo-600',
  communication: 'from-pink-400 to-rose-500',
  problem_solving: 'from-amber-400 to-yellow-500',
};

interface CollapsibleWidgetProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleWidget({ title, icon, count, defaultOpen = true, children }: CollapsibleWidgetProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-foreground text-sm">{title}</span>
          {count !== undefined && (
            <span className="text-xs font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface ProfileViewProps {
  onNavigate: (view: string) => void;
}

export function ProfileView({ onNavigate }: ProfileViewProps) {
  const { bypassUserId } = useBypass();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadgeWithDetails[]>([]);
  const [quests, setQuests] = useState<QuestWithProgress[]>([]);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [pulseVotes, setPulseVotes] = useState<PulseVoteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'badges' | 'activity' | 'communities' | 'pulses' | 'transactions' | 'security'>('overview');
  const [transactions, setTransactions] = useState<{
    id: string; points_change: number; xp_change: number; reason: string | null;
    source_type: string | null; admin_note: string | null; created_at: string;
  }[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [giftPointsBalance, setGiftPointsBalance] = useState<number>(0);
  const [giftDollarValue, setGiftDollarValue] = useState<number>(0);
  const [signingOut, setSigningOut] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [bypassUserId]);

  useEffect(() => {
    if (activeSection === 'transactions' && currentUserId && transactions.length === 0) {
      loadTransactions(currentUserId);
    }
  }, [activeSection, currentUserId]);

  const loadTransactions = async (userId: string) => {
    setTransactionsLoading(true);
    const { data } = await supabase
      .from('points_ledger')
      .select('id, points_change, xp_change, reason, source_type, admin_note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    setTransactions(data || []);
    setTransactionsLoading(false);
  };

  const loadProfile = async () => {
    try {
      const userId = await getCurrentUserId(bypassUserId);
      if (!userId) return;
      setCurrentUserId(userId);

      const [profileRes, badgesRes, questsRes, challengesRes, pulseVotesRes, giftPacksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase
          .from('user_badges')
          .select('*, badge:badges(*, constellation:badge_constellations(*))')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false }),
        supabase.from('quests').select('*').eq('status', 'active').limit(20),
        supabase.from('challenges').select('*').eq('is_active', true).limit(20),
        supabase
          .from('pulse_votes')
          .select('id, pulse_id, created_at, comment, pulse:pulses(id, question, category, status, points_reward), choice:pulse_choices(id, choice_text)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('gift_point_packs').select('points, price_usd').eq('is_active', true),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        const balance = profileRes.data.gift_points_balance ?? 0;
        setGiftPointsBalance(balance);
        const packs = (giftPacksRes.data || []) as { points: number; price_usd: string | number }[];
        if (packs.length > 0 && balance > 0) {
          const validPacks = packs.filter(p => p.points > 0);
          if (validPacks.length > 0) {
            const bestUsdPerPoint = Math.min(...validPacks.map(p => Number(p.price_usd) / p.points));
            if (!isNaN(bestUsdPerPoint) && isFinite(bestUsdPerPoint)) {
              setGiftDollarValue(balance * bestUsdPerPoint);
            }
          }
        } else {
          setGiftDollarValue(0);
        }
      }
      setUserBadges(badgesRes.data || []);
      if (pulseVotesRes.data) {
        const votes = pulseVotesRes.data.map((v) => {
          const pulse = Array.isArray(v.pulse) ? v.pulse[0] : v.pulse;
          const choice = Array.isArray(v.choice) ? v.choice[0] : v.choice;
          return {
            id: v.id,
            pulse_id: v.pulse_id,
            created_at: v.created_at,
            comment: v.comment ?? null,
            pulse: pulse ?? null,
            choice: choice ?? null,
          } as PulseVoteWithDetails;
        });
        setPulseVotes(votes);
      }

      if (questsRes.data) {
        const progressRes = await supabase
          .from('user_quest_progress')
          .select('*')
          .eq('user_id', userId);
        setQuests(questsRes.data.map((q) => ({
          ...q,
          progress: progressRes.data?.find((p) => p.quest_id === q.id) || null,
        })));
      }

      if (challengesRes.data) {
        const challengeProgressRes = await supabase
          .from('user_challenge_progress')
          .select('*')
          .eq('user_id', userId);
        setChallenges(challengesRes.data.map((c) => ({
          ...c,
          progress: challengeProgressRes.data?.find((p) => p.challenge_id === c.id) || null,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const totalBadgesEarned = userBadges.length;

  const questStatus = (q: QuestWithProgress) => {
    if (!q.progress) return 'available';
    if (q.progress.is_completed) return 'completed';
    return 'active';
  };

  const challengeStatus = (c: ChallengeWithProgress) => {
    if (!c.progress) return 'available';
    if (c.progress.is_completed) return 'completed';
    return 'active';
  };

  const statusPill = (status: string) => {
    if (status === 'completed') return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/30 px-2 py-0.5 rounded-full whitespace-nowrap">
        <CheckCircle className="w-3 h-3" /> Completed
      </span>
    );
    if (status === 'active') return (
      <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 rounded-full whitespace-nowrap">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
        <Target className="w-3 h-3" /> Available
      </span>
    );
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'badges', label: `Badges (${totalBadgesEarned})` },
    { id: 'activity', label: 'Quests & Challenges' },
    { id: 'communities', label: 'Communities' },
    { id: 'pulses', label: `Pulses (${pulseVotes.length})` },
    { id: 'transactions', label: 'Transactions' },
    { id: 'security', label: 'Security' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-md flex-shrink-0">
            <User className="w-7 h-7 text-white/90" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground leading-tight">{profile?.full_name || profile?.username || 'User'}</h2>
            <div className="flex items-center gap-3 mt-0.5 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {profile?.department || 'No department set'}
              </span>
              {profile?.industry_sector && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    {profile.industry_sector}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{profile?.current_level ?? 1}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Level
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">{(profile?.total_points ?? 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3" /> Points
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-500">{(profile?.total_xp ?? 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> XP
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-500">{totalBadgesEarned}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Award className="w-3 h-3" /> Badges
              </div>
            </div>
            <div className="h-10 w-px bg-border flex-shrink-0" />
            <div className="text-center">
              <div className="text-xl font-bold text-cyan-500">{giftPointsBalance.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Gift className="w-3 h-3" /> Gift pts
              </div>
              {giftDollarValue > 0 && (
                <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-0.5">
                  ≈ ${giftDollarValue.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
              activeSection === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleWidget
            title="Recent Badges"
            icon={<Award className="w-4 h-4 text-yellow-500" />}
            count={totalBadgesEarned}
          >
            {userBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No badges earned yet</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {userBadges.slice(0, 8).map((ub) => {
                  const theme = ub.badge.constellation?.theme ?? 'learning';
                  const gradient = THEME_GRADIENTS[theme] ?? 'from-blue-400 to-cyan-500';
                  return (
                    <div key={ub.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{ub.badge.name}</div>
                        <div className="text-xs text-muted-foreground">{ub.badge.constellation?.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(ub.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {userBadges.length > 8 && (
              <button
                onClick={() => setActiveSection('badges')}
                className="w-full text-center text-sm text-primary hover:underline pt-2"
              >
                View all {userBadges.length} badges
              </button>
            )}
          </CollapsibleWidget>

          <CollapsibleWidget
            title="Active Quests"
            icon={<Target className="w-4 h-4 text-primary" />}
            count={quests.filter((q) => questStatus(q) === 'active').length}
          >
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {quests.filter((q) => questStatus(q) === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active quests</p>
              ) : (
                quests.filter((q) => questStatus(q) === 'active').map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{q.name}</div>
                      <div className="text-xs text-muted-foreground">{q.points_reward} pts</div>
                    </div>
                    {statusPill(questStatus(q))}
                  </div>
                ))
              )}
            </div>
          </CollapsibleWidget>

          <CollapsibleWidget
            title="Active Challenges"
            icon={<Trophy className="w-4 h-4 text-orange-500" />}
            count={challenges.filter((c) => challengeStatus(c) === 'active').length}
          >
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {challenges.filter((c) => challengeStatus(c) === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active challenges</p>
              ) : (
                challenges.filter((c) => challengeStatus(c) === 'active').map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.challenge_type.replace('_', ' ')}</div>
                    </div>
                    {statusPill(challengeStatus(c))}
                  </div>
                ))
              )}
            </div>
          </CollapsibleWidget>

          <CollapsibleWidget
            title="Achievements Summary"
            icon={<Shield className="w-4 h-4 text-emerald-500" />}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quests Completed</span>
                <span className="font-bold text-foreground">{quests.filter((q) => questStatus(q) === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Challenges Completed</span>
                <span className="font-bold text-foreground">{challenges.filter((c) => challengeStatus(c) === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Badges Earned</span>
                <span className="font-bold text-foreground">{totalBadgesEarned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pulses Answered</span>
                <span className="font-bold text-foreground">{pulseVotes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reputation Score</span>
                <span className="font-bold text-foreground">{profile?.reputation_score ?? 0}</span>
              </div>
            </div>
          </CollapsibleWidget>
        </div>
      )}

      {activeSection === 'badges' && (
        <div className="space-y-4">
          {userBadges.length === 0 ? (
            <div className="text-center py-16">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No badges earned yet</p>
              <p className="text-sm text-muted-foreground mt-1">Complete quests and challenges to earn badges!</p>
              <button
                onClick={() => onNavigate('badges')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Browse Badge Constellations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(
                userBadges.reduce((acc, ub) => {
                  const constName = ub.badge.constellation?.name ?? 'Unknown';
                  if (!acc[constName]) acc[constName] = { constellation: ub.badge.constellation, badges: [] };
                  acc[constName].badges.push(ub);
                  return acc;
                }, {} as Record<string, { constellation: BadgeConstellation | null; badges: UserBadgeWithDetails[] }>)
              ).map(([constName, { constellation, badges }]) => {
                const theme = constellation?.theme ?? 'learning';
                const gradient = THEME_GRADIENTS[theme] ?? 'from-blue-400 to-cyan-500';
                return (
                  <CollapsibleWidget
                    key={constName}
                    title={constName}
                    icon={<div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />}
                    count={badges.length}
                  >
                    <div className={`h-1 bg-gradient-to-r ${gradient} -mx-5 -mt-3 mb-3`} />
                    <div className="flex flex-wrap gap-2 mb-3">
                      {badges.map((ub) => (
                        <div
                          key={ub.id}
                          className="group relative"
                          title={`${ub.badge.name} — earned ${new Date(ub.earned_at).toLocaleDateString()}`}
                        >
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                            <Award className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {badges.map((ub) => (
                        <div key={ub.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span className="text-foreground">{ub.badge.name}</span>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0 ml-2">{new Date(ub.earned_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleWidget>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === 'activity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleWidget
            title="All Quests"
            icon={<Target className="w-4 h-4 text-primary" />}
            count={quests.length}
          >
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {quests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No quests found</p>
              ) : (
                quests.map((q) => {
                  const status = questStatus(q);
                  return (
                    <div key={q.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        status === 'completed' ? 'bg-green-500' : status === 'active' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{q.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{q.points_reward} pts · {q.xp_reward} XP</div>
                      </div>
                      {statusPill(status)}
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleWidget>

          <CollapsibleWidget
            title="All Challenges"
            icon={<Trophy className="w-4 h-4 text-orange-500" />}
            count={challenges.length}
          >
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {challenges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No challenges found</p>
              ) : (
                challenges.map((c) => {
                  const status = challengeStatus(c);
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        status === 'completed' ? 'bg-green-500' : status === 'active' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {c.challenge_type.replace('_', ' ')} · {c.points_reward} pts
                        </div>
                      </div>
                      {statusPill(status)}
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleWidget>
        </div>
      )}

      {activeSection === 'communities' && currentUserId && (
        <CommunitySelector userId={currentUserId} />
      )}

      {activeSection === 'pulses' && (
        <div className="space-y-4">
          <CollapsibleWidget
            title="Pulses I've Responded To"
            icon={<Radio className="w-4 h-4 text-primary" />}
            count={pulseVotes.length}
          >
            {pulseVotes.length === 0 ? (
              <div className="text-center py-8">
                <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No pulse responses yet</p>
                <p className="text-xs text-muted-foreground mt-1">Respond to pulses to see them here</p>
                <button
                  onClick={() => onNavigate('pulses')}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Browse Pulses
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                {pulseVotes.map((vote) => (
                  <div key={vote.id} className="p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{vote.pulse?.question}</p>
                        {vote.choice && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs text-primary font-medium">{vote.choice.choice_text}</span>
                          </div>
                        )}
                        {vote.comment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{vote.comment}"</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          vote.pulse?.status === 'active'
                            ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {vote.pulse?.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{vote.pulse?.category?.replace('_', ' ')}</span>
                      {(vote.pulse?.points_reward ?? 0) > 0 && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                            <Star className="w-3 h-3" /> {vote.pulse?.points_reward} pts earned
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleWidget>
        </div>
      )}

      {activeSection === 'transactions' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">My Point Transactions</h3>
            <span className="ml-auto text-xs text-muted-foreground">{transactions.length} records</span>
          </div>
          {transactionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete quests and challenges to earn points</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.map(t => (
                <div key={t.id} className="flex items-start gap-3 px-6 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.reason || 'Points awarded'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.source_type && (
                        <span className={`text-xs px-2 py-0 rounded-full font-medium capitalize ${
                          t.source_type === 'quest' ? 'bg-blue-500/10 text-blue-500' :
                          t.source_type === 'challenge' ? 'bg-orange-500/10 text-orange-500' :
                          t.source_type === 'badge' ? 'bg-yellow-500/10 text-yellow-500' :
                          t.source_type === 'pulse' ? 'bg-cyan-500/10 text-cyan-500' :
                          t.source_type === 'gift' ? 'bg-pink-500/10 text-pink-500' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {t.source_type}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    {t.admin_note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">Note: {t.admin_note}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${t.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {t.points_change >= 0 ? '+' : ''}{t.points_change} pts
                    </p>
                    {t.xp_change > 0 && (
                      <p className="text-xs text-orange-500">+{t.xp_change} XP</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'security' && (
        <div className="max-w-lg">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Password
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Update your password. You must be signed in to change it here.
            </p>

            {passwordMsg && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                passwordMsg.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2.5 pr-10 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {savingPassword ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                Update Password
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Account Actions
              </h4>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing out...' : 'Sign Out of All Devices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
