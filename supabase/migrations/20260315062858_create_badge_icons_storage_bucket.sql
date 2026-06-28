/*
  # Create badge-icons Storage Bucket

  Sets up a public Supabase Storage bucket for badge icon images.

  1. Bucket
     - Name: badge-icons
     - Public: true (icons are public assets)
     - Allowed MIME types: image/png, image/jpeg, image/svg+xml, image/webp
     - Max file size: 2MB

  2. Storage Policies
     - Anyone can read/view badge icons (public bucket)
     - Only authenticated admins can upload, update, delete icons
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'badge-icons',
  'badge-icons',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

CREATE POLICY "Public can view badge icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'badge-icons');

CREATE POLICY "Admins can upload badge icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'badge-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update badge icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'badge-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete badge icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'badge-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
