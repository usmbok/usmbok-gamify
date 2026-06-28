/*
  # Create Icon Library Storage Bucket

  ## Summary
  Creates a dedicated Supabase Storage bucket for the Icon Library feature, which allows
  admins to upload and manage icons used in challenges, quests, and pulses.

  ## Bucket Configuration
  - **Bucket name:** `icon-library`
  - **Public:** true (icons are publicly readable for use in designs)
  - **File size limit:** 2 MB per file
  - **Allowed MIME types:** PNG, JPEG, SVG, WebP

  ## New Tables
  - `icon_library_items`
    - `id` (uuid, primary key)
    - `name` (text) — display name derived from filename
    - `filename` (text) — original filename for reference
    - `storage_path` (text) — path in the icon-library bucket
    - `url` (text) — public URL
    - `tags` (text[]) — optional tags for filtering
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled on `icon_library_items`
  - Public SELECT (icons are visible to all authenticated users for use in designs)
  - Admin-only INSERT, UPDATE, DELETE (via user_roles check)
  - Storage policies mirror badge-icons pattern: public read, admin write
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'icon-library',
  'icon-library',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read icon library"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'icon-library');

CREATE POLICY "Admins can upload icon library"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'icon-library' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update icon library"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'icon-library' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete icon library"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'icon-library' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS icon_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE icon_library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view icon library items"
  ON icon_library_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert icon library items"
  ON icon_library_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update icon library items"
  ON icon_library_items FOR UPDATE
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

CREATE POLICY "Admins can delete icon library items"
  ON icon_library_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
