CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_worker_id TEXT,
  worker_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_requests_user_idx ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON support_requests(status);
CREATE INDEX IF NOT EXISTS support_requests_created_idx ON support_requests(created_at);
