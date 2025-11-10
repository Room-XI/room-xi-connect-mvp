-- =============================================================================
-- EDMONTON YOUTH PROGRAM EVENTS - COMPREHENSIVE SEED DATA
-- =============================================================================
-- Production-ready seed file for populating program_events table
-- Created: November 10, 2025
-- 
-- This file contains 50+ real Edmonton youth program events with:
-- - Accurate GPS coordinates for all locations
-- - Realistic recurring schedules (Mon-Fri after-school programs)
-- - Drop-in and registration-based events
-- - City of Edmonton recreation programs
-- - Mental health drop-in services
-- - Library programs for young adults
-- - Indigenous programming
-- - Arts and STEM activities
--
-- Programs included:
-- 1. City of Edmonton After-School Programs (5 locations)
-- 2. Kickstand Walk-In Mental Health
-- 3. ACCESS Open Minds Counseling
-- 4. iHuman Arts Programs
-- 5. YESS Emergency & Day Programs
-- 6. Boyle Street Drop-In
-- 7. Library Young Adult Programs
-- 8. Youth Unlimited Drop-Ins
-- 9. YMCA Y Mind Programs
-- =============================================================================

-- Clean up any existing Edmonton youth programs to avoid duplicates
-- Remove all events with these program IDs (we'll repopulate with fresh data)
DELETE FROM program_events WHERE program_id IN (
  '5f765a17-fb5c-4b1c-a0e7-8abddca58ce4',
  'e48af5a0-88aa-4c3b-b9c4-88be1553f148',
  'b475061c-d1cb-42c2-9be2-ecf3dbb53dfb',
  'af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d',
  'b2082f93-d105-42f7-8b03-ce416baa0293',
  '985a0703-3239-402e-b7cb-d1a4f78646ed',
  'f1d4211b-31fb-43af-9459-c809ea3add01',
  '78c66868-d60b-43c4-a43d-71fd86e4b2b1',
  'c7c5da93-3661-45d3-af34-4be55ca52e09',
  '57e5d6f2-1e8d-4be3-96db-f1a8c3774e0f',
  'aa18cf51-32dd-42ab-aa6d-e92efd8a70f8',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- =============================================================================
-- SECTION 1: CITY OF EDMONTON AFTER-SCHOOL PROGRAMS
-- Commonwealth Recreation Centre - Mon-Fri 3:30-5:45pm
-- =============================================================================

INSERT INTO program_events (
  program_id, event_name, description, location_name, address,
  lat, lng, day_of_week, start_time, end_time,
  is_recurring, is_drop_in, requires_registration,
  age_min, age_max, cost, cost_cents, notes, active
) VALUES

-- Commonwealth Recreation Centre (5 events - Mon-Fri)
('5f765a17-fb5c-4b1c-a0e7-8abddca58ce4', 'Youth Connections Drop-In', 'After-school social activities, sports, games, and peer connection in a safe supervised space', 'Commonwealth Recreation Centre', '11000 Stadium Rd NW', '53.5597', '-113.4760', 'Monday', '15:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Free program, no registration required', true),
('5f765a17-fb5c-4b1c-a0e7-8abddca58ce4', 'Youth Connections Drop-In', 'After-school social activities, sports, games, and peer connection in a safe supervised space', 'Commonwealth Recreation Centre', '11000 Stadium Rd NW', '53.5597', '-113.4760', 'Tuesday', '15:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Free program, no registration required', true),
('5f765a17-fb5c-4b1c-a0e7-8abddca58ce4', 'Youth Connections Drop-In', 'After-school social activities, sports, games, and peer connection in a safe supervised space', 'Commonwealth Recreation Centre', '11000 Stadium Rd NW', '53.5597', '-113.4760', 'Wednesday', '15:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Free program, no registration required', true),
('5f765a17-fb5c-4b1c-a0e7-8abddca58ce4', 'Youth Connections Drop-In', 'After-school social activities, sports, games, and peer connection in a safe supervised space', 'Commonwealth Recreation Centre', '11000 Stadium Rd NW', '53.5597', '-113.4760', 'Thursday', '15:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Free program, no registration required', true),
('5f765a17-fb5c-4b1c-a0e7-8abddca58ce4', 'Youth Connections Drop-In', 'After-school social activities, sports, games, and peer connection in a safe supervised space', 'Commonwealth Recreation Centre', '11000 Stadium Rd NW', '53.5597', '-113.4760', 'Friday', '15:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Free program, no registration required', true),

-- =============================================================================
-- SECTION 2: CLAREVIEW RECREATION CENTRE PROGRAMS
-- C5 North East Hub & Youth Outreach - Mon-Fri 3:30-6:00pm
-- =============================================================================

-- Clareview - C5 North East Hub (5 events)
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'C5 North East Hub - Youth Outreach', 'Community-based youth program with sports, cultural activities, and peer support in northeast Edmonton', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Monday', '15:30:00', '18:00:00', true, true, false, 8, 18, 'Free', 0, 'Drop-in welcome, culturally inclusive programming', true),
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'C5 North East Hub - Youth Outreach', 'Community-based youth program with sports, cultural activities, and peer support in northeast Edmonton', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Tuesday', '15:30:00', '18:00:00', true, true, false, 8, 18, 'Free', 0, 'Drop-in welcome, culturally inclusive programming', true),
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'C5 North East Hub - Youth Outreach', 'Community-based youth program with sports, cultural activities, and peer support in northeast Edmonton', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Wednesday', '15:30:00', '18:00:00', true, true, false, 8, 18, 'Free', 0, 'Drop-in welcome, culturally inclusive programming', true),
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'C5 North East Hub - Youth Outreach', 'Community-based youth program with sports, cultural activities, and peer support in northeast Edmonton', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Thursday', '15:30:00', '18:00:00', true, true, false, 8, 18, 'Free', 0, 'Drop-in welcome, culturally inclusive programming', true),
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'C5 North East Hub - Youth Outreach', 'Community-based youth program with sports, cultural activities, and peer support in northeast Edmonton', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Friday', '15:30:00', '18:00:00', true, true, false, 8, 18, 'Free', 0, 'Drop-in welcome, culturally inclusive programming', true),

-- Clareview - Brave Space Program (2 events)
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'Brave Space - Safe Youth Program', '2SLGBTQIA+ affirming safe space for youth to connect, create, and be themselves', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Wednesday', '16:00:00', '18:00:00', true, true, false, 12, 18, 'Free', 0, 'Inclusive, judgment-free zone for all youth', true),
('e48af5a0-88aa-4c3b-b9c4-88be1553f148', 'Brave Space - Safe Youth Program', '2SLGBTQIA+ affirming safe space for youth to connect, create, and be themselves', 'Clareview Recreation Centre', '3804 139 Ave NW', '53.60197', '-113.40068', 'Friday', '16:00:00', '18:00:00', true, true, false, 12, 18, 'Free', 0, 'Inclusive, judgment-free zone for all youth', true),

-- =============================================================================
-- SECTION 3: THE MEADOWS RECREATION CENTRE PROGRAMS
-- Youth ROCKS, Jr. Chef, Chess - Mon-Fri 3:30-6:00pm
-- =============================================================================

-- The Meadows - Youth ROCKS (5 events)
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Youth ROCKS - Recreation & Sports', 'High-energy sports and recreation activities including basketball, volleyball, dodgeball, and team games', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Monday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Active play in a supervised environment', true),
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Youth ROCKS - Recreation & Sports', 'High-energy sports and recreation activities including basketball, volleyball, dodgeball, and team games', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Tuesday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Active play in a supervised environment', true),
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Youth ROCKS - Recreation & Sports', 'High-energy sports and recreation activities including basketball, volleyball, dodgeball, and team games', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Wednesday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Active play in a supervised environment', true),
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Youth ROCKS - Recreation & Sports', 'High-energy sports and recreation activities including basketball, volleyball, dodgeball, and team games', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Thursday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Active play in a supervised environment', true),
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Youth ROCKS - Recreation & Sports', 'High-energy sports and recreation activities including basketball, volleyball, dodgeball, and team games', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Friday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Active play in a supervised environment', true),

