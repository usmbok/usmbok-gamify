/*
  # Add icon_size column to challenges, quests, and pulses

  ## Summary
  The previous migration added icon_url but missed the icon_size column.
  This migration adds icon_size (integer, default 40) to all three tables
  so admins can control the display size of the associated icon.

  ## Modified Tables
  - `challenges` — added `icon_size` (integer, default 40)
  - `quests`      — added `icon_size` (integer, default 40)
  - `pulses`      — added `icon_size` (integer, default 40)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'icon_size'
  ) THEN
    ALTER TABLE challenges ADD COLUMN icon_size integer DEFAULT 40;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'icon_size'
  ) THEN
    ALTER TABLE quests ADD COLUMN icon_size integer DEFAULT 40;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulses' AND column_name = 'icon_size'
  ) THEN
    ALTER TABLE pulses ADD COLUMN icon_size integer DEFAULT 40;
  END IF;
END $$;
