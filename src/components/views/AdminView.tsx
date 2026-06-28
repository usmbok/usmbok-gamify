import React, { useState, useEffect } from 'react';
import {
  Settings,
  Trophy,
  Target,
  Award,
  Activity,
  Gift,
  Calendar,
  Zap,
  Building2,
  AlertCircle,
  Users,
  Megaphone,
  Mail,
  UserCog,
  UsersRound,
  Lightbulb,
  Radio,
  BookOpen,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';
import { ActivityTypesManager } from '../admin/ActivityTypesManager';
import { IndustrySectorsManager } from '../admin/IndustrySectorsManager';
import { BadgesManager } from '../admin/BadgesManager';
import { LevelsManager } from '../admin/LevelsManager';
import { QuestsManager } from '../admin/QuestsManager';
import { ChallengesManager } from '../admin/ChallengesManager';
import { RewardRulesManager } from '../admin/RewardRulesManager';
import { CampaignsManager } from '../admin/CampaignsManager';
import { AnnouncementsManager } from '../admin/AnnouncementsManager';
import { UsersManager } from '../admin/UsersManager';
import { CommunitiesManager } from '../admin/CommunitiesManager';
import { IdeasManager } from '../admin/IdeasManager';
import { PulsesManager } from '../admin/PulsesManager';
import { GiftPacksManager } from '../admin/GiftPacksManager';
import { MessagingManager } from '../admin/MessagingManager';
import { CommunicationsView } from './CommunicationsView';
import { PointsLedgerManager } from '../admin/PointsLedgerManager';
import { IconLibraryManager } from '../admin/IconLibraryManager';
import { ExportManager } from '../admin/ExportManager';

type AdminSection =
  | 'overview'
  | 'users'
  | 'communities'
  | 'activity-types'
  | 'rewards'
  | 'levels'
  | 'badges'
  | 'icon-library'
  | 'quests'
  | 'challenges'
  | 'campaigns'
  | 'ideas'
  | 'pulses'
  | 'gift-packs'
  | 'points-ledger'
  | 'messaging'
  | 'announcements'
  | 'sectors'
  | 'communications'
  | 'export';

interface OverviewStats {
  activityTypes: number;
  quests: number;
  challenges: number;
  badges: number;
  levels: number;
  users: number;
}

export function AdminView() {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const { isAdmin, loading } = useAdmin();
  const [stats, setStats] = useState<OverviewStats>({
    activityTypes: 0,
    quests: 0,
    challenges: 0,
    badges: 0,
    levels: 0,
    users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    setStatsLoading(true);
    const [at, q, c, b, l, u] = await Promise.all([
      supabase.from('activity_types').select('id', { count: 'exact', head: true }),
      supabase.from('quests').select('id', { count: 'exact', head: true }),
      supabase.from('challenges').select('id', { count: 'exact', head: true }),
      supabase.from('badges').select('id', { count: 'exact', head: true }),
      supabase.from('levels').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      activityTypes: at.count || 0,
      quests: q.count || 0,
      challenges: c.count || 0,
      badges: b.count || 0,
      levels: l.count || 0,
      users: u.count || 0,
    });
    setStatsLoading(false);
  };

  const sections: { id: AdminSection; label: string; icon: React.ElementType; group?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'users', label: 'Users', icon: UserCog, group: 'People' },
    { id: 'communities', label: 'Communities', icon: UsersRound, group: 'People' },
    { id: 'sectors', label: 'Industry Sectors', icon: Building2, group: 'Configuration' },
    { id: 'activity-types', label: 'Activity Types', icon: Activity, group: 'Configuration' },
    { id: 'rewards', label: 'Reward Rules', icon: Gift, group: 'Configuration' },
    { id: 'levels', label: 'Levels', icon: Zap, group: 'Configuration' },
    { id: 'badges', label: 'Badges', icon: Award, group: 'Configuration' },
    { id: 'icon-library', label: 'Icon Library', icon: ImageIcon, group: 'Configuration' },
    { id: 'quests', label: 'Quests', icon: Target, group: 'Engagement' },
    { id: 'challenges', label: 'Challenges', icon: Trophy, group: 'Engagement' },
    { id: 'campaigns', label: 'Campaigns', icon: Calendar, group: 'Engagement' },
    { id: 'ideas', label: 'Ideas Board', icon: Lightbulb, group: 'Engagement' },
    { id: 'pulses', label: 'Pulses', icon: Radio, group: 'Engagement' },
    { id: 'gift-packs', label: 'Gift Point Packs', icon: Gift, group: 'Engagement' },
    { id: 'points-ledger', label: 'Points Ledger', icon: BookOpen, group: 'Engagement' },
    { id: 'messaging', label: 'Messaging', icon: Mail, group: 'Comms' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'Comms' },
    { id: 'communications', label: 'Communications', icon: Mail, group: 'Comms' },
    { id: 'export', label: 'Export', icon: Download, group: 'System' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-16 h-16 text-yellow-500" />
        <h3 className="text-xl font-semibold">Admin Access Required</h3>
        <p className="text-muted-foreground">You need admin privileges to access this section.</p>
      </div>
    );
  }

  const overviewCards = [
    { label: 'Activity Types', value: stats.activityTypes, icon: Activity, color: 'text-primary' },
    { label: 'Active Quests', value: stats.quests, icon: Target, color: 'text-blue-500' },
    { label: 'Challenges', value: stats.challenges, icon: Trophy, color: 'text-orange-500' },
    { label: 'Badges', value: stats.badges, icon: Award, color: 'text-yellow-500' },
    { label: 'Levels', value: stats.levels, icon: Zap, color: 'text-green-500' },
    { label: 'Users', value: stats.users, icon: Users, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-bold">Admin Configuration</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Configuration</h3>
            <nav className="space-y-0.5">
              {(() => {
                const groups = ['', 'People', 'Configuration', 'Engagement', 'Comms', 'System'];
                return groups.map(group => {
                  const groupSections = sections.filter(s => (s.group || '') === group);
                  if (groupSections.length === 0) return null;
                  return (
                    <div key={group || 'root'} className={group ? 'pt-2' : ''}>
                      {group && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">{group}</p>
                      )}
                      {groupSections.map(section => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              activeSection === section.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg p-6">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold">System Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {overviewCards.map(card => (
                    <div key={card.label} className="p-4 bg-secondary rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                        <h4 className="font-semibold text-sm">{card.label}</h4>
                      </div>
                      {statsLoading ? (
                        <div className="h-8 w-12 bg-border rounded animate-pulse" />
                      ) : (
                        <p className="text-3xl font-bold text-foreground">{card.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Getting Started
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>1. Configure Activity Types to define engagement behaviors</li>
                    <li>2. Set up Reward Rules to assign points and XP multipliers</li>
                    <li>3. Upload Badge Icons to personalize achievements</li>
                    <li>4. Design Quests and Challenges for users</li>
                    <li>5. Schedule Campaigns to boost engagement</li>
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'users' && <UsersManager />}
            {activeSection === 'communities' && <CommunitiesManager />}
            {activeSection === 'activity-types' && <ActivityTypesManager />}
            {activeSection === 'sectors' && <IndustrySectorsManager />}
            {activeSection === 'rewards' && <RewardRulesManager />}
            {activeSection === 'levels' && <LevelsManager />}
            {activeSection === 'badges' && <BadgesManager />}
            {activeSection === 'icon-library' && <IconLibraryManager />}
            {activeSection === 'quests' && <QuestsManager />}
            {activeSection === 'challenges' && <ChallengesManager />}

            {activeSection === 'campaigns' && <CampaignsManager />}
            {activeSection === 'ideas' && <IdeasManager />}
            {activeSection === 'pulses' && <PulsesManager />}
            {activeSection === 'gift-packs' && <GiftPacksManager />}
            {activeSection === 'points-ledger' && <PointsLedgerManager />}
            {activeSection === 'messaging' && <MessagingManager />}
            {activeSection === 'announcements' && <AnnouncementsManager />}
            {activeSection === 'communications' && <CommunicationsView />}
            {activeSection === 'export' && <ExportManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
