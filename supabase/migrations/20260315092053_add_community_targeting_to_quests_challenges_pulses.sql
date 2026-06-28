/*
  # Add Community Targeting to Quests, Challenges, and Pulses

  ## Summary
  Adds a `target_community_ids` array column to the quests, challenges, and pulses
  tables so an admin can target content at one or more specific communities.
  An empty/null array means the record is visible to everyone (no restriction).

  ## Changes

  ### quests
  - `target_community_ids` (uuid[]) — optional list of community IDs this quest targets

  ### challenges
  - `target_community_ids` (uuid[]) — optional list of community IDs this challenge targets

  ### pulses
  - `target_community_ids` (uuid[]) — optional list of community IDs this pulse targets

  ## Notes
  - NULL or empty array = global / no community restriction
  - No RLS changes needed; existing policies remain intact
  - GIN indexes added for efficient array querying
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'target_community_ids'
  ) THEN
    ALTER TABLE quests ADD COLUMN target_community_ids uuid[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'target_community_ids'
  ) THEN
    ALTER TABLE challenges ADD COLUMN target_community_ids uuid[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulses' AND column_name = 'target_community_ids'
  ) THEN
    ALTER TABLE pulses ADD COLUMN target_community_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quests_target_community_ids ON quests USING GIN (target_community_ids);
CREATE INDEX IF NOT EXISTS idx_challenges_target_community_ids ON challenges USING GIN (target_community_ids);
CREATE INDEX IF NOT EXISTS idx_pulses_target_community_ids ON pulses USING GIN (target_community_ids);
