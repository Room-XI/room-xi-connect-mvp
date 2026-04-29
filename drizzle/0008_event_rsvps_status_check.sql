ALTER TABLE event_rsvps ADD CONSTRAINT event_rsvps_status_check CHECK (status IN ('confirmed', 'pending_consent', 'cancelled'));
