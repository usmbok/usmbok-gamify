/*
  # Restrict user-sent messages to admin recipients only

  ## Changes
  - Drop the previous broad INSERT policy that allowed users to send to anyone
  - Replace with a tighter policy that only allows sending when the target_user_id is an admin
  - Replace recipient INSERT policy to only allow delivering messages whose target is an admin

  ## Security
  - Users can only create messages where target_user_id has an admin role
  - Users can only add recipients for those admin-targeted messages
*/

DROP POLICY IF EXISTS "authenticated_users_can_send_messages" ON admin_messages;
DROP POLICY IF EXISTS "authenticated_users_can_add_recipients_for_own_messages" ON admin_message_recipients;

CREATE POLICY "authenticated_users_can_send_messages_to_admins"
  ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sent_by
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = target_user_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "authenticated_users_can_add_recipients_for_admin_messages"
  ON admin_message_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_messages am
      WHERE am.id = message_id
        AND am.sent_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = am.target_user_id
            AND ur.role = 'admin'
        )
    )
  );
