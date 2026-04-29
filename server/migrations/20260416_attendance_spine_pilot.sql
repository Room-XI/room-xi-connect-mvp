-- Pilot Omni Prompt 5: Attendance Spine hardening
--
-- 1) attendance_records gets a canonical consent snapshot pointer +
--    a walk-in justification column. The consent snapshot freezes the
--    parental authorization at check-in time so that later consent
--    withdrawal does not rewrite historical attendance.
-- 2) attendance_passes gets a kind/printed/single-use columns so that
--    staff can issue paper passes for youth without phones. Dynamic
--    passes continue to rotate every 90 seconds; printed passes have
--    an extended TTL and are consumed on first successful check-in.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS consent_receipt_id UUID
    REFERENCES consent_receipts(id) ON DELETE SET NULL;

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS walkin_justification TEXT;

CREATE INDEX IF NOT EXISTS attendance_records_consent_receipt_idx
  ON attendance_records(consent_receipt_id)
  WHERE consent_receipt_id IS NOT NULL;

ALTER TABLE attendance_passes
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'dynamic';

ALTER TABLE attendance_passes
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

ALTER TABLE attendance_passes
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE attendance_passes
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

ALTER TABLE attendance_passes
  DROP CONSTRAINT IF EXISTS attendance_passes_kind_check;

ALTER TABLE attendance_passes
  ADD CONSTRAINT attendance_passes_kind_check
    CHECK (kind = ANY (ARRAY['dynamic'::text, 'printed'::text]));
