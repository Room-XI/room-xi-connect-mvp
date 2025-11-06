-- Add privacy consent and audit logging tables
-- As per consent_privacy_center_spec.md

-- Privacy consent preferences table
CREATE TABLE IF NOT EXISTS privacy_consents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 5 consent toggles (all default OFF as per spec)
  location_sharing BOOLEAN DEFAULT FALSE,
  orb_sharing BOOLEAN DEFAULT FALSE,
  reflections_sharing BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  research_participation BOOLEAN DEFAULT FALSE,
  
  -- Monthly reminder settings
  reminder_enabled BOOLEAN DEFAULT FALSE,
  last_reminder_sent TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Consent audit log table
CREATE TABLE IF NOT EXISTS consent_audit_log (
  id SERIAL PRIMARY KEY,
  user_xid VARCHAR(255) NOT NULL, -- Using XID for privacy
  consent_type VARCHAR(50) NOT NULL, -- location, orb, reflections, notifications, research
  action VARCHAR(20) NOT NULL, -- granted, revoked, reminded
  previous_value BOOLEAN,
  new_value BOOLEAN,
  source VARCHAR(50), -- settings, onboarding, reminder, api
  ip_address_hash VARCHAR(64), -- Hashed IP for security
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index for efficient querying
  INDEX idx_consent_audit_user (user_xid, timestamp),
  INDEX idx_consent_audit_type (consent_type, timestamp)
);

-- Differential privacy metadata table
CREATE TABLE IF NOT EXISTS dp_applications (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  query_type VARCHAR(50),
  original_count INTEGER,
  noise_added BOOLEAN DEFAULT TRUE,
  epsilon DECIMAL(3,2) DEFAULT 0.5,
  mechanism VARCHAR(20) DEFAULT 'laplace',
  suppressed BOOLEAN DEFAULT FALSE,
  suppression_reason VARCHAR(200),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_dp_operation (operation, created_at)
);

-- Add consent reminder tracking
CREATE TABLE IF NOT EXISTS consent_reminders (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) DEFAULT 'monthly',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_at TIMESTAMP,
  response_action VARCHAR(50), -- viewed, updated, dismissed
  
  INDEX idx_reminder_user (user_id, sent_at)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for privacy_consents
CREATE TRIGGER update_privacy_consents_updated_at
  BEFORE UPDATE ON privacy_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE privacy_consents IS 'User privacy preferences with 5 toggles, all default OFF';
COMMENT ON TABLE consent_audit_log IS 'Audit trail for all consent changes per PIPA requirements';
COMMENT ON TABLE dp_applications IS 'Log of differential privacy applications for transparency';
COMMENT ON COLUMN privacy_consents.location_sharing IS 'Share approximate location for program discovery';
COMMENT ON COLUMN privacy_consents.orb_sharing IS 'Include mood data in anonymized community insights';
COMMENT ON COLUMN privacy_consents.reflections_sharing IS 'Share reflections for research (with DP)';
COMMENT ON COLUMN privacy_consents.notifications_enabled IS 'Receive check-in reminders and milestone celebrations';
COMMENT ON COLUMN privacy_consents.research_participation IS 'Participate in optional research studies';