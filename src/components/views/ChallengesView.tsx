import { useEffect, useState } from 'react';
import { Trophy, Users, Building, Clock, CheckCircle, Star, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import { useViewPreference } from '../../hooks/useViewPreference';
import { ViewToggle } from '../ui/ViewToggle';
import type { Challenge, UserChallengeProgress } from '../../types/database';

export function ChallengesView() {
  const { bypassUserId } = useBypass();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserChallengeProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('challenges', 'card');

  useEffect(() => {
    loadChallenges();
  }, [bypassUserId]);

  const loadChallenges = async () => {
    try {
      const userId = await getCurrentUserId(bypassUserId);

      const { data: challengesData } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setChallenges(challengesData || []);

      if (userId && challengesData) {
        const { data: progressData } = await supabase
          .from('user_challenge_progress')
          .select('*')
          .eq('user_id', userId);

        const progressMap = new Map<string, UserChallengeProgress>();
        progressData?.forEach((p) => {
          progressMap.set(p.challenge_id, p);
        });
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challenge: Challenge) => {
    const userId = await getCurrentUserId(bypassUserId);
    if (!userId) return;

    const { error } = await supabase.from('user_challenge_progress').insert({
      user_id: userId,
      challenge_id: challenge.id,
      progress_data: {},
      is_completed: false
    });

    if (!error) {
      loadChallenges();
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'team':
        return Users;
      case 'department':
        return Building;
      default:
        return Trophy;
    }
  };

  const getTimeRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Challenges</h2>
        </div>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {challenges.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active challenges at this time</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => {
            const Icon = getChallengeIcon(challenge.challenge_type);
            const progress = userProgress.get(challenge.id);
            const timeRemaining = getTimeRemaining(challenge.end_date);
            return (
              <div key={challenge.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{challenge.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{challenge.challenge_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{challenge.description}</p>
                {timeRemaining && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Clock className="w-3.5 h-3.5" /><span>{timeRemaining}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Star className="w-3.5 h-3.5" />{challenge.points_reward} pts</span>
                  <span className="flex items-center gap-1 text-orange-500 font-semibold"><Zap className="w-3.5 h-3.5" />{challenge.xp_reward} XP</span>
                </div>
                {progress ? (
                  progress.is_completed ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg font-medium text-sm">
                      <CheckCircle className="w-4 h-4" />Completed
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg text-center text-sm font-medium">In Progress</div>
                  )
                ) : (
                  <button onClick={() => joinChallenge(challenge)} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                    Join Challenge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Challenge</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Rewards</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Time Left</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {challenges.map(challenge => {
                const Icon = getChallengeIcon(challenge.challenge_type);
                const progress = userProgress.get(challenge.id);
                const timeRemaining = getTimeRemaining(challenge.end_date);
                return (
                  <tr key={challenge.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{challenge.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{challenge.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize hidden sm:table-cell">{challenge.challenge_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-yellow-500 font-semibold">{challenge.points_reward}pts</span>
                        <span className="text-orange-500 font-semibold">{challenge.xp_reward}XP</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{timeRemaining ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {progress ? (
                        progress.is_completed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />Done
                          </span>
                        ) : (
                          <span className="text-xs text-blue-500 font-medium">In Progress</span>
                        )
                      ) : (
                        <button onClick={() => joinChallenge(challenge)} className="flex items-center gap-1 ml-auto text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                          Join <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
