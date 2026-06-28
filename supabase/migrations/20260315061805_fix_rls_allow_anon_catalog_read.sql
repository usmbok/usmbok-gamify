/*
  # Fix RLS Policies — Allow Anonymous/Bypass Read Access to Catalog Tables

  The dev bypass mode has no auth session, so all RLS-protected tables return
  empty results. This migration adds anon-readable SELECT policies to all
  catalog/public-facing tables so the app works without login.

  Changes:
  - badges: allow anon SELECT on active badges
  - quests: allow anon SELECT on active quests
  - challenges: allow anon SELECT on active challenges
  - rewards_catalog: allow anon SELECT on active rewards
  - reward_items: allow anon SELECT on active reward items
  - profiles: already has USING (true) — ensure it allows anon too
  - leaderboard_records: already has USING (true) — ensure anon access
  - user_badges: add policy for viewing all earned badges (needed for leaderboard/badges views)
  - levels: add SELECT policy so level data is always readable
  - activity_types: add SELECT policy
  - industry_sectors: add SELECT policy
  - campaigns: add SELECT policy
*/

-- Badges: allow anon to view active badges
DROP POLICY IF EXISTS "Users can view badges" ON public.badges;
CREATE POLICY "Anyone can view active badges"
  ON public.badges FOR SELECT
  USING (is_active = true);

-- Quests: allow anon to view active quests
DROP POLICY IF EXISTS "Users can view active quests" ON public.quests;
CREATE POLICY "Anyone can view active quests"
  ON public.quests FOR SELECT
  USING (status = 'active');

-- Challenges: allow anon to view active challenges
DROP POLICY IF EXISTS "Users can view active challenges" ON public.challenges;
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true);

-- Rewards catalog: allow anon to view
DROP POLICY IF EXISTS "Anyone authenticated can view active rewards" ON public.rewards_catalog;
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards_catalog FOR SELECT
  USING (is_active = true);

-- Reward items: allow anon to view
DROP POLICY IF EXISTS "Anyone can view active reward items" ON public.reward_items;
CREATE POLICY "Anyone can view active reward items"
  ON public.reward_items FOR SELECT
  USING (is_active = true);

-- Profiles: ensure anon can read all profiles (for leaderboard)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Anyone can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Leaderboard records: already USING (true) but re-create to be safe
DROP POLICY IF EXISTS "Users can view leaderboard records" ON public.leaderboard_records;
CREATE POLICY "Anyone can view leaderboard records"
  ON public.leaderboard_records FOR SELECT
  USING (true);

-- User badges: allow anyone to view all earned badges (for badges view, leaderboard, etc.)
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
CREATE POLICY "Anyone can view earned badges"
  ON public.user_badges FOR SELECT
  USING (true);

-- Levels: add read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='levels' AND policyname='Anyone can view levels'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view levels" ON public.levels FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.levels ENABLE ROW LEVEL SECURITY;

-- Activity types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activity_types' AND policyname='Anyone can view activity types'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view activity types" ON public.activity_types FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.activity_types ENABLE ROW LEVEL SECURITY;

-- Industry sectors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='industry_sectors' AND policyname='Anyone can view industry sectors'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view industry sectors" ON public.industry_sectors FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.industry_sectors ENABLE ROW LEVEL SECURITY;

-- Campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='Anyone can view active campaigns'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;

-- Quest steps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quest_steps' AND policyname='Anyone can view quest steps'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view quest steps" ON public.quest_steps FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.quest_steps ENABLE ROW LEVEL SECURITY;

-- Badge constellations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='badge_constellations' AND policyname='Anyone can view badge constellations'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view badge constellations" ON public.badge_constellations FOR SELECT USING (true)';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.badge_constellations ENABLE ROW LEVEL SECURITY;
