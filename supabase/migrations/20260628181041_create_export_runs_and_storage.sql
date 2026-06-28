
-- Storage bucket for exported ZIP files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  true,
  104857600, -- 100 MB
  ARRAY['application/zip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the exports bucket
CREATE POLICY "exports_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'exports');

CREATE POLICY "exports_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "exports_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Table to track export history
CREATE TABLE IF NOT EXISTS export_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    text NOT NULL,
  storage_path text NOT NULL,
  public_url  text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  entity_counts   jsonb NOT NULL DEFAULT '{}',
  asset_counts    jsonb NOT NULL DEFAULT '{}',
  exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  notes       text
);

ALTER TABLE export_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_runs_select_admin" ON export_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "export_runs_insert_admin" ON export_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "export_runs_update_admin" ON export_runs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "export_runs_delete_admin" ON export_runs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
