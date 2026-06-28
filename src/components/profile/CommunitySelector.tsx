import { useEffect, useState } from 'react';
import { Users, Check, Plus, Minus, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Community {
  id: string;
  name: string;
  description: string;
  tags: string[];
  color: string;
  member_count: number;
  is_public: boolean;
}

interface Membership {
  id: string;
  community_id: string;
  joined_at: string;
}

interface CommunitySelectorProps {
  userId: string;
}

export function CommunitySelector({ userId }: CommunitySelectorProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(true);

  useEffect(() => {
    load();
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const [commRes, memRes] = await Promise.all([
      supabase
        .from('communities')
        .select('id, name, description, tags, color, member_count, is_public')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('community_members')
        .select('id, community_id, joined_at')
        .eq('user_id', userId),
    ]);
    if (commRes.data) setCommunities(commRes.data);
    if (memRes.data) setMemberships(memRes.data);
    setLoading(false);
  };

  const isMember = (communityId: string) =>
    memberships.some((m) => m.community_id === communityId);

  const handleToggle = async (community: Community) => {
    if (!community.is_public) return;
    setToggling(community.id);

    if (isMember(community.id)) {
      const membership = memberships.find((m) => m.community_id === community.id);
      if (membership) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('id', membership.id);
        if (!error) {
          setMemberships((prev) => prev.filter((m) => m.id !== membership.id));
          setCommunities((prev) =>
            prev.map((c) =>
              c.id === community.id
                ? { ...c, member_count: Math.max(0, c.member_count - 1) }
                : c
            )
          );
        }
      }
    } else {
      const { data, error } = await supabase
        .from('community_members')
        .insert({ community_id: community.id, user_id: userId, role: 'member', join_method: 'self' })
        .select('id, community_id, joined_at')
        .maybeSingle();
      if (!error && data) {
        setMemberships((prev) => [...prev, data]);
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === community.id ? { ...c, member_count: c.member_count + 1 } : c
          )
        );
      }
    }
    setToggling(null);
  };

  const myMemberships = memberships
    .map((m) => communities.find((c) => c.id === m.community_id))
    .filter(Boolean) as Community[];

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Communities</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setWidgetOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">My Communities</span>
            {myMemberships.length > 0 && (
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {myMemberships.length}
              </span>
            )}
          </div>
          {widgetOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {widgetOpen && (
          <div className="px-5 pb-5 border-t border-border">
            {myMemberships.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                You haven't joined any communities yet. Browse below to get started.
              </p>
            ) : (
              <div className="pt-4 flex flex-wrap gap-2">
                {myMemberships.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
                    style={{ borderColor: c.color + '55', backgroundColor: c.color + '15', color: c.color }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Browse & Join Communities
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select the communities you'd like to belong to. Private communities are managed by admins.
        </p>

        <div className="space-y-2">
          {communities.map((community) => {
            const joined = isMember(community.id);
            const isToggling = toggling === community.id;

            return (
              <div
                key={community.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  joined
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-secondary/50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: community.color }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{community.name}</span>
                    {!community.is_public && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {community.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                  </div>
                </div>

                {community.is_public ? (
                  <button
                    onClick={() => handleToggle(community)}
                    disabled={isToggling}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                      joined
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40'
                        : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                    } disabled:opacity-50`}
                  >
                    {isToggling ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : joined ? (
                      <>
                        <Minus className="w-3 h-3" /> Leave
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Join
                      </>
                    )}
                  </button>
                ) : joined ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex-shrink-0">
                    <Check className="w-3 h-3" /> Member
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground px-3 py-1.5 flex-shrink-0">
                    Admin only
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
