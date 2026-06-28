/*
  # Add Image Library, Quest Predecessor/Successor Links, and Email Footer Templates

  ## New Tables

  ### image_library
  Stores uploaded images for use in announcements and email templates.
  - id (uuid, pk)
  - name (text) — friendly name / filename
  - storage_path (text) — path inside the Supabase storage bucket
  - public_url (text) — publicly accessible URL
  - mime_type (text)
  - file_size (integer, bytes)
  - alt_text (text, nullable)
  - uploaded_by (uuid FK auth.users)
  - created_at (timestamptz)

  ### email_footer_templates
  Stores reusable footer HTML that is appended to email templates.
  - id (uuid, pk)
  - name (text) — e.g. "Default Footer"
  - html_content (text) — full HTML of footer
  - is_default (boolean) — if true, auto-applied to new templates
  - is_active (boolean)
  - created_by (uuid FK auth.users)
  - created_at, updated_at (timestamptz)

  ## Modified Tables

  ### quests
  - predecessor_quest_id (uuid, nullable FK quests.id) — the quest that must be completed before this one
  - successor_quest_id (uuid, nullable FK quests.id) — the quest that unlocks after this one

  ### email_templates
  - footer_template_id (uuid, nullable FK email_footer_templates.id)

  ## Security
  - RLS enabled on both new tables
  - Authenticated users can read; admins/moderators can write
*/

-- ─── image_library ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS image_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  file_size integer NOT NULL DEFAULT 0,
  alt_text text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE image_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view image library"
  ON image_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert images"
  ON image_library FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete images"
  ON image_library FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- ─── email_footer_templates ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_footer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_footer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view footers"
  ON email_footer_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert footers"
  ON email_footer_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update footers"
  ON email_footer_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete footers"
  ON email_footer_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Seed a default footer
INSERT INTO email_footer_templates (name, html_content, is_default, is_active)
VALUES (
  'Default Footer',
  '<div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;text-align:center"><p style="margin:0 0 8px"><strong style="color:#6b7280">USMBOK Gamify</strong> &mdash; Engagement &amp; Recognition Platform</p><p style="margin:0 0 8px">&copy; {{year}} USMBOK. All rights reserved.</p><p style="margin:0"><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a> &nbsp;|&nbsp; <a href="{{preferences_url}}" style="color:#6b7280;text-decoration:underline">Email Preferences</a></p></div>',
  true,
  true
);

-- ─── quests: add predecessor / successor ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'predecessor_quest_id'
  ) THEN
    ALTER TABLE quests ADD COLUMN predecessor_quest_id uuid REFERENCES quests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'successor_quest_id'
  ) THEN
    ALTER TABLE quests ADD COLUMN successor_quest_id uuid REFERENCES quests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── email_templates: add footer_template_id ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'footer_template_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN footer_template_id uuid REFERENCES email_footer_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure anon can also read footers and image_library (bypass mode support)
CREATE POLICY "Anon can view image library"
  ON image_library FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can view footers"
  ON email_footer_templates FOR SELECT
  TO anon
  USING (true);

-- Storage bucket for image library (if not already created)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image-library',
  'image-library',
  true,
  5242880,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;
