/*
  # Seed Email Templates and Replace Industry Sectors

  ## Email Templates
  Inserts 6 example email templates covering common gamification communications:
  - Welcome email for new players
  - Quest completion notification
  - Challenge invitation
  - Campaign launch announcement
  - Weekly leaderboard digest
  - Inactivity re-engagement email

  ## Industry Sectors
  Deletes all existing industry sector records and replaces them with the 40 L1
  sectors shown in the design screenshots. Also seeds one L2 example (Radiology
  under Healthcare and Medical) to demonstrate the hierarchy. The `level` column
  stores 1, 2, or 3 and the `parent_id` column links children to parents.

  ## Notes
  - Email templates are inserted with no created_by so they appear as system templates
  - Sector codes are derived from names (uppercase, max 10 chars)
  - Existing sectors are fully replaced (DELETE then INSERT)
*/

-- ─── Email Templates ───────────────────────────────────────────────────────────

INSERT INTO email_templates (name, subject, body_html, body_text, template_type, is_active)
VALUES

(
  'Welcome to USMBOK Gamify',
  'Welcome, {{first_name}}! Your journey starts now.',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#0ea5e9;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">Welcome to USMBOK Gamify!</h1></div><div style="padding:32px"><p style="font-size:16px">Hi <strong>{{first_name}}</strong>,</p><p>We''re thrilled to have you on board. Your gamification journey starts today — earn points, complete quests, and climb the leaderboard.</p><h3>Getting Started</h3><ul><li>Complete your profile</li><li>Browse available Quests</li><li>Join an active Challenge</li></ul><a href="{{app_url}}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Start Playing</a></div><div style="padding:16px 32px;background:#f9f9f9;font-size:12px;color:#888">You received this email because you registered at USMBOK Gamify. &copy; 2026 USMBOK</div></div></body></html>',
  'Hi {{first_name}}, welcome to USMBOK Gamify! Complete quests, earn points, and climb the leaderboard. Visit {{app_url}} to get started.',
  'general',
  true
),

(
  'Quest Completed - Congratulations',
  'You completed "{{quest_name}}"! Here''s what you earned.',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#16a34a;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">Quest Complete!</h1><p style="color:#dcfce7;margin:8px 0 0">{{quest_name}}</p></div><div style="padding:32px"><p style="font-size:16px">Congratulations <strong>{{first_name}}</strong>!</p><p>You''ve successfully completed the quest <strong>{{quest_name}}</strong>. Here''s a summary of your rewards:</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0"><table style="width:100%"><tr><td>Points Earned</td><td style="text-align:right;font-weight:bold;color:#16a34a">+{{points_earned}} pts</td></tr><tr><td>XP Earned</td><td style="text-align:right;font-weight:bold;color:#16a34a">+{{xp_earned}} XP</td></tr></table></div><p>Keep going — your next quest is waiting!</p><a href="{{quests_url}}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">View More Quests</a></div></div></body></html>',
  'Congratulations {{first_name}}! You completed "{{quest_name}}" and earned {{points_earned}} points and {{xp_earned}} XP.',
  'quest',
  true
),

(
  'New Challenge Invitation',
  'You''ve been invited to join: {{challenge_name}}',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#f59e0b;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">Challenge Invitation</h1></div><div style="padding:32px"><p style="font-size:16px">Hey <strong>{{first_name}}</strong>,</p><p>You''ve been invited to participate in an exciting challenge:</p><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:16px 0"><h2 style="margin:0 0 8px;color:#92400e">{{challenge_name}}</h2><p style="margin:0;color:#78350f">{{challenge_description}}</p><hr style="border:none;border-top:1px solid #fde68a;margin:12px 0"><p style="margin:0;font-size:14px">Ends: <strong>{{ends_at}}</strong> &nbsp;|&nbsp; Prize: <strong>{{prize_points}} pts</strong></p></div><a href="{{challenge_url}}" style="display:inline-block;background:#f59e0b;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Accept Challenge</a></div></div></body></html>',
  'Hi {{first_name}}, you''ve been invited to join "{{challenge_name}}" — ends {{ends_at}}. Prize: {{prize_points}} pts. Visit {{challenge_url}} to accept.',
  'challenge',
  true
),

