/*
  # USMBOK Gamification Engine Database Schema

  ## Overview
  Complete database schema for a configurable gamification engine supporting:
  - User engagement tracking and rewards
  - Badge constellation system
  - Quest and challenge management
  - Scheduling and campaigns
  - Leaderboards and progression
  - Industry-specific templates

  ## New Tables

  ### Core User & Profile
  - `profiles` - Extended user profile information

  ### Engagement & Rewards
  - `activity_types` - Configurable engagement activities
  - `engagement_events` - Log of all user engagement activities
  - `points_ledger` - Transaction log of all point changes
  - `reward_rules` - Configuration for reward calculation

  ### Progression System
  - `levels` - Level definitions and requirements
  - `user_levels` - User current level and progress

  ### Badge System
  - `badge_constellations` - Themed badge clusters
  - `badges` - Individual badge definitions
  - `user_badges` - Badges earned by users

  ### Quest System
  - `quests` - Quest definitions
  - `quest_steps` - Steps within quests
  - `user_quest_progress` - User progress on quests

  ### Challenge System
  - `challenges` - Challenge definitions
  - `user_challenge_progress` - User progress on challenges

  ### Leaderboards
  - `leaderboard_records` - Current leaderboard standings
  - `seasonal_leaderboards` - Historical leaderboard seasons

  ### Scheduling & Campaigns
  - `campaigns` - Marketing/engagement campaigns
  - `scheduled_events` - Scheduled quests and challenges
  - `event_recurrence_rules` - Recurrence patterns
  - `campaign_quests` - Quests associated with campaigns
  - `campaign_challenges` - Challenges associated with campaigns

  ### Configuration
  - `industry_templates` - Industry-specific configurations
  - `notifications` - User notifications

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated user access
  - Admin-only policies for configuration tables
*/

-- Create enum types
CREATE TYPE challenge_type AS ENUM ('individual', 'team', 'department', 'community', 'time_based', 'seasonal');
CREATE TYPE quest_status AS ENUM ('active', 'inactive', 'completed', 'expired');
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom');
CREATE TYPE leaderboard_type AS ENUM ('global', 'team', 'department', 'season', 'friend');
CREATE TYPE notification_type AS ENUM ('quest_available', 'challenge_ending', 'challenge_started', 'campaign_launched', 'level_up', 'badge_earned');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  current_level integer DEFAULT 1,
  total_points integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  reputation_score integer DEFAULT 0,
  team_id uuid,
  department text,
  industry_sector text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity Types (configurable engagement actions)
CREATE TABLE IF NOT EXISTS activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_points integer DEFAULT 0,
  base_xp integer DEFAULT 0,
  industry_sector text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Engagement Events (event log)
CREATE TABLE IF NOT EXISTS engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type_id uuid REFERENCES activity_types(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  points_awarded integer DEFAULT 0,
  xp_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Points Ledger (transaction log)
CREATE TABLE IF NOT EXISTS points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  points_change integer NOT NULL,
  xp_change integer DEFAULT 0,
  reason text,
  event_id uuid REFERENCES engagement_events(id),
  created_at timestamptz DEFAULT now()
);

-- Reward Rules (configurable reward logic)
CREATE TABLE IF NOT EXISTS reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type_id uuid REFERENCES activity_types(id),
  condition jsonb DEFAULT '{}'::jsonb,
  points_multiplier numeric DEFAULT 1.0,
  xp_multiplier numeric DEFAULT 1.0,
  badge_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Levels (progression tiers)
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number integer UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  xp_required integer NOT NULL,
  privileges jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- User Levels (user progression)
CREATE TABLE IF NOT EXISTS user_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id),
  level_number integer NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, level_id)
);

-- Badge Constellations (themed badge clusters)
CREATE TABLE IF NOT EXISTS badge_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  theme text,
  visual_data jsonb DEFAULT '{}'::jsonb,
  industry_sector text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Badges (individual achievements)
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constellation_id uuid REFERENCES badge_constellations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon_url text,
  sequence_order integer DEFAULT 0,
  achievement_criteria jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User Badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Quests (structured activities)
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  narrative text,
  status quest_status DEFAULT 'active',
  points_reward integer DEFAULT 0,
  xp_reward integer DEFAULT 0,
  badge_reward_id uuid REFERENCES badges(id),
  is_daily boolean DEFAULT false,
  is_weekly boolean DEFAULT false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Quest Steps (multi-step quest structure)
CREATE TABLE IF NOT EXISTS quest_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  name text NOT NULL,
  description text,
  activity_type_id uuid REFERENCES activity_types(id),
  completion_criteria jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quest_id, step_number)
);

-- User Quest Progress
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  current_step integer DEFAULT 1,
  completed_steps jsonb DEFAULT '[]'::jsonb,
  is_completed boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, quest_id)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  challenge_type challenge_type DEFAULT 'individual',
  objective jsonb DEFAULT '{}'::jsonb,
  points_reward integer DEFAULT 0,
  xp_reward integer DEFAULT 0,
  badge_reward_id uuid REFERENCES badges(id),
  start_date timestamptz,
  end_date timestamptz,
  duration_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  progress_data jsonb DEFAULT '{}'::jsonb,
  is_completed boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, challenge_id)
);

-- Leaderboard Records
CREATE TABLE IF NOT EXISTS leaderboard_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_type leaderboard_type DEFAULT 'global',
  scope text,
  points integer DEFAULT 0,
  rank integer,
  season_id uuid,
  updated_at timestamptz DEFAULT now()
);