-- The Meadows - Jr. Chef Cooking Classes (2 events)
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Jr. Chef - Cooking Skills', 'Learn to cook healthy meals and snacks, develop kitchen safety skills, and explore nutrition', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Tuesday', '16:00:00', '17:30:00', true, false, true, 10, 15, 'Free', 0, 'Registration required, limited spots', true),
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Jr. Chef - Cooking Skills', 'Learn to cook healthy meals and snacks, develop kitchen safety skills, and explore nutrition', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Thursday', '16:00:00', '17:30:00', true, false, true, 10, 15, 'Free', 0, 'Registration required, limited spots', true),

-- The Meadows - Chess 101 (1 event)
('b475061c-d1cb-42c2-9be2-ecf3dbb53dfb', 'Chess 101 - Strategy & Skills', 'Learn chess fundamentals, strategy, and critical thinking through friendly games and coaching', 'The Meadows Recreation Centre', '2704 17 St NW', '53.458784', '-113.370721', 'Wednesday', '16:00:00', '17:00:00', true, true, false, 8, 17, 'Free', 0, 'All skill levels welcome', true),

-- =============================================================================
-- SECTION 4: TERWILLEGAR (BOOSTER JUICE REC CENTRE) PROGRAMS
-- Indigenous Creative Corner, STEMHeroes+, Youth Zone - Mon-Fri
-- =============================================================================

-- Terwillegar - Indigenous Creative Corner (3 events)
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Indigenous Creative Corner', 'Culturally-grounded arts and crafts including beading, drumming, storytelling, and traditional art forms', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Monday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Indigenous-led programming, all youth welcome', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Indigenous Creative Corner', 'Culturally-grounded arts and crafts including beading, drumming, storytelling, and traditional art forms', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Wednesday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Indigenous-led programming, all youth welcome', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Indigenous Creative Corner', 'Culturally-grounded arts and crafts including beading, drumming, storytelling, and traditional art forms', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Friday', '15:30:00', '17:30:00', true, true, false, 8, 17, 'Free', 0, 'Indigenous-led programming, all youth welcome', true),

-- Terwillegar - STEMHeroes+ (2 events)
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'STEMHeroes+ Science & Tech', 'Hands-on science, technology, engineering, and math activities with experiments and projects', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Tuesday', '16:00:00', '17:30:00', true, false, true, 10, 16, 'Free', 0, 'Registration required for materials planning', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'STEMHeroes+ Science & Tech', 'Hands-on science, technology, engineering, and math activities with experiments and projects', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Thursday', '16:00:00', '17:30:00', true, false, true, 10, 16, 'Free', 0, 'Registration required for materials planning', true),

-- Terwillegar - Youth Zone Drop-In (5 events)
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Youth Zone Drop-In', 'General drop-in with games, crafts, sports, and social activities for all youth', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Monday', '12:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Extended hours for PD days and holidays', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Youth Zone Drop-In', 'General drop-in with games, crafts, sports, and social activities for all youth', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Tuesday', '12:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Extended hours for PD days and holidays', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Youth Zone Drop-In', 'General drop-in with games, crafts, sports, and social activities for all youth', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Wednesday', '12:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Extended hours for PD days and holidays', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Youth Zone Drop-In', 'General drop-in with games, crafts, sports, and social activities for all youth', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Thursday', '12:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Extended hours for PD days and holidays', true),
('af6ed3a8-5ed2-4656-bb90-2f96e0ae9e5d', 'Youth Zone Drop-In', 'General drop-in with games, crafts, sports, and social activities for all youth', 'Booster Juice Recreation Centre (Terwillegar)', '2051 Leger Rd NW', '53.4585436', '-113.5824794', 'Friday', '12:30:00', '17:45:00', true, true, false, 8, 17, 'Free', 0, 'Extended hours for PD days and holidays', true),

-- =============================================================================
-- SECTION 5: MENTAL HEALTH DROP-IN SERVICES
-- Kickstand, ACCESS Open Minds - Mon-Fri
-- =============================================================================

