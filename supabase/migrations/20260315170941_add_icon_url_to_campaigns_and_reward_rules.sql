/*
  # Add icon_url and icon_size to campaigns and reward_rules

  1. Modified Tables
    - `campaigns` — adds icon_url (text, nullable) and icon_size (int, default 40)
    - `reward_rules` — adds icon_url (text, nullable) and icon_size (int, default 40)

  2. Notes
    - Mirrors the same columns already present on challenges, quests, and pulses
    - Safe additive migration using IF NOT EXISTS checks
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN icon_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'icon_size'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN icon_size integer NOT NULL DEFAULT 40;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reward_rules' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE reward_rules ADD COLUMN icon_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reward_rules' AND column_name = 'icon_size'
  ) THEN
    ALTER TABLE reward_rules ADD COLUMN icon_size integer NOT NULL DEFAULT 40;
  END IF;
END $$;
