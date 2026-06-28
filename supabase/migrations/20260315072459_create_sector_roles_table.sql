/*
  # Create sector_roles table

  ## New Tables
  - `sector_roles`
    - `id` (uuid, primary key)
    - `sector_id` (uuid, FK to industry_sectors)
    - `name` (text, not null)
    - `description` (text, nullable)
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)
    - `created_by` (uuid, nullable FK to auth.users)

  ## Security
  - Enable RLS
  - Authenticated users can read all sector roles
  - Admins (role admin or moderator in user_roles) can insert/update/delete
*/

CREATE TABLE IF NOT EXISTS sector_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES industry_sectors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sector_roles_sector_idx ON sector_roles(sector_id);

ALTER TABLE sector_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sector roles"
  ON sector_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sector roles"
  ON sector_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update sector roles"
  ON sector_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete sector roles"
  ON sector_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );
