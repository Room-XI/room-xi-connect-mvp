-- Migration: Make consent_audit_log append-only and immutable
-- Prevents UPDATE and DELETE operations to ensure audit integrity
-- Date: 2025-11-08

-- Add database-level constraints to prevent modifications
CREATE OR REPLACE FUNCTION prevent_consent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Consent audit log is append-only. Updates and deletes are not permitted for audit integrity.';
END;
$$ LANGUAGE plpgsql;

-- Create triggers to block UPDATE and DELETE
DROP TRIGGER IF EXISTS prevent_consent_audit_update ON consent_audit_log;
CREATE TRIGGER prevent_consent_audit_update
  BEFORE UPDATE ON consent_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_consent_audit_modification();

DROP TRIGGER IF EXISTS prevent_consent_audit_delete ON consent_audit_log;
CREATE TRIGGER prevent_consent_audit_delete
  BEFORE DELETE ON consent_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_consent_audit_modification();

-- Add index for efficient querying by user_xid and timestamp
CREATE INDEX IF NOT EXISTS idx_consent_audit_user_xid_timestamp 
  ON consent_audit_log(user_xid, timestamp DESC);

-- Add index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_consent_audit_timestamp 
  ON consent_audit_log(timestamp DESC);

-- Add index for consent type queries
CREATE INDEX IF NOT EXISTS idx_consent_audit_type 
  ON consent_audit_log(consent_type, timestamp DESC);

COMMENT ON TABLE consent_audit_log IS 'Append-only immutable audit log for consent changes. Protected by triggers to prevent UPDATE/DELETE operations.';
