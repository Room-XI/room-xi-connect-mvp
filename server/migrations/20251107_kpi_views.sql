-- KPI Views and Supporting Tables for Dashboard
-- Created: 2025-11-07

-- First, ensure audit_log table exists (needed for tracking)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_id TEXT,
  resource_type TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_action ON audit_log(actor_id, action, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_id, resource_type);

-- Add role column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'role') 
  THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- View 1: Daily Check-in Rate
DROP VIEW IF EXISTS kpi_daily_checkin_rate CASCADE;
CREATE VIEW kpi_daily_checkin_rate AS
WITH daily_stats AS (
  SELECT 
    DATE(timestamp) as day,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_checkins
  FROM checkins
  WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY DATE(timestamp)
)
SELECT 
  day,
  unique_users as dau,
  total_checkins,
  CASE 
    WHEN unique_users > 0 THEN ROUND((total_checkins::numeric / unique_users), 2)
    ELSE 0
  END as checkins_per_user,
  CASE 
    WHEN unique_users < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM daily_stats
ORDER BY day DESC;

-- View 2: 7-Day Streak Completion
DROP VIEW IF EXISTS kpi_streak_completion CASCADE;
CREATE VIEW kpi_streak_completion AS
WITH user_streaks AS (
  SELECT 
    user_id,
    COUNT(DISTINCT DATE(timestamp)) as days_checked_in,
    MIN(DATE(timestamp)) as first_checkin,
    MAX(DATE(timestamp)) as last_checkin,
    CASE 
      WHEN COUNT(DISTINCT DATE(timestamp)) >= 7 
        AND (MAX(DATE(timestamp)) - MIN(DATE(timestamp))) <= 6
      THEN true
      ELSE false
    END as has_7day_streak
  FROM checkins
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_active_users,
  COUNT(*) FILTER (WHERE has_7day_streak) as users_with_streak,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE has_7day_streak)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as streak_completion_percent,
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM user_streaks;

-- View 3: Explore Unlock Compliance
DROP VIEW IF EXISTS kpi_explore_unlock CASCADE;
CREATE VIEW kpi_explore_unlock AS
WITH morning_checkins AS (
  SELECT 
    c.user_id,
    DATE(c.timestamp) as checkin_date,
    EXTRACT(HOUR FROM c.timestamp AT TIME ZONE COALESCE(p.timezone, 'America/Edmonton')) as hour,
    CASE 
      WHEN EXTRACT(HOUR FROM c.timestamp AT TIME ZONE COALESCE(p.timezone, 'America/Edmonton')) < 10 
      THEN true 
      ELSE false 
    END as unlocked_explore
  FROM checkins c
  LEFT JOIN profiles p ON c.user_id = p.user_id
  WHERE c.timestamp >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  checkin_date,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT user_id) FILTER (WHERE unlocked_explore) as users_unlocked,
  CASE 
    WHEN COUNT(DISTINCT user_id) > 0
    THEN ROUND((COUNT(DISTINCT user_id) FILTER (WHERE unlocked_explore)::numeric / COUNT(DISTINCT user_id)) * 100, 2)
    ELSE 0
  END as unlock_compliance_percent,
  CASE 
    WHEN COUNT(DISTINCT user_id) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM morning_checkins
GROUP BY checkin_date
ORDER BY checkin_date DESC;

-- View 4: Opt-in Rates (Privacy Consents)
DROP VIEW IF EXISTS kpi_optin_rates CASCADE;
CREATE VIEW kpi_optin_rates AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE location_sharing = true) as location_optin,
  COUNT(*) FILTER (WHERE orb_sharing = true) as orb_optin,
  COUNT(*) FILTER (WHERE reflections_sharing = true) as reflections_optin,
  COUNT(*) FILTER (WHERE notifications_enabled = true) as notifications_optin,
  COUNT(*) FILTER (WHERE research_participation = true) as research_optin,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE location_sharing = true)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as location_percent,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE orb_sharing = true)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as orb_percent,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE reflections_sharing = true)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as reflections_percent,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE research_participation = true)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as research_percent,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE notifications_enabled = true)::numeric / COUNT(*)) * 100, 2)
    ELSE 0
  END as notifications_percent,
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM privacy_consents;

-- View 5: Staff Weekly Dashboard Use
DROP VIEW IF EXISTS kpi_staff_dashboard_use CASCADE;
CREATE VIEW kpi_staff_dashboard_use AS
WITH staff_activity AS (
  SELECT 
    p.user_id,
    p.role,
    DATE_TRUNC('week', al.timestamp) as week,
    COUNT(*) as dashboard_views
  FROM profiles p
  LEFT JOIN audit_log al ON p.user_id = al.actor_id
  WHERE p.role IN ('staff', 'admin', 'org_admin')
    AND al.action = 'dashboard_view'
    AND al.timestamp >= CURRENT_DATE - INTERVAL '4 weeks'
  GROUP BY p.user_id, p.role, DATE_TRUNC('week', al.timestamp)
),
all_staff AS (
  SELECT 
    user_id,
    generate_series(
      DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks'),
      DATE_TRUNC('week', CURRENT_DATE),
      INTERVAL '1 week'
    ) as week
  FROM profiles
  WHERE role IN ('staff', 'admin', 'org_admin')
)
SELECT 
  as_data.week,
  COUNT(DISTINCT as_data.user_id) as total_staff,
  COUNT(DISTINCT sa.user_id) as staff_with_views,
  CASE 
    WHEN COUNT(DISTINCT as_data.user_id) > 0
    THEN ROUND((COUNT(DISTINCT sa.user_id)::numeric / COUNT(DISTINCT as_data.user_id)) * 100, 2)
    ELSE 0
  END as usage_percent,
  CASE 
    WHEN COUNT(DISTINCT as_data.user_id) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM all_staff as_data