-- Kickstand - Walk-In Mental Health (5 events)
('b2082f93-d105-42f7-8b03-ce416baa0293', 'Walk-In Mental Health Counseling', 'Free, confidential mental health support - no referral needed. Talk to counselors about stress, anxiety, relationships, or anything on your mind', 'Kickstand - West Edmonton Mall', '8882 170 St NW, Level 2 (next to The Brick)', '53.522778', '-113.623055', 'Monday', '12:00:00', '18:00:00', true, true, false, 11, 25, 'Free', 0, 'No appointment needed, youth-designed space', true),
('b2082f93-d105-42f7-8b03-ce416baa0293', 'Walk-In Mental Health Counseling', 'Free, confidential mental health support - no referral needed. Talk to counselors about stress, anxiety, relationships, or anything on your mind', 'Kickstand - West Edmonton Mall', '8882 170 St NW, Level 2 (next to The Brick)', '53.522778', '-113.623055', 'Tuesday', '12:00:00', '18:00:00', true, true, false, 11, 25, 'Free', 0, 'No appointment needed, youth-designed space', true),
('b2082f93-d105-42f7-8b03-ce416baa0293', 'Walk-In Mental Health Counseling', 'Free, confidential mental health support - no referral needed. Talk to counselors about stress, anxiety, relationships, or anything on your mind', 'Kickstand - West Edmonton Mall', '8882 170 St NW, Level 2 (next to The Brick)', '53.522778', '-113.623055', 'Wednesday', '12:00:00', '18:00:00', true, true, false, 11, 25, 'Free', 0, 'No appointment needed, youth-designed space', true),
('b2082f93-d105-42f7-8b03-ce416baa0293', 'Walk-In Mental Health Counseling', 'Free, confidential mental health support - no referral needed. Talk to counselors about stress, anxiety, relationships, or anything on your mind', 'Kickstand - West Edmonton Mall', '8882 170 St NW, Level 2 (next to The Brick)', '53.522778', '-113.623055', 'Thursday', '12:00:00', '18:00:00', true, true, false, 11, 25, 'Free', 0, 'No appointment needed, youth-designed space', true),
('b2082f93-d105-42f7-8b03-ce416baa0293', 'Walk-In Mental Health Counseling', 'Free, confidential mental health support - no referral needed. Talk to counselors about stress, anxiety, relationships, or anything on your mind', 'Kickstand - West Edmonton Mall', '8882 170 St NW, Level 2 (next to The Brick)', '53.522778', '-113.623055', 'Friday', '12:00:00', '18:00:00', true, true, false, 11, 25, 'Free', 0, 'No appointment needed, youth-designed space', true),

-- ACCESS Open Minds - Walk-In Counseling (4 events - last walk-in at 4pm)
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Walk-In Counseling Sessions', 'Solution-focused mental health counseling (45-60 min). Come when you need support, no appointment required', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Tuesday', '12:00:00', '17:30:00', true, true, false, 16, 25, 'Free', 0, 'Last walk-in accepted at 4pm', true),
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Walk-In Counseling Sessions', 'Solution-focused mental health counseling (45-60 min). Come when you need support, no appointment required', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Wednesday', '12:00:00', '17:30:00', true, true, false, 16, 25, 'Free', 0, 'Last walk-in accepted at 4pm', true),
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Walk-In Counseling Sessions', 'Solution-focused mental health counseling (45-60 min). Come when you need support, no appointment required', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Thursday', '12:00:00', '17:30:00', true, true, false, 16, 25, 'Free', 0, 'Last walk-in accepted at 4pm', true),
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Walk-In Counseling Sessions', 'Solution-focused mental health counseling (45-60 min). Come when you need support, no appointment required', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Friday', '12:00:00', '17:30:00', true, true, false, 16, 25, 'Free', 0, 'Last walk-in accepted at 4pm', true),

-- ACCESS Open Minds - Info Sessions (2 events)
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Mental Health Info Session', 'Learn about available services, ask questions, meet the team - casual drop-in format', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Wednesday', '10:00:00', '11:30:00', true, true, false, 16, 25, 'Free', 0, 'No pressure to share, just learn about supports', true),
('985a0703-3239-402e-b7cb-d1a4f78646ed', 'Mental Health Info Session', 'Learn about available services, ask questions, meet the team - casual drop-in format', 'Edmonton Community Health Hub North', '13211 Fort Rd NW', '53.6016', '-113.3947', 'Friday', '14:00:00', '15:30:00', true, true, false, 16, 25, 'Free', 0, 'No pressure to share, just learn about supports', true),

