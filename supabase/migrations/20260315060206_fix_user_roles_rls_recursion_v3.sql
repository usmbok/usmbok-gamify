
/*
  # Fix user_roles RLS infinite recursion

  ## Problem
  The SELECT policy on user_roles calls is_admin(), which queries user_roles,
  which triggers the SELECT policy again — infinite recursion.
  Supabase GoTrue returns "Database error querying schema" as a result.

  ## Fix
  - Replace the recursive SELECT policy with a direct uid check for own-row access
  - Recreate the is_admin function as SECURITY DEFINER so it bypasses RLS
    when called from within itself (preventing the loop)
  - Keep admin-view-all policy but it is now safe because is_admin bypasses RLS

  ## Changes
  - Drop recursive policies on user_roles
  - Add "Users can view own role" policy (direct, no recursion)
  - Recreate is_admin with SECURITY DEFINER + SET search_path to prevent recursion
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

-- Replace is_admin with a version that sets search_path and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

-- Non-recursive: users can read their own role directly
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all roles — safe now because is_admin is SECURITY DEFINER (bypasses RLS)
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admin insert
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Admin delete
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
