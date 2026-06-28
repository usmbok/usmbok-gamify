import { useEffect, useState } from 'react';
import { Award, Star, Lock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import { useViewPreference } from '../../hooks/useViewPreference';
import { ViewToggle } from '../ui/ViewToggle';
import type { BadgeConstellation, Badge, UserBadge } from '../../types/database';

interface ConstellationWithBadges extends BadgeConstellation {
  badges: Badge[];
}

export function BadgesView() {
  const { bypassUserId } = useBypass();
  const [constellations, setConstellations] = useState<ConstellationWithBadges[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [selectedConstellation, setSelectedConstellation] = useState<ConstellationWithBadges | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('badges', 'card');

  useEffect(() => {
    loadBadges();
  }, [bypassUserId]);

  const loadBadges = async () => {
    try {
      const userId = await getCurrentUserId(bypassUserId);

      const { data: constellationsData } = await supabase
        .from('badge_constellations')
        .select('*')
        .eq('is_active', true);

      if (!constellationsData) {
        setLoading(false);
        return;
      }

      const constellationsWithBadges = await Promise.all(
        constellationsData.map(async (constellation) => {
          const { data: badgesData } = await supabase
            .from('badges')
            .select('*')
            .eq('constellation_id', constellation.id)
            .eq('is_active', true)
            .order('sequence_order');

          return {
            ...constellation,
            badges: badgesData || []
          };
        })
      );

      setConstellations(constellationsWithBadges);

      if (userId) {
        const { data: userBadgesData } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', userId);

        const earnedSet = new Set(userBadgesData?.map((ub) => ub.badge_id) || []);
        setEarnedBadges(earnedSet);
      }
    } catch (error) {
      console.error('Error loading badges:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Badge Constellations</h2>
        </div>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'list' && constellations.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Constellation</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Theme</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Progress</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {constellations.map(constellation => {
                const earnedCount = constellation.badges.filter(b => earnedBadges.has(b.id)).length;
                const totalCount = constellation.badges.length;
                const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
                return (
                  <tr key={constellation.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedConstellation(constellation)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{constellation.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{constellation.theme ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{earnedCount}/{totalCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'card' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {constellations.map((constellation) => {
          const earnedCount = constellation.badges.filter((b) => earnedBadges.has(b.id)).length;
          const totalCount = constellation.badges.length;
          const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

          return (
            <div
              key={constellation.id}
              onClick={() => setSelectedConstellation(constellation)}
              className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{constellation.name}</h3>
                  {constellation.theme && (
                    <span className="text-xs text-muted-foreground">{constellation.theme}</span>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{constellation.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {earnedCount} / {totalCount}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mt-4">
                {constellation.badges.slice(0, 5).map((badge) => {
                  const isEarned = earnedBadges.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`aspect-square rounded-lg flex items-center justify-center overflow-hidden ${
                        isEarned
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          : 'bg-muted'
                      }`}
                      title={badge.name}
                    >
                      {badge.icon_url ? (
                        <img
                          src={badge.icon_url}
                          alt={badge.name}
                          className={`w-full h-full object-contain p-0.5 ${!isEarned ? 'grayscale opacity-40' : ''}`}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : isEarned ? (
                        <Star className="w-4 h-4 text-white fill-white" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
                {constellation.badges.length > 5 && (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{constellation.badges.length - 5}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>}

      {selectedConstellation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold">{selectedConstellation.name}</h3>
                <p className="text-muted-foreground mt-1">{selectedConstellation.description}</p>
              </div>
              <button
                onClick={() => setSelectedConstellation(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="relative bg-gradient-to-b from-blue-950/20 to-transparent rounded-lg p-8 mb-6">
                <svg className="w-full h-64" viewBox="0 0 800 300">
                  {selectedConstellation.badges.map((badge, index) => {
                    const x = 100 + (index * 140);
                    const y = 150 + Math.sin(index * 0.8) * 50;
                    const isEarned = earnedBadges.has(badge.id);

                    if (index < selectedConstellation.badges.length - 1) {
                      const nextX = 100 + ((index + 1) * 140);
                      const nextY = 150 + Math.sin((index + 1) * 0.8) * 50;
                      return (
                        <g key={badge.id}>
                          <line
                            x1={x}
                            y1={y}
                            x2={nextX}
                            y2={nextY}
                            stroke={isEarned ? 'rgb(59, 130, 246)' : 'rgb(71, 85, 105)'}
                            strokeWidth="2"
                            strokeDasharray={isEarned ? '0' : '5,5'}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="20"
                            fill={isEarned ? 'url(#starGradient)' : 'rgb(51, 65, 85)'}
                            stroke={isEarned ? 'rgb(251, 191, 36)' : 'rgb(71, 85, 105)'}
                            strokeWidth="2"
                          />
                          {isEarned && (
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="20"
                            >
                              ★
                            </text>
                          )}
                        </g>
                      );
                    } else {
                      return (
                        <g key={badge.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="20"
                            fill={isEarned ? 'url(#starGradient)' : 'rgb(51, 65, 85)'}
                            stroke={isEarned ? 'rgb(251, 191, 36)' : 'rgb(71, 85, 105)'}
                            strokeWidth="2"
                          />
                          {isEarned && (
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="20"
                            >
                              ★
                            </text>
                          )}
                        </g>
                      );
                    }
                  })}
                  <defs>
                    <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(251, 191, 36)" />
                      <stop offset="100%" stopColor="rgb(249, 115, 22)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedConstellation.badges.map((badge) => {
                  const isEarned = earnedBadges.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-lg border ${
                        isEarned
                          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                          : 'bg-secondary border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-14 h-14 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden ${
                            isEarned
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : 'bg-muted'
                          }`}
                        >
                          {badge.icon_url ? (
                            <img
                              src={badge.icon_url}
                              alt={badge.name}
                              className={`w-full h-full object-contain p-1 ${!isEarned ? 'grayscale opacity-50' : ''}`}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          ) : isEarned ? (
                            <Star className="w-6 h-6 text-white fill-white" />
                          ) : (
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{badge.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                          {isEarned && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded">
                              Earned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {constellations.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No badge constellations available</p>
        </div>
      )}
    </div>
  );
}
