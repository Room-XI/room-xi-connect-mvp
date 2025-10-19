-- ============================================================================
-- Room XI Connect - Edmonton Multi-Org Expansion Migration
-- Version: 2.0
-- Date: October 2025
-- 
-- This migration adds:
-- - Multi-tenant organization system
-- - Referral and consent management
-- - Case notes with encryption
-- - Guardian verification
-- - Enhanced security and compliance features
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS & MEMBERSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) <= 200),
  type text NOT NULL CHECK (type IN ('nonprofit', 'school', 'government', 'healthcare')),
  contact_email text CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  contact_phone text CHECK (contact_phone ~ '^\+?1?\d{10}$'),
  address jsonb,
  website text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_active ON public.organizations (active, name);

CREATE TABLE IF NOT EXISTS public.org_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('org_admin', 'staff', 'school_staff', 'volunteer')),
  permissions jsonb DEFAULT '{"view_referrals": true, "create_referrals": false, "manage_programs": false}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_id)
);

CREATE INDEX idx_org_members_user ON public.org_members (user_id);
CREATE INDEX idx_org_members_org ON public.org_members (org_id, role);

-- ============================================================================
-- ENHANCE YOUTH PROFILES
-- ============================================================================

-- Add new columns to existing youth_profiles table
ALTER TABLE public.youth_profiles 
  ADD COLUMN IF NOT EXISTS guardian_name text CHECK (length(guardian_name) <= 200),
  ADD COLUMN IF NOT EXISTS guardian_email text CHECK (guardian_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  ADD COLUMN IF NOT EXISTS guardian_phone text CHECK (guardian_phone ~ '^\+?1?\d{10}$'),
  ADD COLUMN IF NOT EXISTS guardian_relationship text CHECK (guardian_relationship IN ('parent', 'legal_guardian', 'foster_parent', 'other')),
  ADD COLUMN IF NOT EXISTS guardian_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_first_name text CHECK (length(legal_first_name) <= 100),
  ADD COLUMN IF NOT EXISTS legal_last_name text CHECK (length(legal_last_name) <= 100),
  ADD COLUMN IF NOT EXISTS emergency_contact_name text CHECK (length(emergency_contact_name) <= 200),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text CHECK (emergency_contact_phone ~ '^\+?1?\d{10}$'),
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS indigenous_identity text CHECK (indigenous_identity IN ('first_nations', 'metis', 'inuit', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS indigenous_community text,
  ADD COLUMN IF NOT EXISTS account_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS safety_profile_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_default_share boolean NOT NULL DEFAULT false;

-- ============================================================================
-- JOURNAL ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood int CHECK (mood BETWEEN 1 AND 5),
  prompt text CHECK (length(prompt) <= 500),
  content text CHECK (length(content) <= 5000),
  ximi_conversation boolean DEFAULT false,
  ximi_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_youth ON public.journal_entries (youth_id, created_at DESC);

-- ============================================================================
-- COPING SKILLS & RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coping_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('anxiety', 'stress', 'sleep', 'anger', 'sadness', 'overwhelm', 'general')),
  title text NOT NULL CHECK (length(title) <= 200),
  description text CHECK (length(description) <= 1000),
  steps text[] NOT NULL,
  duration_minutes int CHECK (duration_minutes > 0),
  difficulty text CHECK (difficulty IN ('easy', 'moderate', 'advanced')),
  tags text[] DEFAULT '{}',
  culturally_adapted boolean DEFAULT false,
  cultural_notes text,
  active boolean NOT NULL DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coping_skills_category ON public.coping_skills (category, active);
CREATE INDEX idx_coping_skills_tags ON public.coping_skills USING GIN (tags);

-- ============================================================================
-- CONSENT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN (
    'share_intake',
    'referral',
    'case_notes',
    'updates',
    'photo_internal',
    'photo_social_media',
    'analytics_opt_in',
    'ai_personalization'
  )),
  status text NOT NULL CHECK (status IN ('pending', 'granted', 'revoked', 'expired')),
  guardian_email text,
  guardian_name text,
  guardian_verified boolean DEFAULT false,
  verification_token text UNIQUE,
  verification_sent_at timestamptz,
  verification_expires_at timestamptz,
  signed_at timestamptz,
  signed_by_ip inet,
  signed_by_user_agent text,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youth_id, grantee_org_id, scope)
);

