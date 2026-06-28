/*
  # Create Projects Gamification System

  ## Overview
  Projects are client-specific or stakeholder-specific subsets of the overall gamification
  application. Each project contains its own complete gamification setup tied to an industry
  sector, with its own reward rules, levels, quests, and challenges.

  ## New Tables

  ### projects
  - Core project record with client name, industry sector linkage, status, and brand color
  - Status options: draft | active | archived

  ### project_levels
  - Project-specific level configuration (xp thresholds per level per project)

  ### project_reward_rules
  - Project-specific points/XP multipliers per activity type

  ### project_quests
  - Project-scoped quests with full reward configuration

  ### project_challenges
  - Project-scoped challenges: individual, team, department, community, time_based, seasonal

  ## Security
  - RLS enabled on all 5 tables
  - Authenticated users can read all project data
  - Only role='admin' users can create/update/delete
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client_name text,
  industry_sector_id uuid REFERENCES industry_sectors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  color text DEFAULT '#3B82F6',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  name text NOT NULL,
  description text,
  xp_required integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, level_number)
);

CREATE TABLE IF NOT EXISTS project_reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_type_id uuid REFERENCES activity_types(id) ON DELETE SET NULL,
  points_multiplier numeric NOT NULL DEFAULT 1.0,
  xp_multiplier numeric NOT NULL DEFAULT 1.0,
  badge_id uuid REFERENCES badges(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  narrative text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'expired')),
  points_reward integer NOT NULL DEFAULT 100,
  xp_reward integer NOT NULL DEFAULT 150,
  is_daily boolean NOT NULL DEFAULT false,
  is_weekly boolean NOT NULL DEFAULT false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'individual' CHECK (challenge_type IN ('individual', 'team', 'department', 'community', 'time_based', 'seasonal')),
  points_reward integer NOT NULL DEFAULT 200,
  xp_reward integer NOT NULL DEFAULT 300,
  is_active boolean NOT NULL DEFAULT true,
  duration_days integer DEFAULT 7,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Authenticated users can read project_levels"
  ON project_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert project_levels"
  ON project_levels FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update project_levels"
  ON project_levels FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete project_levels"
  ON project_levels FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Authenticated users can read project_reward_rules"
  ON project_reward_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert project_reward_rules"
  ON project_reward_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update project_reward_rules"
  ON project_reward_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete project_reward_rules"
  ON project_reward_rules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Authenticated users can read project_quests"
  ON project_quests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert project_quests"
  ON project_quests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update project_quests"
  ON project_quests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete project_quests"
  ON project_quests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Authenticated users can read project_challenges"
  ON project_challenges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert project_challenges"
  ON project_challenges FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update project_challenges"
  ON project_challenges FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete project_challenges"
  ON project_challenges FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
