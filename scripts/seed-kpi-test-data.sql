-- Test Data for KPI Dashboard
-- This script creates realistic test data for all KPI metrics

-- First, clear existing test data (be careful in production!)
DELETE FROM audit_log WHERE actor_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM ximi_conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM saved_programs WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM checkins WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM privacy_consents WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@kpi.test');
DELETE FROM users WHERE email LIKE 'test%@kpi.test';

-- Create test users (mix of regular users and staff)
INSERT INTO users (id, email, password_hash) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'test1@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a2222222-2222-2222-2222-222222222222', 'test2@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a3333333-3333-3333-3333-333333333333', 'test3@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a4444444-4444-4444-4444-444444444444', 'test4@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a5555555-5555-5555-5555-555555555555', 'test5@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a6666666-6666-6666-6666-666666666666', 'test6@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a7777777-7777-7777-7777-777777777777', 'test7@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a8888888-8888-8888-8888-888888888888', 'test8@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('a9999999-9999-9999-9999-999999999999', 'test9@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b1111111-1111-1111-1111-111111111111', 'staff1@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b2222222-2222-2222-2222-222222222222', 'staff2@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b3333333-3333-3333-3333-333333333333', 'staff3@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b4444444-4444-4444-4444-444444444444', 'admin1@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b5555555-5555-5555-5555-555555555555', 'admin2@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO'),
  ('b6666666-6666-6666-6666-666666666666', 'test10@kpi.test', '$2b$10$K7L1OJNR3B0iqKA2n1pv8u24cSl1p1.J9K/D9Wz0KlDh.5l7jHOXO');

-- Create profiles (mix of regular users and staff)
INSERT INTO profiles (user_id, first_name, last_name, role, timezone, is_admin) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Test', 'User1', 'user', 'America/Edmonton', false),
  ('a2222222-2222-2222-2222-222222222222', 'Test', 'User2', 'user', 'America/Edmonton', false),
  ('a3333333-3333-3333-3333-333333333333', 'Test', 'User3', 'user', 'America/Toronto', false),
  ('a4444444-4444-4444-4444-444444444444', 'Test', 'User4', 'user', 'America/Vancouver', false),
  ('a5555555-5555-5555-5555-555555555555', 'Test', 'User5', 'user', 'America/Edmonton', false),
  ('a6666666-6666-6666-6666-666666666666', 'Test', 'User6', 'user', 'America/Edmonton', false),
  ('a7777777-7777-7777-7777-777777777777', 'Test', 'User7', 'user', 'America/Edmonton', false),
  ('a8888888-8888-8888-8888-888888888888', 'Test', 'User8', 'user', 'America/Edmonton', false),
  ('a9999999-9999-9999-9999-999999999999', 'Test', 'User9', 'user', 'America/Edmonton', false),
  ('b1111111-1111-1111-1111-111111111111', 'Staff', 'User1', 'staff', 'America/Edmonton', false),
  ('b2222222-2222-2222-2222-222222222222', 'Staff', 'User2', 'staff', 'America/Edmonton', false),
  ('b3333333-3333-3333-3333-333333333333', 'Staff', 'User3', 'org_admin', 'America/Edmonton', false),
  ('b4444444-4444-4444-4444-444444444444', 'Admin', 'User1', 'admin', 'America/Edmonton', true),
  ('b5555555-5555-5555-5555-555555555555', 'Admin', 'User2', 'admin', 'America/Edmonton', true),
  ('b6666666-6666-6666-6666-666666666666', 'Test', 'User10', 'user', 'America/Edmonton', false);

