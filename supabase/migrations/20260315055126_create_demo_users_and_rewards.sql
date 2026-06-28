
/*
  # Create Demo Users and Rewards System

  1. Creates admin user (admin@usmbok.com) and test subscriber (test@usmbok.com)
     via auth.users and linked profiles
  2. New Tables
     - `rewards_catalog` - Portfolio of redeemable rewards (gift cards, etc.)
     - `reward_conversions` - Conversion rate table (points per dollar per reward)
     - `redemption_requests` - User redemption history and status
  3. Security
     - RLS enabled on all new tables
     - Admin-only write access to catalog and conversion rates
     - Users can only read/write their own redemptions
*/

-- Create demo users via Supabase auth
-- Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@usmbok.com',
  crypt('Sarasota2026!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "USMBOK Admin", "role": "admin"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Test subscriber user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'b2c3d4e5-0002-0002-0002-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'test@usmbok.com',
  crypt('Sarasota2026!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Alex Johnson", "role": "user"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create identity records for both users
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'admin@usmbok.com',
  '{"sub": "a1b2c3d4-0001-0001-0001-000000000001", "email": "admin@usmbok.com"}',
  'email',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'b2c3d4e5-0002-0002-0002-000000000002',
  'b2c3d4e5-0002-0002-0002-000000000002',
  'test@usmbok.com',
  '{"sub": "b2c3d4e5-0002-0002-0002-000000000002", "email": "test@usmbok.com"}',
  'email',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create profiles for demo users
INSERT INTO profiles (id, username, full_name, current_level, total_points, total_xp, reputation_score, department, industry_sector)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'usmbok_admin',
  'USMBOK Admin',
  5,
  12500,
  18750,
  980,
  'Platform Administration',
  'Technology'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, username, full_name, current_level, total_points, total_xp, reputation_score, department, industry_sector)
VALUES (
  'b2c3d4e5-0002-0002-0002-000000000002',
  'alex_johnson',
  'Alex Johnson',
  3,
  4250,
  6375,
  410,
  'Customer Success',
  'Healthcare'
) ON CONFLICT (id) DO NOTHING;

-- Assign admin role
INSERT INTO user_roles (user_id, role)
VALUES ('a1b2c3d4-0001-0001-0001-000000000001', 'admin')
ON CONFLICT DO NOTHING;

-- Give test user some badges
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT 'b2c3d4e5-0002-0002-0002-000000000002', b.id, now() - (random() * interval '60 days')
FROM badges b
WHERE b.sequence_order <= 2
LIMIT 8
ON CONFLICT DO NOTHING;

-- ==========================================
-- REWARDS CATALOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'gift_card',
  brand text,
  image_url text,
  denomination_options jsonb DEFAULT '[]'::jsonb,
  min_redemption_points integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active rewards"
  ON rewards_catalog FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert rewards"
  ON rewards_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rewards"
  ON rewards_catalog FOR UPDATE
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

-- ==========================================
-- REWARD CONVERSION RATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reward_conversion_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid REFERENCES rewards_catalog(id),
  points_per_dollar numeric NOT NULL DEFAULT 100,
  min_dollar_value numeric NOT NULL DEFAULT 5,
  max_dollar_value numeric,
  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_conversion_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conversion rates"
  ON reward_conversion_rates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage conversion rates"
  ON reward_conversion_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ==========================================
-- REDEMPTION REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS redemption_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  reward_id uuid REFERENCES rewards_catalog(id) NOT NULL,
  points_spent integer NOT NULL,
  dollar_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'fulfilled', 'cancelled', 'failed')),
  delivery_info jsonb DEFAULT '{}'::jsonb,
  notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE redemption_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
  ON redemption_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON redemption_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON redemption_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update redemptions"
  ON redemption_requests FOR UPDATE
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

