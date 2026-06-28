/*
  # Seed Sample Data: Pulses, Ideas, and Additional Communities

  ## Summary
  Populates the platform with realistic mock data so admins can review
  how these features look and decide on required functionality.

  ## Data Added

  ### Pulses (8 sample engagement polls)
  A mix of statuses: published (active), draft, and closed.
  Categories: Engagement, Culture, Learning, Product, Wellbeing.

  ### Ideas (10 sample submitted ideas)
  Various categories and statuses: pending review, under review, approved, implemented, rejected.
  Includes vote counts to simulate community engagement.
  Submitted by different mock users.

  ### Communities (6 additional communities)
  Sector-based and interest-based groups to demonstrate community targeting.
*/

-- =====================
-- PULSES
-- =====================
INSERT INTO pulses (question, description, category, status, points_reward, submitted_by, published_at, closes_at)
VALUES
  (
    'How satisfied are you with the current onboarding experience?',
    'We want to understand how new members feel about their first few weeks on the platform. Your feedback will directly shape improvements.',
    'Engagement',
    'published',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '3 days',
    now() + interval '11 days'
  ),
  (
    'Which type of challenge would you most like to see added next?',
    'Help us prioritise the challenge roadmap by telling us what motivates you most.',
    'Engagement',
    'published',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '1 day',
    now() + interval '13 days'
  ),
  (
    'How well does the current points system reflect your contributions?',
    'We are evaluating whether the reward weighting feels fair across different activity types.',
    'Culture',
    'published',
    15,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '5 days',
    now() + interval '9 days'
  ),
  (
    'Would you use a mobile app version of USMBOK Gamify?',
    'We are assessing demand for a dedicated mobile application before committing to the build.',
    'Product',
    'published',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '7 days',
    now() + interval '7 days'
  ),
  (
    'How often do you engage with learning content on the platform each week?',
    'Understanding usage frequency helps us tune notification cadence and content scheduling.',
    'Learning',
    'published',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '2 days',
    now() + interval '12 days'
  ),
  (
    'Rate your overall wellbeing and work-life balance this month.',
    'A quick pulse on team wellbeing. All responses are aggregated anonymously.',
    'Wellbeing',
    'draft',
    5,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    null,
    now() + interval '30 days'
  ),
  (
    'What feature would most improve your daily experience on the platform?',
    'Open feedback to surface the highest-impact improvements from the community.',
    'Product',
    'draft',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    null,
    now() + interval '20 days'
  ),
  (
    'Did the Q1 campaign challenges feel achievable and rewarding?',
    'Retrospective pulse on the Q1 campaign to inform Q2 design.',
    'Engagement',
    'closed',
    10,
    '1aebe549-8724-418b-911c-d098b00b1ece',
    now() - interval '45 days',
    now() - interval '15 days'
  );

