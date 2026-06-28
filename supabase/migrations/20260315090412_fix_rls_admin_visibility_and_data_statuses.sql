/*
  # Fix Admin Visibility: RLS Policies + Data Status Corrections

  ## Problems Fixed
  1. Pulses seeded with status 'active' — not covered by any RLS SELECT policy.
     Fix: update seeded pulses to 'published' status.

  2. Gift point packs RLS only allows SELECT WHERE is_active = true.
     Admins need to see all packs. Fix: add admin SELECT/INSERT/UPDATE/DELETE policies.

  3. Ideas seeded with 'approved'/'pending' statuses not matching UI options.
     Fix: remap 'approved' → 'accepted', 'pending' → 'open'.

  ## Role used: 'admin' (valid enum value per user_role type)
*/

-- 1. Fix pulse statuses
UPDATE pulses SET status = 'published' WHERE status = 'active';

-- 2. Fix idea statuses to match UI STATUS_OPTIONS
UPDATE ideas SET status = 'accepted' WHERE status = 'approved';
UPDATE ideas SET status = 'open'     WHERE status = 'pending';

-- 3. Gift point packs — admin full access
DROP POLICY IF EXISTS "gift_packs_admin_select" ON gift_point_packs;
CREATE POLICY "gift_packs_admin_select"
  ON gift_point_packs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gift_packs_admin_insert" ON gift_point_packs;
CREATE POLICY "gift_packs_admin_insert"
  ON gift_point_packs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gift_packs_admin_update" ON gift_point_packs;
CREATE POLICY "gift_packs_admin_update"
  ON gift_point_packs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gift_packs_admin_delete" ON gift_point_packs;
CREATE POLICY "gift_packs_admin_delete"
  ON gift_point_packs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- 4. Pulses — admin full access
DROP POLICY IF EXISTS "pulses_admin_select" ON pulses;
CREATE POLICY "pulses_admin_select"
  ON pulses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pulses_admin_insert" ON pulses;
CREATE POLICY "pulses_admin_insert"
  ON pulses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pulses_admin_update" ON pulses;
CREATE POLICY "pulses_admin_update"
  ON pulses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pulses_admin_delete" ON pulses;
CREATE POLICY "pulses_admin_delete"
  ON pulses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- 5. Pulse choices — admin full access
DROP POLICY IF EXISTS "pulse_choices_admin_select" ON pulse_choices;
CREATE POLICY "pulse_choices_admin_select"
  ON pulse_choices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pulse_choices_admin_update" ON pulse_choices;
CREATE POLICY "pulse_choices_admin_update"
  ON pulse_choices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pulse_choices_admin_delete" ON pulse_choices;
CREATE POLICY "pulse_choices_admin_delete"
  ON pulse_choices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- 6. Ideas — admin update and delete
DROP POLICY IF EXISTS "ideas_admin_update" ON ideas;
CREATE POLICY "ideas_admin_update"
  ON ideas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "ideas_admin_delete" ON ideas;
CREATE POLICY "ideas_admin_delete"
  ON ideas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
