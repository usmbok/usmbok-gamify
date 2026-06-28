import { useEffect, useState } from 'react';
import { Target, Trophy, CheckCircle, Clock, Star, Zap, AlertCircle, Filter, Search, ExternalLink, Award, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import type { Quest, Challenge, UserQuestProgress, UserChallengeProgress } from '../../types/database';

interface QuestWithProgress extends Quest {
  progress: UserQuestProgress | null;
}

interface ChallengeWithProgress extends Challenge {
  progress: UserChallengeProgress | null;
}

type TaskFilter = 'all' | 'active' | 'available' | 'completed';
type TaskType = 'all' | 'quests' | 'challenges';

interface Props {
  onNavigate: (view: string) => void;
}

export function MyTasksView({ onNavigate }: Props) {
  const { bypassUserId } = useBypass();
  const [quests, setQuests] = useState<QuestWithProgress[]>([]);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TaskType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, [bypassUserId]);

  const load = async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId(bypassUserId);
      if (!userId) return;

      const [questsRes, challengesRes, questProgressRes, challengeProgressRes] = await Promise.all([
        supabase.from('quests').select('*').eq('status', 'active').order('name'),
        supabase.from('challenges').select('*').eq('is_active', true).order('name'),
        supabase.from('user_quest_progress').select('*').eq('user_id', userId),
        supabase.from('user_challenge_progress').select('*').eq('user_id', userId),
      ]);

      const questsWithProgress: QuestWithProgress[] = (questsRes.data || []).map(q => ({
        ...q,
        progress: (questProgressRes.data || []).find(p => p.quest_id === q.id) || null,
      }));

      const challengesWithProgress: ChallengeWithProgress[] = (challengesRes.data || []).map(c => ({
        ...c,
        progress: (challengeProgressRes.data || []).find(p => p.challenge_id === c.id) || null,
      }));

      setQuests(questsWithProgress);
      setChallenges(challengesWithProgress);
    } finally {
      setLoading(false);
    }
  };

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

  const allTasks = [
    ...quests.map(q => ({
      id: q.id,
      type: 'quest' as const,
      name: q.name,
      description: q.description,
      points: q.points_reward,
      xp: q.xp_reward,
      status: questStatus(q),
      end_date: q.end_date,
      is_daily: q.is_daily,
      is_weekly: q.is_weekly,
      raw: q,
    })),
    ...challenges.map(c => ({
      id: c.id,
      type: 'challenge' as const,
      name: c.name,
      description: c.description,
      points: c.points_reward,
      xp: c.xp_reward,
      status: challengeStatus(c),
      end_date: c.end_date,
      is_daily: false,
      is_weekly: false,
      challenge_type: c.challenge_type,
      raw: c,
    })),
  ];

  const filtered = allTasks.filter(t => {
    const matchType = typeFilter === 'all' || t.type === typeFilter.slice(0, -1);
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchFilter && matchSearch;
  });

  const counts = {
    all: allTasks.length,
    active: allTasks.filter(t => t.status === 'active').length,
    available: allTasks.filter(t => t.status === 'available').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
  };

  const statusInfo = (status: string) => {
    if (status === 'completed') return { label: 'Completed', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    if (status === 'active') return { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
    return { label: 'Available', icon: Star, color: 'text-muted-foreground', bg: 'bg-secondary text-muted-foreground' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All quests and challenges assigned to you</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'all' as TaskFilter, label: 'Total Tasks', value: counts.all, color: 'text-primary', icon: Target },
          { key: 'active' as TaskFilter, label: 'In Progress', value: counts.active, color: 'text-blue-500', icon: Clock },
          { key: 'available' as TaskFilter, label: 'Available', value: counts.available, color: 'text-muted-foreground', icon: Star },
          { key: 'completed' as TaskFilter, label: 'Completed', value: counts.completed, color: 'text-green-500', icon: CheckCircle },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`rounded-xl p-4 text-left transition-all ${
              filter === s.key
                ? 'bg-primary/10 border-2 border-primary/30'
                : 'bg-secondary border-2 border-transparent hover:border-primary/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TaskType)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          <option value="quests">Quests Only</option>
          <option value="challenges">Challenges Only</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-semibold mb-1">No tasks found</p>
          <p className="text-sm text-muted-foreground">
            {filter !== 'all' ? 'Try changing the filter above.' : 'No quests or challenges are currently active.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(task => {
            const si = statusInfo(task.status);
            const StatusIcon = si.icon;
            const isQuest = task.type === 'quest';
            const daysLeft = task.end_date
              ? Math.ceil((new Date(task.end_date).getTime() - Date.now()) / 86400000)
              : null;

            return (
              <div
                key={`${task.type}-${task.id}`}
                className={`bg-card border rounded-xl p-5 flex flex-col gap-3 transition-all hover:shadow-md ${
                  task.status === 'completed'
                    ? 'border-green-500/20 opacity-75'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isQuest ? 'bg-blue-500/10' : 'bg-orange-500/10'
                    }`}>
                      {isQuest
                        ? <Target className="w-4 h-4 text-blue-500" />
                        : <Trophy className="w-4 h-4 text-orange-500" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {isQuest
                          ? (task.is_daily ? 'Daily Quest' : task.is_weekly ? 'Weekly Quest' : 'Quest')
                          : `${(task as typeof task & { challenge_type: string }).challenge_type?.replace('_', ' ')} Challenge`
                        }
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${si.bg}`}>
                    <StatusIcon className="w-3 h-3" />
                    {si.label}
                  </span>
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-yellow-500 font-medium">
                    <Star className="w-3 h-3" /> {task.points.toLocaleString()} pts
                  </span>
                  <span className="flex items-center gap-1 text-orange-500 font-medium">
                    <Zap className="w-3 h-3" /> {task.xp.toLocaleString()} XP
                  </span>
                  {daysLeft !== null && daysLeft >= 0 && (
                    <span className={`flex items-center gap-1 font-medium ml-auto ${daysLeft <= 3 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      <Calendar className="w-3 h-3" />
                      {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
                    </span>
                  )}
                  {daysLeft !== null && daysLeft < 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                      <AlertCircle className="w-3 h-3" /> Expired
                    </span>
                  )}
                </div>

                {task.status !== 'completed' && (
                  <button
                    onClick={() => onNavigate(isQuest ? 'quests' : 'challenges')}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      task.status === 'active'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary hover:bg-accent text-foreground border border-border'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {task.status === 'active' ? 'Continue' : 'Start'} {isQuest ? 'Quest' : 'Challenge'}
                  </button>
                )}

                {task.status === 'completed' && (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {allTasks.length} tasks
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('quests')}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Target className="w-3.5 h-3.5" /> Browse All Quests
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={() => onNavigate('challenges')}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Trophy className="w-3.5 h-3.5" /> Browse All Challenges
          </button>
        </div>
      </div>
    </div>
  );
}
