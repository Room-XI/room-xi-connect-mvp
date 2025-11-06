-- Create weekly_orb_snapshots table for storing mood orb state weekly
CREATE TABLE IF NOT EXISTS weekly_orb_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL, -- Date of the Sunday snapshot
  week_start_date DATE NOT NULL, -- Monday of the week
  week_end_date DATE NOT NULL, -- Sunday of the week
  
  -- Mood ratios for the week (0.0 to 1.0)
  cold_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  stormy_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  foggy_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  clear_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  breezy_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  aurora_ratio DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
  
  -- Dominant mood and statistics
  dominant_mood TEXT NOT NULL, -- The most common mood
  total_check_ins INTEGER NOT NULL DEFAULT 0,
  average_mood_level DECIMAL(3, 2), -- 1.00 to 6.00
  
  -- Visual snapshot data (JSON blob for rendering)
  visual_data JSONB, -- Store color values, gradients, etc.
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE UNIQUE INDEX IF NOT EXISTS weekly_orb_snapshots_user_date_idx 
  ON weekly_orb_snapshots(user_id, snapshot_date);

CREATE INDEX IF NOT EXISTS weekly_orb_snapshots_user_idx 
  ON weekly_orb_snapshots(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS weekly_orb_snapshots_date_idx 
  ON weekly_orb_snapshots(snapshot_date DESC);

-- Add comment to the table
COMMENT ON TABLE weekly_orb_snapshots IS 'Stores weekly mood orb snapshots taken every Sunday at 08:00 America/Edmonton';
COMMENT ON COLUMN weekly_orb_snapshots.visual_data IS 'JSON blob containing color values, gradients, and other visual rendering data';