-- Migration 0016: Add missing indexes for query performance
-- These indexes cover commonly queried foreign key columns that lacked indexes

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvps_program_id ON rsvps (program_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_programs_program_id ON saved_programs (program_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mood_tasks_program_event_id ON mood_tasks (program_event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_logs_user_id ON admin_logs (user_id);