CREATE INDEX idx_consents_youth ON public.consents (youth_id, status);
CREATE INDEX idx_consents_org ON public.consents (grantee_org_id, status);
CREATE INDEX idx_consents_verification ON public.consents (verification_token) WHERE status = 'pending';

-- ============================================================================
-- REFERRALS & CASE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  to_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  youth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text CHECK (length(summary) <= 500),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status text NOT NULL CHECK (status IN ('pending_consent', 'sent', 'accepted', 'declined', 'withdrawn', 'expired')) DEFAULT 'pending_consent',
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  access_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_from ON public.referrals (from_org_id, status);
CREATE INDEX idx_referrals_to ON public.referrals (to_org_id, status);
CREATE INDEX idx_referrals_youth ON public.referrals (youth_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  youth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_encrypted jsonb NOT NULL,
  category text CHECK (category IN ('intake', 'session', 'incident', 'progress', 'other')),
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_notes_org_youth ON public.case_notes (org_id, youth_id, created_at DESC);
CREATE INDEX idx_case_notes_author ON public.case_notes (author_user_id, created_at DESC);

-- ============================================================================
-- GUARDIAN VERIFICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guardian_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_name text NOT NULL CHECK (length(guardian_name) <= 200),
  guardian_contact_type text NOT NULL CHECK (guardian_contact_type IN ('email', 'phone')),
  guardian_contact_value text NOT NULL,
  guardian_contact_hash text NOT NULL,
  guardian_relationship text NOT NULL,
  guardian_dob date,
  verification_token text NOT NULL UNIQUE,
  verification_method text CHECK (verification_method IN ('email_link', 'sms_link', 'alberta_digital_id')),
  verified_at timestamptz,
  verified_by_name text,
  verified_by_ip inet,
  verified_by_user_agent text,
  id_verification_status text CHECK (id_verification_status IN ('not_required', 'pending', 'verified', 'failed')),
  id_document_type text,
  id_verification_provider text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guardian_verifications_user_idx ON public.guardian_verifications (user_id);
CREATE INDEX guardian_verifications_token_idx ON public.guardian_verifications (verification_token) WHERE verified_at IS NULL;

-- ============================================================================
-- PROGRAM OUTCOMES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.program_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('attendance', 'completion', 'satisfaction', 'engagement', 'retention')),
  value numeric NOT NULL,
  period_start date,
  period_end date,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_outcomes_program ON public.program_outcomes (program_id, metric, recorded_at DESC);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  org_id uuid REFERENCES public.organizations(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  record_data jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  result text CHECK (result IN ('success', 'denied', 'error')),
  error_message text,
  duration_ms int
);

CREATE INDEX idx_audit_trail_timestamp ON public.audit_trail (timestamp DESC);
CREATE INDEX idx_audit_trail_user ON public.audit_trail (user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_table ON public.audit_trail (table_name, timestamp DESC);
CREATE INDEX idx_audit_trail_action ON public.audit_trail (action, result, timestamp DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER youth_profiles_updated_at
BEFORE UPDATE ON public.youth_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consents_updated_at
BEFORE UPDATE ON public.consents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members m
    WHERE m.user_id = _user 
      AND m.org_id = _org
      AND m.active = true
  );
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  );
$$;

-- Check if user has referral consent
CREATE OR REPLACE FUNCTION public.has_referral_consent(_youth uuid, _to_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.consents c
    WHERE c.youth_id = _youth
      AND c.grantee_org_id = _to_org
      AND c.scope IN ('referral', 'share_intake')
      AND c.status = 'granted'
      AND (c.verification_expires_at IS NULL OR c.verification_expires_at > now())
  );
$$;

-- Check if youth is minor
CREATE OR REPLACE FUNCTION public.is_minor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT age < 18 FROM public.youth_profiles WHERE user_id = _user_id),
    true
  );
$$;

