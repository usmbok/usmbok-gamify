import { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  Target,
  Trophy,
  Flame,
  Clock,
  TrendingUp,
  Award,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Campaign, ScheduledEvent } from '../../types/database';

interface EnrichedEvent extends ScheduledEvent {
  title: string;
  description: string | null;
  colorClass: string;
  kind: 'campaign' | 'quest' | 'challenge';
  campaign?: Campaign | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const campaignTypeConfig: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  points_boost: { label: 'Points Boost', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', Icon: Star },
  xp_sprint: { label: 'XP Sprint', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', Icon: Zap },
  early_bird: { label: 'Early Bird', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30', Icon: TrendingUp },
  streak: { label: 'Streak', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/15 border-red-500/30', Icon: Flame },
  milestone: { label: 'Milestone', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/15 border-green-500/30', Icon: Award },
};

const eventColorMap: Record<string, string> = {
  campaign_points_boost: 'bg-yellow-500',
  campaign_xp_sprint: 'bg-orange-500',
  campaign_early_bird: 'bg-sky-500',
  campaign_streak: 'bg-red-500',
  campaign_milestone: 'bg-green-500',
  quest: 'bg-blue-500',
  challenge: 'bg-teal-500',
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [campaignModal, setCampaignModal] = useState<Campaign | null>(null);

  useEffect(() => {
    loadEvents();
    loadActiveCampaigns();
  }, [currentDate]);

  const loadActiveCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      .gte('end_date', new Date().toISOString())
      .order('start_date');
    setActiveCampaigns(data || []);
  };

  const loadEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { data: raw } = await supabase
        .from('scheduled_events')
        .select('*')
        .lte('start_date', endOfMonth.toISOString())
        .gte('start_date', startOfMonth.toISOString())
        .eq('is_active', true);

      if (!raw || raw.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const campaignIds = raw.filter(e => e.campaign_id).map(e => e.campaign_id!);
      const questIds = raw.filter(e => e.quest_id).map(e => e.quest_id!);
      const challengeIds = raw.filter(e => e.challenge_id).map(e => e.challenge_id!);

      const [campaignsRes, questsRes, challengesRes] = await Promise.all([
        campaignIds.length ? supabase.from('campaigns').select('*').in('id', campaignIds) : Promise.resolve({ data: [] }),
        questIds.length ? supabase.from('quests').select('id, name').in('id', questIds) : Promise.resolve({ data: [] }),
        challengeIds.length ? supabase.from('challenges').select('id, name').in('id', challengeIds) : Promise.resolve({ data: [] }),
      ]);

      const campaignMap = Object.fromEntries((campaignsRes.data || []).map(c => [c.id, c]));
      const questMap = Object.fromEntries((questsRes.data || []).map(q => [q.id, q.name]));
      const challengeMap = Object.fromEntries((challengesRes.data || []).map(c => [c.id, c.name]));

      const enriched: EnrichedEvent[] = raw.map(e => {
        if (e.campaign_id && campaignMap[e.campaign_id]) {
          const c = campaignMap[e.campaign_id] as Campaign;
          return {
            ...e,
            title: c.name,
            description: c.description,
            colorClass: eventColorMap[`campaign_${c.campaign_type}`] || 'bg-amber-500',
            kind: 'campaign' as const,
            campaign: c,
          };
        } else if (e.quest_id && questMap[e.quest_id]) {
          return { ...e, title: questMap[e.quest_id], description: null, colorClass: 'bg-blue-500', kind: 'quest' as const };
        } else if (e.challenge_id && challengeMap[e.challenge_id]) {
          return { ...e, title: challengeMap[e.challenge_id], description: null, colorClass: 'bg-teal-500', kind: 'challenge' as const };
        }
        return { ...e, title: 'Event', description: null, colorClass: 'bg-slate-500', kind: 'quest' as const };
      });

      setEvents(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push(d);
    return days;
  };

  const getEventsForDay = (day: number): EnrichedEvent[] => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return events.filter(e => new Date(e.start_date).toISOString().split('T')[0] === dateStr);
  };

  const hasCampaignOnDay = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return activeCampaigns.some(c => {
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return date >= start && date <= end;
    });
  };

  const isEarlyTargetDay = (day: number): boolean => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    return activeCampaigns.some(c => c.early_target_date && new Date(c.early_target_date).toISOString().split('T')[0] === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold">Event Calendar</h2>
          <p className="text-sm text-muted-foreground">Campaigns, quests, and challenge schedules</p>
        </div>
      </div>

      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Active &amp; Upcoming Campaigns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {activeCampaigns.map(c => {
              const cfg = campaignTypeConfig[c.campaign_type] || campaignTypeConfig.points_boost;
              const CIcon = cfg.Icon;
              const daysLeft = daysUntil(c.end_date);
              const daysToEarly = daysUntil(c.early_target_date);
              const earlyPossible = daysToEarly !== null && daysToEarly > 0;
              return (
                <div key={c.id} onClick={() => setCampaignModal(c)} className={`border rounded-xl p-4 ${cfg.bg} transition-all hover:shadow-md cursor-pointer hover:scale-[1.02]`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/20`}>
                      <CIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-white/20 ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1 leading-tight">{c.name}</h4>
                  {c.objective_description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.objective_description}</p>
                  )}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground"><Star className="w-3 h-3" />Base</span>
                      <span className="font-semibold">{c.points_multiplier}x pts &bull; {c.xp_multiplier}x XP</span>
                    </div>
                    {(c.early_completion_multiplier > 1 || c.early_completion_bonus_points > 0) && (
                      <div className="flex items-center justify-between text-xs">
                        <span className={`flex items-center gap-1 font-medium ${cfg.color}`}><Zap className="w-3 h-3" />Early Bird</span>
                        <span className={`font-bold ${cfg.color}`}>
                          {c.early_completion_multiplier}x &bull; +{c.early_completion_bonus_points} pts
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      {earlyPossible ? (
                        <span className={`flex items-center gap-1 font-medium ${cfg.color}`}><Clock className="w-3 h-3" />{daysToEarly}d to early deadline</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft !== null && daysLeft > 0 ? `${daysLeft}d remaining` : 'Ends soon'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />Campaign</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Quest</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />Challenge</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400/40 border border-orange-400 inline-block" />Early deadline</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs rounded-lg bg-secondary hover:bg-accent transition-colors font-medium">Today</button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, idx) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isActive = day && isToday(day);
                const hasActiveCampaign = day ? hasCampaignOnDay(day) : false;
                const isEarlyTarget = day ? isEarlyTargetDay(day) : false;
                const isSelected = day === selectedDay;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (day) {
                        setSelectedDay(day === selectedDay ? null : day);
                        setSelectedEvent(null);
                      }
                    }}
                    className={`min-h-[72px] p-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                      !day
                        ? 'bg-secondary/30 border-transparent'
                        : isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : isEarlyTarget
                        ? 'border-orange-400/60 bg-orange-400/10 hover:bg-orange-400/15'
                        : hasActiveCampaign
                        ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
                        : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : isEarlyTarget
                            ? 'bg-orange-400/20 text-orange-600 dark:text-orange-400'
                            : 'text-foreground'
                        }`}>
                          {day}
                        </div>
                        {isEarlyTarget && (
                          <div className="text-[9px] font-bold text-orange-500 uppercase tracking-wide leading-none mb-0.5 truncate">Early</div>
                        )}
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map(e => (
                            <div
                              key={e.id}
                              onClick={ev => { ev.stopPropagation(); setSelectedEvent(e); setSelectedDay(day); }}
                              className={`text-[10px] ${e.colorClass} text-white rounded px-1 py-0.5 truncate leading-tight font-medium cursor-pointer hover:opacity-80`}
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground font-medium pl-1">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          {selectedDay && (
            <div className="bg-card border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">
                  {MONTH_NAMES[currentDate.getMonth()]} {selectedDay}
                </h4>
                <button onClick={() => { setSelectedDay(null); setSelectedEvent(null); }} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEvent(selectedEvent?.id === e.id ? null : e)}
                      className={`w-full text-left flex items-center gap-2 p-2 rounded-lg border transition-colors ${selectedEvent?.id === e.id ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-accent/50'}`}
                    >
                      <div className={`w-2 h-full min-h-[24px] rounded-full ${e.colorClass} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{e.kind}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedEvent && selectedEvent.kind === 'campaign' && selectedEvent.campaign && (
            <CampaignDetailCard campaign={selectedEvent.campaign} />
          )}

          {!selectedDay && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm">Upcoming Events</h4>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events this month.</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 8).map(e => (
                    <div key={e.id} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(e.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeCampaigns.filter(c => c.early_completion_multiplier > 1 || c.early_completion_bonus_points > 0).map(c => (
          <AcceleratorCard key={c.id} campaign={c} onViewDetails={() => setCampaignModal(c)} />
        ))}
      </div>

      {campaignModal && (
        <CampaignModal campaign={campaignModal} onClose={() => setCampaignModal(null)} />
      )}
    </div>
  );
}

function CampaignDetailCard({ campaign: c }: { campaign: Campaign }) {
  const cfg = campaignTypeConfig[c.campaign_type] || campaignTypeConfig.points_boost;
  const CIcon = cfg.Icon;
  const daysLeft = daysUntil(c.end_date);
  const daysToEarly = daysUntil(c.early_target_date);

  return (
    <div className={`border rounded-xl p-4 ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <CIcon className={`w-4 h-4 ${cfg.color}`} />
        <h4 className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</h4>
      </div>
      <p className="font-bold text-sm mb-1">{c.name}</p>
      {c.description && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{c.description}</p>}
      {c.objective_description && (
        <div className="bg-white/10 rounded-lg p-2.5 mb-3">
          <p className="text-xs font-medium mb-0.5">Objective</p>
          <p className="text-xs text-muted-foreground">{c.objective_description}</p>
        </div>
      )}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{formatDate(c.start_date)} – {formatDate(c.end_date)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Base rewards</span><span className="font-semibold">{c.points_multiplier}x pts &bull; {c.xp_multiplier}x XP</span></div>
        {(c.early_completion_multiplier > 1 || c.early_completion_bonus_points > 0) && (
          <div className={`flex justify-between font-semibold ${cfg.color}`}>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />Early Bird bonus</span>
            <span>{c.early_completion_multiplier}x &bull; +{c.early_completion_bonus_points} pts</span>
          </div>
        )}
        {c.early_target_date && daysToEarly !== null && daysToEarly > 0 && (
          <div className={`flex justify-between ${cfg.color}`}>
            <span>Early deadline</span>
            <span className="font-medium">{daysToEarly}d left ({formatDate(c.early_target_date)})</span>
          </div>
        )}
        {daysLeft !== null && (
          <div className="flex justify-between text-muted-foreground pt-1 border-t border-white/10">
            <span>Campaign ends in</span>
            <span className="font-medium text-foreground">{daysLeft > 0 ? `${daysLeft} days` : 'Today'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignModal({ campaign: c, onClose }: { campaign: Campaign; onClose: () => void }) {
  const cfg = campaignTypeConfig[c.campaign_type] || campaignTypeConfig.points_boost;
  const CIcon = cfg.Icon;
  const daysLeft = daysUntil(c.end_date);
  const daysToEarly = daysUntil(c.early_target_date);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 ${cfg.bg} border-b border-white/10`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <CIcon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <h3 className="text-xl font-bold mt-0.5">{c.name}</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {c.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
          )}

          {c.objective_description && (
            <div className="bg-secondary rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Objective</p>
              <p className="text-sm">{c.objective_description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Points Multiplier</span>
              </div>
              <p className="text-2xl font-extrabold text-yellow-500">{c.points_multiplier}x</p>
            </div>
            <div className="bg-secondary rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs text-muted-foreground">XP Multiplier</span>
              </div>
              <p className="text-2xl font-extrabold text-orange-500">{c.xp_multiplier}x</p>
            </div>
          </div>

          {(c.early_completion_multiplier > 1 || c.early_completion_bonus_points > 0) && (
            <div className={`rounded-xl p-4 border ${cfg.bg} border-white/10`}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-sm font-bold ${cfg.color}`}>Early Bird Bonus</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className={`text-xl font-extrabold ${cfg.color}`}>{c.early_completion_multiplier}x</p>
                  <p className="text-xs text-muted-foreground">Multiplier</p>
                </div>
                <div>
                  <p className={`text-xl font-extrabold ${cfg.color}`}>+{c.early_completion_bonus_points}</p>
                  <p className="text-xs text-muted-foreground">Bonus Points</p>
                </div>
              </div>
              {c.early_target_date && daysToEarly !== null && daysToEarly > 0 && (
                <div className="mt-3">
                  <EarlyDeadlineBar startDate={c.start_date} earlyDate={c.early_target_date} endDate={c.end_date} />
                </div>
              )}
            </div>
          )}

          <div className="border border-border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start date</span>
              <span className="font-medium">{formatDate(c.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End date</span>
              <span className="font-medium">{formatDate(c.end_date)}</span>
            </div>
            {c.early_target_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Early deadline</span>
                <span className={`font-medium ${cfg.color}`}>{formatDate(c.early_target_date)}</span>
              </div>
            )}
            {daysLeft !== null && (
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Time remaining</span>
                <span className="font-bold">{daysLeft > 0 ? `${daysLeft} days` : 'Ends today'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AcceleratorCard({ campaign: c, onViewDetails }: { campaign: Campaign; onViewDetails: () => void }) {
  const cfg = campaignTypeConfig[c.campaign_type] || campaignTypeConfig.points_boost;
  const CIcon = cfg.Icon;
  const daysToEarly = daysUntil(c.early_target_date);
  const earlyActive = daysToEarly !== null && daysToEarly > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
      <div className={`h-1.5 w-full ${earlyActive ? 'bg-gradient-to-r from-orange-500 to-yellow-400' : 'bg-gradient-to-r from-slate-400 to-slate-500'}`} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
            <CIcon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm">{c.name}</h4>
              {earlyActive && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Flame className="w-3 h-3" />{daysToEarly}d to unlock
                </span>
              )}
            </div>
            {c.objective_description && (
              <p className="text-xs text-muted-foreground mt-1">{c.objective_description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Standard</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">{c.points_multiplier}x</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Standard</span>
            </div>
            <p className="text-xl font-bold text-orange-500">{c.xp_multiplier}x</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
        </div>

        <div className={`rounded-xl p-4 border ${earlyActive ? 'border-orange-500/30 bg-orange-500/8' : 'border-border bg-secondary'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-4 h-4 ${earlyActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${earlyActive ? 'text-orange-500' : 'text-muted-foreground'}`}>
              Motivational Accelerator
            </span>
            {earlyActive && <TrendingUp className="w-3.5 h-3.5 text-orange-400 ml-auto" />}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {earlyActive
              ? `Complete the objective before ${c.early_target_date ? formatDate(c.early_target_date) : 'the early deadline'} to unlock:`
              : 'Early completion window has passed.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg p-2.5 text-center ${earlyActive ? 'bg-orange-500/15' : 'bg-border/50'}`}>
              <p className={`text-lg font-extrabold ${earlyActive ? 'text-orange-500' : 'text-muted-foreground'}`}>{c.early_completion_multiplier}x</p>
              <p className="text-[10px] text-muted-foreground">Multiplier</p>
            </div>
            <div className={`rounded-lg p-2.5 text-center ${earlyActive ? 'bg-yellow-500/15' : 'bg-border/50'}`}>
              <p className={`text-lg font-extrabold ${earlyActive ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>+{c.early_completion_bonus_points}</p>
              <p className="text-[10px] text-muted-foreground">Bonus pts</p>
            </div>
          </div>
          {earlyActive && c.early_target_date && (
            <div className="mt-3">
              <EarlyDeadlineBar startDate={c.start_date} earlyDate={c.early_target_date} endDate={c.end_date} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(c.start_date)}</span>
          <Trophy className="w-3 h-3" />
          <span className="flex items-center gap-1">{formatDate(c.end_date)}<Clock className="w-3 h-3" /></span>
        </div>

        <button
          onClick={onViewDetails}
          className="mt-4 w-full py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent transition-colors text-foreground"
        >
          View Campaign Details
        </button>
      </div>
    </div>
  );
}

function EarlyDeadlineBar({ startDate, earlyDate, endDate }: { startDate: string; earlyDate: string; endDate: string }) {
  const start = new Date(startDate).getTime();
  const early = new Date(earlyDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  const earlyPct = Math.round(((early - start) / total) * 100);
  const progressPct = Math.min(100, Math.round(((now - start) / total) * 100));

  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>Start</span>
        <span className="text-orange-500 font-semibold">Early deadline ({earlyPct}%)</span>
        <span>End</span>
      </div>
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-orange-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-orange-500" style={{ left: `${earlyPct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{progressPct}% of campaign elapsed</p>
    </div>
  );
}
