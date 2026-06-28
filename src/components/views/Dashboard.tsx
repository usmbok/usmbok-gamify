import { useEffect, useState } from 'react';
import { TrendingUp, Award, Target, Star, Zap, ChevronRight, ExternalLink, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import type { Profile, Quest, Challenge, UserBadge, Badge, Level } from '../../types/database';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  target_type: string;
  target_label: string | null;
  priority: number;
}

export function Dashboard() {
  const { bypassUserId } = useBypass();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [recentBadges, setRecentBadges] = useState<Array<UserBadge & { badge: Badge }>>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [bypassUserId]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const t = setInterval(() => setHeroIndex(i => (i + 1) % announcements.length), 6000);
    return () => clearInterval(t);
  }, [announcements.length]);

  const loadDashboardData = async () => {
    try {
      const userId = await getCurrentUserId(bypassUserId);

      const [levelsRes, questsRes, challengesRes, announcementsRes] = await Promise.all([
        supabase.from('levels').select('*').order('level_number'),
        supabase.from('quests').select('*').eq('status', 'active').limit(3),
        supabase.from('challenges').select('*').eq('is_active', true).limit(3),
        supabase
          .from('announcements')
          .select('id, title, body, image_url, cta_label, cta_url, target_type, target_label, priority')
          .eq('is_active', true)
          .lte('starts_at', new Date().toISOString())
          .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
          .order('priority', { ascending: false })
          .limit(5),
      ]);

      setActiveQuests(questsRes.data || []);
      setActiveChallenges(challengesRes.data || []);
      setAnnouncements(announcementsRes.data || []);

      if (userId) {
        const [profileRes, badgesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', userId)
            .order('earned_at', { ascending: false })
            .limit(5),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
          if (levelsRes.data) {
            const current = levelsRes.data.find(l => l.level_number === profileRes.data.current_level);
            const next = levelsRes.data.find(l => l.level_number === (profileRes.data.current_level ?? 0) + 1);
            setCurrentLevel(current || null);
            setNextLevel(next || null);
          }
        }

        setRecentBadges(badgesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const xpProgress = nextLevel
    ? ((profile?.total_xp || 0) / nextLevel.xp_required) * 100
    : 100;

  const hero = announcements[heroIndex] ?? null;

  return (
    <div className="space-y-6">
      {/* Welcome strip — compact */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 rounded-xl px-6 py-4 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold leading-tight">
            Welcome back, {profile?.full_name || profile?.username || 'there'}!
          </h2>
          <p className="text-blue-100 text-xs mt-0.5">
            You're making great progress on your engagement journey
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-right">
          <div>
            <p className="text-xs text-blue-200">Level</p>
            <p className="text-xl font-extrabold">{profile?.current_level ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200">Points</p>
            <p className="text-xl font-extrabold">{profile?.total_points?.toLocaleString() ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Hero Banner — Announcements */}
      <div className="w-full">
        {hero ? (
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg min-h-[180px] bg-card">
            {hero.image_url ? (
              <div className="absolute inset-0">
                <img
                  src={hero.image_url}
                  alt={hero.title}
                  className="w-full h-full object-cover"
                  onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            )}

            <div className="relative z-10 p-8 flex flex-col justify-end min-h-[180px]">
              {hero.target_label && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white/90 backdrop-blur-sm w-fit mb-3">
                  <Megaphone className="w-3 h-3" />
                  {hero.target_label}
                </span>
              )}
              <h3 className="text-2xl font-extrabold text-white leading-tight mb-1">{hero.title}</h3>
              {hero.body && (
                <p className="text-white/80 text-sm max-w-xl line-clamp-2 mb-4">{hero.body}</p>
              )}
              {hero.cta_label && hero.cta_url && (
                <a
                  href={hero.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors w-fit shadow-lg"
                >
                  {hero.cta_label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Dot indicators for multiple announcements */}
            {announcements.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === heroIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <Megaphone className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No active announcements</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Admins can create announcements via Admin &rarr; Announcements</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Level</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground">{profile?.current_level ?? '-'}</div>
          <div className="text-sm text-muted-foreground mt-1">{currentLevel?.name ?? 'N/A'}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total Points</span>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-foreground">{profile?.total_points?.toLocaleString() ?? '-'}</div>
          <div className="text-sm text-muted-foreground mt-1">Lifetime earned</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Experience</span>
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-foreground">{profile?.total_xp?.toLocaleString() ?? '-'}</div>
          <div className="text-sm text-muted-foreground mt-1">XP earned</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Reputation</span>
            <Award className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-foreground">{profile?.reputation_score?.toLocaleString() ?? '-'}</div>
          <div className="text-sm text-muted-foreground mt-1">Community score</div>
        </div>
      </div>

      {nextLevel && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Progress to Next Level</h3>
            <span className="text-sm text-muted-foreground">
              {profile?.total_xp?.toLocaleString()} / {nextLevel?.xp_required?.toLocaleString() || 0} XP
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min(xpProgress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Next: {nextLevel.name} (Level {nextLevel.level_number})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Active Quests</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {activeQuests.length} available
            </span>
          </div>
          {activeQuests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active quests</p>
          ) : (
            <div className="space-y-3">
              {activeQuests.map((quest) => (
                <div key={quest.id} className="p-4 bg-secondary rounded-lg hover:bg-accent transition-colors cursor-pointer flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">{quest.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{quest.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-yellow-500 font-medium">{quest.points_reward} pts</span>
                      <span className="text-blue-500 font-medium">{quest.xp_reward} XP</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Recent Badges</h3>
          </div>
          {recentBadges.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No badges earned yet</p>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {recentBadges.map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex flex-col items-center gap-2 p-2 bg-secondary rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  title={userBadge.badge.name}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center overflow-hidden">
                    {userBadge.badge.icon_url ? (
                      <img
                        src={userBadge.badge.icon_url}
                        alt={userBadge.badge.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Award className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <span className="text-xs text-center text-muted-foreground truncate w-full">
                    {userBadge.badge.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Active Challenges</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {activeChallenges.length} available
          </span>
        </div>
        {activeChallenges.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No active challenges</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeChallenges.map((challenge) => (
              <div key={challenge.id} className="p-4 bg-secondary rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <h4 className="font-medium text-foreground">{challenge.name}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{challenge.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">{challenge.challenge_type}</span>
                  <span className="text-yellow-500 font-medium">{challenge.points_reward} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
