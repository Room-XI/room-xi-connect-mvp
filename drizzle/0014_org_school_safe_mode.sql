ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "school_safe_mode" boolean NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "ximi_mode" text NOT NULL DEFAULT 'program_finder';