-- Create privacy consents (varied opt-in rates)
INSERT INTO privacy_consents (user_id, location_sharing, orb_sharing, reflections_sharing, notifications_enabled, research_participation) VALUES
  ('a1111111-1111-1111-1111-111111111111', true, true, false, true, true),
  ('a2222222-2222-2222-2222-222222222222', true, false, true, true, false),
  ('a3333333-3333-3333-3333-333333333333', false, true, true, false, true),
  ('a4444444-4444-4444-4444-444444444444', true, true, true, true, true),
  ('a5555555-5555-5555-5555-555555555555', false, false, true, true, false),
  ('a6666666-6666-6666-6666-666666666666', true, true, false, false, true),
  ('a7777777-7777-7777-7777-777777777777', true, false, true, true, true),
  ('a8888888-8888-8888-8888-888888888888', false, true, false, true, false),
  ('a9999999-9999-9999-9999-999999999999', true, true, true, false, true),
  ('b1111111-1111-1111-1111-111111111111', true, true, true, true, true),
  ('b2222222-2222-2222-2222-222222222222', true, false, true, true, true),
  ('b3333333-3333-3333-3333-333333333333', false, true, true, true, false),
  ('b4444444-4444-4444-4444-444444444444', true, true, true, true, true),
  ('b5555555-5555-5555-5555-555555555555', true, true, false, true, true),
  ('b6666666-6666-6666-6666-666666666666', false, false, false, false, false);

-- Create check-ins for the past 30 days
-- Some users with 7-day streaks, some without
DO $$
DECLARE
  user_rec RECORD;
  day_offset INTEGER;
  check_hour INTEGER;
  should_checkin BOOLEAN;
BEGIN
  FOR user_rec IN SELECT id, email FROM users WHERE email LIKE 'test%@kpi.test' LOOP
    FOR day_offset IN 0..30 LOOP
      -- Determine if this user should check in on this day
      -- Users 1-5 have perfect 7-day streaks in the last week
      -- Users 6-8 have sporadic check-ins
      -- Users 9-10 check in regularly but not streaks
      
      IF user_rec.email IN ('test1@kpi.test', 'test2@kpi.test', 'test3@kpi.test', 'test4@kpi.test', 'test5@kpi.test') THEN
        -- Perfect streak in last 7 days
        should_checkin := day_offset <= 7;
      ELSIF user_rec.email IN ('test6@kpi.test', 'test7@kpi.test', 'test8@kpi.test') THEN
        -- Sporadic check-ins
        should_checkin := RANDOM() > 0.5;
      ELSE
        -- Regular but not streak
        should_checkin := day_offset <= 20 AND RANDOM() > 0.3;
      END IF;
      
      IF should_checkin THEN
        -- Determine check-in hour (for Explore unlock compliance)
        -- Users 1-3 check in before 10 AM
        -- Others check in at random times
        IF user_rec.email IN ('test1@kpi.test', 'test2@kpi.test', 'test3@kpi.test') AND day_offset <= 7 THEN
          check_hour := FLOOR(RANDOM() * 10)::INTEGER; -- 0-9 AM
        ELSE
          check_hour := FLOOR(RANDOM() * 24)::INTEGER; -- Any hour
        END IF;
        
        -- Create 1-2 check-ins per day
        FOR i IN 1..(1 + FLOOR(RANDOM() * 2)::INTEGER) LOOP
          INSERT INTO checkins (
            user_id, 
            timestamp, 
            checkin_date,
            dimension,
            mood_level_1_6,
            mood_type,
            affect_tags,
            local_tz,
            crisis_flagged
          ) VALUES (
            user_rec.id,
            CURRENT_DATE - INTERVAL '1 day' * day_offset + INTERVAL '1 hour' * (check_hour + i - 1),
            CURRENT_DATE - day_offset,
            CASE WHEN RANDOM() > 0.5 THEN 'valence' ELSE 'arousal' END,
            FLOOR(RANDOM() * 6 + 1)::INTEGER,
            CASE 
              WHEN RANDOM() < 0.2 THEN 'clear'
              WHEN RANDOM() < 0.4 THEN 'sunny'
              WHEN RANDOM() < 0.6 THEN 'cloudy'
              WHEN RANDOM() < 0.8 THEN 'rainy'
              ELSE 'stormy'
            END,
            ARRAY['focused', 'calm', 'energized'],
            'America/Edmonton',
            RANDOM() < 0.05 -- 5% chance of crisis flag
          );
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Create staff dashboard views (audit log entries)
INSERT INTO audit_log (actor_id, action, timestamp, resource_type)
SELECT 
  user_id,
  'dashboard_view',
  CURRENT_TIMESTAMP - INTERVAL '1 day' * FLOOR(RANDOM() * 30),
  'dashboard'
