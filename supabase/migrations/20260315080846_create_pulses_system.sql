/*
  # Pulses System

  ## Summary
  A "Pulse" is a focused community poll — a short question posted by admins or users
  with 2–6 multiple-choice answers. Subscribers vote on the choices (one vote per user
  per Pulse), and the results shape the USMBOK reference. Users earn points for
  submitting Pulse ideas. Every Pulse goes through a lifecycle:
    draft → under_review → published → closed → archived

  ## New Tables

  ### `pulses`
  The poll header. Admin-published only after review.
  - `id`, `question`, `description`, `category`, `status`, `points_reward`
    (awarded to submitter when published), `submitted_by`, `admin_notes`,
    `published_at`, `closes_at`, `created_at`, `updated_at`

  ### `pulse_choices`
  The answer options for each Pulse (2–6 per Pulse).
  - `id`, `pulse_id`, `label`, `display_order`, `vote_count` (denormalised)

  ### `pulse_votes`
  One row per user per Pulse — records which choice they picked.
  Changing vote: delete old row, insert new. No negative votes.
  - `id`, `pulse_id`, `choice_id`, `user_id`, `created_at`
  - UNIQUE(pulse_id, user_id) — one vote per user per Pulse

  ## Triggers
  - Keep `pulse_choices.vote_count` in sync on INSERT/DELETE of pulse_votes
  - Auto-stamp `pulses.updated_at`

  ## Security
  - RLS on all three tables
  - Authenticated users can read published/closed pulses and their choices
  - Users can submit pulse ideas (draft status)
  - Users can cast/change votes on published pulses
  - Only service_role can update pulse status (admin flow via edge function or direct)
*/

-- ─── pulses ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question       text NOT NULL,
  description    text,
  category       text NOT NULL DEFAULT 'general',
  status         text NOT NULL DEFAULT 'draft',
  points_reward  integer NOT NULL DEFAULT 0,
  submitted_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes    text,
  published_at   timestamptz,
  closes_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pulses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulses_select_published"
  ON pulses FOR SELECT
  TO authenticated
  USING (status IN ('published', 'closed', 'archived'));

CREATE POLICY "pulses_select_own_draft"
  ON pulses FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

CREATE POLICY "pulses_insert"
  ON pulses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by AND status = 'draft');

CREATE POLICY "pulses_update_own_draft"
  ON pulses FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by AND status = 'draft')
  WITH CHECK (auth.uid() = submitted_by);

-- ─── pulse_choices ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_choices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id      uuid NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  label         text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  vote_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pulse_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_choices_select"
  ON pulse_choices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pulses
      WHERE pulses.id = pulse_choices.pulse_id
        AND (pulses.status IN ('published', 'closed', 'archived') OR pulses.submitted_by = auth.uid())
    )
  );

CREATE POLICY "pulse_choices_insert_own"
  ON pulse_choices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pulses
      WHERE pulses.id = pulse_choices.pulse_id
        AND pulses.submitted_by = auth.uid()
        AND pulses.status = 'draft'
    )
  );

-- ─── pulse_votes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id   uuid NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  choice_id  uuid NOT NULL REFERENCES pulse_choices(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pulse_id, user_id)
);

ALTER TABLE pulse_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_votes_select"
  ON pulse_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pulse_votes_insert"
  ON pulse_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM pulses WHERE pulses.id = pulse_votes.pulse_id AND pulses.status = 'published'
    )
  );

CREATE POLICY "pulse_votes_delete"
  ON pulse_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── trigger: sync choice vote_count ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_pulse_choice_vote_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pulse_choices SET vote_count = vote_count + 1 WHERE id = NEW.choice_id;
    UPDATE pulses SET updated_at = now() WHERE id = NEW.pulse_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pulse_choices SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.choice_id;
    UPDATE pulses SET updated_at = now() WHERE id = OLD.pulse_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_votes_count ON pulse_votes;
CREATE TRIGGER trg_pulse_votes_count
  AFTER INSERT OR DELETE ON pulse_votes
  FOR EACH ROW EXECUTE FUNCTION sync_pulse_choice_vote_count();

-- ─── trigger: updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_pulses_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulses_updated_at ON pulses;
CREATE TRIGGER trg_pulses_updated_at
  BEFORE UPDATE ON pulses
  FOR EACH ROW EXECUTE FUNCTION touch_pulses_updated_at();

-- ─── indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pulses_status ON pulses (status);
CREATE INDEX IF NOT EXISTS idx_pulses_published_at ON pulses (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_choices_pulse ON pulse_choices (pulse_id, display_order);
CREATE INDEX IF NOT EXISTS idx_pulse_votes_pulse ON pulse_votes (pulse_id);
CREATE INDEX IF NOT EXISTS idx_pulse_votes_user ON pulse_votes (user_id);
