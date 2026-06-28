/*
  # Seed Sample Content: Ideas, Pulses & Gift Point Packs

  1. Ideas Board (12 fictitious ideas across multiple categories)
     - Variety of statuses: pending, approved, under_review
     - Assigned to existing profiles as submitted_by
     - Realistic vote counts

  2. Pulses (10 pulse questions with multiple choice options)
     - Covers workplace, culture, wellbeing, innovation categories
     - Active status with future close dates
     - Points rewards for responding

  3. Gift Point Packs (6 packs at different price tiers)
     - Points range from 500 to 10,000
     - Dollar price scales with points (slight bulk discount on larger packs)
     - All active, ordered by points ascending
*/

-- ─────────────────────────────────────────
-- IDEAS
-- ─────────────────────────────────────────
INSERT INTO ideas (id, title, description, submitted_by, category, status, vote_count, points_awarded, created_at)
VALUES
  (gen_random_uuid(), 'Monthly Innovation Sprint', 'Set aside one Friday per month for cross-team hackathon-style sprints focused on internal tooling improvements. Winners get recognised at the all-hands.', '1aebe549-8724-418b-911c-d098b00b1ece', 'innovation', 'approved', 47, 150, now() - interval '14 days'),

  (gen_random_uuid(), 'Peer Learning Library', 'A curated internal wiki where team members share short video walkthroughs (5–10 min) of skills they use daily. Tag-searchable, points awarded for contributions.', 'd1f7fc78-a094-4f17-9444-90b5838f036a', 'learning', 'approved', 62, 200, now() - interval '21 days'),

  (gen_random_uuid(), 'Green Commute Reward Program', 'Award bonus points to employees who commute by bike, public transport, or car-pool at least 3 days per week. Verified monthly via self-declaration with manager sign-off.', '5395bae4-2011-4ebf-b36e-82950ab4f501', 'sustainability', 'under_review', 38, 0, now() - interval '7 days'),

  (gen_random_uuid(), 'Customer Story Showcase', 'A fortnightly internal Slack post spotlighting a real customer success story sourced from frontline staff. Builds empathy and celebrates wins company-wide.', '1aebe549-8724-418b-911c-d098b00b1ece', 'customer_service', 'approved', 55, 100, now() - interval '30 days'),

  (gen_random_uuid(), 'Reverse Mentorship Initiative', 'Pair senior leaders with junior employees for monthly 30-minute sessions where the junior leads the agenda. Promotes upward knowledge flow and inclusivity.', 'd1f7fc78-a094-4f17-9444-90b5838f036a', 'mentorship', 'pending', 29, 0, now() - interval '3 days'),

  (gen_random_uuid(), 'Automated Onboarding Quest', 'Build a gamified onboarding journey for new starters with quests covering culture, tools, and processes. Auto-assigns on day one and tracks progress over 90 days.', '5395bae4-2011-4ebf-b36e-82950ab4f501', 'innovation', 'approved', 71, 250, now() - interval '45 days'),

  (gen_random_uuid(), 'Cross-Department Job Shadow Days', 'Allow employees to spend a half-day shadowing a colleague in a different department once per quarter. Earns XP and fosters collaboration.', '1aebe549-8724-418b-911c-d098b00b1ece', 'collaboration', 'under_review', 44, 0, now() - interval '10 days'),

  (gen_random_uuid(), 'Wellbeing Wednesday Check-Ins', 'A short anonymous weekly pulse every Wednesday asking one wellbeing-related question. Results shared with leadership to inform policy changes.', 'd1f7fc78-a094-4f17-9444-90b5838f036a', 'wellbeing', 'approved', 83, 50, now() - interval '60 days'),

  (gen_random_uuid(), 'Skills Gap Self-Assessment Tool', 'A quarterly self-assessment survey that maps individual skills against role requirements and auto-recommends learning resources and quests to close gaps.', '5395bae4-2011-4ebf-b36e-82950ab4f501', 'learning', 'pending', 19, 0, now() - interval '2 days'),

  (gen_random_uuid(), 'Recognition Wall Display', 'A digital display in the office foyer cycling through recent peer recognition moments, badge earners and leaderboard highlights. Refreshes every 15 minutes.', '1aebe549-8724-418b-911c-d098b00b1ece', 'culture', 'under_review', 36, 0, now() - interval '5 days'),

  (gen_random_uuid(), 'Supplier Innovation Challenge', 'Invite key suppliers to submit ideas for joint process improvements once a year. Best submission earns a co-branded award and featured case study.', 'd1f7fc78-a094-4f17-9444-90b5838f036a', 'innovation', 'pending', 12, 0, now() - interval '1 day'),

  (gen_random_uuid(), 'Internal Podcast Series', 'A monthly 20-minute internal podcast featuring one team leader discussing their biggest lessons learned that quarter. Hosted on the intranet and earns listener points.', '5395bae4-2011-4ebf-b36e-82950ab4f501', 'communication', 'approved', 58, 75, now() - interval '18 days');


