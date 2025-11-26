-- Disclosure request system for parent/guardian access to youth demographics
-- Parents must request access, and youth must approve or deny

CREATE TABLE IF NOT EXISTS disclosure_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  youth_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_disclosure_requests_parent ON disclosure_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_disclosure_requests_youth ON disclosure_requests(youth_id);
CREATE INDEX IF NOT EXISTS idx_disclosure_requests_status ON disclosure_requests(status, created_at);

-- Audit log for disclosure decisions
CREATE TABLE IF NOT EXISTS disclosure_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disclosure_request_id UUID REFERENCES disclosure_requests(id),
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('youth', 'parent', 'admin')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disclosure_audit_request ON disclosure_audit_log(disclosure_request_id);
