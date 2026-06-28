/*
  # Allow authenticated users to send messages (replies)

  ## Changes
  - Add INSERT policy on `admin_messages` for authenticated users (sent_by = their own id)
  - Add INSERT policy on `admin_message_recipients` for authenticated users sending their own messages
  
  ## Security
  - Users can only insert messages where sent_by matches their own auth.uid()
  - Users can only insert recipients for messages they created
*/

CREATE POLICY "authenticated_users_can_send_messages"
  ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "authenticated_users_can_add_recipients_for_own_messages"
  ON admin_message_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_messages am
      WHERE am.id = message_id
        AND am.sent_by = auth.uid()
    )
  );
