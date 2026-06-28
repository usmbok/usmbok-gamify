/*
  # Update Mock User Profiles with Leaderboard Stats

  The auth trigger already created blank profiles for the mock users.
  This migration updates those profiles with realistic names, departments,
  points, XP, levels, and reputation scores for leaderboard demo data.

  1. Changes
    - Updates 20 mock profiles with full_name, username, department, industry_sector
    - Sets varied total_points (150–9820), total_xp, reputation_score, current_level
    - Covers all 5 levels: L1 (2), L2 (4), L3 (5), L4 (5), L5 (4)
*/

UPDATE profiles SET
  full_name = 'James Carter', username = 'jcarter', department = 'Product',
  industry_sector = 'Technology', current_level = 5,
  total_points = 9820, total_xp = 6100, reputation_score = 412, pulse_points = 88
WHERE id = 'a1000001-0000-0000-0000-000000000001';

UPDATE profiles SET
  full_name = 'Sophie Riley', username = 'sriley', department = 'Engineering',
  industry_sector = 'Technology', current_level = 5,
  total_points = 8750, total_xp = 5640, reputation_score = 380, pulse_points = 74
WHERE id = 'a1000001-0000-0000-0000-000000000002';

UPDATE profiles SET
  full_name = 'Michael Chen', username = 'mchen', department = 'Marketing',
  industry_sector = 'Finance', current_level = 5,
  total_points = 7640, total_xp = 5200, reputation_score = 345, pulse_points = 66
WHERE id = 'a1000001-0000-0000-0000-000000000003';

UPDATE profiles SET
  full_name = 'Anita Patel', username = 'apatel', department = 'Operations',
  industry_sector = 'Healthcare', current_level = 5,
  total_points = 6890, total_xp = 5010, reputation_score = 312, pulse_points = 59
WHERE id = 'a1000001-0000-0000-0000-000000000004';

UPDATE profiles SET
  full_name = 'Tyler Morgan', username = 'tmorgan', department = 'Sales',
  industry_sector = 'Retail', current_level = 4,
  total_points = 5950, total_xp = 3800, reputation_score = 278, pulse_points = 51
WHERE id = 'a1000001-0000-0000-0000-000000000005';

UPDATE profiles SET
  full_name = 'Linh Nguyen', username = 'lnguyen', department = 'Engineering',
  industry_sector = 'Technology', current_level = 4,
  total_points = 5200, total_xp = 3200, reputation_score = 245, pulse_points = 44
WHERE id = 'a1000001-0000-0000-0000-000000000006';

UPDATE profiles SET
  full_name = 'Rachel Kowalski', username = 'rkowalski', department = 'HR',
  industry_sector = 'Professional Services', current_level = 4,
  total_points = 4680, total_xp = 2900, reputation_score = 218, pulse_points = 40
WHERE id = 'a1000001-0000-0000-0000-000000000007';

UPDATE profiles SET
  full_name = 'Diego Santos', username = 'dsantos', department = 'Product',
  industry_sector = 'Technology', current_level = 4,
  total_points = 4120, total_xp = 2600, reputation_score = 196, pulse_points = 36
WHERE id = 'a1000001-0000-0000-0000-000000000008';

UPDATE profiles SET
  full_name = 'Emily Kim', username = 'ekim', department = 'Marketing',
  industry_sector = 'Retail', current_level = 4,
  total_points = 3750, total_xp = 2350, reputation_score = 175, pulse_points = 32
WHERE id = 'a1000001-0000-0000-0000-000000000009';

UPDATE profiles SET
  full_name = 'Ben Thompson', username = 'bthompson', department = 'Finance',
  industry_sector = 'Finance', current_level = 3,
  total_points = 3210, total_xp = 1980, reputation_score = 154, pulse_points = 28
WHERE id = 'a1000001-0000-0000-0000-000000000010';

UPDATE profiles SET
  full_name = 'Fatima Wilson', username = 'fwilson', department = 'Operations',
  industry_sector = 'Healthcare', current_level = 3,
  total_points = 2840, total_xp = 1720, reputation_score = 138, pulse_points = 25
WHERE id = 'a1000001-0000-0000-0000-000000000011';

UPDATE profiles SET
  full_name = 'Nathan Brooks', username = 'nbrooks', department = 'Engineering',
  industry_sector = 'Technology', current_level = 3,
  total_points = 2490, total_xp = 1550, reputation_score = 122, pulse_points = 22
WHERE id = 'a1000001-0000-0000-0000-000000000012';

UPDATE profiles SET
  full_name = 'Yuna Park', username = 'ypark', department = 'Design',
  industry_sector = 'Professional Services', current_level = 3,
  total_points = 2100, total_xp = 1300, reputation_score = 106, pulse_points = 18
WHERE id = 'a1000001-0000-0000-0000-000000000013';

UPDATE profiles SET
  full_name = 'Carlos Martin', username = 'cmartin', department = 'Sales',
  industry_sector = 'Retail', current_level = 3,
  total_points = 1760, total_xp = 1080, reputation_score = 90, pulse_points = 15
WHERE id = 'a1000001-0000-0000-0000-000000000014';

UPDATE profiles SET
  full_name = 'Hannah Lee', username = 'hlee', department = 'Customer Success',
  industry_sector = 'Technology', current_level = 2,
  total_points = 1340, total_xp = 820, reputation_score = 72, pulse_points = 12
WHERE id = 'a1000001-0000-0000-0000-000000000015';

UPDATE profiles SET
  full_name = 'Omar Johnson', username = 'ojohnson', department = 'HR',
  industry_sector = 'Healthcare', current_level = 2,
  total_points = 980, total_xp = 610, reputation_score = 56, pulse_points = 9
WHERE id = 'a1000001-0000-0000-0000-000000000016';

UPDATE profiles SET
  full_name = 'Priya White', username = 'pwhite', department = 'Finance',
  industry_sector = 'Finance', current_level = 2,
  total_points = 720, total_xp = 440, reputation_score = 42, pulse_points = 7
WHERE id = 'a1000001-0000-0000-0000-000000000017';

UPDATE profiles SET
  full_name = 'Grace Davis', username = 'gdavis', department = 'Marketing',
  industry_sector = 'Retail', current_level = 2,
  total_points = 480, total_xp = 290, reputation_score = 30, pulse_points = 5
WHERE id = 'a1000001-0000-0000-0000-000000000018';

UPDATE profiles SET
  full_name = 'Sam Miller', username = 'smiller', department = 'Engineering',
  industry_sector = 'Technology', current_level = 1,
  total_points = 260, total_xp = 155, reputation_score = 18, pulse_points = 3
WHERE id = 'a1000001-0000-0000-0000-000000000019';

UPDATE profiles SET
  full_name = 'Kai Taylor', username = 'ktaylor', department = 'Product',
  industry_sector = 'Professional Services', current_level = 1,
  total_points = 150, total_xp = 88, reputation_score = 10, pulse_points = 2
WHERE id = 'a1000001-0000-0000-0000-000000000020';
