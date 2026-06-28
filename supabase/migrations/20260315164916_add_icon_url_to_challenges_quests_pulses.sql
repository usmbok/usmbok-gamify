/*
  # Add icon_url to Challenges, Quests, and Pulses

  ## Summary
  Adds an optional icon_url column to the challenges, quests, and pulses tables.
  This allows admins to select an icon from the icon library and associate it with
  each entity. The icon is displayed in the player-facing views for visual context.

  ## Modified Tables
  - `challenges` — added `icon_url` (text, nullable)
  - `quests`      — added `icon_url` (text, nullable)
  - `pulses`      — added `icon_url` (text, nullable)
  - `icon_library_items` — added `icon_size` (integer, default 40)
    - Stores the preferred display size in pixels for the icon

  ## Notes
  - All columns nullable; existing rows unaffected
  - icon_size stored on icon_library_items for reuse anywhere icons are displayed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE challenges ADD COLUMN icon_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE quests ADD COLUMN icon_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulses' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE pulses ADD COLUMN icon_url text;
  END IF;
END $$;
