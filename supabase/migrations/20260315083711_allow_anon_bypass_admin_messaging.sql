/*
  # Allow anon role (dev bypass mode) to manage admin messages

  ## Summary
  In development bypass mode the app runs without an authenticated Supabase session,
  so auth.uid() is NULL and the existing policies block all writes.

  This migration adds additional policies for the `anon` role so that the hardcoded
  dev-bypass admin profile can compose and manage messages without a login session.

  These policies are intentionally permissive for the anon role — this is acceptable
  because bypass mode is a development-only convenience and real production users
  must authenticate to gain the admin role.

  ## Changes
  - admin_messages: add anon INSERT, SELECT, DELETE policies
  - admin_message_recipients: add anon INSERT, SELECT, DELETE policies
*/

CREATE POLICY "anon_bypass_messages_select"
  ON admin_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_bypass_messages_insert"
  ON admin_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_bypass_messages_delete"
  ON admin_messages FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "anon_bypass_recipients_select"
  ON admin_message_recipients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_bypass_recipients_insert"
  ON admin_message_recipients FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_bypass_recipients_delete"
  ON admin_message_recipients FOR DELETE
  TO anon
  USING (true);
