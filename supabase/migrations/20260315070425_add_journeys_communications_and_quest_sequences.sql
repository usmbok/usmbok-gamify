/*
  # Journeys, Communications, and Quest Sequences

  ## Summary
  This migration adds three major capabilities:

  1. **Quest Journeys (Chaining)**
     - New `journeys` table: a named sequence of quests
     - New `journey_quests` table: links quests to a journey with a `sequence_order`
     - `user_journey_progress` tracks each player's place in a journey

  2. **Email Templates**
     - `email_templates` table: reusable HTML/text email templates with subject, body, variables

  3. **Email Schedules**
     - `email_schedules` table: schedule a template to be sent on a date or immediately
     - Tracks status: draft, scheduled, sending, sent, cancelled

  ## Security
  - RLS enabled on all new tables
  - Admin-only write access (role check via user_roles)
  - Authenticated users can read journeys
*/

-- ─── Journeys ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  narrative text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active journeys"
  ON journeys FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert journeys"
  ON journeys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update journeys"
  ON journeys FOR UPDATE
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

CREATE POLICY "Admins can delete journeys"
  ON journeys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ─── Journey Quests (sequence linking) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS journey_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  sequence_order integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT true,
  unlock_condition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(journey_id, quest_id)
);

ALTER TABLE journey_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journey quests"
  ON journey_quests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert journey quests"
  ON journey_quests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update journey quests"
  ON journey_quests FOR UPDATE
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

CREATE POLICY "Admins can delete journey quests"
  ON journey_quests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ─── User Journey Progress ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_journey_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  current_sequence_order integer NOT NULL DEFAULT 1,
  completed_quest_ids uuid[] NOT NULL DEFAULT '{}',
  is_completed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, journey_id)
);

ALTER TABLE user_journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journey progress"
  ON user_journey_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey progress"
  ON user_journey_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journey progress"
  ON user_journey_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Email Templates ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text,
  template_type text NOT NULL DEFAULT 'general',
  variables jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
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

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ─── Email Schedules ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  recipient_type text NOT NULL DEFAULT 'all',
  recipient_filter jsonb,
  subject_override text,
  scheduled_at timestamptz,
  send_immediately boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  sent_count integer,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email schedules"
  ON email_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can insert email schedules"
  ON email_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update email schedules"
  ON email_schedules FOR UPDATE
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

CREATE POLICY "Admins can delete email schedules"
  ON email_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_journey_quests_journey_id ON journey_quests(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_quests_quest_id ON journey_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_journey_quests_sequence ON journey_quests(journey_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_user ON user_journey_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_journey ON user_journey_progress(journey_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON email_schedules(scheduled_at);
