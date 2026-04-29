-- Pilot Omni Prompt 4: add 'blocked' to event_rsvps.status allowed values.
-- 'blocked' is set by the canonical consent runtime (server/routes/consent-wallet.ts)
-- when a parent declines or withdraws consent. Distinguishes consent-driven
-- termination from user-initiated 'cancelled', and is surfaced on the youth
-- Schedule as a red "Blocked" pill with guidance text.

ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_status_check;

ALTER TABLE event_rsvps ADD CONSTRAINT event_rsvps_status_check
  CHECK (status = ANY (ARRAY[
    'confirmed'::text,
    'pending_consent'::text,
    'cancelled'::text,
    'blocked'::text
  ]));
