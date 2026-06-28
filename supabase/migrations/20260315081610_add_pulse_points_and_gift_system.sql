/*
  # Pulse Points & Gift Points System

  ## Summary
  This migration adds two distinct point currencies and a peer gifting system.

  ### Pulse Points
  A separate point type awarded ONLY for voting on Pulses WITH a rationale comment.
  Tracked on the `profiles` table as `pulse_points`.
  The `pulse_votes` table gets a `comment` column (required to earn Pulse Points)
  and a `pulse_points_awarded` boolean flag.

  ### Gift Point Packs (Admin-managed)
  `gift_point_packs` — admin-configurable packs that users can "purchase".
  Each pack has a name, description, number of points, and a USD price.
  Purchasing is simulated (no real Stripe call yet) — creates an order record
  and credits the buyer's `gift_points_balance`.

  ### Gift Point Orders
  `gift_point_orders` — records every simulated purchase.
  Status: pending → completed | failed.

  ### Point Gifts (peer gifting)
  `point_gifts` — a user sends some of their `gift_points_balance` to another user.
  The sender's balance is debited, the recipient's `gift_points_balance` is credited.
  Includes a personal message.

  ## Tables

  ### Columns added to `profiles`
  - `pulse_points` integer NOT NULL DEFAULT 0 — earned by voting with comments
  - `gift_points_balance` integer NOT NULL DEFAULT 0 — purchased gift points available to send

  ### `gift_point_packs`
  - id, name, description, points (number awarded), price_usd, is_active, display_order, created_at

  ### `gift_point_orders`
  - id, user_id, pack_id, points_purchased, price_usd, status, stripe_session_id (placeholder), created_at

  ### `point_gifts`
  - id, sender_id, recipient_id, points, message, created_at

  ## Security
  RLS on all new tables.
*/

-- ─── profiles: new columns ────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='pulse_points') THEN
    ALTER TABLE profiles ADD COLUMN pulse_points integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gift_points_balance') THEN
    ALTER TABLE profiles ADD COLUMN gift_points_balance integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── pulse_votes: comment + award flag ───────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pulse_votes' AND column_name='comment') THEN
    ALTER TABLE pulse_votes ADD COLUMN comment text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pulse_votes' AND column_name='pulse_points_awarded') THEN
    ALTER TABLE pulse_votes ADD COLUMN pulse_points_awarded boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── gift_point_packs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_point_packs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  points        integer NOT NULL DEFAULT 0,
  price_usd     numeric(10,2) NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gift_point_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_packs_select_active"
  ON gift_point_packs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ─── gift_point_orders ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_point_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id            uuid NOT NULL REFERENCES gift_point_packs(id) ON DELETE RESTRICT,
  points_purchased   integer NOT NULL,
  price_usd          numeric(10,2) NOT NULL,
  status             text NOT NULL DEFAULT 'completed',
  stripe_session_id  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gift_point_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_orders_select_own"
  ON gift_point_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "gift_orders_insert_own"
  ON gift_point_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── point_gifts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS point_gifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points        integer NOT NULL CHECK (points > 0),
  message       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE point_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gifts_select_involved"
  ON point_gifts FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "gifts_insert_sender"
  ON point_gifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

-- ─── indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gift_orders_user ON gift_point_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_point_gifts_sender ON point_gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_point_gifts_recipient ON point_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_packs_order ON gift_point_packs(display_order);

-- ─── seed a few default packs ─────────────────────────────────────────────────

INSERT INTO gift_point_packs (name, description, points, price_usd, display_order)
VALUES
  ('Starter Pack',   '50 gift points to share with the community',  50,  4.99, 0),
  ('Value Pack',     '150 gift points — great for team recognition', 150, 9.99, 1),
  ('Power Pack',     '400 gift points for serious givers',           400, 19.99, 2),
  ('Champion Pack',  '1000 gift points — the ultimate gift bundle',  1000, 39.99, 3)
ON CONFLICT DO NOTHING;
