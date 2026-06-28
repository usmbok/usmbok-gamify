/*
  # Add Admin Roles and Industry Sectors

  ## Overview
  Adds role-based access control and industry sector hierarchy management

  ## New Tables
  - `user_roles` - Assigns roles to users (admin, moderator, user)
  - `industry_sectors` - Hierarchical industry sector classification
  - `recent_views` - Track recently viewed items for each user

  ## Schema Changes
  1. User Roles
    - `user_roles` table for role assignments
    - Support for multiple roles per user
    
  2. Industry Sectors
    - Three-level hierarchy (sector, subsector, specialty)
    - Descriptions and metadata
    - Active/inactive status
    
  3. Recent Views
    - Track what items users view
    - Support different entity types
    - Automatic cleanup of old entries

  ## Security
  - RLS enabled on all new tables
  - Admin-only policies for role management
  - User-specific policies for recent views
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');

-- User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Industry Sectors table (3-level hierarchy)
CREATE TABLE IF NOT EXISTS industry_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES industry_sectors(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level IN (1, 2, 3)),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recent Views tracking
CREATE TABLE IF NOT EXISTS recent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles

-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for industry_sectors

-- All authenticated users can view active sectors
CREATE POLICY "Users can view active industry sectors"
  ON industry_sectors FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ));

-- Only admins can insert sectors
CREATE POLICY "Admins can insert industry sectors"
  ON industry_sectors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can update sectors
CREATE POLICY "Admins can update industry sectors"
  ON industry_sectors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can delete sectors
CREATE POLICY "Admins can delete industry sectors"
  ON industry_sectors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for recent_views

-- Users can view their own recent views
CREATE POLICY "Users can view own recent views"
  ON recent_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own recent views
CREATE POLICY "Users can insert own recent views"
  ON recent_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recent views
CREATE POLICY "Users can update own recent views"
  ON recent_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recent views
CREATE POLICY "Users can delete own recent views"
  ON recent_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_industry_sectors_parent_id ON industry_sectors(parent_id);
CREATE INDEX IF NOT EXISTS idx_industry_sectors_level ON industry_sectors(level);
CREATE INDEX IF NOT EXISTS idx_industry_sectors_code ON industry_sectors(code);
CREATE INDEX IF NOT EXISTS idx_recent_views_user_id ON recent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_viewed_at ON recent_views(viewed_at DESC);

-- Function to clean up old recent views (keep last 50 per user)
CREATE OR REPLACE FUNCTION cleanup_recent_views()
RETURNS void AS $$
BEGIN
  DELETE FROM recent_views
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY viewed_at DESC) as rn
      FROM recent_views
    ) t
    WHERE rn > 50
  );
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for industry_sectors
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industry_sectors_updated_at
  BEFORE UPDATE ON industry_sectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update activity_types, badges, quests, challenges, campaigns tables to add admin-only policies
DO $$
BEGIN
  -- Activity Types
  DROP POLICY IF EXISTS "Admins can insert activity types" ON activity_types;
  CREATE POLICY "Admins can insert activity types"
    ON activity_types FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update activity types" ON activity_types;
  CREATE POLICY "Admins can update activity types"
    ON activity_types FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete activity types" ON activity_types;
  CREATE POLICY "Admins can delete activity types"
    ON activity_types FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Reward Rules
  DROP POLICY IF EXISTS "Admins can insert reward rules" ON reward_rules;
  CREATE POLICY "Admins can insert reward rules"
    ON reward_rules FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update reward rules" ON reward_rules;
  CREATE POLICY "Admins can update reward rules"
    ON reward_rules FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete reward rules" ON reward_rules;
  CREATE POLICY "Admins can delete reward rules"
    ON reward_rules FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Badge Constellations
  DROP POLICY IF EXISTS "Admins can insert badge constellations" ON badge_constellations;
  CREATE POLICY "Admins can insert badge constellations"
    ON badge_constellations FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update badge constellations" ON badge_constellations;
  CREATE POLICY "Admins can update badge constellations"
    ON badge_constellations FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete badge constellations" ON badge_constellations;
  CREATE POLICY "Admins can delete badge constellations"
    ON badge_constellations FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Badges
  DROP POLICY IF EXISTS "Admins can insert badges" ON badges;
  CREATE POLICY "Admins can insert badges"
    ON badges FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update badges" ON badges;
  CREATE POLICY "Admins can update badges"
    ON badges FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete badges" ON badges;
  CREATE POLICY "Admins can delete badges"
    ON badges FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Quests
  DROP POLICY IF EXISTS "Admins can insert quests" ON quests;
  CREATE POLICY "Admins can insert quests"
    ON quests FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update quests" ON quests;
  CREATE POLICY "Admins can update quests"
    ON quests FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete quests" ON quests;
  CREATE POLICY "Admins can delete quests"
    ON quests FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Challenges
  DROP POLICY IF EXISTS "Admins can insert challenges" ON challenges;
  CREATE POLICY "Admins can insert challenges"
    ON challenges FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update challenges" ON challenges;
  CREATE POLICY "Admins can update challenges"
    ON challenges FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete challenges" ON challenges;
  CREATE POLICY "Admins can delete challenges"
    ON challenges FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

  -- Campaigns
  DROP POLICY IF EXISTS "Admins can insert campaigns" ON campaigns;
  CREATE POLICY "Admins can insert campaigns"
    ON campaigns FOR INSERT
    TO authenticated
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can update campaigns" ON campaigns;
  CREATE POLICY "Admins can update campaigns"
    ON campaigns FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;
  CREATE POLICY "Admins can delete campaigns"
    ON campaigns FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));
END $$;
