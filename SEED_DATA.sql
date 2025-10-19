-- ============================================================================
-- Room XI Connect v2.0 - Seed Data
-- ============================================================================
-- This file contains SQL commands to seed initial data after migration
-- Run these commands in Supabase SQL Editor after applying the migration
-- ============================================================================

-- ============================================================================
-- 1. CREATE ROOM XI ORGANIZATION
-- ============================================================================

-- Insert Room XI as the primary organization
INSERT INTO organizations (name, type, contact_email, contact_phone, website, active)
VALUES (
  'Room XI',
  'nonprofit',
  'hello@roomxi.org',
  '+17801234567',  -- Replace with actual phone
  'https://roomxi.org',
  true
)
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Note: Save the returned ID to use in next steps
-- Example: '123e4567-e89b-12d3-a456-426614174000'

-- ============================================================================
-- 2. ADD ADMIN USERS TO ORGANIZATION
-- ============================================================================

-- Replace 'YOUR_USER_ID' with actual user IDs from auth.users table
-- Replace 'YOUR_ORG_ID' with the ID returned from step 1

-- Add primary admin
INSERT INTO org_members (org_id, user_id, role, permissions, active)
VALUES (
  'YOUR_ORG_ID',  -- Replace with org ID from step 1
  'YOUR_USER_ID',  -- Replace with your user ID
  'org_admin',
  '{"view_referrals": true, "create_referrals": true, "manage_programs": true, "manage_members": true}',
  true
)
ON CONFLICT (user_id, org_id) DO UPDATE
SET role = 'org_admin',
    permissions = '{"view_referrals": true, "create_referrals": true, "manage_programs": true, "manage_members": true}',
    active = true;

-- Add additional staff members (repeat as needed)
-- INSERT INTO org_members (org_id, user_id, role, permissions, active)
-- VALUES (
--   'YOUR_ORG_ID',
--   'STAFF_USER_ID',
--   'staff',
--   '{"view_referrals": true, "create_referrals": false, "manage_programs": false}',
--   true
-- );

-- ============================================================================
-- 3. SEED EDMONTON PROGRAMS
-- ============================================================================

-- Youth Drop-In Programs
INSERT INTO programs (
  title, 
  description, 
  tags, 
  free, 
  indoor, 
  outdoor,
  location_name, 
  address, 
  lat, 
  lng, 
  organizer, 
  next_start,
  active
) VALUES
(
  'Youth Drop-In',
  'Safe space for youth ages 13-25. Come hang out, play games, get snacks, and connect with peers in a judgment-free environment.',
  ARRAY['social', 'mental_health', 'recreation'],
  true,
  true,
  false,
  'Room XI Community Center',
  '123 Main Street, Edmonton, AB T5K 2P7',
  53.5461,
  -113.4938,
  'Room XI',
  NOW() + INTERVAL '1 day',
  true
),
(
  'Art Therapy Workshop',
  'Express yourself through creative art. No experience needed. All materials provided. Led by a registered art therapist.',
  ARRAY['mental_health', 'creative', 'therapy'],
  true,
  true,
  false,
  'Community Arts Center',
  '456 Jasper Avenue, Edmonton, AB T5J 1Z9',
  53.5444,
  -113.4909,
  'Edmonton Arts Council',
  NOW() + INTERVAL '3 days',
  true
),
(
  'Basketball Drop-In',
  'Casual basketball games every Thursday evening. All skill levels welcome. Great way to stay active and meet new friends.',
  ARRAY['recreation', 'sports', 'social'],
  true,
  true,
  false,
  'Terwillegar Recreation Centre',
  '2051 Leger Road NW, Edmonton, AB T6R 3V2',
  53.4584,
  -113.5542,
  'City of Edmonton',
  NOW() + INTERVAL '2 days',
  true
),
(
  'Mindfulness & Meditation',
  'Learn practical mindfulness techniques to manage stress and anxiety. Beginner-friendly sessions every Monday.',
  ARRAY['mental_health', 'wellness', 'meditation'],
  true,
  true,
  false,
  'Wellness Hub',
  '789 104 Street NW, Edmonton, AB T6E 2P4',
  53.5232,
  -113.4975,
  'Edmonton Mental Health Coalition',
  NOW() + INTERVAL '5 days',
  true
),
(
  'Indigenous Youth Circle',
  'Cultural gathering for Indigenous youth. Drumming, storytelling, and traditional teachings. Elders present.',
  ARRAY['cultural', 'indigenous', 'social'],
  true,
  true,
  false,
  'Amiskwaciy Academy',
  '11304 93 Street NW, Edmonton, AB T5B 4T1',
  53.5591,
  -113.4891,
  'Amiskwaciy Academy',
  NOW() + INTERVAL '7 days',
  true
),
(
  'LGBTQ2S+ Youth Group',
  'Safe and affirming space for LGBTQ2S+ youth to connect, share experiences, and build community.',
  ARRAY['social', 'mental_health', 'lgbtq'],
  true,
  true,
  false,
  'Pride Centre of Edmonton',
  '10612 124 Street NW, Edmonton, AB T5N 1S1',
  53.5525,
  -113.5229,
  'Pride Centre of Edmonton',
  NOW() + INTERVAL '4 days',
  true
),
(
  'Coding & Tech Workshop',
  'Learn to code! Build websites, apps, and games. Laptops provided. No experience needed.',
  ARRAY['education', 'technology', 'career'],
  true,
  true,
  false,
  'Edmonton Public Library - Stanley Milner',
  '7 Sir Winston Churchill Square, Edmonton, AB T5J 2V4',
  53.5438,
  -113.4909,
  'Edmonton Public Library',
  NOW() + INTERVAL '6 days',
  true
),
(
  'Music Jam Session',
  'Bring your instrument or voice and jam with other young musicians. All genres welcome.',
  ARRAY['creative', 'music', 'social'],
  true,
  true,
  false,
  'MacEwan University - Allard Hall',
  '10700 104 Avenue NW, Edmonton, AB T5J 4S2',
  53.5422,
  -113.5006,
  'MacEwan Music Students Association',
  NOW() + INTERVAL '8 days',
  true
);

