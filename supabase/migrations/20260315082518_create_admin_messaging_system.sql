/*
  # Admin Messaging System

  ## Summary
  Enables admins to send messages to individual users, community groups, or broadcast to all users.
  Each message delivery is tracked per-recipient so read/unread state is per-user.

  ## New Tables

  ### `admin_messages`
  Master message record created by an admin.
  - id, subject, body, priority (normal|high|alert), send_type (individual|community|broadcast)
  - target_user_id (null unless individual), target_community_id (null unless community)
  - sent_by (profile id of sender), created_at

  ### `admin_message_recipients`
  One row per actual recipient of a message.
  - id, message_id, recipient_id, is_read, read_at, created_at

  ## Security
  - Admins (role = 'admin') can insert messages and read all recipient rows
  - Users can only see and update their own recipient rows

  ## Indexes
  - Fast lookup by recipient + unread status (for badge count)
*/

CREATE TABLE IF NOT EXISTS admin_messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject              text NOT NULL,
  body                 text NOT NULL,
  priority             text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'alert')),
  send_type            text NOT NULL DEFAULT 'individual' CHECK (send_type IN ('individual', 'community', 'broadcast')),
  target_user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_community_id  uuid,
  sent_by              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_message_recipients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES admin_messages(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_read       boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, recipient_id)
);

ALTER TABLE admin_message_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_messages_select"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_message_recipients amr
      WHERE amr.message_id = admin_messages.id
      AND amr.recipient_id = auth.uid()
    )
  );

CREATE POLICY "admin_messages_insert"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "admin_messages_delete"
  ON admin_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "msg_recipients_select"
  ON admin_message_recipients FOR SELECT
  TO authenticated
  USING (
    auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "msg_recipients_insert"
  ON admin_message_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "msg_recipients_update_own"
  ON admin_message_recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "msg_recipients_delete_admin"
  ON admin_message_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_amr_recipient_unread ON admin_message_recipients(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_amr_message_id ON admin_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);
