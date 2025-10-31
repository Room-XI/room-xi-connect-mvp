-- Room XI Connect - Row Level Security Policies
-- Database: Neon PostgreSQL with Express Session Auth
-- 
-- IMPORTANT: Since we use Express sessions (not Supabase auth), most security
-- is enforced at the application level. These RLS policies provide defense-in-depth.
-- The application must set session variables for RLS to work.

-- ==============================================
-- ENABLE RLS ON ALL TABLES
-- ==============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE xids ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coping_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE ximi_conversations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Get current authenticated user from session variable
-- Application must call: SET LOCAL app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION app_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = app_user_id()
    AND is_admin = TRUE
  );
$$ LANGUAGE SQL STABLE;

-- Check if current user is part of an organization
CREATE OR REPLACE FUNCTION app_is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = app_user_id()
    AND org_id = org_uuid
    AND active = TRUE
  );
$$ LANGUAGE SQL STABLE;

-- ==============================================
-- PUBLIC READ POLICIES (No Auth Required)
-- ==============================================

-- Programs are viewable by everyone (programs-first approach)
CREATE POLICY "programs_select_all" ON programs
  FOR SELECT USING (TRUE);

-- Crisis supports are viewable by everyone
CREATE POLICY "crisis_supports_select_all" ON crisis_supports
  FOR SELECT USING (TRUE);

-- Coping skills (active ones) are viewable by everyone
CREATE POLICY "coping_skills_select_active" ON coping_skills
  FOR SELECT USING (active = TRUE);

-- ==============================================
-- USER-OWNED DATA POLICIES
-- ==============================================

-- Users: Can only read their own record
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = app_user_id());

-- Profiles: Full access to own profile
CREATE POLICY "profiles_all_own" ON profiles
  FOR ALL USING (user_id = app_user_id());

-- Check-ins: Full access to own check-ins
CREATE POLICY "checkins_all_own" ON checkins
  FOR ALL USING (user_id = app_user_id());

-- Saved Programs: Full access to own saved programs
CREATE POLICY "saved_programs_all_own" ON saved_programs
  FOR ALL USING (user_id = app_user_id());

-- XIDs: Full access to own XIDs
CREATE POLICY "xids_all_own" ON xids
  FOR ALL USING (user_id = app_user_id());

-- Attendance: Can view own attendance via XID ownership
CREATE POLICY "attendance_select_own" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM xids
      WHERE xids.id = attendance.xid_id
      AND xids.user_id = app_user_id()
    )
  );

-- Attendance: Can create attendance for own XID
CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM xids
      WHERE xids.id = attendance.xid_id
      AND xids.user_id = app_user_id()
    )
  );

-- Guardian Verifications: Can view own verifications
CREATE POLICY "guardian_verifications_select_own" ON guardian_verifications
  FOR SELECT USING (user_id = app_user_id());

-- Consents: Full access to own consents
CREATE POLICY "consents_all_own" ON consents
  FOR ALL USING (user_id = app_user_id());

-- Health Profiles: Full access to own health profile
CREATE POLICY "health_profiles_all_own" ON health_profiles
  FOR ALL USING (user_id = app_user_id());

-- Consent Events: Can view own consent events
CREATE POLICY "consent_events_select_own" ON consent_events
  FOR SELECT USING (user_id = app_user_id());

-- Journal Entries: Full access to own journal
CREATE POLICY "journal_entries_all_own" ON journal_entries
  FOR ALL USING (youth_id = app_user_id());

-- Ximi Conversations: Full access to own conversations
CREATE POLICY "ximi_conversations_all_own" ON ximi_conversations
  FOR ALL USING (user_id = app_user_id());

-- ==============================================
-- ADMIN POLICIES
-- ==============================================

-- Admins: Can read all users
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (app_is_admin());

-- Admins: Can manage all profiles
CREATE POLICY "profiles_all_admin" ON profiles
  FOR ALL USING (app_is_admin());

-- Admins: Can view all check-ins
CREATE POLICY "checkins_select_admin" ON checkins
  FOR SELECT USING (app_is_admin());

-- Admins: Can manage programs
CREATE POLICY "programs_all_admin" ON programs
  FOR ALL USING (app_is_admin());

-- Admins: Can view all guardian verifications
CREATE POLICY "guardian_verifications_select_admin" ON guardian_verifications
  FOR SELECT USING (app_is_admin());

-- Admins: Can view all consent events
CREATE POLICY "consent_events_select_admin" ON consent_events
  FOR SELECT USING (app_is_admin());

