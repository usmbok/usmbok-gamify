/*
  # Add anon bypass policies for communities table

  Allows the dev/demo bypass mode (unauthenticated anon role) to fully manage
  communities in the admin panel, matching the pattern used by other bypass
  policies in this project.

  Changes:
  - SELECT: anon can read all communities
  - INSERT: anon can create communities
  - UPDATE: anon can update communities
  - DELETE: anon can delete communities
*/

CREATE POLICY "anon_bypass_communities_select"
  ON communities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_bypass_communities_insert"
  ON communities FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_bypass_communities_update"
  ON communities FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_bypass_communities_delete"
  ON communities FOR DELETE
  TO anon
  USING (true);
