-- Audit C11 / M3 (Task #40 subtask 2): pin organization_id onto each
-- youth_worker_assignment row at creation time so a worker who moves
-- between orgs cannot carry their old assignments across org boundaries.
--
-- Pattern note: youth_worker_assignments is defined in
-- server/migrations/20260122_phase2_extensions.sql and is intentionally
-- NOT tracked by drizzle-kit (server/schema-extensions.ts is excluded
-- from drizzle.config.ts). Follow-up schema work for this table goes
-- here as a hand-rolled migration. This file is idempotent.
--
-- Date: 2026-04-27

-- 1. Add the column nullable so backfill can succeed.
ALTER TABLE youth_worker_assignments
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Backfill from the assignment's worker (the worker's current org at
--    time of migration is the best available snapshot for legacy rows).
UPDATE youth_worker_assignments a
SET organization_id = w.organization_id
FROM youth_workers w
WHERE a.youth_worker_id = w.id
  AND a.organization_id IS NULL;

-- 3. Lock down: column must be NOT NULL going forward.
ALTER TABLE youth_worker_assignments
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. Indexes used by the cross-org-filtered lookups.
CREATE INDEX IF NOT EXISTS yw_assignments_org_idx
  ON youth_worker_assignments(organization_id);

CREATE INDEX IF NOT EXISTS yw_assignments_worker_org_idx
  ON youth_worker_assignments(youth_worker_id, organization_id);

-- 5. Widen the uniqueness constraint to include organization_id.
--    The previous (youth_worker_id, youth_id) UNIQUE index from
--    20260122_phase2_extensions.sql contradicts the new org-pinned
--    model: a worker who moves from OrgA to OrgB must be able to
--    create a fresh assignment for the same youth in OrgB without
--    hitting a 23505 on the legacy index. The app-level dedup check
--    in POST /assign already filters by organization_id, so the DB
--    constraint must mirror that or we'd drift app/DB and 500 on the
--    insert path. Drop-then-create is safe here because the column
--    org backfill (step 2) already populated organization_id on every
--    existing row, so the new composite index can be built without
--    NULLs.
DROP INDEX IF EXISTS youth_worker_assignments_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS youth_worker_assignments_uniq
  ON youth_worker_assignments(youth_worker_id, youth_id, organization_id);