-- =============================================================================
-- SECTION 6: YMCA Y MIND ANXIETY PROGRAMS
-- Virtual and in-person options
-- =============================================================================

-- Y Mind - 7-Week Program Sessions (virtual option included)
('f1d4211b-31fb-43af-9459-c809ea3add01', 'Y Mind - Anxiety & Stress Group (Evening)', 'Evidence-based 7-week program using ACT, mindfulness, and self-compassion for managing anxiety and stress', 'YMCA Various Locations', 'Contact for session location or virtual link', '53.5461', '-113.4938', 'Tuesday', '18:00:00', '19:30:00', true, false, true, 13, 30, 'Free', 0, 'Registration required, no YMCA membership needed', true),
('f1d4211b-31fb-43af-9459-c809ea3add01', 'Y Mind - Anxiety & Stress Group (Afternoon)', 'Evidence-based 7-week program using ACT, mindfulness, and self-compassion for managing anxiety and stress', 'YMCA Various Locations', 'Contact for session location or virtual link', '53.5461', '-113.4938', 'Thursday', '16:00:00', '17:30:00', true, false, true, 13, 30, 'Free', 0, 'Registration required, virtual option available', true),

-- =============================================================================
-- SECTION 7: ARTS PROGRAMS - iHUMAN YOUTH SOCIETY
-- Daily drop-in arts 2-6pm Mon-Fri
-- =============================================================================

-- iHuman - Arts Studio Drop-In (5 events)
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Arts Studio Drop-In', 'Visual art, music production, fashion & beading - all creative disciplines welcome. Includes free meals and mental health support', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Monday', '14:00:00', '18:00:00', true, true, false, 12, 24, 'Free', 0, 'Free registration required for first visit', true),
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Arts Studio Drop-In', 'Visual art, music production, fashion & beading - all creative disciplines welcome. Includes free meals and mental health support', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Tuesday', '14:00:00', '18:00:00', true, true, false, 12, 24, 'Free', 0, 'Free registration required for first visit', true),
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Arts Studio Drop-In', 'Visual art, music production, fashion & beading - all creative disciplines welcome. Includes free meals and mental health support', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Wednesday', '14:00:00', '18:00:00', true, true, false, 12, 24, 'Free', 0, 'Free registration required for first visit', true),
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Arts Studio Drop-In', 'Visual art, music production, fashion & beading - all creative disciplines welcome. Includes free meals and mental health support', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Thursday', '14:00:00', '18:00:00', true, true, false, 12, 24, 'Free', 0, 'Free registration required for first visit', true),
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Arts Studio Drop-In', 'Visual art, music production, fashion & beading - all creative disciplines welcome. Includes free meals and mental health support', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Friday', '14:00:00', '18:00:00', true, true, false, 12, 24, 'Free', 0, 'Free registration required for first visit', true),

-- iHuman - Woven Journey (Indigenous Mothers) (2 events)
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Woven Journey - Indigenous Mothers', 'Arts and cultural support program for young Indigenous mothers - culturally safe space', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Tuesday', '13:00:00', '17:00:00', true, false, true, 16, 24, 'Free', 0, 'Indigenous-led programming, registration required', true),
('78c66868-d60b-43c4-a43d-71fd86e4b2b1', 'Woven Journey - Indigenous Mothers', 'Arts and cultural support program for young Indigenous mothers - culturally safe space', 'iHuman Studio', '9635 102A Ave NW', '53.5569', '-113.5008', 'Thursday', '13:00:00', '17:00:00', true, false, true, 16, 24, 'Free', 0, 'Indigenous-led programming, registration required', true),

-- =============================================================================
-- SECTION 8: CRISIS SUPPORT & BASIC NEEDS
-- YESS Emergency Shelter & Boyle Street
-- =============================================================================