-- Generate XID hash with salt (enhanced security)
CREATE OR REPLACE FUNCTION generate_xid_hash(user_id uuid, salt text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pepper text;
BEGIN
  pepper := current_setting('app.xid_pepper', true);
  IF pepper IS NULL THEN
    RAISE EXCEPTION 'XID pepper not configured';
  END IF;
  
  RETURN encode(
    hmac(
      user_id::text || salt,
      pepper,
      'sha256'
    ),
    'base64'
  );
END;
$$;

-- ============================================================================
-- CONSENT MANAGEMENT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_consent_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status = 'granted' THEN
    -- Log the withdrawal event
    INSERT INTO public.consent_events (
      user_id, actor, event_type, consent_key, old_value, new_value, occurred_at
    ) VALUES (
      NEW.youth_id, 'youth', 'revoked', NEW.scope, true, false, now()
    );
    
    -- Revoke related referrals
    UPDATE public.referrals
    SET status = 'withdrawn', updated_at = now()
    WHERE youth_id = NEW.youth_id
      AND to_org_id = NEW.grantee_org_id
      AND status IN ('pending_consent', 'sent', 'accepted');
    
    -- Delete case notes if consent scope includes them
    IF NEW.scope IN ('referral', 'share_intake', 'case_notes') THEN
      DELETE FROM public.case_notes
      WHERE youth_id = NEW.youth_id
        AND org_id = NEW.grantee_org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER consent_withdrawal_cascade
AFTER UPDATE OF status ON public.consents
FOR EACH ROW
WHEN (NEW.status = 'revoked')
EXECUTE FUNCTION handle_consent_withdrawal();

-- ============================================================================
-- REFERRAL MANAGEMENT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_referral_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('declined', 'withdrawn') AND OLD.status != NEW.status THEN
    UPDATE public.consents 
    SET status = 'revoked', revoked_at = now(), updated_at = now()
    WHERE youth_id = NEW.youth_id 
      AND grantee_org_id = NEW.to_org_id
      AND scope IN ('referral', 'share_intake')
      AND status = 'granted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER referral_status_change
AFTER UPDATE OF status ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION revoke_referral_access();

-- ============================================================================
-- AUDIT LOGGING TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_case_notes_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_trail (
    user_id, org_id, action, table_name, record_id, ip_address, result
  ) VALUES (
    auth.uid(),
    (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() LIMIT 1),
    TG_OP,
    'case_notes',
    COALESCE(NEW.id, OLD.id),
    inet_client_addr(),
    'success'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER case_notes_audit
AFTER INSERT OR UPDATE OR DELETE ON public.case_notes
FOR EACH ROW
EXECUTE FUNCTION audit_case_notes_access();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coping_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Coping skills viewable by everyone
CREATE POLICY "coping_skills_public_read" ON public.coping_skills
FOR SELECT USING (active = true);

-- Organizations
CREATE POLICY "organizations_member_read" ON public.organizations
FOR SELECT USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "organizations_admin_update" ON public.organizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = id AND m.user_id = auth.uid() 
      AND m.role = 'org_admin' AND m.active = true
  )
);

-- Org members
CREATE POLICY "org_members_read" ON public.org_members
FOR SELECT USING (
  user_id = auth.uid() OR public.is_org_member(auth.uid(), org_id)
);

CREATE POLICY "org_members_admin_all" ON public.org_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = org_id AND m.user_id = auth.uid() 
      AND m.role = 'org_admin' AND m.active = true
  )
);

-- Journal entries (private to youth only)
CREATE POLICY "journal_entries_own_all" ON public.journal_entries
FOR ALL USING (auth.uid() = youth_id)
WITH CHECK (auth.uid() = youth_id);

-- Consents
CREATE POLICY "consents_youth_all" ON public.consents
FOR ALL USING (auth.uid() = youth_id)
WITH CHECK (auth.uid() = youth_id);

CREATE POLICY "consents_org_read" ON public.consents
FOR SELECT USING (
  grantee_org_id IS NOT NULL 
  AND public.is_org_member(auth.uid(), grantee_org_id)
  AND status = 'granted'
);

-- Consent events
CREATE POLICY "consent_events_youth_read" ON public.consent_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "consent_events_system_insert" ON public.consent_events
FOR INSERT WITH CHECK (true);

-- Referrals
CREATE POLICY "referrals_read" ON public.referrals
FOR SELECT USING (
  (public.is_org_member(auth.uid(), from_org_id) 
   AND status IN ('pending_consent', 'sent'))
  OR
  (public.is_org_member(auth.uid(), to_org_id) 
   AND status = 'accepted'
   AND public.has_referral_consent(youth_id, to_org_id))
  OR
  (auth.uid() = youth_id)
);

