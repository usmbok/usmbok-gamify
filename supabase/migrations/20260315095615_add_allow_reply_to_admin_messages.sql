/*
  # Add allow_reply flag to admin_messages

  ## Summary
  Adds an optional reply permission flag to admin messages so admins can
  explicitly enable 1-to-1 replies from recipients on a per-message basis.

  ## Changes
  - `admin_messages` table
    - New column `allow_reply` (boolean, default false) — when true, the
      individual recipient is permitted to reply directly to the sending admin.
      Defaults to false so existing messages are not replyable unless opted in.

  ## Notes
  - Only meaningful for send_type = 'individual'. Community/broadcast messages
    should leave this false.
  - No RLS changes needed: the subscriber reply flow already validates via
    existing policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_messages' AND column_name = 'allow_reply'
  ) THEN
    ALTER TABLE admin_messages ADD COLUMN allow_reply boolean NOT NULL DEFAULT false;
  END IF;
END $$;