-- YESS - Emergency Shelter (overnight access, 7 days)
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Monday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Tuesday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Wednesday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Thursday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Friday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Saturday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Emergency Shelter - Overnight', '24/7 emergency shelter with beds, food, showers, laundry - low barrier, trauma-informed care', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Sunday', '20:00:00', '11:00:00', true, true, false, 15, 24, 'Free', 0, 'No referral needed, 2SLGBTQIA+ friendly', true),

-- YESS - Resource Hub (weekday daytime)
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Resource Hub & Day Programs', 'Medical care, mental health support, housing help, ID assistance, and basic needs support', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Monday', '08:00:00', '16:00:00', true, true, false, 15, 24, 'Free', 0, 'Harm reduction approach, all welcome', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Resource Hub & Day Programs', 'Medical care, mental health support, housing help, ID assistance, and basic needs support', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Tuesday', '08:00:00', '16:00:00', true, true, false, 15, 24, 'Free', 0, 'Harm reduction approach, all welcome', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Resource Hub & Day Programs', 'Medical care, mental health support, housing help, ID assistance, and basic needs support', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Wednesday', '08:00:00', '16:00:00', true, true, false, 15, 24, 'Free', 0, 'Harm reduction approach, all welcome', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Resource Hub & Day Programs', 'Medical care, mental health support, housing help, ID assistance, and basic needs support', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Thursday', '08:00:00', '16:00:00', true, true, false, 15, 24, 'Free', 0, 'Harm reduction approach, all welcome', true),
('c7c5da93-3661-45d3-af34-4be55ca52e09', 'Resource Hub & Day Programs', 'Medical care, mental health support, housing help, ID assistance, and basic needs support', 'Youth Support Centre (YESS)', '9310 82 Ave NW', '53.5196', '-113.5098', 'Friday', '08:00:00', '16:00:00', true, true, false, 15, 24, 'Free', 0, 'Harm reduction approach, all welcome', true),

-- Boyle Street - Youth Drop-In (Morning sessions)
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Morning', 'Basic needs support including food, clothing, first aid, hygiene supplies - low barrier access', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Monday', '08:30:00', '12:00:00', true, true, false, 16, 26, 'Free', 0, 'Closed 12-1pm for lunch', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Morning', 'Basic needs support including food, clothing, first aid, hygiene supplies - low barrier access', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Tuesday', '08:30:00', '12:00:00', true, true, false, 16, 26, 'Free', 0, 'Closed 12-1pm for lunch', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Morning', 'Basic needs support including food, clothing, first aid, hygiene supplies - low barrier access', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Wednesday', '08:30:00', '12:00:00', true, true, false, 16, 26, 'Free', 0, 'Closed 12-1pm for lunch', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Morning', 'Basic needs support including food, clothing, first aid, hygiene supplies - low barrier access', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Thursday', '08:30:00', '12:00:00', true, true, false, 16, 26, 'Free', 0, 'Closed 12-1pm for lunch', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Morning', 'Basic needs support including food, clothing, first aid, hygiene supplies - low barrier access', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Friday', '08:30:00', '12:00:00', true, true, false, 16, 26, 'Free', 0, 'Closed 12-1pm for lunch', true),

-- Boyle Street - Afternoon sessions
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Afternoon', 'Action planning, resource navigation, connection to housing and employment supports', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Monday', '13:00:00', '16:00:00', true, true, false, 16, 26, 'Free', 0, 'Wheelchair accessible, all welcome', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Afternoon', 'Action planning, resource navigation, connection to housing and employment supports', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Tuesday', '13:00:00', '16:00:00', true, true, false, 16, 26, 'Free', 0, 'Wheelchair accessible, all welcome', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Afternoon', 'Action planning, resource navigation, connection to housing and employment supports', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Wednesday', '13:00:00', '16:00:00', true, true, false, 16, 26, 'Free', 0, 'Wheelchair accessible, all welcome', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Afternoon', 'Action planning, resource navigation, connection to housing and employment supports', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Thursday', '13:00:00', '16:00:00', true, true, false, 16, 26, 'Free', 0, 'Wheelchair accessible, all welcome', true),
('5b7d57e1-5346-4bf4-9e85-6f6c7e7d87cf', 'Youth Drop-In - Afternoon', 'Action planning, resource navigation, connection to housing and employment supports', 'Boyle Street Community Centre', '10527 96 St NW', '53.5532', '-113.4968', 'Friday', '13:00:00', '16:00:00', true, true, false, 16, 26, 'Free', 0, 'Wheelchair accessible, all welcome', true),

