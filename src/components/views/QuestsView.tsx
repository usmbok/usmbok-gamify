import { useEffect, useState } from 'react';
import {
  Target,
  CheckCircle,
  Circle,
  Play,
  Map,
  ArrowRight,
  Lock,
  ChevronRight,
  Star,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../hooks/useCurrentUser';
import { useBypass } from '../../contexts/BypassContext';
import { useViewPreference } from '../../hooks/useViewPreference';
import { ViewToggle } from '../ui/ViewToggle';
import type { Quest, QuestStep, UserQuestProgress, Journey, JourneyQuest, UserJourneyProgress } from '../../types/database';

type Tab = 'quests' | 'journeys';

interface JourneyWithQuests extends Journey {
  journey_quests: (JourneyQuest & { quest: Quest })[];
  userProgress?: UserJourneyProgress | null;
}

export function QuestsView() {
  const { bypassUserId } = useBypass();
  const [tab, setTab] = useState<Tab>('quests');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [journeys, setJourneys] = useState<JourneyWithQuests[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<JourneyWithQuests | null>(null);
  const [questSteps, setQuestSteps] = useState<QuestStep[]>([]);
  const [userQuestProgress, setUserQuestProgress] = useState<UserQuestProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('quests', 'card');

  useEffect(() => {
    loadAll();
  }, [bypassUserId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId(bypassUserId);

      const [questsRes, journeysRes] = await Promise.all([
        supabase.from('quests').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('journeys').select('*, journey_quests(*, quest:quests(*))').eq('is_active', true).order('created_at', { ascending: false }),
      ]);

      setQuests(questsRes.data || []);

      const rawJourneys = (journeysRes.data || []) as JourneyWithQuests[];
      const sorted = rawJourneys.map(j => ({
        ...j,
        journey_quests: [...(j.journey_quests || [])].sort((a, b) => a.sequence_order - b.sequence_order),
      }));

      if (userId) {
        const { data: jpData } = await supabase
          .from('user_journey_progress')
          .select('*')
          .eq('user_id', userId);
        const progressMap = Object.fromEntries((jpData || []).map(p => [p.journey_id, p]));
        sorted.forEach(j => { j.userProgress = progressMap[j.id] ?? null; });
      }

      setJourneys(sorted);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestDetails = async (quest: Quest) => {
    setSelectedQuest(quest);
    const userId = await getCurrentUserId(bypassUserId);
    const stepsRes = await supabase.from('quest_steps').select('*').eq('quest_id', quest.id).order('step_number');
    setQuestSteps(stepsRes.data || []);
    if (userId) {
      const progressRes = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('quest_id', quest.id)
        .eq('user_id', userId)
        .maybeSingle();
      setUserQuestProgress(progressRes.data || null);
    }
  };

  const startQuest = async (quest: Quest) => {
    const userId = await getCurrentUserId(bypassUserId);
    if (!userId) return;
    const { error } = await supabase.from('user_quest_progress').insert({
      user_id: userId,
      quest_id: quest.id,
      current_step: 1,
      completed_steps: [],
      is_completed: false,
    });
    if (!error) loadQuestDetails(quest);
  };

  const startJourney = async (journey: JourneyWithQuests) => {
    const userId = await getCurrentUserId(bypassUserId);
    if (!userId) return;
    const { error } = await supabase.from('user_journey_progress').insert({
      user_id: userId,
      journey_id: journey.id,
      current_sequence_order: 1,
      completed_quest_ids: [],
      is_completed: false,
    });
    if (!error) loadAll();
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
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Quests &amp; Journeys</h2>
            <p className="text-sm text-muted-foreground">Complete quests and follow journey paths</p>
          </div>
        </div>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
        {(['quests', 'journeys'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedQuest(null); setSelectedJourney(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'quests' ? <Target className="w-3.5 h-3.5" /> : <Map className="w-3.5 h-3.5" />}
            {t === 'quests' ? `Quests (${quests.length})` : `Journeys (${journeys.length})`}
          </button>
        ))}
      </div>

      {tab === 'quests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Quests</h3>
            {viewMode === 'card' ? (
              <div className="space-y-3">
                {quests.map(quest => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    selected={selectedQuest?.id === quest.id}
                    onClick={() => loadQuestDetails(quest)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {quests.map((quest, i) => (
                  <button
                    key={quest.id}
                    onClick={() => loadQuestDetails(quest)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${
                      i < quests.length - 1 ? 'border-b border-border' : ''
                    } ${selectedQuest?.id === quest.id ? 'bg-primary/5 text-primary' : 'hover:bg-accent/40'}`}
                  >
                    <span className="font-medium truncate">{quest.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                      <span className="text-yellow-500 font-semibold">{quest.points_reward}pts</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            {quests.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active quests</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedQuest ? (
              <QuestDetailPanel
                quest={selectedQuest}
                steps={questSteps}
                progress={userQuestProgress}
                onStart={startQuest}
              />
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a quest to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'journeys' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quest Journeys</h3>
            {viewMode === 'card' ? (
              <div className="space-y-3">
                {journeys.map(j => (
                  <JourneyCard
                    key={j.id}
                    journey={j}
                    selected={selectedJourney?.id === j.id}
                    onClick={() => setSelectedJourney(j)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {journeys.map((j, i) => (
                  <button
                    key={j.id}
                    onClick={() => setSelectedJourney(j)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${
                      i < journeys.length - 1 ? 'border-b border-border' : ''
                    } ${selectedJourney?.id === j.id ? 'bg-primary/5 text-primary' : 'hover:bg-accent/40'}`}
                  >
                    <span className="font-medium truncate">{j.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                      <span>{j.journey_quests.length} quests</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            {journeys.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Map className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No journeys yet</p>
                <p className="text-xs text-muted-foreground mt-1">Admins can create journeys by chaining quests in sequence</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedJourney ? (
              <JourneyDetailPanel
                journey={selectedJourney}
                onStart={startJourney}
                onSelectQuest={loadQuestDetails}
              />
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Map className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a journey to view its quest sequence</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, selected, onClick }: { quest: Quest; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 bg-card border rounded-xl cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
      }`}
    >
      <h4 className="font-semibold text-foreground">{quest.name}</h4>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quest.description}</p>
      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="flex items-center gap-1 text-yellow-500 font-semibold">
          <Star className="w-3 h-3" />{quest.points_reward} pts
        </span>
        <span className="flex items-center gap-1 text-orange-500 font-semibold">
          <Zap className="w-3 h-3" />{quest.xp_reward} XP
        </span>
        {quest.is_daily && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-medium">Daily</span>}
        {quest.is_weekly && <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-500 rounded text-[10px] font-medium">Weekly</span>}
      </div>
    </div>
  );
}

function QuestDetailPanel({
  quest,
  steps,
  progress,
  onStart,
}: {
  quest: Quest;
  steps: QuestStep[];
  progress: UserQuestProgress | null;
  onStart: (q: Quest) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-2xl font-bold mb-2">{quest.name}</h3>
      <p className="text-muted-foreground mb-4">{quest.description}</p>

      {quest.narrative && (
        <div className="bg-secondary p-4 rounded-xl mb-5 border-l-4 border-primary/50">
          <p className="text-sm italic text-muted-foreground">{quest.narrative}</p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="px-4 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          <Star className="w-4 h-4" />{quest.points_reward} Points
        </div>
        <div className="px-4 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          <Zap className="w-4 h-4" />{quest.xp_reward} XP
        </div>
      </div>

      {steps.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Quest Steps</h4>
          <div className="space-y-3">
            {steps.map(step => {
              const isCompleted = progress?.completed_steps?.includes(step.step_number) || false;
              const isCurrent = progress?.current_step === step.step_number && !isCompleted;
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-green-500/5 border-green-500/20'
                      : isCurrent
                      ? 'bg-primary/5 border-primary/20'
                      : 'border-border'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : isCurrent ? (
                    <Play className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">Step {step.step_number}</span>
                      {isCurrent && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Current</span>}
                    </div>
                    <h5 className="font-medium mt-0.5">{step.name}</h5>
                    {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!progress ? (
        <button
          onClick={() => onStart(quest)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold"
        >
          <Play className="w-4 h-4" />
          Start Quest
        </button>
      ) : progress.is_completed ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-500 rounded-xl font-semibold">
          <CheckCircle className="w-5 h-5" />
          Quest Completed
        </div>
      ) : (
        <div className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-semibold">
          In Progress — Step {progress.current_step} of {steps.length}
        </div>
      )}
    </div>
  );
}

function JourneyCard({ journey, selected, onClick }: { journey: JourneyWithQuests; selected: boolean; onClick: () => void }) {
  const total = journey.journey_quests.length;
  const completed = journey.userProgress?.completed_quest_ids?.length ?? 0;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-card border rounded-xl cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Map className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground">{journey.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{total} quest{total !== 1 ? 's' : ''} in sequence</p>
        </div>
      </div>

      {journey.userProgress && (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completed} / {total} completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function JourneyDetailPanel({
  journey,
  onStart,
  onSelectQuest,
}: {
  journey: JourneyWithQuests;
  onStart: (j: JourneyWithQuests) => void;
  onSelectQuest: (q: Quest) => void;
}) {
  const completedIds = new Set(journey.userProgress?.completed_quest_ids ?? []);
  const currentSeq = journey.userProgress?.current_sequence_order ?? 1;
  const hasStarted = !!journey.userProgress;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Map className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">{journey.name}</h3>
          {journey.description && <p className="text-muted-foreground mt-1">{journey.description}</p>}
        </div>
      </div>

      {journey.narrative && (
        <div className="bg-secondary p-4 rounded-xl mb-5 border-l-4 border-primary/50">
          <p className="text-sm italic text-muted-foreground">{journey.narrative}</p>
        </div>
      )}

      {hasStarted && (
        <div className="mb-5 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-primary">Journey Progress</span>
            <span className="text-muted-foreground">{completedIds.size} / {journey.journey_quests.length} completed</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${journey.journey_quests.length > 0 ? (completedIds.size / journey.journey_quests.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quest Sequence</h4>
        <div className="space-y-3">
          {journey.journey_quests.map((jq, idx) => {
            const quest = jq.quest;
            if (!quest) return null;
            const isCompleted = completedIds.has(quest.id);
            const isCurrent = hasStarted && jq.sequence_order === currentSeq && !isCompleted;
            const isLocked = hasStarted && jq.sequence_order > currentSeq && !isCompleted;
            const isUnstarted = !hasStarted && idx > 0;

            return (
              <div key={jq.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-secondary border-border text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : jq.sequence_order}
                  </div>
                  {idx < journey.journey_quests.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[16px] mt-1 ${isCompleted ? 'bg-green-500/50' : 'bg-border'}`} />
                  )}
                </div>

                <div
                  className={`flex-1 mb-3 p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-green-500/5 border-green-500/20'
                      : isCurrent
                      ? 'bg-primary/5 border-primary/20 shadow-sm'
                      : isLocked || isUnstarted
                      ? 'bg-secondary/50 border-border opacity-60'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isCurrent && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Current Quest</span>}
                        {isCompleted && <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-semibold">Completed</span>}
                        {(isLocked || isUnstarted) && <Lock className="w-3 h-3 text-muted-foreground" />}
                        {jq.is_required && <span className="text-xs text-muted-foreground">Required</span>}
                      </div>
                      <h5 className="font-semibold">{quest.name}</h5>
                      {quest.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quest.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-yellow-500 font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" />{quest.points_reward} pts
                        </span>
                        <span className="text-orange-500 font-semibold flex items-center gap-1">
                          <Zap className="w-3 h-3" />{quest.xp_reward} XP
                        </span>
                      </div>
                    </div>
                    {(!isLocked && !isUnstarted) && (
                      <button
                        onClick={() => onSelectQuest(quest)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                      >
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {jq.unlock_condition && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Unlock condition: {jq.unlock_condition}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!hasStarted && (
        <button
          onClick={() => onStart(journey)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold"
        >
          <Play className="w-4 h-4" />
          Begin Journey
        </button>
      )}
      {journey.userProgress?.is_completed && (
        <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-500 rounded-xl font-semibold">
          <CheckCircle className="w-5 h-5" />
          Journey Complete!
        </div>
      )}
    </div>
  );
}
