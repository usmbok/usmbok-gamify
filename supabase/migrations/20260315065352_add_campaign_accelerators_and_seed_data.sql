/*
  # Add Campaign Accelerator Mechanics

  ## Overview
  Extends the campaigns table with "motivational accelerator" reward mechanics:
  if a participant completes a campaign objective *before* the target/end date,
  they earn bonus points and an elevated multiplier.

  ## Changes to campaigns table
  - `early_completion_multiplier` (numeric) – additional multiplier stacked on top of the base when completed early
  - `early_completion_bonus_points` (integer) – flat bonus points awarded for early completion
  - `early_target_date` (timestamptz) – the deadline that defines "early"; defaults to end_date
  - `objective_description` (text) – plain-English description of what must be completed
  - `campaign_type` (text) – categorises the campaign: 'points_boost' | 'xp_sprint' | 'early_bird' | 'streak' | 'milestone'

  ## New Example Campaigns (seeded)
  Three campaigns with scheduled_events entries so they appear on the calendar.

  ## Security
  No new tables; existing campaigns/scheduled_events RLS policies cover this.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'early_completion_multiplier'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN early_completion_multiplier numeric NOT NULL DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'early_completion_bonus_points'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN early_completion_bonus_points integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'early_target_date'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN early_target_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'objective_description'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN objective_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'campaign_type'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN campaign_type text NOT NULL DEFAULT 'points_boost'
      CHECK (campaign_type IN ('points_boost', 'xp_sprint', 'early_bird', 'streak', 'milestone'));
  END IF;
END $$;

DO $$
DECLARE
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
BEGIN
  INSERT INTO campaigns (
    id, name, description, objective_description, campaign_type,
    start_date, end_date, early_target_date,
    points_multiplier, xp_multiplier,
    early_completion_multiplier, early_completion_bonus_points,
    is_active
  ) VALUES
  (
    c1,
    'Q2 Innovation Sprint',
    'Celebrate Q2 by recognising innovative contributions across all teams.',
    'Submit at least one innovation idea or complete 3 knowledge-share activities.',
    'early_bird',
    now() + interval '2 days',
    now() + interval '32 days',
    now() + interval '14 days',
    2.0, 2.0, 3.0, 500,
    true
  ),
  (
    c2,
    'Spring Learning Blitz',
    'A 3-week sprint to rack up learning credits and boost your XP score before the mid-year review.',
    'Complete 5 learning activities or finish 2 active quests.',
    'xp_sprint',
    now() + interval '5 days',
    now() + interval '26 days',
    now() + interval '17 days',
    1.5, 3.0, 1.5, 300,
    true
  ),
  (
    c3,
    'Community Wellness Month',
    'A month-long community challenge celebrating healthy habits and team camaraderie.',
    'Log a wellness activity every day for 14 consecutive days.',
    'streak',
    now() + interval '1 days',
    now() + interval '31 days',
    now() + interval '21 days',
    1.5, 1.5, 2.0, 250,
    true
  ),
  (
    c4,
    'Year-End Milestone Push',
    'Close out the year strong — hit your personal XP milestone and earn exclusive end-of-year recognition.',
    'Reach 5,000 total XP before the campaign closes.',
    'milestone',
    now() + interval '7 days',
    now() + interval '45 days',
    now() + interval '30 days',
    1.0, 2.5, 2.0, 750,
    true
  );

  INSERT INTO scheduled_events (
    event_type, campaign_id, start_date, end_date, timezone, auto_activate, auto_close, is_active
  ) VALUES
  ('campaign', c1, now() + interval '2 days', now() + interval '32 days', 'UTC', true, true, true),
  ('campaign', c2, now() + interval '5 days', now() + interval '26 days', 'UTC', true, true, true),
  ('campaign', c3, now() + interval '1 days', now() + interval '31 days', 'UTC', true, true, true),
  ('campaign', c4, now() + interval '7 days', now() + interval '45 days', 'UTC', true, true, true);
END $$;
