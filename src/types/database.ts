export type ChallengeType = 'individual' | 'team' | 'department' | 'community' | 'time_based' | 'seasonal';
export type QuestStatus = 'active' | 'inactive' | 'completed' | 'expired';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
export type LeaderboardType = 'global' | 'team' | 'department' | 'season' | 'friend';
export type NotificationType = 'quest_available' | 'challenge_ending' | 'challenge_started' | 'campaign_launched' | 'level_up' | 'badge_earned';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  current_level: number;
  total_points: number;
  total_xp: number;
  reputation_score: number;
  team_id: string | null;
  department: string | null;
  industry_sector: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityType {
  id: string;
  name: string;
  description: string | null;
  base_points: number;
  base_xp: number;
  industry_sector: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EngagementEvent {
  id: string;
  user_id: string;
  activity_type_id: string;
  metadata: Record<string, unknown>;
  points_awarded: number;
  xp_awarded: number;
  created_at: string;
}

export interface PointsLedger {
  id: string;
  user_id: string;
  points_change: number;
  xp_change: number;
  reason: string | null;
  event_id: string | null;
  created_at: string;
}

export interface Level {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  xp_required: number;
  privileges: Record<string, unknown>;
  created_at: string;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level_id: string;
  level_number: number;
  achieved_at: string;
}

export interface BadgeConstellation {
  id: string;
  name: string;
  description: string | null;
  theme: string | null;
  visual_data: Record<string, unknown>;
  industry_sector: string | null;
  is_active: boolean;
  cover_image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Badge {
  id: string;
  constellation_id: string | null;
  name: string;
  description: string | null;
  icon_url: string | null;
  sequence_order: number;
  points_reward: number;
  xp_reward: number;
  achievement_criteria: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string | null;
  narrative: string | null;
  status: QuestStatus;
  points_reward: number;
  xp_reward: number;
  badge_reward_id: string | null;
  is_daily: boolean;
  is_weekly: boolean;
  start_date: string | null;
  end_date: string | null;
  icon_url: string | null;
  icon_size: number | null;
  created_at: string;
}

export interface QuestStep {
  id: string;
  quest_id: string;
  step_number: number;
  name: string;
  description: string | null;
  activity_type_id: string | null;
  completion_criteria: Record<string, unknown>;
  created_at: string;
}

export interface UserQuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  objective: Record<string, unknown>;
  points_reward: number;
  xp_reward: number;
  badge_reward_id: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  is_active: boolean;
  icon_url: string | null;
  icon_size: number | null;
  created_at: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  progress_data: Record<string, unknown>;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface LeaderboardRecord {
  id: string;
  user_id: string;
  leaderboard_type: LeaderboardType;
  scope: string | null;
  points: number;
  rank: number | null;
  season_id: string | null;
  updated_at: string;
}

export type CampaignType = 'points_boost' | 'xp_sprint' | 'early_bird' | 'streak' | 'milestone';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  objective_description: string | null;
  campaign_type: CampaignType;
  start_date: string;
  end_date: string;
  early_target_date: string | null;
  points_multiplier: number;
  xp_multiplier: number;
  early_completion_multiplier: number;
  early_completion_bonus_points: number;
  is_active: boolean;
  created_at: string;
}

export interface ScheduledEvent {
  id: string;
  event_type: string;
  quest_id: string | null;
  challenge_id: string | null;
  campaign_id: string | null;
  recurrence_rule_id: string | null;
  start_date: string;
  end_date: string | null;
  timezone: string;
  auto_activate: boolean;
  auto_close: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  industry_sector_id: string | null;
  status: 'draft' | 'active' | 'archived';
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  industry_sector?: { name: string; code: string } | null;
}

export interface ProjectLevel {
  id: string;
  project_id: string;
  level_number: number;
  name: string;
  description: string | null;
  xp_required: number;
  created_at: string;
}

export interface ProjectRewardRule {
  id: string;
  project_id: string;
  activity_type_id: string | null;
  points_multiplier: number;
  xp_multiplier: number;
  badge_id: string | null;
  is_active: boolean;
  created_at: string;
  activity_type?: { name: string } | null;
  badge?: { name: string } | null;
}

export interface ProjectQuest {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  narrative: string | null;
  status: QuestStatus;
  points_reward: number;
  xp_reward: number;
  is_daily: boolean;
  is_weekly: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface ProjectChallenge {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  points_reward: number;
  xp_reward: number;
  is_active: boolean;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Journey {
  id: string;
  name: string;
  description: string | null;
  narrative: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyQuest {
  id: string;
  journey_id: string;
  quest_id: string;
  sequence_order: number;
  is_required: boolean;
  unlock_condition: string | null;
  created_at: string;
  quest?: Quest;
}

export interface UserJourneyProgress {
  id: string;
  user_id: string;
  journey_id: string;
  current_sequence_order: number;
  completed_quest_ids: string[];
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  template_type: string;
  variables: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSchedule {
  id: string;
  name: string;
  template_id: string | null;
  recipient_type: string;
  recipient_filter: Record<string, unknown> | null;
  subject_override: string | null;
  scheduled_at: string | null;
  send_immediately: boolean;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  sent_at: string | null;
  sent_count: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  email_template?: EmailTemplate | null;
}