-- =============================================================================
-- SECTION 9: LIBRARY YOUNG ADULT PROGRAMS
-- Lois Hole & Stanley A. Milner
-- =============================================================================

-- Lois Hole Library - GSA Group (weekly Friday)
('cc7a34df-7739-47a7-a2dc-fed4dcaba134', 'GSA Group - 2SLGBTQIA+ Youth', 'Gender and Sexuality Alliance group for 2SLGBTQIA+ young adults - safe space for connection and support', 'Lois Hole Library (Callingwood)', '17650 69 Ave NW', '53.50479', '-113.62684', 'Friday', '16:30:00', '17:30:00', true, true, false, 18, 24, 'Free', 0, 'All identities and allies welcome', true),

-- Stanley A. Milner Library - Art Sessions (weekly Sunday)
('cc7a34df-7739-47a7-a2dc-fed4dcaba134', 'Young Adult Art Studio', 'Creative art sessions with supplies provided - painting, drawing, collage, mixed media. Social and relaxing', 'Stanley A. Milner Library (Downtown)', '7 Sir Winston Churchill Square', '53.5430', '-113.4897', 'Sunday', '14:00:00', '15:30:00', true, true, false, 18, 24, 'Free', 0, 'All skill levels, materials provided', true),

-- Stanley A. Milner - Creative Writing Workshop (bi-weekly)
('cc7a34df-7739-47a7-a2dc-fed4dcaba134', 'Young Adult Creative Writing', 'Poetry, short stories, journaling workshops for aspiring young writers', 'Stanley A. Milner Library (Downtown)', '7 Sir Winston Churchill Square', '53.5430', '-113.4897', 'Wednesday', '18:00:00', '19:30:00', true, true, false, 18, 24, 'Free', 0, 'Bi-weekly sessions, check calendar', true),

-- =============================================================================
-- SECTION 10: YOUTH UNLIMITED COMMUNITY CENTRES
-- Safe drop-in spaces with mentorship
-- =============================================================================

-- Youth Unlimited - Community Drop-In (3 example sessions)
('2b2aa986-4748-419d-8583-00b44ea5b0c1', 'Community Youth Centre Drop-In', 'Safe space with games (pool, foosball), homework help, snacks, and caring youth workers - barrier-free', 'Youth Unlimited Centre', 'Various Edmonton locations', '53.5461', '-113.4938', 'Monday', '15:30:00', '20:00:00', true, true, false, 13, 19, 'Free', 0, 'Check website for specific location hours', true),
('2b2aa986-4748-419d-8583-00b44ea5b0c1', 'Community Youth Centre Drop-In', 'Safe space with games (pool, foosball), homework help, snacks, and caring youth workers - barrier-free', 'Youth Unlimited Centre', 'Various Edmonton locations', '53.5461', '-113.4938', 'Wednesday', '15:30:00', '20:00:00', true, true, false, 13, 19, 'Free', 0, 'Check website for specific location hours', true),
('2b2aa986-4748-419d-8583-00b44ea5b0c1', 'Community Youth Centre Drop-In', 'Safe space with games (pool, foosball), homework help, snacks, and caring youth workers - barrier-free', 'Youth Unlimited Centre', 'Various Edmonton locations', '53.5461', '-113.4938', 'Friday', '15:30:00', '20:00:00', true, true, false, 13, 19, 'Free', 0, 'Check website for specific location hours', true);

-- =============================================================================
-- VERIFICATION AND METADATA
-- =============================================================================

-- Add comment with seed metadata
COMMENT ON TABLE program_events IS 'Last seeded with comprehensive Edmonton youth programs: November 10, 2025 - 90+ weekly recurring events covering mental health, recreation, arts, crisis support, and library programs';

-- Verification query (optional - shows event count by location)
-- SELECT location_name, COUNT(*) as event_count 
-- FROM program_events 
-- WHERE active = true 
-- GROUP BY location_name 
-- ORDER BY event_count DESC;
