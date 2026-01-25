-- Crisis follow-up table for scheduling check-ins after crisis detection
-- This supports the safety feature of gentle follow-up messages

CREATE TABLE IF NOT EXISTS crisis_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  escalation_id UUID NOT NULL REFERENCES crisis_escalations(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  followup_type TEXT NOT NULL DEFAULT 'ximi_message',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crisis_followups_user_scheduled_idx ON crisis_followups(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS crisis_followups_status_idx ON crisis_followups(status, scheduled_for);