-- Admins: Can manage breach events
CREATE POLICY "breach_events_all_admin" ON breach_events
  FOR ALL USING (app_is_admin());

-- Admins: Can manage crisis supports
CREATE POLICY "crisis_supports_all_admin" ON crisis_supports
  FOR ALL USING (app_is_admin());

-- Admins: Can view admin logs
CREATE POLICY "admin_logs_select_admin" ON admin_logs
  FOR SELECT USING (app_is_admin());

-- Admins: Can view audit trail
CREATE POLICY "audit_trail_select_admin" ON audit_trail
  FOR SELECT USING (app_is_admin());

-- Admins: Can manage organizations
CREATE POLICY "organizations_all_admin" ON organizations
  FOR ALL USING (app_is_admin());

-- Admins: Can manage org members
CREATE POLICY "org_members_all_admin" ON org_members
  FOR ALL USING (app_is_admin());

-- Admins: Can manage coping skills
CREATE POLICY "coping_skills_all_admin" ON coping_skills
  FOR ALL USING (app_is_admin());

-- Admins: Can view all program outcomes
CREATE POLICY "program_outcomes_select_admin" ON program_outcomes
  FOR SELECT USING (app_is_admin());

-- ==============================================
-- ORGANIZATION MEMBER POLICIES
-- ==============================================

-- Org Members: Can view referrals to/from their org
CREATE POLICY "referrals_select_org_member" ON referrals
  FOR SELECT USING (
    app_is_org_member(from_org_id) OR
    app_is_org_member(to_org_id) OR
    youth_id = app_user_id()
  );

-- Org Members: Can create referrals from their org
CREATE POLICY "referrals_insert_org_member" ON referrals
  FOR INSERT WITH CHECK (app_is_org_member(from_org_id));

-- Org Members: Can update referrals to/from their org
CREATE POLICY "referrals_update_org_member" ON referrals
  FOR UPDATE USING (
    app_is_org_member(from_org_id) OR
    app_is_org_member(to_org_id)
  );

-- Org Members: Can view case notes from their org
CREATE POLICY "case_notes_select_org_member" ON case_notes
  FOR SELECT USING (app_is_org_member(org_id));

-- Org Members: Can create case notes for their org
CREATE POLICY "case_notes_insert_org_member" ON case_notes
  FOR INSERT WITH CHECK (
    app_is_org_member(org_id) AND
    author_user_id = app_user_id()
  );

-- ==============================================
-- TRIGGER FUNCTIONS FOR AUDIT LOGGING
-- ==============================================

-- Function to log admin changes to programs
CREATE OR REPLACE FUNCTION log_program_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := app_user_id();
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO admin_logs (user_id, action, table_name, record_id, new_record)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO admin_logs (user_id, action, table_name, record_id, old_record, new_record)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO admin_logs (user_id, action, table_name, record_id, old_record)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to programs table
DROP TRIGGER IF EXISTS programs_audit_trigger ON programs;
CREATE TRIGGER programs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON programs
  FOR EACH ROW EXECUTE FUNCTION log_program_changes();

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO consent_events (user_id, actor, event_type, consent_key, new_value, ip_address, user_agent)
    VALUES (NEW.user_id, NEW.granted_by, 'granted', NEW.consent_type, NEW.value, NEW.ip_address, NEW.user_agent);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO consent_events (user_id, actor, event_type, consent_key, old_value, new_value, ip_address, user_agent)
    VALUES (NEW.user_id, NEW.granted_by, 'updated', NEW.consent_type, OLD.value, NEW.value, NEW.ip_address, NEW.user_agent);
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to consents table
DROP TRIGGER IF EXISTS consents_audit_trigger ON consents;
CREATE TRIGGER consents_audit_trigger
  AFTER INSERT OR UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION log_consent_changes();

-- ==============================================
-- COMMENTS & DOCUMENTATION
-- ==============================================

COMMENT ON FUNCTION app_user_id() IS 'Returns current authenticated user ID from session variable app.current_user_id';
COMMENT ON FUNCTION app_is_admin() IS 'Returns true if current user has admin privileges';
COMMENT ON FUNCTION app_is_org_member(UUID) IS 'Returns true if current user is an active member of the specified organization';
COMMENT ON TABLE breach_events IS 'PIPA-compliant breach notification tracking with 72-hour OIPC requirement';
COMMENT ON TABLE consent_events IS 'Audit trail for all consent actions (PIPA compliance)';
COMMENT ON TABLE health_profiles IS 'HIA-compliant health information with separate consent tracking';
COMMENT ON TABLE guardian_verifications IS 'Guardian verification for youth under 16 (Alberta PIPA)';
