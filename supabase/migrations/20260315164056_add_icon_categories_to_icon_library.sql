/*
  # Add Icon Categories to Icon Library

  ## Summary
  Adds a categories system to the icon library, mirroring how badge constellations
  work for badges. Icons can be assigned to a category (folder) for organization.

  ## New Tables
  - `icon_categories`
    - `id` (uuid, primary key)
    - `name` (text, unique) — category display name
    - `description` (text, optional)
    - `sort_order` (integer, default 0)
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)

  ## Modified Tables
  - `icon_library_items`
    - Added `category_id` (uuid, nullable FK → icon_categories)

  ## Security
  - RLS enabled on `icon_categories`
  - Authenticated users can SELECT (read) categories
  - Admin-only INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS icon_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT icon_categories_name_unique UNIQUE (name)
);

ALTER TABLE icon_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view icon categories"
  ON icon_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert icon categories"
  ON icon_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update icon categories"
  ON icon_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete icon categories"
  ON icon_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'icon_library_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE icon_library_items
      ADD COLUMN category_id uuid REFERENCES icon_categories(id) ON DELETE SET NULL;
  END IF;
END $$;
