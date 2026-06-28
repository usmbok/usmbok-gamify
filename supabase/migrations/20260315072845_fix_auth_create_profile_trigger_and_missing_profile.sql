/*
  # Fix Authentication: Auto-Profile Trigger + Missing Profile Repair

  ## Problem
  When a user signs up via supabase.auth.signUp(), a record is created in auth.users
  but NO corresponding row is inserted into the public.profiles table. Every subsequent
  database query that JOIN or filter on profiles.id returns null/error for those users.

  ## Changes

  ### 1. Auto-profile creation trigger
  Creates a PostgreSQL function `handle_new_user()` that fires AFTER INSERT on auth.users.
  It reads full_name and username from raw_user_meta_data and inserts a minimal profile row
  with sensible defaults (level 1, 0 points, 0 XP).

  ### 2. Auto user_roles insertion
  Adds a second function `handle_new_user_role()` that fires AFTER the profile is created
  to assign the default 'user' role in user_roles.

  ### 3. Repair existing orphaned users
  Inserts a profile for any auth.users row that does not yet have a profiles entry.
  Also assigns them the 'user' role if missing.

  ## Important Notes
  - The trigger uses SECURITY DEFINER so it can bypass RLS and write to profiles
  - raw_user_meta_data fields: full_name, username (set in supabase.auth.signUp options.data)
  - Defaults: current_level=1, total_points=0, total_xp=0, reputation_score=0
  - Username fallback: email prefix (everything before @)
*/

-- ─── 1. Function to auto-create profile on new auth user ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    current_level,
    total_points,
    total_xp,
    reputation_score
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    1,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ─── 2. Trigger: fire after every new auth user insert ────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── 3. Function to auto-assign 'user' role after profile created ─────────────

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- ─── 4. Repair any existing auth users with no profile ────────────────────────

INSERT INTO public.profiles (
  id,
  username,
  full_name,
  current_level,
  total_points,
  total_xp,
  reputation_score
)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(u.email, '@', 1)
  ),
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(u.email, '@', 1)
  ),
  1,
  0,
  0,
  0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Repair user_roles for any profile without a role entry ────────────────

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;
