-- Room XI Connect - Comprehensive Database Migration
-- Generated: 2024-10-31
-- Database: Neon PostgreSQL (NOT Supabase Auth)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ==============================================
-- USERS & AUTH (Session-based, not Supabase)
-- ==============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==============================================
-- PROGRAMS
-- ==============================================

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  free BOOLEAN NOT NULL DEFAULT true,
  indoor BOOLEAN,
  outdoor BOOLEAN,
  cost_cents INTEGER,
  location_name TEXT,
  address TEXT,
  city TEXT,
  lat TEXT,
  lng TEXT,
  organizer TEXT,
  website TEXT,
  accessibility_notes TEXT,
  next_start TIMESTAMPTZ,
  next_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_tags ON programs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_programs_free ON programs(free);
CREATE INDEX IF NOT EXISTS idx_programs_location ON programs(city, lat, lng);

-- ==============================================
-- SAVED PROGRAMS
-- ==============================================

CREATE TABLE IF NOT EXISTS saved_programs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_programs_user ON saved_programs(user_id);

-- ==============================================
-- CHECK-INS
-- ==============================================

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  checkin_date DATE NOT NULL,
  dimension TEXT NOT NULL,
  mood_level_1_6 INTEGER NOT NULL CHECK (mood_level_1_6 BETWEEN 1 AND 6),
  mood_type TEXT,
  affect_tags TEXT[] NOT NULL DEFAULT '{}',
  wellness_dimensions TEXT[] DEFAULT '{}',
  note TEXT,
  local_tz TEXT,
  crisis_flags JSONB,
  crisis_flagged BOOLEAN DEFAULT FALSE,
  crisis_resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS checkins_one_per_day_idx ON checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS checkins_user_ts_idx ON checkins(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS checkins_crisis_idx ON checkins(crisis_flagged, timestamp DESC);

-- ==============================================
-- PROFILES
-- ==============================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weights JSONB,
  scores JSONB,
  streak_count INTEGER DEFAULT 0,
  last_checkin_date DATE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Layer 1: Basic Info
  first_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  age INTEGER CHECK (age BETWEEN 13 AND 25),
  date_of_birth DATE,
  city TEXT,
  postal_code TEXT,
  timezone TEXT DEFAULT 'America/Edmonton',
  
  -- Layer 2: Safety Profile
  legal_first_name TEXT,
  legal_last_name TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Indigenous Self-Identification
  indigenous_identity TEXT CHECK (indigenous_identity IN ('first_nations', 'metis', 'inuit', 'prefer_not_to_say')),
  indigenous_community TEXT,
  
  -- Progress Tracking
  account_complete BOOLEAN DEFAULT FALSE,
  safety_profile_complete BOOLEAN DEFAULT FALSE,
  program_profile_complete BOOLEAN DEFAULT FALSE,
  
  -- XP system
  xp_points INTEGER DEFAULT 0,
  
  -- Ximi AI preferences
  ximi_consent BOOLEAN DEFAULT FALSE,
  ximi_mode TEXT DEFAULT 'sibling',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- ==============================================
-- XIDs (Pseudonymous Attendance Identifiers)
-- ==============================================

CREATE TABLE IF NOT EXISTS xids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xid_hash TEXT NOT NULL UNIQUE,
  checksum TEXT,
  tombstoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xids_user ON xids(user_id);
CREATE INDEX IF NOT EXISTS idx_xids_hash ON xids(xid_hash);

-- ==============================================
-- ATTENDANCE
-- ==============================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xid_id UUID NOT NULL REFERENCES xids(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
  site TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_xid_ts ON attendance(xid_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_program ON attendance(program_id, timestamp DESC);

-- ==============================================
-- GUARDIAN VERIFICATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS guardian_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_contact_type TEXT NOT NULL CHECK (guardian_contact_type IN ('email', 'phone')),
  guardian_contact_value TEXT NOT NULL,
  guardian_contact_hash TEXT NOT NULL,
  verification_token TEXT NOT NULL,
  verification_method TEXT CHECK (verification_method IN ('alberta_digital_id', 'email_link', 'sms_link')),
  pin_hash TEXT,
  verified_at TIMESTAMPTZ,
  verified_by_name TEXT,
  verified_by_ip TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_verifications_user ON guardian_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_verifications_token ON guardian_verifications(verification_token) WHERE verified_at IS NULL;

-- ==============================================
-- CONSENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS consents (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_use',
    'privacy_notice',
    'data_collection',
    'photo_internal',
    'photo_social_media',
    'photo_website',
    'photo_fundraising',
    'photo_story',
    'analytics_opt_in',
    'ai_personalization',
    'crash_reporting',
    'marketing_email',
    'marketing_sms'
  )),
  value BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  granted_by TEXT CHECK (granted_by IN ('self', 'guardian', 'staff')),
  evidence_ref TEXT,
  text_version TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- ==============================================
-- HEALTH PROFILES (HIA Compliance)
-- ==============================================

CREATE TABLE IF NOT EXISTS health_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,
  accessibility_needs TEXT,
  dietary_restrictions TEXT,
  parq_status TEXT CHECK (parq_status IN ('clear', 'refer', 'not_completed')),
  parq_completed_at TIMESTAMPTZ,
  
  -- HIA-Specific Consent
  health_data_consent BOOLEAN NOT NULL DEFAULT FALSE,
  health_consent_granted_at TIMESTAMPTZ,
  health_consent_ip TEXT,
  health_consent_user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- CONSENT EVENTS (Audit Trail)
-- ==============================================

CREATE TABLE IF NOT EXISTS consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('youth', 'guardian', 'staff', 'system')),
  event_type TEXT NOT NULL CHECK (event_type IN ('granted', 'revoked', 'updated', 'requested', 'verified')),
  consent_key TEXT,
  old_value BOOLEAN,
  new_value BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,
  evidence_ref TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_events_user ON consent_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_events_type ON consent_events(event_type, occurred_at DESC);

-- ==============================================
-- BREACH EVENTS (PIPA Compliance)
-- ==============================================

CREATE TABLE IF NOT EXISTS breach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_type TEXT NOT NULL CHECK (breach_type IN ('unauthorized_access', 'data_loss', 'ransomware', 'insider_threat', 'accidental_disclosure', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_user_count INTEGER,
  affected_user_ids UUID[],
  description TEXT NOT NULL,
  
  -- OIPC Notification Tracking (72-hour requirement)
  oipc_notification_required BOOLEAN NOT NULL DEFAULT FALSE,
  oipc_notified_at TIMESTAMPTZ,
  oipc_notification_method TEXT,
  oipc_reference_number TEXT,
  
  -- Individual Notification Tracking
  individuals_notified_at TIMESTAMPTZ,
  notification_method TEXT,
  guardians_notified_at TIMESTAMPTZ,
  
  -- Remediation
  remediation_steps TEXT,
  remediation_completed_at TIMESTAMPTZ,
  
  discovered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_events_discovered ON breach_events(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_breach_events_severity ON breach_events(severity, discovered_at DESC);

-- ==============================================
-- CRISIS SUPPORTS
-- ==============================================

CREATE TABLE IF NOT EXISTS crisis_supports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('call', 'textchat', 'inperson')),
  name TEXT NOT NULL,
  phone TEXT,
  text_code TEXT,
  chat_url TEXT,
  address TEXT,
  hours TEXT,
  notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_supports_region ON crisis_supports(region, category);

-- ==============================================
-- ADMIN LOGS
-- ==============================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_record JSONB,
  new_record JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_table ON admin_logs(table_name, timestamp DESC);

-- ==============================================
-- ORGANIZATIONS (Multi-org Expansion)
-- ==============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active, name);

-- ==============================================
-- ORG MEMBERS
-- ==============================================

CREATE TABLE IF NOT EXISTS org_members (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{"view_referrals": true, "create_referrals": false, "manage_programs": false}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id, role);

-- ==============================================
-- JOURNAL ENTRIES
-- ==============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood INTEGER,
  prompt TEXT,
  content TEXT,
  ximi_conversation BOOLEAN DEFAULT FALSE,
  ximi_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_youth ON journal_entries(youth_id, created_at DESC);

-- ==============================================
-- COPING SKILLS
-- ==============================================

CREATE TABLE IF NOT EXISTS coping_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  steps TEXT[] NOT NULL,
  duration_minutes INTEGER,
  difficulty TEXT,
  tags TEXT[] DEFAULT '{}',
  culturally_adapted BOOLEAN DEFAULT FALSE,
  cultural_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coping_skills_category ON coping_skills(category, active);

-- ==============================================
-- REFERRALS
-- ==============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  youth_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending_consent',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_from ON referrals(from_org_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_to ON referrals(to_org_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_youth ON referrals(youth_id, created_at DESC);

-- ==============================================
-- CASE NOTES
-- ==============================================

CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  youth_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_encrypted JSONB NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_org_youth ON case_notes(org_id, youth_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_notes_author ON case_notes(author_user_id, created_at DESC);

-- ==============================================
-- PROGRAM OUTCOMES
-- ==============================================

CREATE TABLE IF NOT EXISTS program_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  period_start DATE,
  period_end DATE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_outcomes_program ON program_outcomes(program_id, metric, recorded_at DESC);

-- ==============================================
-- AUDIT TRAIL (Comprehensive Logging)
-- ==============================================

CREATE TABLE IF NOT EXISTS audit_trail (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  record_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  result TEXT,
  error_message TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON audit_trail(table_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action, result, timestamp DESC);

-- ==============================================
-- XIMI CONVERSATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS ximi_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'sibling',
  user_message TEXT NOT NULL,
  ximi_response TEXT NOT NULL,
  mood_context TEXT,
  dimensions_context TEXT[] DEFAULT '{}',
  crisis_detected BOOLEAN DEFAULT FALSE,
  crisis_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ximi_user ON ximi_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ximi_crisis ON ximi_conversations(crisis_detected, created_at DESC);

-- ==============================================
-- SESSION STORAGE (for connect-pg-simple)
-- ==============================================

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
