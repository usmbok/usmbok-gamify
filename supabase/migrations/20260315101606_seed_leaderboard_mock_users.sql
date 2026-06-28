/*
  # Seed Leaderboard Mock Users

  Creates 20 realistic mock users in auth.users and corresponding profiles
  with varied points, XP, levels, departments, and reputation scores to
  populate the leaderboard with meaningful demo data.

  1. New Data
    - 20 mock auth.users entries (confirmed, no password needed)
    - 20 corresponding profiles with realistic stats spread across all 5 levels
    - Points range: ~150 (L1) to ~9,800 (L5)
    - Varied departments and industry sectors

  2. Notes
    - ON CONFLICT DO NOTHING makes this idempotent
    - Mock users have confirmed_at set so they appear as valid users
    - Fixed UUIDs ensure consistent re-runs
*/

DO $$
DECLARE
  mock_users uuid[] := ARRAY[
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'a1000001-0000-0000-0000-000000000002'::uuid,
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'a1000001-0000-0000-0000-000000000005'::uuid,
    'a1000001-0000-0000-0000-000000000006'::uuid,
    'a1000001-0000-0000-0000-000000000007'::uuid,
    'a1000001-0000-0000-0000-000000000008'::uuid,
    'a1000001-0000-0000-0000-000000000009'::uuid,
    'a1000001-0000-0000-0000-000000000010'::uuid,
    'a1000001-0000-0000-0000-000000000011'::uuid,
    'a1000001-0000-0000-0000-000000000012'::uuid,
    'a1000001-0000-0000-0000-000000000013'::uuid,
    'a1000001-0000-0000-0000-000000000014'::uuid,
    'a1000001-0000-0000-0000-000000000015'::uuid,
    'a1000001-0000-0000-0000-000000000016'::uuid,
    'a1000001-0000-0000-0000-000000000017'::uuid,
    'a1000001-0000-0000-0000-000000000018'::uuid,
    'a1000001-0000-0000-0000-000000000019'::uuid,
    'a1000001-0000-0000-0000-000000000020'::uuid
  ];
  mock_emails text[] := ARRAY[
    'jcarter@mock.demo','sriley@mock.demo','mchen@mock.demo','apatel@mock.demo',
    'tmorgan@mock.demo','lnguyen@mock.demo','rkowalski@mock.demo','dsantos@mock.demo',
    'ekim@mock.demo','bthompson@mock.demo','fwilson@mock.demo','nbrooks@mock.demo',
    'ypark@mock.demo','cmartin@mock.demo','hlee@mock.demo','ojohnson@mock.demo',
    'pwhite@mock.demo','gdavis@mock.demo','smiller@mock.demo','ktaylor@mock.demo'
  ];
  i int;
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud
    )
    VALUES (
      mock_users[i],
      '00000000-0000-0000-0000-000000000000',
      mock_emails[i],
      '',
      now(),
      now() - (210 - i * 10) * interval '1 day',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

INSERT INTO profiles (id, username, full_name, department, industry_sector, current_level, total_points, total_xp, reputation_score, pulse_points, gift_points_balance, created_at, updated_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'jcarter',   'James Carter',    'Product',          'Technology',            5, 9820, 6100, 412, 88, 0, now() - interval '200 days', now()),
  ('a1000001-0000-0000-0000-000000000002', 'sriley',    'Sophie Riley',    'Engineering',      'Technology',            5, 8750, 5640, 380, 74, 0, now() - interval '190 days', now()),
  ('a1000001-0000-0000-0000-000000000003', 'mchen',     'Michael Chen',    'Marketing',        'Finance',               5, 7640, 5200, 345, 66, 0, now() - interval '180 days', now()),
  ('a1000001-0000-0000-0000-000000000004', 'apatel',    'Anita Patel',     'Operations',       'Healthcare',            5, 6890, 5010, 312, 59, 0, now() - interval '170 days', now()),
  ('a1000001-0000-0000-0000-000000000005', 'tmorgan',   'Tyler Morgan',    'Sales',            'Retail',                4, 5950, 3800, 278, 51, 0, now() - interval '160 days', now()),
  ('a1000001-0000-0000-0000-000000000006', 'lnguyen',   'Linh Nguyen',     'Engineering',      'Technology',            4, 5200, 3200, 245, 44, 0, now() - interval '150 days', now()),
  ('a1000001-0000-0000-0000-000000000007', 'rkowalski', 'Rachel Kowalski', 'HR',               'Professional Services', 4, 4680, 2900, 218, 40, 0, now() - interval '140 days', now()),
  ('a1000001-0000-0000-0000-000000000008', 'dsantos',   'Diego Santos',    'Product',          'Technology',            4, 4120, 2600, 196, 36, 0, now() - interval '130 days', now()),
  ('a1000001-0000-0000-0000-000000000009', 'ekim',      'Emily Kim',       'Marketing',        'Retail',                4, 3750, 2350, 175, 32, 0, now() - interval '120 days', now()),
  ('a1000001-0000-0000-0000-000000000010', 'bthompson', 'Ben Thompson',    'Finance',          'Finance',               3, 3210, 1980, 154, 28, 0, now() - interval '110 days', now()),
  ('a1000001-0000-0000-0000-000000000011', 'fwilson',   'Fatima Wilson',   'Operations',       'Healthcare',            3, 2840, 1720, 138, 25, 0, now() - interval '100 days', now()),
  ('a1000001-0000-0000-0000-000000000012', 'nbrooks',   'Nathan Brooks',   'Engineering',      'Technology',            3, 2490, 1550, 122, 22, 0, now() - interval '90 days',  now()),
  ('a1000001-0000-0000-0000-000000000013', 'ypark',     'Yuna Park',       'Design',           'Professional Services', 3, 2100, 1300, 106, 18, 0, now() - interval '80 days',  now()),
  ('a1000001-0000-0000-0000-000000000014', 'cmartin',   'Carlos Martin',   'Sales',            'Retail',                3, 1760, 1080,  90, 15, 0, now() - interval '70 days',  now()),
  ('a1000001-0000-0000-0000-000000000015', 'hlee',      'Hannah Lee',      'Customer Success', 'Technology',            2, 1340,  820,  72, 12, 0, now() - interval '60 days',  now()),
  ('a1000001-0000-0000-0000-000000000016', 'ojohnson',  'Omar Johnson',    'HR',               'Healthcare',            2,  980,  610,  56,  9, 0, now() - interval '50 days',  now()),
  ('a1000001-0000-0000-0000-000000000017', 'pwhite',    'Priya White',     'Finance',          'Finance',               2,  720,  440,  42,  7, 0, now() - interval '40 days',  now()),
  ('a1000001-0000-0000-0000-000000000018', 'gdavis',    'Grace Davis',     'Marketing',        'Retail',                2,  480,  290,  30,  5, 0, now() - interval '28 days',  now()),
  ('a1000001-0000-0000-0000-000000000019', 'smiller',   'Sam Miller',      'Engineering',      'Technology',            1,  260,  155,  18,  3, 0, now() - interval '15 days',  now()),
  ('a1000001-0000-0000-0000-000000000020', 'ktaylor',   'Kai Taylor',      'Product',          'Professional Services', 1,  150,   88,  10,  2, 0, now() - interval '7 days',   now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role, granted_at)
SELECT id, 'subscriber', now()
FROM profiles
WHERE id::text LIKE 'a1000001%'
ON CONFLICT DO NOTHING;