-- ============================================================================
-- 4. VERIFY COPING SKILLS (Auto-Seeded)
-- ============================================================================

-- Check that coping skills were auto-seeded during migration
SELECT COUNT(*) as coping_skills_count FROM coping_skills;
-- Expected result: 30+ skills

-- View sample coping skills
SELECT category, title, difficulty 
FROM coping_skills 
ORDER BY category, difficulty 
LIMIT 10;

-- ============================================================================
-- 5. CREATE SAMPLE CRISIS SUPPORTS (Optional)
-- ============================================================================

-- Insert Edmonton-specific crisis resources
INSERT INTO crisis_supports (
  name,
  description,
  phone,
  sms,
  website,
  hours,
  category,
  location,
  active
) VALUES
(
  'Kids Help Phone',
  '24/7 support for young people across Canada. Call, text, or chat online.',
  '1-800-668-6868',
  'Text CONNECT to 686868',
  'https://kidshelpphone.ca',
  '24/7',
  'crisis',
  'National',
  true
),
(
  'Alberta Health Link',
  'Talk to a registered nurse 24/7 about health concerns.',
  '811',
  null,
  'https://www.albertahealthservices.ca/info/811.aspx',
  '24/7',
  'health',
  'Alberta',
  true
),
(
  'Edmonton Distress Line',
  'Emotional support and crisis intervention.',
  '780-482-4357',
  null,
  'https://www.edmontoncrisisservices.ca',
  '24/7',
  'crisis',
  'Edmonton',
  true
),
(
  'Support Network',
  'Mental health support and resources for youth and families.',
  '780-482-0198',
  null,
  'https://www.supportnetwork.ca',
  'Mon-Fri 8:30am-4:30pm',
  'mental_health',
  'Edmonton',
  true
);

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Verify organizations
SELECT id, name, type, active FROM organizations;

-- Verify org members
SELECT om.role, u.email, o.name as org_name
FROM org_members om
JOIN auth.users u ON om.user_id = u.id
JOIN organizations o ON om.org_id = o.id
WHERE om.active = true;

-- Verify programs
SELECT title, organizer, location_name, active 
FROM programs 
WHERE active = true
ORDER BY next_start;

-- Verify coping skills by category
SELECT category, COUNT(*) as count 
FROM coping_skills 
WHERE active = true
GROUP BY category 
ORDER BY category;

-- Verify crisis supports
SELECT name, category, phone, hours 
FROM crisis_supports 
WHERE active = true
ORDER BY category;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. Replace placeholder values (YOUR_ORG_ID, YOUR_USER_ID) with actual IDs
-- 2. Adjust program details (dates, locations, contacts) as needed
-- 3. Add more programs specific to your Edmonton partnerships
-- 4. Update crisis support resources with local contacts
-- 5. Run verification queries to ensure data was inserted correctly
--
-- For more information, see:
-- - V2_DEPLOYMENT_GUIDE.md
-- - README_V2.md
-- ============================================================================

