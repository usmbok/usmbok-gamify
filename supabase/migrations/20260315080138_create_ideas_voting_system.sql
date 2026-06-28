/*
  # Ideas & Voting System

  ## Summary
  Creates a community-driven ideas board where users can submit improvement ideas
  and vote them up (or retract their vote back to zero). Ideas are ranked by vote
  count to form a live leaderboard. Top ideas can be converted into challenges,
  and contributors earn rewards for participation.

  ## New Tables

  ### `ideas`
  - `id`, `title`, `description`, `submitted_by`, `category`, `status`,
    `vote_count`, `points_awarded`, `linked_challenge_id`, `admin_notes`,
    `created_at`, `updated_at`

  ### `idea_votes`
  - One row per active vote. UNIQUE(idea_id, user_id).
  - Deleting the row retracts the vote (back to zero — no negative votes).

  ## Security
  - RLS on both tables; authenticated-only access.
*/

-- ─── ideas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ideas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  submitted_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category            text NOT NULL DEFAULT 'other',
  status              text NOT NULL DEFAULT 'open',
  vote_count          integer NOT NULL DEFAULT 0,
  points_awarded      integer NOT NULL DEFAULT 0,
  linked_challenge_id uuid REFERENCES challenges(id) ON DELETE SET NULL,
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas_select"
  ON ideas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ideas_insert"
  ON ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "ideas_update_own_open"
  ON ideas FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by AND status = 'open')
  WITH CHECK (auth.uid() = submitted_by);

-- ─── idea_votes ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idea_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_votes_select"
  ON idea_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "idea_votes_insert"
  ON idea_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "idea_votes_delete"
  ON idea_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── trigger: keep vote_count in sync ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_idea_vote_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ideas SET vote_count = vote_count + 1, updated_at = now() WHERE id = NEW.idea_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ideas SET vote_count = GREATEST(vote_count - 1, 0), updated_at = now() WHERE id = OLD.idea_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_idea_votes_count ON idea_votes;
CREATE TRIGGER trg_idea_votes_count
  AFTER INSERT OR DELETE ON idea_votes
  FOR EACH ROW EXECUTE FUNCTION sync_idea_vote_count();

-- ─── updated_at auto-stamp ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_ideas_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ideas_updated_at ON ideas;
CREATE TRIGGER trg_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION touch_ideas_updated_at();

-- ─── indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ideas_vote_count ON ideas (vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas (status);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea ON idea_votes (idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user ON idea_votes (user_id);