-- ─────────────────────────────────────────
-- PULSES  (questions + choices)
-- ─────────────────────────────────────────

DO $$
DECLARE
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();
  p8 uuid := gen_random_uuid();
  p9 uuid := gen_random_uuid();
  p10 uuid := gen_random_uuid();
BEGIN

  INSERT INTO pulses (id, question, description, category, status, points_reward, submitted_by, published_at, closes_at, created_at)
  VALUES
    (p1, 'How would you rate your energy levels at work this week?', 'We check in regularly so we can support your wellbeing. Your response is anonymous.', 'wellbeing', 'active', 25, '1aebe549-8724-418b-911c-d098b00b1ece', now() - interval '2 days', now() + interval '5 days', now() - interval '2 days'),
    (p2, 'What is the biggest barrier to collaboration in your team right now?', 'Help us identify and remove friction points so your team can work better together.', 'collaboration', 'active', 30, 'd1f7fc78-a094-4f17-9444-90b5838f036a', now() - interval '3 days', now() + interval '4 days', now() - interval '3 days'),
    (p3, 'Which learning format do you prefer?', 'We are designing the next learning program and want to know how you like to learn best.', 'learning', 'active', 20, '5395bae4-2011-4ebf-b36e-82950ab4f501', now() - interval '1 day', now() + interval '6 days', now() - interval '1 day'),
    (p4, 'How confident do you feel sharing new ideas with your manager?', 'Psychological safety is a priority. Your honest answer helps us improve our culture.', 'culture', 'active', 25, '1aebe549-8724-418b-911c-d098b00b1ece', now() - interval '4 days', now() + interval '3 days', now() - interval '4 days'),
    (p5, 'How satisfied are you with the recognition you receive for your work?', 'Recognition drives engagement. Tell us how we are doing so we can do better.', 'engagement', 'active', 30, 'd1f7fc78-a094-4f17-9444-90b5838f036a', now() - interval '5 days', now() + interval '2 days', now() - interval '5 days'),
    (p6, 'Which area should we focus on improving first?', 'We have limited capacity to improve everything at once — your vote shapes our roadmap.', 'strategy', 'active', 35, '5395bae4-2011-4ebf-b36e-82950ab4f501', now() - interval '6 days', now() + interval '7 days', now() - interval '6 days'),
    (p7, 'How often do you feel overwhelmed by your workload?', 'Understanding workload pressures helps us plan capacity and support the team better.', 'wellbeing', 'active', 25, '1aebe549-8724-418b-911c-d098b00b1ece', now() - interval '2 days', now() + interval '5 days', now() - interval '2 days'),
    (p8, 'What motivates you most in your role?', 'Knowing what drives you helps us design a better rewards and recognition experience.', 'engagement', 'active', 20, 'd1f7fc78-a094-4f17-9444-90b5838f036a', now() - interval '1 day', now() + interval '6 days', now() - interval '1 day'),
    (p9, 'How effective is our current onboarding process for new team members?', 'We are reviewing onboarding this quarter and want feedback from those who experienced it.', 'culture', 'active', 30, '5395bae4-2011-4ebf-b36e-82950ab4f501', now() - interval '7 days', now() + interval '1 day', now() - interval '7 days'),
    (p10, 'Would you recommend this organisation as a great place to work?', 'Our eNPS helps us benchmark engagement and track improvement over time.', 'engagement', 'active', 40, '1aebe549-8724-418b-911c-d098b00b1ece', now() - interval '3 days', now() + interval '4 days', now() - interval '3 days');

  -- Choices for p1 (energy levels)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p1, 'Very high — feeling great', 1),
    (gen_random_uuid(), p1, 'Good — mostly fine', 2),
    (gen_random_uuid(), p1, 'Average — getting through it', 3),
    (gen_random_uuid(), p1, 'Low — struggling a bit', 4),
    (gen_random_uuid(), p1, 'Very low — need support', 5);

  -- Choices for p2 (barriers to collaboration)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p2, 'Too many meetings, not enough deep work time', 1),
    (gen_random_uuid(), p2, 'Unclear ownership of tasks and projects', 2),
    (gen_random_uuid(), p2, 'Remote / hybrid working challenges', 3),
    (gen_random_uuid(), p2, 'Siloed tools and systems', 4),
    (gen_random_uuid(), p2, 'Interpersonal or communication issues', 5);

  -- Choices for p3 (learning format)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p3, 'Short video modules (under 10 min)', 1),
    (gen_random_uuid(), p3, 'Live virtual workshops', 2),
    (gen_random_uuid(), p3, 'In-person training sessions', 3),
    (gen_random_uuid(), p3, 'Self-paced written guides / articles', 4),
    (gen_random_uuid(), p3, 'Peer coaching or mentoring', 5);

  -- Choices for p4 (confidence sharing ideas)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p4, 'Very confident — always encouraged', 1),
    (gen_random_uuid(), p4, 'Fairly confident — mostly supported', 2),
    (gen_random_uuid(), p4, 'Neutral — depends on the idea', 3),
    (gen_random_uuid(), p4, 'Not very confident — worry about reaction', 4),
    (gen_random_uuid(), p4, 'Not at all — feel ideas are dismissed', 5);

  -- Choices for p5 (recognition satisfaction)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p5, 'Very satisfied', 1),
    (gen_random_uuid(), p5, 'Satisfied', 2),
    (gen_random_uuid(), p5, 'Neutral', 3),
    (gen_random_uuid(), p5, 'Dissatisfied', 4),
    (gen_random_uuid(), p5, 'Very dissatisfied', 5);

  -- Choices for p6 (focus area)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p6, 'Internal communication and transparency', 1),
    (gen_random_uuid(), p6, 'Career development and growth pathways', 2),
    (gen_random_uuid(), p6, 'Work-life balance and wellbeing', 3),
    (gen_random_uuid(), p6, 'Technology and tooling', 4),
    (gen_random_uuid(), p6, 'Team culture and inclusion', 5);

  -- Choices for p7 (workload overwhelm)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p7, 'Rarely or never', 1),
    (gen_random_uuid(), p7, 'Occasionally (once a month or less)', 2),
    (gen_random_uuid(), p7, 'Sometimes (a few times a month)', 3),
    (gen_random_uuid(), p7, 'Often (weekly)', 4),
    (gen_random_uuid(), p7, 'Almost always', 5);

  -- Choices for p8 (motivation)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p8, 'Meaningful work that makes a difference', 1),
    (gen_random_uuid(), p8, 'Recognition and appreciation from others', 2),
    (gen_random_uuid(), p8, 'Learning and growing new skills', 3),
    (gen_random_uuid(), p8, 'Financial rewards and incentives', 4),
    (gen_random_uuid(), p8, 'Being part of a great team', 5);

  -- Choices for p9 (onboarding effectiveness)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p9, 'Very effective — felt set up for success', 1),
    (gen_random_uuid(), p9, 'Effective — covered the essentials', 2),
    (gen_random_uuid(), p9, 'Adequate — some gaps but manageable', 3),
    (gen_random_uuid(), p9, 'Ineffective — had to figure a lot out myself', 4),
    (gen_random_uuid(), p9, 'Very ineffective — felt lost for weeks', 5);

  -- Choices for p10 (eNPS)
  INSERT INTO pulse_choices (id, pulse_id, label, display_order) VALUES
    (gen_random_uuid(), p10, 'Definitely yes — I already do!', 1),
    (gen_random_uuid(), p10, 'Probably yes', 2),
    (gen_random_uuid(), p10, 'Not sure', 3),
    (gen_random_uuid(), p10, 'Probably not', 4),
    (gen_random_uuid(), p10, 'Definitely not', 5);

