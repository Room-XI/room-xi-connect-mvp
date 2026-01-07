-- Migration: Add account_lockouts table for persistent login attempt tracking
-- Date: 2026-01-07
-- Description: Replaces in-memory Map with PostgreSQL-backed storage for account lockouts.
--              This ensures lockout data persists across server restarts and works
--              across multiple server instances.

CREATE TABLE IF NOT EXISTS "account_lockouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "account_lockouts_email_idx" ON "account_lockouts" USING btree ("email");
