/*
  # Add Badge Rewards and Constellation Cover

  Adds missing columns to support badge management features:

  1. badges table
    - `points_reward` (integer, default 0) - points awarded when badge is earned
    - `xp_reward` (integer, default 0) - XP awarded when badge is earned

  2. badge_constellations table
    - `cover_image_url` (text, nullable) - optional cover image for the constellation folder
    - `sort_order` (integer, default 0) - controls display order of constellations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'points_reward'
  ) THEN
    ALTER TABLE badges ADD COLUMN points_reward integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'xp_reward'
  ) THEN
    ALTER TABLE badges ADD COLUMN xp_reward integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badge_constellations' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE badge_constellations ADD COLUMN cover_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badge_constellations' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE badge_constellations ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;
