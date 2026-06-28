import { useEffect, useState } from 'react';
import { Award, Search, Star, Lock, ChevronDown, ChevronRight, Image as ImageIcon, Upload, FolderOpen, Package, ArrowRightLeft, Check, X, Loader, ChevronsUpDown, ChevronsDownUp, ArrowLeft, Grid3x3 as Grid3X3, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BadgeIconUpload } from './BadgeIconUpload';
import { ConstellationManager } from './ConstellationManager';
import { BadgePackUpload } from './BadgePackUpload';
import type { Badge, BadgeConstellation } from '../../types/database';

type Tab = 'badges' | 'constellations' | 'packs';

interface TransferState {
  badgeId: string;
  status: 'idle' | 'saving' | 'done' | 'error';
  targetConstellationId: string;
  error?: string;
}

interface BadgeWithConstellation extends Badge {
  constellation: BadgeConstellation | null;
}

interface ConstellationGroup {
  constellation: BadgeConstellation | null;
  badges: BadgeWithConstellation[];
}

interface ConstellationDetailProps {
  group: ConstellationGroup;
  onBack: () => void;
  onIconUpdate: (badgeId: string, newUrl: string) => void;
}

function ConstellationDetail({ group, onBack, onIconUpdate }: ConstellationDetailProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('badge-detail-view') as 'card' | 'list') ?? 'card';
  });

  const name = group.constellation?.name ?? 'Uncategorised';
  const withIcon = group.badges.filter(b => b.icon_url).length;
  const coverage = group.badges.length > 0 ? Math.round((withIcon / group.badges.length) * 100) : 0;

  const switchView = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('badge-detail-view', mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Badges
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{name}</h3>
            {group.constellation?.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{group.constellation.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {group.constellation?.theme && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {group.constellation.theme}
                </span>
              )}
              {group.constellation?.industry_sector && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {group.constellation.industry_sector}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-bold">{group.badges.length}</p>
            <p className="text-xs text-muted-foreground">badges</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{coverage}%</p>
            <p className="text-xs text-muted-foreground">icons</p>
          </div>
        </div>
      </div>

      {group.constellation?.cover_image_url && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border">
          <img
            src={group.constellation.cover_image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Grid3X3 className="w-4 h-4" />
          <span>{withIcon}/{group.badges.length} icons uploaded</span>
          <div className="w-24 bg-border rounded-full h-1.5 ml-1">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => switchView('card')}
            title="Card view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => switchView('list')}
            title="List view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {group.badges.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-16 text-center text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No badges in this constellation</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {group.badges.map(badge => (
            <div
              key={badge.id}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/20 transition-all"
            >
              <div className="relative w-full aspect-square">
                <BadgeIconUpload
                  badgeId={badge.id}
                  badgeName={badge.name}
                  currentIconUrl={badge.icon_url}
                  onUploadSuccess={onIconUpdate}
                />
              </div>
              <div className="w-full text-center">
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{badge.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  {badge.icon_url ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-green-500">
                      <ImageIcon className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/50">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  {!badge.is_active && (
                    <span className="text-xs text-red-400">inactive</span>
                  )}
                </div>
                {(badge.points_reward > 0 || badge.xp_reward > 0) && (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {badge.points_reward > 0 && (
                      <span className="text-xs text-yellow-500 font-medium">{badge.points_reward}pt</span>
                    )}
                    {badge.xp_reward > 0 && (
                      <span className="text-xs text-orange-500 font-medium">{badge.xp_reward}xp</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {group.badges.map(badge => (
            <div
              key={badge.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-accent/20 transition-colors"
            >
              <div className="w-12 h-12 flex-shrink-0">
                <BadgeIconUpload
                  badgeId={badge.id}
                  badgeName={badge.name}
                  currentIconUrl={badge.icon_url}
                  onUploadSuccess={onIconUpdate}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{badge.name}</p>
                  {!badge.is_active && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full flex-shrink-0">Inactive</span>
                  )}
                </div>
                {badge.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{badge.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {badge.points_reward > 0 && (
                  <span className="text-xs text-yellow-500 font-medium">{badge.points_reward} pts</span>
                )}
                {badge.xp_reward > 0 && (
                  <span className="text-xs text-orange-500 font-medium">{badge.xp_reward} XP</span>
                )}
                <span className="text-xs text-muted-foreground">#{badge.sequence_order}</span>
                {badge.icon_url ? (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Icon
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                    <Lock className="w-3.5 h-3.5" />
                    No icon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BadgesManager() {
  const [tab, setTab] = useState<Tab>('badges');
  const [groups, setGroups] = useState<ConstellationGroup[]>([]);
  const [constellations, setConstellations] = useState<BadgeConstellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, withIcon: 0, constellations: 0 });
  const [transferring, setTransferring] = useState<TransferState | null>(null);
  const [detailGroup, setDetailGroup] = useState<ConstellationGroup | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [badgesRes, constellationsRes] = await Promise.all([
        supabase
          .from('badges')
          .select('*, constellation:badge_constellations(*)')
          .order('sequence_order'),
        supabase
          .from('badge_constellations')
          .select('*')
          .order('sort_order')
          .order('name'),
      ]);

      const badges: BadgeWithConstellation[] = badgesRes.data || [];
      const allConstellations: BadgeConstellation[] = constellationsRes.data || [];

      setConstellations(allConstellations);

      const grouped: Record<string, ConstellationGroup> = {};
      allConstellations.forEach((c) => {
        grouped[c.id] = { constellation: c, badges: [] };
      });
      grouped['__none__'] = { constellation: null, badges: [] };

      badges.forEach((b) => {
        const key = b.constellation_id ?? '__none__';
        if (!grouped[key]) grouped[key] = { constellation: null, badges: [] };
        grouped[key].badges.push(b);
      });

      const result = Object.values(grouped).filter((g) => g.badges.length > 0);

      setGroups(result);
      setExpandedGroups(new Set(result.map((g) => g.constellation?.id ?? '__none__')));
      setStats({
        total: badges.length,
        withIcon: badges.filter((b) => b.icon_url).length,
        constellations: allConstellations.length,
      });

      if (detailGroup) {
        const key = detailGroup.constellation?.id ?? '__none__';
        const updated = result.find(g => (g.constellation?.id ?? '__none__') === key);
        if (updated) setDetailGroup(updated);
      }
    } catch (err) {
      console.error('Error loading badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpdate = (badgeId: string, newUrl: string) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        badges: g.badges.map((b) =>
          b.id === badgeId ? { ...b, icon_url: newUrl || null } : b
        ),
      }))
    );
    setDetailGroup((prev) => prev ? {
      ...prev,
      badges: prev.badges.map(b => b.id === badgeId ? { ...b, icon_url: newUrl || null } : b),
    } : null);
    setStats((prev) => {
      const allBadges = groups.flatMap((g) => g.badges);
      const updated = allBadges.map((b) => (b.id === badgeId ? { ...b, icon_url: newUrl || null } : b));
      return { ...prev, withIcon: updated.filter((b) => b.icon_url).length };
    });
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allExpanded = filteredGroups().length > 0 && filteredGroups().every(g => expandedGroups.has(g.constellation?.id ?? '__none__'));

  const toggleAll = () => {
    const keys = filteredGroups().map(g => g.constellation?.id ?? '__none__');
    if (allExpanded) {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.delete(k));
        return next;
      });
    } else {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.add(k));
        return next;
      });
    }
  };

  const startTransfer = (badge: BadgeWithConstellation) => {
    setTransferring({
      badgeId: badge.id,
      status: 'idle',
      targetConstellationId: badge.constellation_id ?? '',
    });
  };

  const cancelTransfer = () => setTransferring(null);

  const commitTransfer = async () => {
    if (!transferring) return;
    setTransferring((t) => t ? { ...t, status: 'saving' } : t);

    const newId = transferring.targetConstellationId || null;
    const { error } = await supabase
      .from('badges')
      .update({ constellation_id: newId })
      .eq('id', transferring.badgeId);

    if (error) {
      setTransferring((t) => t ? { ...t, status: 'error', error: error.message } : t);
      return;
    }

    setTransferring((t) => t ? { ...t, status: 'done' } : t);
    setTimeout(() => {
      setTransferring(null);
      loadAll();
    }, 800);
  };

  function filteredGroups() {
    return search.trim()
      ? groups.map((g) => ({
          ...g,
          badges: g.badges.filter((b) =>
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.description?.toLowerCase().includes(search.toLowerCase())
          ),
        })).filter((g) => g.badges.length > 0)
      : groups;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const iconCoverage = stats.total > 0 ? Math.round((stats.withIcon / stats.total) * 100) : 0;

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'badges', label: 'Badges', icon: <Award className="w-4 h-4" /> },
    { id: 'constellations', label: 'Constellations', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'packs', label: 'Import Pack', icon: <Package className="w-4 h-4" /> },
  ];

  const displayed = filteredGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Badge Management</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
          <ImageIcon className="w-4 h-4" />
          <span>{stats.withIcon}/{stats.total} icons</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Badges</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Constellations</span>
          </div>
          <p className="text-3xl font-bold">{stats.constellations}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Icon Coverage</span>
          </div>
          <p className="text-3xl font-bold">{iconCoverage}%</p>
          <div className="mt-2 w-full bg-border rounded-full h-1.5">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${iconCoverage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setDetailGroup(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'badges' && detailGroup && (
        <ConstellationDetail
          group={detailGroup}
          onBack={() => setDetailGroup(null)}
          onIconUpdate={handleIconUpdate}
        />
      )}

      {tab === 'badges' && !detailGroup && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Uploading Badge Icons</p>
                <p className="text-muted-foreground">
                  Click the icon box next to any badge to upload an image, or drag and drop a file onto it.
                  Supports <strong>PNG, JPEG, SVG, WebP</strong> up to 2MB.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search badges..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {displayed.length > 0 && (
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 px-3 py-2.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {allExpanded
                  ? <><ChevronsDownUp className="w-4 h-4" /> Collapse All</>
                  : <><ChevronsUpDown className="w-4 h-4" /> Expand All</>
                }
              </button>
            )}
          </div>

          <div className="space-y-4">
            {displayed.map((group) => {
              const key = group.constellation?.id ?? '__none__';
              const isExpanded = expandedGroups.has(key);
              const withIconCount = group.badges.filter((b) => b.icon_url).length;

              return (
                <div key={key} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center bg-secondary">
                    <button
                      onClick={() => toggleGroup(key)}
                      className="flex-1 flex items-center gap-3 px-5 py-3.5 hover:bg-accent transition-colors text-left"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      }
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="font-semibold truncate">
                          {group.constellation?.name ?? 'Uncategorised'}
                        </span>
                        {group.constellation?.theme && (
                          <span className="text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full hidden sm:inline">
                            {group.constellation.theme}
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 pr-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="text-xs">{withIconCount}/{group.badges.length} icons</span>
                        <span className="text-xs bg-background/60 px-2 py-0.5 rounded-full">
                          {group.badges.length} badge{group.badges.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setDetailGroup(group)}
                        title="View all badge thumbnails"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-card hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {group.badges.map((badge) => {
                        const isThisTransferring = transferring?.badgeId === badge.id;
                        return (
                          <div key={badge.id} className="transition-colors">
                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                              <BadgeIconUpload
                                badgeId={badge.id}
                                badgeName={badge.name}
                                currentIconUrl={badge.icon_url}
                                onUploadSuccess={handleIconUpdate}
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-semibold text-foreground">{badge.name}</h4>
                                  {badge.icon_url ? (
                                    <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      Has icon
                                    </span>
                                  ) : (
                                    <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      No icon
                                    </span>
                                  )}
                                  {!badge.is_active && (
                                    <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                {badge.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{badge.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                  {badge.points_reward > 0 && (
                                    <span className="text-yellow-500 font-medium">{badge.points_reward} pts</span>
                                  )}
                                  {badge.xp_reward > 0 && (
                                    <span className="text-orange-500 font-medium">{badge.xp_reward} XP</span>
                                  )}
                                  <span>Seq #{badge.sequence_order}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {badge.icon_url && (
                                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 flex items-center justify-center overflow-hidden p-1">
                                    <img
                                      src={badge.icon_url}
                                      alt={badge.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                  </div>
                                )}
                                {!isThisTransferring && (
                                  <button
                                    onClick={() => startTransfer(badge)}
                                    title="Move to another constellation"
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isThisTransferring && (
                              <div className="px-5 py-3 bg-accent/40 border-t border-border flex items-center gap-3">
                                <ArrowRightLeft className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Move to:</span>
                                <div className="relative flex-1 max-w-xs">
                                  <select
                                    value={transferring.targetConstellationId}
                                    onChange={(e) => setTransferring((t) => t ? { ...t, targetConstellationId: e.target.value } : t)}
                                    disabled={transferring.status === 'saving' || transferring.status === 'done'}
                                    className="w-full appearance-none text-xs px-2.5 py-1.5 pr-7 bg-card border border-border rounded-md focus:outline-none focus:border-primary disabled:opacity-60"
                                  >
                                    <option value="">-- Uncategorised --</option>
                                    {constellations.map((c) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                </div>
                                {transferring.status === 'idle' && (
                                  <>
                                    <button
                                      onClick={commitTransfer}
                                      disabled={transferring.targetConstellationId === (badge.constellation_id ?? '')}
                                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                      <Check className="w-3 h-3" />
                                      Move
                                    </button>
                                    <button
                                      onClick={cancelTransfer}
                                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                {transferring.status === 'saving' && (
                                  <Loader className="w-4 h-4 text-primary animate-spin" />
                                )}
                                {transferring.status === 'done' && (
                                  <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                                    <Check className="w-3.5 h-3.5" /> Moved
                                  </span>
                                )}
                                {transferring.status === 'error' && (
                                  <span className="text-xs text-red-500">{transferring.error}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {displayed.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No badges found{search ? ` matching "${search}"` : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'constellations' && (
        <ConstellationManager
          constellations={constellations}
          onConstellationsChange={loadAll}
        />
      )}

      {tab === 'packs' && (
        <BadgePackUpload
          constellations={constellations}
          onPackImported={loadAll}
        />
      )}
    </div>
  );
}