LEFT JOIN staff_activity sa ON as_data.user_id = sa.user_id AND as_data.week = sa.week
GROUP BY as_data.week
ORDER BY as_data.week DESC;

-- View 6: Referral Conversion (Program page views to sign-ups)
DROP VIEW IF EXISTS kpi_referral_conversion CASCADE;
CREATE VIEW kpi_referral_conversion AS
WITH program_stats AS (
  SELECT 
    p.id as program_id,
    p.title,
    COUNT(DISTINCT al.actor_id) as unique_views,
    COUNT(DISTINCT sp.user_id) as signups
  FROM programs p
  LEFT JOIN audit_log al ON al.resource_id = p.id::text 
    AND al.resource_type = 'program'
    AND al.action = 'view'
    AND al.timestamp >= CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN saved_programs sp ON sp.program_id = p.id
    AND sp.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.id, p.title
)
SELECT 
  program_id,
  title,
  unique_views,
  signups,
  CASE 
    WHEN unique_views > 0
    THEN ROUND((signups::numeric / unique_views) * 100, 2)
    ELSE 0
  END as conversion_percent,
  CASE 
    WHEN unique_views < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM program_stats
WHERE unique_views > 0 OR signups > 0
ORDER BY unique_views DESC;

-- View 7: Crisis Routing Time (Time from detection to support link click)
DROP VIEW IF EXISTS kpi_crisis_routing CASCADE;
CREATE VIEW kpi_crisis_routing AS
WITH crisis_events AS (
  SELECT 
    xc.user_id,
    xc.created_at as crisis_detected_at,
    MIN(al.timestamp) as support_clicked_at,
    EXTRACT(EPOCH FROM (MIN(al.timestamp) - xc.created_at)) / 60 as minutes_to_support
  FROM ximi_conversations xc
  LEFT JOIN audit_log al ON al.actor_id = xc.user_id
    AND al.action = 'crisis_support_click'
    AND al.timestamp > xc.created_at
    AND al.timestamp <= xc.created_at + INTERVAL '1 hour'
  WHERE xc.crisis_detected = true
    AND xc.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY xc.user_id, xc.created_at
)
SELECT 
  COUNT(*) as total_crisis_events,
  COUNT(*) FILTER (WHERE support_clicked_at IS NOT NULL) as events_with_support,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY minutes_to_support) FILTER (WHERE minutes_to_support IS NOT NULL) as median_minutes,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY minutes_to_support) FILTER (WHERE minutes_to_support IS NOT NULL) as q1_minutes,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY minutes_to_support) FILTER (WHERE minutes_to_support IS NOT NULL) as q3_minutes,
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM crisis_events;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp_user ON checkins(timestamp, user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user ON privacy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_ximi_crisis ON ximi_conversations(crisis_detected, created_at) WHERE crisis_detected = true;
CREATE INDEX IF NOT EXISTS idx_saved_programs_created ON saved_programs(created_at);

-- Create aggregated view for dashboard summary
DROP VIEW IF EXISTS kpi_dashboard_summary CASCADE;
CREATE VIEW kpi_dashboard_summary AS
SELECT 
  CURRENT_TIMESTAMP as generated_at,
  -- Daily check-ins (today)
  (SELECT jsonb_build_object(
    'dau', dau,
    'total_checkins', total_checkins,
    'checkins_per_user', checkins_per_user
  ) FROM kpi_daily_checkin_rate WHERE day = CURRENT_DATE LIMIT 1) as daily_checkins,
  
  -- Streak completion
  (SELECT jsonb_build_object(
    'total_active_users', total_active_users,
    'users_with_streak', users_with_streak,
    'completion_percent', streak_completion_percent
  ) FROM kpi_streak_completion) as streak_completion,
  
  -- Opt-in rates
  (SELECT jsonb_build_object(
    'total_users', total_users,
    'location_percent', location_percent,
    'orb_percent', orb_percent,
    'reflections_percent', reflections_percent,
    'research_percent', research_percent
  ) FROM kpi_optin_rates) as opt_in_rates,
  
  -- Crisis routing
  (SELECT jsonb_build_object(
    'total_events', total_crisis_events,
    'events_with_support', events_with_support,
    'median_minutes', median_minutes
  ) FROM kpi_crisis_routing) as crisis_routing;