-- ==========================================
-- SEED REWARDS CATALOG
-- ==========================================
INSERT INTO rewards_catalog (name, description, category, brand, denomination_options, min_redemption_points, is_featured, sort_order) VALUES
('Amazon Gift Card', 'Shop millions of items on Amazon', 'gift_card', 'Amazon', '[5, 10, 25, 50, 100]', 500, true, 1),
('Walmart Gift Card', 'Save money at Walmart stores and Walmart.com', 'gift_card', 'Walmart', '[5, 10, 25, 50, 100]', 500, true, 2),
('Starbucks Gift Card', 'Enjoy your favorite coffee and beverages', 'gift_card', 'Starbucks', '[5, 10, 15, 25]', 500, true, 3),
('Target Gift Card', 'Shop for groceries, clothing, electronics and more', 'gift_card', 'Target', '[5, 10, 25, 50, 100]', 500, true, 4),
('Apple App Store', 'Apps, games, and content for iPhone and iPad', 'digital', 'Apple', '[5, 10, 15, 25, 50]', 500, true, 5),
('Google Play Gift Card', 'Apps, games, movies and music on Google Play', 'digital', 'Google', '[5, 10, 15, 25, 50]', 500, false, 6),
('Netflix Gift Card', '1-3 months of streaming entertainment', 'subscription', 'Netflix', '[15, 30, 45]', 1500, true, 7),
('Spotify Premium', 'Ad-free music streaming for 1-3 months', 'subscription', 'Spotify', '[10, 20, 30]', 1000, false, 8),
('DoorDash Gift Card', 'Food delivery from your favorite restaurants', 'gift_card', 'DoorDash', '[10, 15, 25, 50]', 1000, false, 9),
('Uber Gift Card', 'Ride credits for Uber and UberEats', 'gift_card', 'Uber', '[10, 25, 50]', 1000, false, 10),
('Best Buy Gift Card', 'Electronics, appliances and tech accessories', 'gift_card', 'Best Buy', '[10, 25, 50, 100]', 1000, false, 11),
('Home Depot Gift Card', 'Tools, home improvement and garden supplies', 'gift_card', 'Home Depot', '[10, 25, 50, 100]', 1000, false, 12),
('Charity Donation', 'Donate to a charity of your choice', 'charity', 'Various', '[5, 10, 25, 50, 100]', 500, true, 13),
('Extra PTO Day', 'One additional paid day off (manager approval required)', 'experience', 'Company', '[1]', 5000, true, 14),
('Team Lunch', 'Lunch for your team (up to 8 people)', 'experience', 'Company', '[1]', 3000, false, 15),
('LinkedIn Learning', '1 month of premium LinkedIn Learning access', 'digital', 'LinkedIn', '[30]', 3000, false, 16),
('Udemy Course Credit', 'Any course on Udemy.com', 'digital', 'Udemy', '[15, 25, 50]', 1500, false, 17),
('PayPal Cash', 'Direct cash deposit to your PayPal account', 'cash', 'PayPal', '[5, 10, 25, 50, 100]', 500, true, 18);

-- Seed conversion rates (points per $1 value)
INSERT INTO reward_conversion_rates (reward_id, points_per_dollar, min_dollar_value, max_dollar_value)
SELECT id, 
  CASE 
    WHEN category = 'gift_card' THEN 100
    WHEN category = 'digital' THEN 100
    WHEN category = 'subscription' THEN 100
    WHEN category = 'cash' THEN 120
    WHEN category = 'charity' THEN 80
    WHEN category = 'experience' THEN 150
    ELSE 100
  END,
  CASE WHEN category = 'experience' THEN 1 ELSE 5 END,
  CASE 
    WHEN category = 'cash' THEN 100
    WHEN category = 'experience' THEN 1
    ELSE 100
  END
FROM rewards_catalog;

-- Seed some redemption history for test user
INSERT INTO redemption_requests (user_id, reward_id, points_spent, dollar_value, status, created_at)
SELECT 
  'b2c3d4e5-0002-0002-0002-000000000002',
  r.id,
  500,
  5.00,
  'fulfilled',
  now() - interval '30 days'
FROM rewards_catalog r WHERE r.name = 'Starbucks Gift Card'
LIMIT 1;

INSERT INTO redemption_requests (user_id, reward_id, points_spent, dollar_value, status, created_at)
SELECT 
  'b2c3d4e5-0002-0002-0002-000000000002',
  r.id,
  1000,
  10.00,
  'processing',
  now() - interval '3 days'
FROM rewards_catalog r WHERE r.name = 'Amazon Gift Card'
LIMIT 1;
