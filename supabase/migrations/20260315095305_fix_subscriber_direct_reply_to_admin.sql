/*
  # Fix subscriber direct reply to admin

  ## Problem
  Subscribers could not reply to admin messages because:
  1. admin_messages INSERT: there were two policies — one only allowing admins, one allowing
     authenticated users when target is admin. Both must coexist (OR semantics).
  2. admin_message_recipients INSERT: the admin-only policy (msg_recipients_insert) blocked
     subscribers from adding the admin as a recipient on their own reply message.

  ## Changes
  - Keep the admin-only INSERT policy on admin_messages (for broadcasts etc.)
  - Keep the subscriber-to-admin policy on admin_messages
  - Fix the recipient INSERT: allow authenticated users to add a recipient when:
      a) The message was sent by themselves (auth.uid() = sent_by), AND
      b) The recipient being added is the same admin as the target_user_id on that message
  - This means a subscriber reply goes to exactly one admin — no user-to-user messaging possible

  ## Security
  - A subscriber can only add a recipient that is an admin AND matches the target_user_id of their own message
  - Admins retain full access to insert recipients for any message
*/

DROP POLICY IF EXISTS "authenticated_users_can_add_recipients_for_admin_messages" ON admin_message_recipients;

CREATE POLICY "subscribers_can_add_admin_recipient_for_own_reply"
  ON admin_message_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_messages am
      WHERE am.id = message_id
        AND am.sent_by = auth.uid()
        AND am.target_user_id = recipient_id
        AND EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = am.target_user_id
            AND ur.role = 'admin'
        )
    )
  );
