-- Migration: Add Push Subscriptions Table
-- Created: 2025-11-09
-- Description: Create table for storing web push notification subscriptions

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

-- Create unique index to prevent duplicate subscriptions for the same user + endpoint
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx 
  ON push_subscriptions(user_id, endpoint);

-- Add comment to the table
COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for users';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Encryption key for push messages';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for push messages';
