-- KPI SQL Views for Room XI Connect
-- Implements 7 core metrics with differential privacy
-- Based on kpi_definitions.md

-- View 1: Daily Check-in Rate
CREATE OR REPLACE VIEW kpi_daily_checkin_rate AS
WITH daily_stats AS (
  SELECT 
    DATE(timestamp) as day,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_checkins
  FROM checkins
  WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
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
  -- Apply DP threshold
  CASE 
    WHEN unique_users < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM daily_stats
ORDER BY day DESC;

-- View 2: 7-Day Streak Completion
CREATE OR REPLACE VIEW kpi_streak_completion AS
WITH user_streaks AS (
  SELECT 
    user_id,
    COUNT(DISTINCT DATE(timestamp)) as days_checked_in,
    MIN(DATE(timestamp)) as first_checkin,
    MAX(DATE(timestamp)) as last_checkin,
    CASE 
      WHEN COUNT(DISTINCT DATE(timestamp)) >= 7 
        AND (MAX(DATE(timestamp)) - MIN(DATE(timestamp))) <= INTERVAL '7 days'
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
  -- Apply DP threshold
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM user_streaks;

-- View 3: Explore Unlock Compliance
-- (Tracks users who unlock Explore by checking in before 10:00 AM local)
CREATE OR REPLACE VIEW kpi_explore_unlock AS
WITH morning_checkins AS (
  SELECT 
    user_id,
    DATE(timestamp) as checkin_date,
    EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Edmonton') as hour,
    CASE 
      WHEN EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Edmonton') < 10 
      THEN true 
      ELSE false 
    END as unlocked_explore
  FROM checkins
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
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
  -- Apply DP threshold
  CASE 
    WHEN COUNT(DISTINCT user_id) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM morning_checkins
GROUP BY checkin_date
ORDER BY checkin_date DESC;

-- View 4: Opt-in Rates (Privacy Consents)
CREATE OR REPLACE VIEW kpi_optin_rates AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE location_sharing = true) as location_optin,
  COUNT(*) FILTER (WHERE orb_sharing = true) as orb_optin,
  COUNT(*) FILTER (WHERE reflections_sharing = true) as reflections_optin,
  COUNT(*) FILTER (WHERE notifications_enabled = true) as notifications_optin,
  COUNT(*) FILTER (WHERE research_participation = true) as research_optin,
  -- Calculate percentages
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
  -- Apply DP threshold
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM privacy_consents;

-- View 5: Staff Weekly Dashboard Use
CREATE OR REPLACE VIEW kpi_staff_dashboard_use AS
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
)
SELECT 
  week,
  COUNT(DISTINCT user_id) as total_staff,
  COUNT(DISTINCT user_id) FILTER (WHERE dashboard_views > 0) as staff_with_views,
  CASE 
    WHEN COUNT(DISTINCT user_id) > 0
    THEN ROUND((COUNT(DISTINCT user_id) FILTER (WHERE dashboard_views > 0)::numeric / COUNT(DISTINCT user_id)) * 100, 2)
    ELSE 0
  END as usage_percent,
  -- Apply DP threshold
  CASE 
    WHEN COUNT(DISTINCT user_id) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM staff_activity
GROUP BY week
ORDER BY week DESC;

-- View 6: Referral Conversion (Program page views to sign-ups)
CREATE OR REPLACE VIEW kpi_referral_conversion AS
WITH program_stats AS (
  SELECT 
    p.id as program_id,
    p.title,
    COUNT(DISTINCT al.actor_id) as unique_views,
    COUNT(DISTINCT sp.user_id) as signups
  FROM programs p
  LEFT JOIN audit_log al ON al.resource_id = p.id::text 
    AND al.action = 'program_view'
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
  -- Apply DP threshold
  CASE 
    WHEN unique_views < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM program_stats
ORDER BY unique_views DESC;

-- View 7: Crisis Routing Time (Time from detection to support link click)
CREATE OR REPLACE VIEW kpi_crisis_routing AS
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
  WHERE xc.crisis_detected = true
    AND xc.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY xc.user_id, xc.created_at
)
SELECT 
  COUNT(*) as total_crisis_events,
  COUNT(*) FILTER (WHERE support_clicked_at IS NOT NULL) as events_with_support,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY minutes_to_support) as median_minutes,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY minutes_to_support) as q1_minutes,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY minutes_to_support) as q3_minutes,
  -- Apply DP threshold
  CASE 
    WHEN COUNT(*) < 7 THEN 'suppressed'
    ELSE 'visible'
  END as privacy_status
FROM crisis_events;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp_user ON checkins(timestamp, user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user ON privacy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_action ON audit_log(actor_id, action, timestamp);
CREATE INDEX IF NOT EXISTS idx_ximi_crisis ON ximi_conversations(crisis_detected, created_at) WHERE crisis_detected = true;

-- Create materialized view for performance (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS kpi_daily_summary AS
SELECT 
  CURRENT_DATE as report_date,
  (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE DATE(timestamp) = CURRENT_DATE) as dau,
  (SELECT COUNT(*) FROM checkins WHERE DATE(timestamp) = CURRENT_DATE) as total_checkins,
  (SELECT COUNT(*) FROM profiles WHERE DATE(created_at) = CURRENT_DATE) as new_users,
  (SELECT COUNT(*) FILTER (WHERE location_sharing = true) FROM privacy_consents) as location_optins,
  (SELECT COUNT(*) FILTER (WHERE orb_sharing = true) FROM privacy_consents) as orb_optins,
  (SELECT COUNT(*) FROM ximi_conversations WHERE crisis_detected = true AND DATE(created_at) = CURRENT_DATE) as crisis_events
WITH DATA;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_kpi_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW kpi_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily refresh (would typically be done with pg_cron or external scheduler)
COMMENT ON FUNCTION refresh_kpi_summary() IS 'Should be called daily at 00:05 America/Edmonton';