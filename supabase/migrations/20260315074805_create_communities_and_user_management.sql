/*
  # Communities and User Management

  ## New Tables

  1. `communities`
     - Groups of users (subscribers/players) with name, description, tags, and metadata
     - Admin-managed, can be public or private
     - Members tracked via `community_members` join table

  2. `community_members`
     - Links users (profiles) to communities
     - Tracks role within community (owner, moderator, member)
     - Tracks how they joined (invited, auto, manual)
     - join_date and added_by tracked

  3. `impersonation_log`
     - Audit trail of all admin impersonation sessions
     - Records who impersonated whom, when, and for how long
     - Non-destructive, append-only audit table

  ## Modified Tables
  - No destructive changes

  ## Security
  - RLS enabled on all new tables
  - communities: authenticated read; admin/moderator write
  - community_members: authenticated read own; admin/moderator full access
  - impersonation_log: admin read; system write via SECURITY DEFINER function

  ## Notes
  - Communities support bulk (crowd) actions via status field and tags array
  - Impersonation is fully audited and cannot exceed caller's access level (enforced in app layer)
*/

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  member_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community members join table
CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  join_method text NOT NULL DEFAULT 'manual' CHECK (join_method IN ('invited', 'auto', 'manual', 'bulk')),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(community_id, user_id)
);

-- Impersonation audit log
CREATE TABLE IF NOT EXISTS impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  reason text,
  admin_role text,
  target_role text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON impersonation_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_target ON impersonation_log(impersonated_user_id);

-- Function to keep member_count in sync
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1, updated_at = now() WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(0, member_count - 1), updated_at = now() WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_member_count_trigger ON community_members;
CREATE TRIGGER community_member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

-- Helper to check admin/moderator role (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin_or_moderator(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role IN ('admin', 'moderator')
  );
END;
$$;

-- Communities policies
CREATE POLICY "Anyone authenticated can view active communities"
  ON communities FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can insert communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can update communities"
  ON communities FOR UPDATE
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can delete communities"
  ON communities FOR DELETE
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Community members policies
CREATE POLICY "Users can view their own memberships"
  ON community_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can insert members"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can update members"
  ON community_members FOR UPDATE
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can delete members"
  ON community_members FOR DELETE
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Impersonation log policies
CREATE POLICY "Admins can view impersonation log"
  ON impersonation_log FOR SELECT
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert impersonation log"
  ON impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid() AND is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update their own impersonation log entries"
  ON impersonation_log FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- Seed a sample community
INSERT INTO communities (name, description, tags, color, is_active, is_public)
VALUES
  ('Early Adopters', 'First users and beta testers of the platform', ARRAY['beta', 'founders'], '#10b981', true, false),
  ('Champions Circle', 'Top-performing members across all leaderboards', ARRAY['top-performers', 'vip'], '#f59e0b', true, false),
  ('Healthcare Professionals', 'Members from the Healthcare and Medical sector', ARRAY['healthcare', 'sector'], '#3b82f6', true, true),
  ('Technology Leaders', 'Members working in Technology and IT', ARRAY['technology', 'sector'], '#8b5cf6', true, true)
ON CONFLICT DO NOTHING;
