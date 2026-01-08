-- KPI SQL Views (Supabase/Postgres)

CREATE OR REPLACE VIEW v_daily_checkins AS
SELECT date_trunc('day', created_at AT TIME ZONE 'America/Edmonton')::date AS day,
       COUNT(*) FILTER (WHERE type='checkin') AS checkins
FROM events
GROUP BY 1;

WITH first_unlock AS (
  SELECT user_xid,
         date_trunc('day', created_at AT TIME ZONE 'America/Edmonton')::date AS day,
         MIN(created_at AT TIME ZONE 'America/Edmonton') AS first_unlock_ts
  FROM explore_unlock_events
  GROUP BY 1,2
)
SELECT day,
       COUNT(*) FILTER (WHERE first_unlock_ts < (day + time '10:00')) AS unlocks_by_10,
       COUNT(*) AS users_with_unlock
INTO TEMP v_explore_unlocks
FROM first_unlock
GROUP BY 1;
