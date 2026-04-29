-- Add verification columns to programs
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "stale_at" timestamp with time zone;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "sunset_at" timestamp with time zone;

-- Import jobs table
CREATE TABLE IF NOT EXISTS "import_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "uploaded_by" uuid NOT NULL REFERENCES "users"("id"),
  "file_name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "total_rows" integer DEFAULT 0,
  "processed_rows" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "error_count" integer DEFAULT 0,
  "errors" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "import_jobs_org_idx" ON "import_jobs" ("org_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "import_jobs_status_idx" ON "import_jobs" ("status");

-- Listing verifications table
CREATE TABLE IF NOT EXISTS "listing_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid REFERENCES "users"("id"),
  "review_notes" text,
  "change_requested" text,
  "import_job_id" uuid REFERENCES "import_jobs"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "listing_verifications_org_status_idx" ON "listing_verifications" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "listing_verifications_program_idx" ON "listing_verifications" ("program_id");
