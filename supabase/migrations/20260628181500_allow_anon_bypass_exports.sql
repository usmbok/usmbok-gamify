-- Allow anon role (dev bypass mode) to write exports and read history

-- Storage bucket policies for anon
CREATE POLICY "exports_select_anon"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'exports');

CREATE POLICY "exports_insert_anon"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'exports');

CREATE POLICY "exports_delete_anon"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'exports');

-- export_runs table policies for anon
CREATE POLICY "export_runs_select_anon" ON export_runs FOR SELECT
  TO anon USING (true);

CREATE POLICY "export_runs_insert_anon" ON export_runs FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "export_runs_update_anon" ON export_runs FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "export_runs_delete_anon" ON export_runs FOR DELETE
  TO anon USING (true);
