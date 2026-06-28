/*
  # Add Anon Bypass Policies for Dev Admin Access

  ## Purpose
  The dev admin bypass operates as the anon role (unauthenticated).
  These policies mirror the existing anon bypass pattern used on
  admin_messages and admin_message_recipients tables.

  ## Tables affected
  - ideas: full CRUD for anon bypass
  - pulses: full CRUD for anon bypass
  - pulse_choices: full CRUD for anon bypass
  - gift_point_packs: full CRUD for anon bypass

  ## Security Note
  These policies are intentional for dev/demo bypass mode only.
  They match the existing anon bypass pattern already in the codebase.
*/

-- ─────────────────────────────────────────
-- IDEAS - anon bypass
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "anon_bypass_ideas_select" ON ideas;
CREATE POLICY "anon_bypass_ideas_select"
  ON ideas FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_bypass_ideas_insert" ON ideas;
CREATE POLICY "anon_bypass_ideas_insert"
  ON ideas FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_ideas_update" ON ideas;
CREATE POLICY "anon_bypass_ideas_update"
  ON ideas FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_ideas_delete" ON ideas;
CREATE POLICY "anon_bypass_ideas_delete"
  ON ideas FOR DELETE
  TO anon
  USING (true);

-- ─────────────────────────────────────────
-- PULSES - anon bypass
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "anon_bypass_pulses_select" ON pulses;
CREATE POLICY "anon_bypass_pulses_select"
  ON pulses FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_bypass_pulses_insert" ON pulses;
CREATE POLICY "anon_bypass_pulses_insert"
  ON pulses FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_pulses_update" ON pulses;
CREATE POLICY "anon_bypass_pulses_update"
  ON pulses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_pulses_delete" ON pulses;
CREATE POLICY "anon_bypass_pulses_delete"
  ON pulses FOR DELETE
  TO anon
  USING (true);

-- ─────────────────────────────────────────
-- PULSE CHOICES - anon bypass
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "anon_bypass_pulse_choices_select" ON pulse_choices;
CREATE POLICY "anon_bypass_pulse_choices_select"
  ON pulse_choices FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_bypass_pulse_choices_insert" ON pulse_choices;
CREATE POLICY "anon_bypass_pulse_choices_insert"
  ON pulse_choices FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_pulse_choices_update" ON pulse_choices;
CREATE POLICY "anon_bypass_pulse_choices_update"
  ON pulse_choices FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_pulse_choices_delete" ON pulse_choices;
CREATE POLICY "anon_bypass_pulse_choices_delete"
  ON pulse_choices FOR DELETE
  TO anon
  USING (true);

-- ─────────────────────────────────────────
-- GIFT POINT PACKS - anon bypass
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "anon_bypass_gift_packs_select" ON gift_point_packs;
CREATE POLICY "anon_bypass_gift_packs_select"
  ON gift_point_packs FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_bypass_gift_packs_insert" ON gift_point_packs;
CREATE POLICY "anon_bypass_gift_packs_insert"
  ON gift_point_packs FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_gift_packs_update" ON gift_point_packs;
CREATE POLICY "anon_bypass_gift_packs_update"
  ON gift_point_packs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_gift_packs_delete" ON gift_point_packs;
CREATE POLICY "anon_bypass_gift_packs_delete"
  ON gift_point_packs FOR DELETE
  TO anon
  USING (true);
