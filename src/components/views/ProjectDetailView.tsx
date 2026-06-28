import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  Zap,
  Target,
  Trophy,
  Gift,
  Settings,
  Circle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProjectLevelsPanel } from '../projects/ProjectLevelsPanel';
import { ProjectRewardRulesPanel } from '../projects/ProjectRewardRulesPanel';
import { ProjectQuestsPanel } from '../projects/ProjectQuestsPanel';
import { ProjectChallengesPanel } from '../projects/ProjectChallengesPanel';
import type { Project } from '../../types/database';

type Tab = 'overview' | 'levels' | 'rewards' | 'quests' | 'challenges';

interface SectionCounts {
  levels: number;
  rewardRules: number;
  quests: number;
  challenges: number;
}

interface Props {
  project: Project;
  onBack: () => void;
}

const statusConfig = {
  active: { label: 'Active', dot: 'bg-green-500' },
  draft: { label: 'Draft', dot: 'bg-yellow-500' },
  archived: { label: 'Archived', dot: 'bg-slate-400' },
};

export function ProjectDetailView({ project, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [counts, setCounts] = useState<SectionCounts>({ levels: 0, rewardRules: 0, quests: 0, challenges: 0 });
  const [sectorName, setSectorName] = useState<string>('');

  useEffect(() => {
    loadCounts();
    if (project.industry_sector_id) {
      supabase
        .from('industry_sectors')
        .select('name')
        .eq('id', project.industry_sector_id)
        .maybeSingle()
        .then(({ data }) => { if (data) setSectorName(data.name); });
    }
  }, [project.id]);

  const loadCounts = async () => {
    const [l, r, q, c] = await Promise.all([
      supabase.from('project_levels').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
      supabase.from('project_reward_rules').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
      supabase.from('project_quests').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
      supabase.from('project_challenges').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
    ]);
    setCounts({ levels: l.count || 0, rewardRules: r.count || 0, quests: q.count || 0, challenges: c.count || 0 });
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; count: number }> = [
    { id: 'overview', label: 'Overview', icon: Settings, count: 0 },
    { id: 'levels', label: 'Levels', icon: Zap, count: counts.levels },
    { id: 'rewards', label: 'Reward Rules', icon: Gift, count: counts.rewardRules },
    { id: 'quests', label: 'Quests', icon: Target, count: counts.quests },
    { id: 'challenges', label: 'Challenges', icon: Trophy, count: counts.challenges },
  ];

  const sc = statusConfig[project.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{project.name}</span>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${project.color || '#3B82F6'}dd, ${project.color || '#3B82F6'}88)` }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${sc.dot} ring-2 ring-white/30`} />
                <span className="text-sm font-medium text-white/80">{sc.label}</span>
              </div>
              <h2 className="text-4xl font-bold mb-1">{project.name}</h2>
              {project.client_name && (
                <div className="flex items-center gap-1.5 text-white/80">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{project.client_name}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {sectorName && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
                  <Building2 className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/90">{sectorName}</span>
                </div>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-white/75 mt-4 max-w-2xl text-sm leading-relaxed">{project.description}</p>
          )}

          <div className="flex items-center gap-6 mt-6">
            {[
              { label: 'Levels', value: counts.levels, icon: Zap },
              { label: 'Reward Rules', value: counts.rewardRules, icon: Gift },
              { label: 'Quests', value: counts.quests, icon: Target },
              { label: 'Challenges', value: counts.challenges, icon: Trophy },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-white/70" />
                <span className="text-2xl font-bold">{s.value}</span>
                <span className="text-white/60 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Levels', value: counts.levels, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10', tab: 'levels' as Tab },
                { label: 'Reward Rules', value: counts.rewardRules, icon: Gift, color: 'text-yellow-500', bg: 'bg-yellow-500/10', tab: 'rewards' as Tab },
                { label: 'Quests', value: counts.quests, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10', tab: 'quests' as Tab },
                { label: 'Challenges', value: counts.challenges, icon: Trophy, color: 'text-green-500', bg: 'bg-green-500/10', tab: 'challenges' as Tab },
              ].map(card => (
                <button
                  key={card.label}
                  onClick={() => setActiveTab(card.tab)}
                  className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-3xl font-bold mb-1">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-4">Project Setup Checklist</h4>
              <div className="space-y-3">
                {[
                  { label: 'Configure progression levels', done: counts.levels > 0, tab: 'levels' as Tab },
                  { label: 'Define reward multiplier rules', done: counts.rewardRules > 0, tab: 'rewards' as Tab },
                  { label: 'Create quests for participants', done: counts.quests > 0, tab: 'quests' as Tab },
                  { label: 'Set up individual challenges', done: counts.challenges > 0, tab: 'challenges' as Tab },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.tab)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-500/15' : 'bg-secondary'}`}>
                      {item.done ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      ) : (
                        <Circle className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    {!item.done && <span className="ml-auto text-xs text-primary">Set up</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'levels' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <ProjectLevelsPanel projectId={project.id} />
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <ProjectRewardRulesPanel projectId={project.id} />
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <ProjectQuestsPanel projectId={project.id} />
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <ProjectChallengesPanel projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
}