-- Seasonal Leaderboards
CREATE TABLE IF NOT EXISTS seasonal_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  leaderboard_type leaderboard_type DEFAULT 'global',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  points_multiplier numeric DEFAULT 1.0,
  xp_multiplier numeric DEFAULT 1.0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Campaign Quests (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, quest_id)
);

-- Campaign Challenges (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, challenge_id)
);

-- Event Recurrence Rules
CREATE TABLE IF NOT EXISTS event_recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern recurrence_pattern NOT NULL,
  interval integer DEFAULT 1,
  day_of_week integer,
  day_of_month integer,
  month_of_year integer,
  custom_rule jsonb,
  created_at timestamptz DEFAULT now()
);

-- Scheduled Events
CREATE TABLE IF NOT EXISTS scheduled_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  quest_id uuid REFERENCES quests(id),
  challenge_id uuid REFERENCES challenges(id),
  campaign_id uuid REFERENCES campaigns(id),
  recurrence_rule_id uuid REFERENCES event_recurrence_rules(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  timezone text DEFAULT 'UTC',
  auto_activate boolean DEFAULT true,
  auto_close boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Industry Templates
CREATE TABLE IF NOT EXISTS industry_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL,
  description text,
  configuration jsonb DEFAULT '{}'::jsonb,
  activity_types jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can view all profiles but only update their own
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Activity Types: All authenticated users can view
CREATE POLICY "Users can view activity types"
  ON activity_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Engagement Events: Users can view own events and insert new events
CREATE POLICY "Users can view own engagement events"
  ON engagement_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement events"
  ON engagement_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Points Ledger: Users can view own transactions
CREATE POLICY "Users can view own points ledger"
  ON points_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points ledger"
  ON points_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Reward Rules: All authenticated users can view active rules
CREATE POLICY "Users can view active reward rules"
  ON reward_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Levels: All authenticated users can view
CREATE POLICY "Users can view levels"
  ON levels FOR SELECT
  TO authenticated
  USING (true);

-- User Levels: Users can view own levels
CREATE POLICY "Users can view own levels"
  ON user_levels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own levels"
  ON user_levels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Badge Constellations: All authenticated users can view active constellations
CREATE POLICY "Users can view badge constellations"
  ON badge_constellations FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Badges: All authenticated users can view active badges
CREATE POLICY "Users can view badges"
  ON badges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User Badges: Users can view own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Quests: All authenticated users can view active quests
CREATE POLICY "Users can view active quests"
  ON quests FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Quest Steps: All authenticated users can view steps of active quests
CREATE POLICY "Users can view quest steps"
  ON quest_steps FOR SELECT
  TO authenticated
  USING (true);

-- User Quest Progress: Users can view and update own progress
CREATE POLICY "Users can view own quest progress"
  ON user_quest_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest progress"
  ON user_quest_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress"
  ON user_quest_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Challenges: All authenticated users can view active challenges
CREATE POLICY "Users can view active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User Challenge Progress: Users can view and update own progress
CREATE POLICY "Users can view own challenge progress"
  ON user_challenge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
  ON user_challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
  ON user_challenge_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard Records: All authenticated users can view
CREATE POLICY "Users can view leaderboard records"
  ON leaderboard_records FOR SELECT
  TO authenticated
  USING (true);

-- Seasonal Leaderboards: All authenticated users can view
CREATE POLICY "Users can view seasonal leaderboards"
  ON seasonal_leaderboards FOR SELECT
  TO authenticated
  USING (true);

-- Campaigns: All authenticated users can view active campaigns
CREATE POLICY "Users can view active campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Campaign Quests: All authenticated users can view
CREATE POLICY "Users can view campaign quests"
  ON campaign_quests FOR SELECT
  TO authenticated
  USING (true);

-- Campaign Challenges: All authenticated users can view
CREATE POLICY "Users can view campaign challenges"
  ON campaign_challenges FOR SELECT
  TO authenticated
  USING (true);

-- Event Recurrence Rules: All authenticated users can view
CREATE POLICY "Users can view recurrence rules"
  ON event_recurrence_rules FOR SELECT
  TO authenticated
  USING (true);

-- Scheduled Events: All authenticated users can view active events
CREATE POLICY "Users can view active scheduled events"
  ON scheduled_events FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Industry Templates: All authenticated users can view
CREATE POLICY "Users can view industry templates"
  ON industry_templates FOR SELECT
  TO authenticated
  USING (true);

-- Notifications: Users can view own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id ON engagement_events(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_created_at ON engagement_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_id ON user_quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_records_type ON leaderboard_records(leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);

-- Insert default levels
INSERT INTO levels (level_number, name, description, xp_required, privileges) VALUES
  (1, 'Participant', 'Just getting started on your journey', 0, '{"can_comment": true}'::jsonb),
  (2, 'Contributor', 'Actively contributing to the community', 100, '{"can_comment": true, "can_vote": true}'::jsonb),
  (3, 'Specialist', 'Recognized for your expertise', 500, '{"can_comment": true, "can_vote": true, "can_create_content": true}'::jsonb),
  (4, 'Expert', 'A valued expert in your field', 2000, '{"can_comment": true, "can_vote": true, "can_create_content": true, "can_moderate": true}'::jsonb),
  (5, 'Master', 'Achieved mastery in engagement', 5000, '{"can_comment": true, "can_vote": true, "can_create_content": true, "can_moderate": true, "can_mentor": true}'::jsonb)
ON CONFLICT (level_number) DO NOTHING;