END $$;


-- ─────────────────────────────────────────
-- GIFT POINT PACKS
-- ─────────────────────────────────────────
INSERT INTO gift_point_packs (id, name, description, points, price_usd, is_active, display_order, created_at)
VALUES
  (gen_random_uuid(), 'Starter Pack', 'A great way to recognise a colleague with a small but meaningful boost of points.', 500, 4.99, true, 1, now()),
  (gen_random_uuid(), 'Appreciation Pack', 'Send genuine appreciation with a solid points gift — perfect for a job well done.', 1000, 8.99, true, 2, now()),
  (gen_random_uuid(), 'Recognition Pack', 'For going above and beyond — reward standout contributions with a generous points bundle.', 2500, 19.99, true, 3, now()),
  (gen_random_uuid(), 'Excellence Pack', 'Celebrate exceptional performance. This pack makes a statement and a real impact on the leaderboard.', 5000, 34.99, true, 4, now()),
  (gen_random_uuid(), 'Champion Pack', 'Our most popular pack for rewarding sustained excellence. Great value for teams and managers.', 7500, 49.99, true, 5, now()),
  (gen_random_uuid(), 'Prestige Pack', 'The ultimate recognition gift. Reserve this for your highest achievers and make them feel truly valued.', 10000, 64.99, true, 6, now());
