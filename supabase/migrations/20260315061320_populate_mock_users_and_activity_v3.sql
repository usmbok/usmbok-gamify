/*
  # Populate Mock Users and Activity Data (v3)

  Creates 15 additional demo users with rich activity records using correct enum values:
  - transaction_type enum: 'earned' | 'redeemed' | 'adjusted' | 'bonus' | 'expired'
  - leaderboard_type enum: 'global' | 'team' | 'department' | 'season' | 'friend'
  - leaderboard scope: plain text column
  - user_badges: id, user_id, badge_id, earned_at
*/

DO $$
DECLARE
  admin_id uuid := '1aebe549-8724-418b-911c-d098b00b1ece';
  alex_id  uuid := 'd1f7fc78-a094-4f17-9444-90b5838f036a';

  u1  uuid := gen_random_uuid();
  u2  uuid := gen_random_uuid();
  u3  uuid := gen_random_uuid();
  u4  uuid := gen_random_uuid();
  u5  uuid := gen_random_uuid();
  u6  uuid := gen_random_uuid();
  u7  uuid := gen_random_uuid();
  u8  uuid := gen_random_uuid();
  u9  uuid := gen_random_uuid();
  u10 uuid := gen_random_uuid();
  u11 uuid := gen_random_uuid();
  u12 uuid := gen_random_uuid();
  u13 uuid := gen_random_uuid();
  u14 uuid := gen_random_uuid();
  u15 uuid := gen_random_uuid();

  b_spark    uuid := 'bb7a0abd-8c7e-4d61-b327-f13f874dcf7d';
  b_ignite   uuid := 'f0e2d4ac-55ef-46e8-98a0-9b19c1830fd6';
  b_blaze    uuid := 'a08110a8-22c5-455c-8596-7c38acc6038f';
  b_inferno  uuid := '2ba96373-0ec4-45d8-be48-6ea8fc263f21';
  b_phoenix  uuid := 'cf97d415-3ed9-473f-a4df-02892d6c6232';
  b_smile    uuid := '3dc5d03e-c07c-43e4-b34d-446f4fef743d';
  b_reliable uuid := '8fde219b-ff23-451d-8fee-2ff1d5e727d0';
  b_hero     uuid := '05df25de-0315-4c14-ba2d-963b468639d6';
  b_team     uuid := '8d952586-d47d-4091-83c2-9c4c4871c214';
  b_curious  uuid := '831f04bf-47c4-4d7c-b0a5-09fd6e9891bc';
  b_quick    uuid := '3133b34c-ffa9-4228-94ef-69d526c435a1';
  b_bridge   uuid := 'c4606bbb-d1ad-43bb-a8e1-523019ab137b';

