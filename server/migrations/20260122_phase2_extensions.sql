-- Phase 2 Schema Extensions: Youth Workers, AI Interventions, Parent Consent
-- Date: 2026-01-22

-- Youth Workers table
CREATE TABLE IF NOT EXISTS youth_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'worker',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS youth_workers_email_idx ON youth_workers(email);
CREATE INDEX IF NOT EXISTS youth_workers_org_idx ON youth_workers(organization_id);

-- Youth Worker Assignments table
CREATE TABLE IF NOT EXISTS youth_worker_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_worker_id UUID NOT NULL REFERENCES youth_workers(id) ON DELETE CASCADE,
    youth_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    consent_level JSONB NOT NULL DEFAULT '{}',
    requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS youth_worker_assignments_worker_idx ON youth_worker_assignments(youth_worker_id);
CREATE INDEX IF NOT EXISTS youth_worker_assignments_youth_idx ON youth_worker_assignments(youth_id);
CREATE UNIQUE INDEX IF NOT EXISTS youth_worker_assignments_uniq ON youth_worker_assignments(youth_worker_id, youth_id);

-- AI Interventions table
CREATE TABLE IF NOT EXISTS ai_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL,
    delivery_channel VARCHAR(50) NOT NULL DEFAULT 'in_app_notification',
    cooldown_period_hours INTEGER DEFAULT 24,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_interventions_type_idx ON ai_interventions(intervention_type);
CREATE INDEX IF NOT EXISTS ai_interventions_active_idx ON ai_interventions(active);

-- User Intervention History table
CREATE TABLE IF NOT EXISTS user_intervention_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES ai_interventions(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ DEFAULT now(),
    interaction_type VARCHAR(100),
    interaction_details JSONB,
    outcome_mood_level INTEGER,
    feedback_rating VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS user_intervention_history_user_idx ON user_intervention_history(user_id);
CREATE INDEX IF NOT EXISTS user_intervention_history_intervention_idx ON user_intervention_history(intervention_id);
CREATE INDEX IF NOT EXISTS user_intervention_history_delivered_idx ON user_intervention_history(delivered_at);

-- Parent Youth Consent table (extends existing parent-youth relationship)
CREATE TABLE IF NOT EXISTS parent_youth_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    youth_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_level JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS parent_youth_consent_parent_idx ON parent_youth_consent(parent_id);
CREATE INDEX IF NOT EXISTS parent_youth_consent_youth_idx ON parent_youth_consent(youth_id);
CREATE UNIQUE INDEX IF NOT EXISTS parent_youth_consent_uniq ON parent_youth_consent(parent_id, youth_id);

-- Seed some default AI interventions
INSERT INTO ai_interventions (intervention_type, content, trigger_conditions, delivery_channel, cooldown_period_hours)
VALUES 
    ('gentle_nudge', 'Hey, just a gentle nudge to check in today. How are you feeling?', '{"mood": ["Cold", "Stormy"], "moodLevel": 4}', 'in_app_notification', 24),
    ('wellness_suggestion', 'I noticed you might be having a tough time. Maybe reaching out to a friend or doing something you enjoy could help?', '{"mood": ["Stormy", "Foggy"], "moodLevel": 4}', 'ximi_chat', 48),
    ('positive_reinforcement', 'Great job checking in! Taking time to reflect on how you feel is a powerful step in your wellness journey.', '{"mood": ["Clear", "Breezy"], "moodLevel": 1}', 'in_app_notification', 72),
    ('reflection_prompt', 'You''ve been consistent with your check-ins lately. What do you think has been helping you stay on track?', '{"streak": 7}', 'ximi_chat', 168)
ON CONFLICT DO NOTHING;
