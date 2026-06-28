/*
  # Create Announcements / Hero Banner Ads Table

  ## Summary
  Adds an `announcements` table for the dashboard hero banner area.
  Admins can create ads or announcements that display to players on the dashboard.

  ## New Table: announcements
  - `id` - Primary key
  - `title` - Announcement headline
  - `body` - Full description / body text
  - `image_url` - Optional banner/ad image URL
  - `cta_label` - Call-to-action button label (optional)
  - `cta_url` - Call-to-action link (optional)
  - `target_type` - Who sees it: 'all', 'quest', 'challenge', 'project', 'community'
  - `target_id` - UUID of the targeted quest/challenge/project (null for 'all')
  - `target_label` - Human-readable label for the target
  - `starts_at` - When the announcement becomes visible
  - `ends_at` - When the announcement expires (null = no expiry)
  - `priority` - Higher priority shows first
  - `is_active` - Soft enable/disable toggle
  - `created_by` - Author reference
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled
  - Authenticated users can read active, non-expired announcements
  - Only admins/moderators can write
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  target_type text NOT NULL DEFAULT 'all',
  target_id uuid,
  target_label text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

CREATE POLICY "Admins can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_type, target_id);