BEGIN

  -- Auth users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, recovery_token)
  VALUES
    (u1,  '00000000-0000-0000-0000-000000000000','priya.sharma@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Priya Sharma"}',    now()-interval'180 days',now(),'authenticated','authenticated','',''),
    (u2,  '00000000-0000-0000-0000-000000000000','marcus.chen@usmbok.com',     crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Marcus Chen"}',     now()-interval'150 days',now(),'authenticated','authenticated','',''),
    (u3,  '00000000-0000-0000-0000-000000000000','sarah.okonkwo@usmbok.com',   crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Sarah Okonkwo"}',   now()-interval'120 days',now(),'authenticated','authenticated','',''),
    (u4,  '00000000-0000-0000-0000-000000000000','james.rodriguez@usmbok.com', crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"James Rodriguez"}', now()-interval'100 days',now(),'authenticated','authenticated','',''),
    (u5,  '00000000-0000-0000-0000-000000000000','emma.larsson@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Emma Larsson"}',    now()-interval'90 days', now(),'authenticated','authenticated','',''),
    (u6,  '00000000-0000-0000-0000-000000000000','kwame.asante@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Kwame Asante"}',    now()-interval'80 days', now(),'authenticated','authenticated','',''),
    (u7,  '00000000-0000-0000-0000-000000000000','yuki.tanaka@usmbok.com',     crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Yuki Tanaka"}',     now()-interval'70 days', now(),'authenticated','authenticated','',''),
    (u8,  '00000000-0000-0000-0000-000000000000','fatima.malik@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Fatima Malik"}',    now()-interval'60 days', now(),'authenticated','authenticated','',''),
    (u9,  '00000000-0000-0000-0000-000000000000','noah.williams@usmbok.com',   crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Noah Williams"}',   now()-interval'50 days', now(),'authenticated','authenticated','',''),
    (u10, '00000000-0000-0000-0000-000000000000','amara.diallo@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Amara Diallo"}',    now()-interval'45 days', now(),'authenticated','authenticated','',''),
    (u11, '00000000-0000-0000-0000-000000000000','lucas.hoffmann@usmbok.com',  crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Lucas Hoffmann"}',  now()-interval'40 days', now(),'authenticated','authenticated','',''),
    (u12, '00000000-0000-0000-0000-000000000000','sofia.garcia@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Sofia Garcia"}',    now()-interval'35 days', now(),'authenticated','authenticated','',''),
    (u13, '00000000-0000-0000-0000-000000000000','ethan.patel@usmbok.com',     crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Ethan Patel"}',     now()-interval'30 days', now(),'authenticated','authenticated','',''),
    (u14, '00000000-0000-0000-0000-000000000000','chloe.dupont@usmbok.com',    crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Chloe Dupont"}',    now()-interval'20 days', now(),'authenticated','authenticated','',''),
    (u15, '00000000-0000-0000-0000-000000000000','ali.hassan@usmbok.com',      crypt('Demo2026!',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Ali Hassan"}',      now()-interval'10 days', now(),'authenticated','authenticated','','');

  -- Auth identities
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (u1, u1,  'priya.sharma@usmbok.com',   'email',jsonb_build_object('sub',u1::text, 'email','priya.sharma@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'180 days',now()),
    (u2, u2,  'marcus.chen@usmbok.com',    'email',jsonb_build_object('sub',u2::text, 'email','marcus.chen@usmbok.com',    'email_verified',true,'provider','email'),now(),now()-interval'150 days',now()),
    (u3, u3,  'sarah.okonkwo@usmbok.com',  'email',jsonb_build_object('sub',u3::text, 'email','sarah.okonkwo@usmbok.com',  'email_verified',true,'provider','email'),now(),now()-interval'120 days',now()),
    (u4, u4,  'james.rodriguez@usmbok.com','email',jsonb_build_object('sub',u4::text, 'email','james.rodriguez@usmbok.com','email_verified',true,'provider','email'),now(),now()-interval'100 days',now()),
    (u5, u5,  'emma.larsson@usmbok.com',   'email',jsonb_build_object('sub',u5::text, 'email','emma.larsson@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'90 days', now()),
    (u6, u6,  'kwame.asante@usmbok.com',   'email',jsonb_build_object('sub',u6::text, 'email','kwame.asante@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'80 days', now()),
    (u7, u7,  'yuki.tanaka@usmbok.com',    'email',jsonb_build_object('sub',u7::text, 'email','yuki.tanaka@usmbok.com',    'email_verified',true,'provider','email'),now(),now()-interval'70 days', now()),
    (u8, u8,  'fatima.malik@usmbok.com',   'email',jsonb_build_object('sub',u8::text, 'email','fatima.malik@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'60 days', now()),
    (u9, u9,  'noah.williams@usmbok.com',  'email',jsonb_build_object('sub',u9::text, 'email','noah.williams@usmbok.com',  'email_verified',true,'provider','email'),now(),now()-interval'50 days', now()),
    (u10,u10, 'amara.diallo@usmbok.com',   'email',jsonb_build_object('sub',u10::text,'email','amara.diallo@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'45 days', now()),
    (u11,u11, 'lucas.hoffmann@usmbok.com', 'email',jsonb_build_object('sub',u11::text,'email','lucas.hoffmann@usmbok.com', 'email_verified',true,'provider','email'),now(),now()-interval'40 days', now()),
    (u12,u12, 'sofia.garcia@usmbok.com',   'email',jsonb_build_object('sub',u12::text,'email','sofia.garcia@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'35 days', now()),
    (u13,u13, 'ethan.patel@usmbok.com',    'email',jsonb_build_object('sub',u13::text,'email','ethan.patel@usmbok.com',    'email_verified',true,'provider','email'),now(),now()-interval'30 days', now()),
    (u14,u14, 'chloe.dupont@usmbok.com',   'email',jsonb_build_object('sub',u14::text,'email','chloe.dupont@usmbok.com',   'email_verified',true,'provider','email'),now(),now()-interval'20 days', now()),
    (u15,u15, 'ali.hassan@usmbok.com',     'email',jsonb_build_object('sub',u15::text,'email','ali.hassan@usmbok.com',     'email_verified',true,'provider','email'),now(),now()-interval'10 days', now());

  -- Profiles
  INSERT INTO public.profiles (id, username, full_name, current_level, total_points, total_xp, reputation_score, department, industry_sector)
  VALUES
    (u1,  'priya_s',  'Priya Sharma',    6, 24800, 37200, 1240, 'Customer Experience',  'Financial Services'),
    (u2,  'marcus_c', 'Marcus Chen',     5, 18600, 27900, 980,  'IT Operations',         'Technology'),
    (u3,  'sarah_o',  'Sarah Okonkwo',   4, 11200, 16800, 620,  'Service Desk',          'Healthcare'),
    (u4,  'james_r',  'James Rodriguez', 7, 38400, 57600, 1850, 'Service Management',    'Government'),
    (u5,  'emma_l',   'Emma Larsson',    5, 16200, 24300, 840,  'Knowledge Management',  'Education'),
    (u6,  'kwame_a',  'Kwame Asante',    4, 9800,  14700, 510,  'Change Management',     'Telecommunications'),
    (u7,  'yuki_t',   'Yuki Tanaka',     6, 22100, 33150, 1120, 'Quality Assurance',     'Manufacturing'),
    (u8,  'fatima_m', 'Fatima Malik',    3, 6400,  9600,  330,  'Customer Support',      'Retail'),
    (u9,  'noah_w',   'Noah Williams',   5, 15800, 23700, 790,  'DevOps',                'Technology'),
    (u10, 'amara_d',  'Amara Diallo',    4, 10500, 15750, 580,  'HR Technology',         'Consulting'),
    (u11, 'lucas_h',  'Lucas Hoffmann',  3, 5200,  7800,  280,  'Procurement',           'Logistics'),
    (u12, 'sofia_g',  'Sofia Garcia',    7, 42000, 63000, 2100, 'CX Strategy',           'Financial Services'),
    (u13, 'ethan_p',  'Ethan Patel',     2, 2800,  4200,  150,  'Support Analyst',       'Healthcare'),
    (u14, 'chloe_d',  'Chloe Dupont',    4, 12300, 18450, 650,  'Service Design',        'Government'),
    (u15, 'ali_h',    'Ali Hassan',      2, 1900,  2850,  95,   'IT Support',            'Telecommunications');

  -- User roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (alex_id,'user'),
    (u1,'user'),(u2,'user'),(u3,'user'),(u4,'user'),(u5,'user'),
    (u6,'user'),(u7,'user'),(u8,'user'),(u9,'user'),(u10,'user'),
    (u11,'user'),(u12,'user'),(u13,'user'),(u14,'user'),(u15,'user');

  -- Points transactions (using 'earned' enum value)
  INSERT INTO public.points_transactions (user_id, amount, transaction_type, source_type, description, balance_after, created_at)
  VALUES
    (admin_id, 500,  'earned','activity','Platform setup and configuration',        500,   now()-interval'60 days'),
    (admin_id, 1000, 'earned','activity','Completed USMBOK Foundations course',      1500,  now()-interval'30 days'),
    (admin_id, 750,  'earned','activity','Mentored 5 new users',                     2250,  now()-interval'10 days'),
    (alex_id,  300,  'earned','activity','First login and profile setup',            300,   now()-interval'45 days'),
    (alex_id,  500,  'earned','activity','Completed onboarding quest',               800,   now()-interval'40 days'),
    (alex_id,  250,  'earned','activity','Submitted knowledge article',              1050,  now()-interval'20 days'),
    (u1,  2000,'earned','activity','USMBOK Practitioner certification',              2000,  now()-interval'120 days'),
    (u1,  1500,'earned','activity','Led customer journey mapping workshop',          3500,  now()-interval'90 days'),
    (u1,  800, 'earned','activity','Published CX best practices guide',             4300,  now()-interval'60 days'),
    (u1,  500, 'earned','activity','Completed Q1 NPS challenge',                    4800,  now()-interval'30 days'),
    (u2,  1800,'earned','activity','Infrastructure optimization project',            1800,  now()-interval'100 days'),
    (u2,  1200,'earned','activity','ITIL 4 recertification',                         3000,  now()-interval'70 days'),
    (u2,  600, 'earned','activity','Incident response improvement',                 3600,  now()-interval'40 days'),
    (u3,  900, 'earned','activity','Service desk KPI improvement initiative',        900,   now()-interval'80 days'),
    (u3,  700, 'earned','activity','First contact resolution campaign win',          1600,  now()-interval'50 days'),
    (u4,  3500,'earned','activity','Enterprise ITSM implementation lead',            3500,  now()-interval'150 days'),
    (u4,  2800,'earned','activity','USMBOK Expert certification',                    6300,  now()-interval'100 days'),
    (u4,  1500,'earned','activity','Published service management framework',         7800,  now()-interval'60 days'),
    (u4,  900, 'earned','activity','Keynote at service management summit',           8700,  now()-interval'20 days'),
    (u5,  1400,'earned','activity','Knowledge management transformation',            1400,  now()-interval'70 days'),
    (u5,  800, 'earned','activity','Created learning pathway for new hires',         2200,  now()-interval'40 days'),
    (u12, 4000,'earned','activity','Global CX strategy rollout',                     4000,  now()-interval'180 days'),
    (u12, 3500,'earned','activity','Board-level service excellence presentation',    7500,  now()-interval'120 days'),
    (u12, 2200,'earned','activity','Achieved USMBOK Master designation',             9700,  now()-interval'80 days'),
    (u12, 1800,'earned','activity','Published three industry white papers',          11500, now()-interval'40 days'),
    (u7,  1900,'earned','activity','Six Sigma improvement project',                  1900,  now()-interval'60 days'),
    (u7,  1500,'earned','activity','Quality metrics dashboard implementation',       3400,  now()-interval'30 days'),
    (u6,  800, 'earned','activity','Change management certification',                800,   now()-interval'50 days'),
    (u8,  600, 'earned','activity','Customer empathy training completion',            600,   now()-interval'30 days'),
    (u9,  1400,'earned','activity','DevOps pipeline optimization',                   1400,  now()-interval'40 days'),
    (u10, 900, 'earned','activity','HRIT system implementation',                     900,   now()-interval'35 days'),
    (u11, 500, 'earned','activity','Supplier SLA renegotiation',                     500,   now()-interval'25 days'),
    (u13, 280, 'earned','activity','Completed new member orientation',               280,   now()-interval'20 days'),
    (u14, 1100,'earned','activity','Service design sprint facilitation',             1100,  now()-interval'15 days'),
    (u15, 190, 'earned','activity','Welcome challenge completion',                   190,   now()-interval'5 days');

  -- User badges
  INSERT INTO public.user_badges (user_id, badge_id, earned_at)
  VALUES
    (admin_id, b_spark,   now()-interval'55 days'),
    (admin_id, b_ignite,  now()-interval'25 days'),
    (admin_id, b_team,    now()-interval'5 days'),
    (alex_id,  b_spark,   now()-interval'40 days'),
    (alex_id,  b_curious, now()-interval'20 days'),
    (u1,  b_spark,    now()-interval'175 days'),
    (u1,  b_ignite,   now()-interval'150 days'),
    (u1,  b_blaze,    now()-interval'120 days'),
    (u1,  b_smile,    now()-interval'90 days'),
    (u1,  b_reliable, now()-interval'60 days'),
    (u1,  b_hero,     now()-interval'30 days'),
    (u2,  b_spark,    now()-interval'145 days'),
    (u2,  b_ignite,   now()-interval'110 days'),
    (u2,  b_blaze,    now()-interval'70 days'),
    (u2,  b_team,     now()-interval'40 days'),
    (u3,  b_spark,    now()-interval'115 days'),
    (u3,  b_smile,    now()-interval'80 days'),
    (u3,  b_curious,  now()-interval'50 days'),
    (u4,  b_spark,    now()-interval'180 days'),
    (u4,  b_ignite,   now()-interval'160 days'),
    (u4,  b_blaze,    now()-interval'140 days'),
    (u4,  b_inferno,  now()-interval'120 days'),
    (u4,  b_phoenix,  now()-interval'90 days'),
    (u4,  b_hero,     now()-interval'60 days'),
    (u4,  b_bridge,   now()-interval'30 days'),
    (u5,  b_spark,    now()-interval'88 days'),
    (u5,  b_ignite,   now()-interval'65 days'),
    (u5,  b_curious,  now()-interval'40 days'),
    (u5,  b_quick,    now()-interval'20 days'),
    (u6,  b_spark,    now()-interval'78 days'),
    (u6,  b_curious,  now()-interval'50 days'),
    (u7,  b_spark,    now()-interval'68 days'),
    (u7,  b_ignite,   now()-interval'50 days'),
    (u7,  b_blaze,    now()-interval'30 days'),
    (u7,  b_reliable, now()-interval'15 days'),
    (u8,  b_spark,    now()-interval'58 days'),
    (u8,  b_smile,    now()-interval'30 days'),
    (u9,  b_spark,    now()-interval'48 days'),
    (u9,  b_ignite,   now()-interval'25 days'),
    (u9,  b_team,     now()-interval'10 days'),
    (u10, b_spark,    now()-interval'43 days'),
    (u10, b_curious,  now()-interval'20 days'),
    (u11, b_spark,    now()-interval'38 days'),
    (u12, b_spark,    now()-interval'300 days'),
    (u12, b_ignite,   now()-interval'280 days'),
    (u12, b_blaze,    now()-interval'250 days'),
    (u12, b_inferno,  now()-interval'200 days'),
    (u12, b_phoenix,  now()-interval'150 days'),
    (u12, b_smile,    now()-interval'120 days'),
    (u12, b_reliable, now()-interval'90 days'),
    (u12, b_hero,     now()-interval'60 days'),
    (u12, b_bridge,   now()-interval'30 days'),
    (u13, b_spark,    now()-interval'28 days'),
    (u14, b_spark,    now()-interval'19 days'),
    (u14, b_curious,  now()-interval'10 days'),
    (u15, b_spark,    now()-interval'8 days');

  -- Leaderboard records (global overall ranking)
  INSERT INTO public.leaderboard_records (user_id, leaderboard_type, scope, points, rank)
  VALUES
    (u12,     'global','overall', 42000, 1),
    (u4,      'global','overall', 38400, 2),
    (u1,      'global','overall', 24800, 3),
    (u7,      'global','overall', 22100, 4),
    (u2,      'global','overall', 18600, 5),
    (u5,      'global','overall', 16200, 6),
    (u9,      'global','overall', 15800, 7),
    (u14,     'global','overall', 12300, 8),
    (admin_id,'global','overall', 12500, 9),
    (u3,      'global','overall', 11200, 10),
    (u10,     'global','overall', 10500, 11),
    (u6,      'global','overall', 9800,  12),
    (u8,      'global','overall', 6400,  13),
    (u11,     'global','overall', 5200,  14),
    (alex_id, 'global','overall', 4250,  15),
    (u13,     'global','overall', 2800,  16),
    (u15,     'global','overall', 1900,  17);

END $$;