FROM profiles 
WHERE role IN ('staff', 'admin', 'org_admin')
CROSS JOIN generate_series(1, FLOOR(RANDOM() * 10 + 1)::INTEGER);

-- Create program views and sign-ups for referral conversion
-- First, ensure we have some test programs
INSERT INTO programs (id, title, description, tags, free, city) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Test Basketball Program', 'Youth basketball', ARRAY['sports', 'team'], true, 'Edmonton'),
  ('c2222222-2222-2222-2222-222222222222', 'Test Music Program', 'Music lessons', ARRAY['music', 'creative'], false, 'Edmonton'),
  ('c3333333-3333-3333-3333-333333333333', 'Test Art Program', 'Art classes', ARRAY['art', 'creative'], true, 'Calgary')
ON CONFLICT DO NOTHING;

-- Create program views
INSERT INTO audit_log (actor_id, action, resource_id, resource_type, timestamp)
SELECT 
  u.id,
  'view',
  p.id::text,
  'program',
  CURRENT_TIMESTAMP - INTERVAL '1 day' * FLOOR(RANDOM() * 30)
FROM users u
CROSS JOIN programs p
WHERE u.email LIKE 'test%@kpi.test'
  AND RANDOM() < 0.4; -- 40% chance of viewing

-- Create program sign-ups (saved programs)
INSERT INTO saved_programs (user_id, program_id, created_at)
SELECT DISTINCT
  u.id,
  p.id,
  CURRENT_TIMESTAMP - INTERVAL '1 day' * FLOOR(RANDOM() * 30)
FROM users u
CROSS JOIN programs p
WHERE u.email LIKE 'test%@kpi.test'
  AND RANDOM() < 0.2 -- 20% conversion rate
  AND EXISTS (
    SELECT 1 FROM audit_log 
    WHERE actor_id = u.id 
    AND resource_id = p.id::text
    AND action = 'view'
  )
ON CONFLICT DO NOTHING;

-- Create Ximi conversations with crisis events
INSERT INTO ximi_conversations (
  user_id, 
  mode, 
  user_message, 
  ximi_response,
  crisis_detected,
  crisis_keywords,
  created_at
)
SELECT 
  id,
  'sibling',
  CASE 
    WHEN RANDOM() < 0.1 THEN 'I feel really hopeless and don''t know what to do'
    WHEN RANDOM() < 0.2 THEN 'Everything feels overwhelming'
    ELSE 'How can I manage my stress better?'
  END,
  'I understand you''re going through a tough time. Let''s talk about it.',
  RANDOM() < 0.15, -- 15% crisis detection
  CASE 
    WHEN RANDOM() < 0.15 THEN ARRAY['hopeless', 'overwhelmed']
    ELSE ARRAY[]::text[]
  END,
  CURRENT_TIMESTAMP - INTERVAL '1 hour' * FLOOR(RANDOM() * 720)
FROM users
WHERE email LIKE 'test%@kpi.test'
  AND RANDOM() < 0.6; -- 60% of users have conversations

-- Create crisis support clicks for some crisis events
INSERT INTO audit_log (actor_id, action, timestamp, resource_type)
SELECT 
  user_id,
  'crisis_support_click',
  created_at + INTERVAL '1 minute' * FLOOR(RANDOM() * 30 + 1), -- 1-30 minutes after detection
  'crisis_support'
FROM ximi_conversations
WHERE crisis_detected = true
  AND RANDOM() < 0.8; -- 80% click support links

-- Display summary of created test data
SELECT 'Test data created successfully!' as message;
SELECT 'Users created:' as category, COUNT(*) as count FROM users WHERE email LIKE '%@kpi.test'
UNION ALL
SELECT 'Check-ins created:', COUNT(*) FROM checkins WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@kpi.test')
UNION ALL  
SELECT 'Staff/admin users:', COUNT(*) FROM profiles WHERE role IN ('staff', 'admin', 'org_admin') AND user_id IN (SELECT id FROM users WHERE email LIKE '%@kpi.test')
UNION ALL
SELECT 'Crisis events:', COUNT(*) FROM ximi_conversations WHERE crisis_detected = true AND user_id IN (SELECT id FROM users WHERE email LIKE '%@kpi.test');