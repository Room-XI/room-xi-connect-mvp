ALTER TABLE "referrals" ADD COLUMN "referred_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "referrals" ADD COLUMN "program_id" uuid REFERENCES "programs"("id") ON DELETE SET NULL;
ALTER TABLE "referrals" ADD COLUMN "event_id" uuid REFERENCES "program_events"("id") ON DELETE SET NULL;
ALTER TABLE "referrals" ADD COLUMN "notes" text;
ALTER TABLE "referrals" ADD COLUMN "outcome" text;
ALTER TABLE "referrals" ADD COLUMN "outcome_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "idx_referrals_referred_by" ON "referrals" ("referred_by");
CREATE INDEX IF NOT EXISTS "idx_referrals_program" ON "referrals" ("program_id");