-- =====================
-- IDEAS
-- =====================
INSERT INTO ideas (title, description, submitted_by, category, status, vote_count, points_awarded, admin_notes)
VALUES
  (
    'Add a streak bonus for completing quests 7 days in a row',
    'A 7-day streak multiplier (e.g. 1.5x points) would massively incentivise daily engagement. Other platforms use this and it drives great retention.',
    'd1f7fc78-a094-4f17-9444-90b5838f036a',
    'Gamification',
    'approved',
    24,
    50,
    'Great idea — scheduled for Q3 sprint. Streak mechanic will apply to quest completions and logins.'
  ),
  (
    'Community leaderboard filtered by sector or group',
    'Right now the global leaderboard can feel intimidating. A community-scoped leaderboard would help smaller groups compete meaningfully.',
    'd251d110-bd95-4669-bf32-22db15f2e961',
    'Leaderboard',
    'under_review',
    18,
    0,
    'Under design review. Need to consider privacy implications and data load.'
  ),
  (
    'Dark mode improvements — better contrast on badge cards',
    'Some badge cards are hard to read in dark mode. The text-on-gradient combinations need work, especially on the silver and bronze tiers.',
    '42744b43-9653-4e2a-ad09-4ab98cec064f',
    'UI/UX',
    'approved',
    15,
    25,
    'Accepted. Design team to address contrast ratios in the next visual refresh.'
  ),
  (
    'Allow team captains to create private group challenges',
    'Communities should be able to spin up their own mini-challenges without needing admin involvement. A self-serve challenge builder would be powerful.',
    'ad9764a0-94ef-46ee-9be7-8845f7fc0bd0',
    'Communities',
    'under_review',
    31,
    0,
    null
  ),
  (
    'Gift points directly to a colleague as a peer recognition gesture',
    'Peer-to-peer gifting is a core social feature. Let users send small point bundles (50–200 pts) with a personal message as a thank-you.',
    'f73ac748-2a07-451c-8c8b-2a0dc0ca6e1e',
    'Rewards',
    'approved',
    42,
    75,
    'High vote count confirms demand. P2P gifting feature is being scoped for Q3.'
  ),
  (
    'Export my personal achievement history as a PDF certificate',
    'Being able to download a PDF of completed quests, badges earned and points history would be useful for performance reviews and CVs.',
    '12bfa90e-cba6-40bb-87c4-a5eef8fed990',
    'Profile',
    'pending',
    9,
    0,
    null
  ),
  (
    'Add a "Quest of the Week" spotlight on the dashboard',
    'Surface one featured quest each week on the dashboard homepage. Helps users who aren''t sure where to start and drives engagement with newer content.',
    '5395bae4-2011-4ebf-b36e-82950ab4f501',
    'Engagement',
    'implemented',
    27,
    100,
    'Implemented in v0.94. Dashboard now features a rotating Quest of the Week widget.'
  ),
  (
    'Integrate Slack notifications for badge unlocks and quest completions',
    'Push real-time notifications to a Slack channel when users earn badges or complete quests. Great for team visibility and social proof.',
    'd1f7fc78-a094-4f17-9444-90b5838f036a',
    'Integrations',
    'pending',
    13,
    0,
    null
  ),
  (
    'Add a "learning path" concept that chains multiple quests together',
    'Group related quests into a structured learning path with a progress bar and a special completion badge at the end.',
    'd251d110-bd95-4669-bf32-22db15f2e961',
    'Gamification',
    'under_review',
    22,
    0,
    'Interesting concept. Relates to the Journeys feature in the roadmap — reviewing alignment.'
  ),
  (
    'Let admins schedule pulse surveys to auto-publish on a recurring basis',
    'Monthly or fortnightly pulses on wellbeing and engagement should be schedulable so they don''t require manual publishing each time.',
    '42744b43-9653-4e2a-ad09-4ab98cec064f',
    'Admin Tools',
    'pending',
    7,
    0,
    null
  );

-- =====================
-- ADDITIONAL COMMUNITIES
-- =====================
INSERT INTO communities (name, description, tags, color, is_active, is_public, member_count, created_by)
VALUES
  (
    'Finance & Banking',
    'Members from the financial services, banking, and insurance sectors. Focus on compliance, risk, and digital transformation.',
    ARRAY['finance', 'banking', 'insurance', 'risk'],
    '#0ea5e9',
    true,
    true,
    8,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  ),
  (
    'Government & Public Sector',
    'Practitioners working in central government, local authorities, and public services driving digital modernisation.',
    ARRAY['government', 'public sector', 'policy', 'digital services'],
    '#64748b',
    true,
    true,
    6,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  ),
  (
    'Quest Masters',
    'Users who have completed 10 or more quests. A peer learning group for high-engagement members.',
    ARRAY['quests', 'learning', 'achievement'],
    '#f59e0b',
    true,
    false,
    5,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  ),
  (
    'New Members — Cohort 2026',
    'Onboarding community for all members who joined the platform in 2026. A welcoming space to get started.',
    ARRAY['onboarding', 'new members', '2026'],
    '#22c55e',
    true,
    true,
    12,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  ),
  (
    'Retail & E-Commerce',
    'Members operating in retail, consumer goods, and e-commerce verticals.',
    ARRAY['retail', 'ecommerce', 'consumer', 'supply chain'],
    '#ec4899',
    true,
    true,
    4,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  ),
  (
    'Consulting & Professional Services',
    'Management consultants, advisors, and professional services practitioners sharing best practices.',
    ARRAY['consulting', 'advisory', 'professional services'],
    '#8b5cf6',
    true,
    true,
    7,
    '1aebe549-8724-418b-911c-d098b00b1ece'
  );