(
  'Campaign Launch Announcement',
  'New Campaign Live: {{campaign_name}} — Earn {{multiplier}}x Points!',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:linear-gradient(135deg,#0369a1,#0ea5e9);padding:32px;text-align:center"><h1 style="color:#fff;margin:0">Campaign Launch!</h1><p style="color:#bae6fd;margin:8px 0 0;font-size:18px">{{multiplier}}x Points Multiplier Active</p></div><div style="padding:32px"><p style="font-size:16px">Hi <strong>{{first_name}}</strong>,</p><p>A new campaign has just launched. For a limited time, earn <strong>{{multiplier}}x</strong> points on all qualifying activities!</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:16px 0"><h3 style="margin:0 0 8px;color:#1e40af">{{campaign_name}}</h3><p style="margin:0 0 8px;color:#3730a3">{{campaign_description}}</p><p style="margin:0;font-size:14px;color:#6b7280">Active: {{starts_at}} – {{ends_at}}</p></div><a href="{{app_url}}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Start Earning Now</a></div></div></body></html>',
  'Hi {{first_name}}, the campaign "{{campaign_name}}" is live! Earn {{multiplier}}x points until {{ends_at}}.',
  'campaign',
  true
),

(
  'Weekly Leaderboard Digest',
  'Your Weekly Leaderboard Update — Week of {{week_start}}',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#7c3aed;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">Weekly Digest</h1><p style="color:#ddd6fe;margin:8px 0 0">Week of {{week_start}}</p></div><div style="padding:32px"><p style="font-size:16px">Hi <strong>{{first_name}}</strong>,</p><p>Here''s your performance summary for the week:</p><div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin:16px 0"><table style="width:100%"><tr><td>Your Rank</td><td style="text-align:right;font-weight:bold">#{{current_rank}}</td></tr><tr><td>Points This Week</td><td style="text-align:right;font-weight:bold;color:#7c3aed">+{{weekly_points}} pts</td></tr><tr><td>Quests Completed</td><td style="text-align:right;font-weight:bold">{{quests_completed}}</td></tr><tr><td>Badges Earned</td><td style="text-align:right;font-weight:bold">{{badges_earned}}</td></tr></table></div><a href="{{leaderboard_url}}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">View Full Leaderboard</a></div></div></body></html>',
  'Hi {{first_name}}, your week {{week_start}} summary: rank #{{current_rank}}, +{{weekly_points}} pts, {{quests_completed}} quests done.',
  'general',
  true
),

(
  'We Miss You — Come Back!',
  '{{first_name}}, you''re missed! Here''s what you''ve been missing.',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#dc2626;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">We Miss You!</h1></div><div style="padding:32px"><p style="font-size:16px">Hi <strong>{{first_name}}</strong>,</p><p>It''s been a while since your last visit. Here''s what''s been happening while you were away:</p><ul style="font-size:15px;line-height:1.8"><li>{{new_quests}} new quests are available</li><li>{{active_challenges}} challenges are currently active</li><li>Your current rank is <strong>#{{current_rank}}</strong></li></ul><p>Don''t let your streak slip — come back and continue your journey!</p><a href="{{app_url}}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Return to USMBOK Gamify</a></div></div></body></html>',
  'Hi {{first_name}}, we miss you! There are {{new_quests}} new quests and {{active_challenges}} active challenges waiting. Visit {{app_url}} to return.',
  'general',
  true
);

-- ─── Replace Industry Sectors ──────────────────────────────────────────────────

DELETE FROM industry_sectors;

INSERT INTO industry_sectors (code, name, level, parent_id, is_active)
VALUES
  ('AERODEF',   'Aerospace and Defense',                          1, NULL, true),
  ('AGRIFOOD',  'Agriculture and Food Production',                1, NULL, true),
  ('ARTSCULT',  'Arts and Culture',                               1, NULL, true),
  ('AUTOTRANS', 'Automotive and Transportation',                  1, NULL, true),
  ('BOATMAR',   'Boating and Marine',                             1, NULL, true),
  ('CSPORTS',   'Care Sports and Recreation',                     1, NULL, true),
  ('CIRCECON',  'Circular Economy and Recycling',                 1, NULL, true),
  ('CONSTENG',  'Construction and Engineering',                   1, NULL, true),
  ('CUSTSERV',  'Customer Service',                               1, NULL, true),
  ('EDUTRAIN',  'Education and Training',                         1, NULL, true),
  ('ENERGUTIL', 'Energy and Utilities',                           1, NULL, true),
  ('ENVRENEN',  'Environmental and Renewable Energy',             1, NULL, true),
  ('FACMGMT',   'Facilities Management',                          1, NULL, true),
  ('FINBANK',   'Finance and Banking',                            1, NULL, true),
  ('GAMESPORT', 'Gaming and Esports',                             1, NULL, true),
  ('GOVPUB',    'Government and Public Sector',                   1, NULL, true),
  ('HEALTHMED', 'Healthcare and Medical',                         1, NULL, true),
  ('HOSPTUR',   'Hospitality and Tourism',                        1, NULL, true),
  ('HUMRES',    'Human Resources',                                1, NULL, true),
  ('INSURE',    'Insurance',                                      1, NULL, true),
  ('MFGINDU',   'Manufacturing and Industrial',                   1, NULL, true),
  ('MEDIAENT',  'Media and Entertainment',                        1, NULL, true),
  ('MININGNAT', 'Mining and Natural Resources',                   1, NULL, true),
  ('NONPROFIT', 'Non-Profit and Social Impact',                   1, NULL, true),
  ('PERSDEVEL', 'Personal Development and Self-Improvement',      1, NULL, true),
  ('PHARMABIO', 'Pharmaceuticals and Biotechnology',              1, NULL, true),
  ('PRODSVC',   'Product and Service Management',                 1, NULL, true),
  ('PROFSVC',   'Professional Services (Consulting, Legal, Accounting)', 1, NULL, true),
  ('REALPROP',  'Real Estate and Property Management',            1, NULL, true),
  ('RETAILEC',  'Retail and E-Commerce',                          1, NULL, true),
  ('SALESMKT',  'Sales and Marketing',                            1, NULL, true),
  ('SECPHYS',   'Security (Physical Protection of Persons and Property)', 1, NULL, true),
  ('SMTCITY',   'Smart Cities and Urban Planning',                1, NULL, true),
  ('SPORTREC',  'Sports and Recreation',                          1, NULL, true),
  ('TECHIT',    'Technology and IT',                              1, NULL, true),
  ('TELECOM',   'Telecommunications',                             1, NULL, true),
  ('TRANSLOG',  'Transportation and Logistics',                   1, NULL, true),
  ('TRAVADV',   'Travel and Adventure Services',                  1, NULL, true),
  ('VETANIM',   'Veterinary and Animal',                          1, NULL, true),
  ('WASTEMGMT', 'Waste Management and Sanitation',                1, NULL, true);

-- Seed one L2 example under Healthcare and Medical (Radiology) to demonstrate hierarchy
INSERT INTO industry_sectors (code, name, level, parent_id, is_active)
SELECT 'RADIOLOGY', 'Radiology', 2, id, true
FROM industry_sectors WHERE code = 'HEALTHMED';