CREATE POLICY "referrals_insert" ON public.referrals
FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), from_org_id));

CREATE POLICY "referrals_update" ON public.referrals
FOR UPDATE USING (
  (public.is_org_member(auth.uid(), from_org_id) AND status IN ('pending_consent', 'sent'))
  OR
  (public.is_org_member(auth.uid(), to_org_id) AND status = 'sent')
);

-- Case notes
CREATE POLICY "case_notes_org_read" ON public.case_notes
FOR SELECT USING (
  public.is_org_member(auth.uid(), org_id)
  AND public.has_referral_consent(youth_id, org_id)
);

CREATE POLICY "case_notes_org_insert" ON public.case_notes
FOR INSERT WITH CHECK (
  public.is_org_member(auth.uid(), org_id)
  AND author_user_id = auth.uid()
  AND public.has_referral_consent(youth_id, org_id)
);

CREATE POLICY "case_notes_author_update" ON public.case_notes
FOR UPDATE USING (auth.uid() = author_user_id);

CREATE POLICY "case_notes_delete" ON public.case_notes
FOR DELETE USING (
  auth.uid() = author_user_id
  OR EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = case_notes.org_id
      AND m.user_id = auth.uid()
      AND m.role = 'org_admin'
  )
);

-- Program outcomes
CREATE POLICY "program_outcomes_org_read" ON public.program_outcomes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_outcomes.program_id
      AND public.is_org_member(auth.uid(), p.org_id)
  )
);

CREATE POLICY "program_outcomes_org_insert" ON public.program_outcomes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_outcomes.program_id
      AND public.is_org_member(auth.uid(), p.org_id)
  )
);

-- Guardian verifications
CREATE POLICY "guardian_verifications_youth_read" ON public.guardian_verifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "guardian_verifications_system_insert" ON public.guardian_verifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "guardian_verifications_system_update" ON public.guardian_verifications
FOR UPDATE USING (true);

-- Audit trail (admins only)
CREATE POLICY "audit_trail_admin_read" ON public.audit_trail
FOR SELECT USING (public.is_admin());

-- ============================================================================
-- SEED INITIAL DATA
-- ============================================================================

-- Insert Room XI as first organization
INSERT INTO public.organizations (name, type, contact_email, active)
VALUES ('Room XI', 'nonprofit', 'hello@roomxi.org', true)
ON CONFLICT DO NOTHING;

-- Insert sample coping skills
INSERT INTO public.coping_skills (category, title, description, steps, duration_minutes, difficulty, active, featured) VALUES
('anxiety', '5-4-3-2-1 Grounding', 'Use your senses to ground yourself in the present moment', 
  ARRAY[
    'Name 5 things you can see around you',
    'Name 4 things you can touch',
    'Name 3 things you can hear',
    'Name 2 things you can smell',
    'Name 1 thing you can taste'
  ], 5, 'easy', true, true),
('stress', 'Box Breathing', 'A simple breathing technique to calm your nervous system',
  ARRAY[
    'Breathe in for 4 counts',
    'Hold your breath for 4 counts',
    'Breathe out for 4 counts',
    'Hold for 4 counts',
    'Repeat 4 times'
  ], 3, 'easy', true, true),
('sleep', 'Progressive Muscle Relaxation', 'Relax your body from head to toe',
  ARRAY[
    'Lie down in a comfortable position',
    'Starting with your toes, tense each muscle group for 5 seconds',
    'Release and notice the relaxation',
    'Move up through your body: legs, stomach, arms, shoulders, face',
    'Take 3 deep breaths when finished'
  ], 10, 'moderate', true, false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations (nonprofits, schools, etc.)';
COMMENT ON TABLE public.org_members IS 'Organization membership and roles';
COMMENT ON TABLE public.consents IS 'Youth consent management for data sharing';
COMMENT ON TABLE public.referrals IS 'Warm referrals between organizations';
COMMENT ON TABLE public.case_notes IS 'Encrypted case notes (PHIPA compliant)';
COMMENT ON TABLE public.guardian_verifications IS 'Guardian identity verification for minors';
COMMENT ON TABLE public.audit_trail IS 'Comprehensive audit log for compliance';

