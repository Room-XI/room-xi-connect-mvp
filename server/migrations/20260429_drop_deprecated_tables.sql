-- T043: Drop deprecated database tables + KPI views
-- Date: 2026-04-29
--
-- Audit findings C7+C14 identified a set of tables and views with zero
-- production callsites under the canonical pilot runtime. After the legacy
-- back-office routers were retired in T041 and the pilot lockdown 410'd the
-- corresponding /api/* prefixes (T024), these schema objects became dead
-- weight. Dropping them keeps the schema honest and reduces backup volume.
--
-- WHAT IS DROPPED
-- ===============
-- Tables (Drizzle-managed; pgTable definitions removed from server/schema.ts):
--   - weekly_orb_snapshots         (orb-snapshots route + service deleted in T033)
--   - tournaments                  (out-of-pilot; /api/tournaments 410'd since T024)
--   - tournament_teams             (CASCADE child of tournaments)
--   - tournament_team_members      (CASCADE child of tournament_teams)
--   - tournament_invites           (CASCADE child of tournament_teams)
--   - tournament_registrations     (CASCADE child of tournaments)
--   - tournament_games             (CASCADE child of tournaments)
--   - tournament_standings         (CASCADE child of tournaments)
--
-- Tables (defensive — not present in dev DB, but DROP IF EXISTS protects any
-- legacy environment that may still carry them from earlier schema iterations):
--   - achievements                 (gamification; /api/achievements 410'd)
--   - orb_snapshots                (singular; predecessor of weekly_orb_snapshots)
--   - partner_consents             (legacy partner-org consent prototype)
--
-- Views (not Drizzle-managed; created by server/migrations/20251107_kpi_views.sql,
-- never wired to any frontend page):
--   - kpi_daily_checkin_rate
--   - kpi_streak_completion
--   - kpi_explore_unlock
--   - kpi_optin_rates
--   - kpi_staff_dashboard_use
--   - kpi_referral_conversion
--   - kpi_crisis_routing
--   - kpi_dashboard_summary        (aggregate of the above)
--
-- WHAT IS DELIBERATELY EXCLUDED (writers found during re-audit)
-- ============================================================
--   - sentiment_analyses
--       Live writer: server/services/sentimentOrchestrator.ts
--                    → invoked from server/routes/checkins.ts on every check-in.
--   - xip_points, xip_activities, xip_rewards, xip_reward_claims
--       Live writers: server/routes/xip.ts (gated behind ENABLE_XIP=false in
--                     pilot, but the code paths remain in the source tree).
-- These two table families remain in schema.ts and in the database; a
-- follow-up task is appropriate if/when the corresponding feature surfaces
-- are formally retired.
--
-- READ-PATH CLEANUP DONE ALONGSIDE THIS MIGRATION
-- ===============================================
-- Removing the tournament tables required gutting a small number of read
-- callsites that joined them; these were updated in the same change set:
--   - server/services/programSearch.ts  (tournament_game schedule rows)
--   - server/routes/youth-workers.ts    (worker /youth/:id/schedule)
--   - server/utils/tournamentNotifications.ts  (deleted; zero importers)
--   - server/seed-demo.js               (tournament demo block + cleanup)

BEGIN;

-- KPI views (drop first; some reference tables we are NOT dropping)
DROP VIEW IF EXISTS kpi_dashboard_summary CASCADE;
DROP VIEW IF EXISTS kpi_daily_checkin_rate CASCADE;
DROP VIEW IF EXISTS kpi_streak_completion CASCADE;
DROP VIEW IF EXISTS kpi_explore_unlock CASCADE;
DROP VIEW IF EXISTS kpi_optin_rates CASCADE;
DROP VIEW IF EXISTS kpi_staff_dashboard_use CASCADE;
DROP VIEW IF EXISTS kpi_referral_conversion CASCADE;
DROP VIEW IF EXISTS kpi_crisis_routing CASCADE;

-- Tournament family (drop children before parents; CASCADE handles any
-- residual FKs from app-level objects we missed)
DROP TABLE IF EXISTS tournament_standings CASCADE;
DROP TABLE IF EXISTS tournament_games CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS tournament_invites CASCADE;
DROP TABLE IF EXISTS tournament_team_members CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;

-- Orb snapshot tables
DROP TABLE IF EXISTS weekly_orb_snapshots CASCADE;
DROP TABLE IF EXISTS orb_snapshots CASCADE;

-- Defensive drops (not in dev DB; protect legacy envs)
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS partner_consents CASCADE;

COMMIT;
