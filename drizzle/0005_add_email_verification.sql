-- Add email verification columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires" timestamptz;
