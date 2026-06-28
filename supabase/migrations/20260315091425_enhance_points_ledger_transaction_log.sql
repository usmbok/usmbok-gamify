/*
  # Enhance Points Ledger — Full Transaction Log

  ## Summary
  Adds metadata columns to points_ledger so every reward can be traced back to
  its origin (quest completion, challenge completion, post/activity, manual admin
  adjustment, etc.).  Also adds the missing policies so the dev-admin bypass (anon
  role) and authenticated admins can read and update every record.

  ## Changes to points_ledger
  - `source_type` (text) — e.g. 'quest', 'challenge', 'activity', 'pulse',
    'gift', 'manual', 'badge'
  - `source_id`   (uuid) — FK to the originating row (quest id, challenge id …)
  - `admin_note`  (text) — free-text note an admin can attach when editing
  - `updated_at`  (timestamptz) — tracks last admin edit

  ## New / updated RLS policies
  - Admins (via user_roles) can SELECT, UPDATE records
  - Anon bypass can SELECT and UPDATE (dev-admin mode)
  - Existing user SELECT / INSERT policies are preserved

  ## Indexes
  - idx_points_ledger_source_type on source_type
*/

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN source_type text DEFAULT 'activity';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN source_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'admin_note'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN admin_note text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'points_ledger' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE points_ledger ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_ledger_source_type ON points_ledger(source_type);

-- ── Anon bypass policies (dev-admin) ──────────────────────────────────────────
DROP POLICY IF EXISTS "anon_bypass_points_ledger_select" ON points_ledger;
CREATE POLICY "anon_bypass_points_ledger_select"
  ON points_ledger FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_bypass_points_ledger_insert" ON points_ledger;
CREATE POLICY "anon_bypass_points_ledger_insert"
  ON points_ledger FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_points_ledger_update" ON points_ledger;
CREATE POLICY "anon_bypass_points_ledger_update"
  ON points_ledger FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_bypass_points_ledger_delete" ON points_ledger;
CREATE POLICY "anon_bypass_points_ledger_delete"
  ON points_ledger FOR DELETE
  TO anon
  USING (true);

-- ── Authenticated admin update policy ────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can update any ledger entry" ON points_ledger;
CREATE POLICY "Admins can update any ledger entry"
  ON points_ledger FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ── Authenticated admin full-read policy ──────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all ledger entries" ON points_ledger;
CREATE POLICY "Admins can read all ledger entries"
  ON points_ledger FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'moderator')
    )
  );
