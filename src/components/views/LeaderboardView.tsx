import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LeaderboardType } from '../../types/database';

interface LeaderboardEntry {
  user_id: string;
  points: number;
  rank: number;
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function LeaderboardView() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardType]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, total_points')
        .order('total_points', { ascending: false })
        .limit(50);

      const leaderboardEntries: LeaderboardEntry[] = (data || []).map((profile, index) => ({
        user_id: profile.id,
        points: profile.total_points,
        rank: index + 1,
        profile: {
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      }));

      setEntries(leaderboardEntries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const leaderboardTypes: Array<{ value: LeaderboardType; label: string }> = [
    { value: 'global', label: 'Global' },
    { value: 'team', label: 'Team' },
    { value: 'department', label: 'Department' },
    { value: 'season', label: 'Season' },
    { value: 'friend', label: 'Friends' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Leaderboard</h2>
        </div>
        <div className="flex gap-2">
          {leaderboardTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setLeaderboardType(type.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                leaderboardType === type.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {entries.slice(0, 3).map((entry) => (
            <div
              key={entry.user_id}
              className={`bg-card border rounded-lg p-6 text-center ${
                entry.rank === 1
                  ? 'border-yellow-500 bg-yellow-500/5'
                  : entry.rank === 2
                  ? 'border-gray-400 bg-gray-400/5'
                  : 'border-orange-600 bg-orange-600/5'
              }`}
            >
              <div className="flex justify-center mb-3">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                {entry.profile.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <h3 className="font-semibold text-lg">
                {entry.profile.full_name || entry.profile.username || 'Unknown'}
              </h3>
              <p className="text-2xl font-bold text-primary mt-2">{entry.points}</p>
              <p className="text-sm text-muted-foreground">points</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.user_id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="font-medium">{entry.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                        {entry.profile.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium">
                        {entry.profile.full_name || entry.profile.username || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-semibold">{entry.points}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 text-green-500">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">-</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No leaderboard data available</p>
        </div>
      )}
    </div>
  );
}
