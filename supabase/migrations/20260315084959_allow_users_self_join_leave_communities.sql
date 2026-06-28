/*
  # Allow Users to Self-Join and Leave Public Communities

  ## Summary
  Adds RLS policies so authenticated users can join and leave public communities
  themselves, without requiring admin intervention.

  ## Changes

  ### community_members table
  - New INSERT policy: authenticated users can join public communities for themselves
  - New DELETE policy: users can leave (remove themselves from) communities they joined

  ## Notes
  - Self-join is restricted to communities where is_public = true
  - Users can only insert rows where user_id matches their own auth.uid()
  - Users can only delete their own membership rows
*/

CREATE POLICY "Users can join public communities"
  ON community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_id
      AND is_public = true
      AND is_active = true
    )
  );

CREATE POLICY "Users can leave communities they joined"
  ON community_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
