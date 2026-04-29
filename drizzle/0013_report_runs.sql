CREATE TABLE IF NOT EXISTS "report_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "run_by" uuid NOT NULL,
  "report_type" text NOT NULL,
  "parameters" jsonb,
  "status" text NOT NULL DEFAULT 'running',
  "row_count" integer,
  "error" text,
  "file_content" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "report_runs_org_created_idx" ON "report_runs" ("org_id", "created_at" DESC);
