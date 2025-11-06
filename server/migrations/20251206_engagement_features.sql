-- Add daily reflective quotes consent field to privacy_consents table
ALTER TABLE privacy_consents 
ADD COLUMN IF NOT EXISTS daily_quotes_enabled BOOLEAN DEFAULT FALSE;

-- Add quotes preference and last shown date
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_quote_date DATE,
ADD COLUMN IF NOT EXISTS last_quote_id INTEGER;

-- Create table for storing daily quotes
CREATE TABLE IF NOT EXISTS daily_quotes (
  id SERIAL PRIMARY KEY,
  quote TEXT NOT NULL,
  author TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial set of reflective quotes
INSERT INTO daily_quotes (quote, author, category) VALUES
('Every moment is a fresh beginning.', 'T.S. Eliot', 'new_beginnings'),
('You are braver than you believe, stronger than you seem, and smarter than you think.', 'A.A. Milne', 'self_belief'),
('The only way to do great work is to love what you do.', 'Steve Jobs', 'passion'),
('In the middle of difficulty lies opportunity.', 'Albert Einstein', 'resilience'),
('Be yourself; everyone else is already taken.', 'Oscar Wilde', 'authenticity'),
('The future belongs to those who believe in the beauty of their dreams.', 'Eleanor Roosevelt', 'dreams'),
('It does not matter how slowly you go as long as you do not stop.', 'Confucius', 'perseverance'),
('Everything you've ever wanted is on the other side of fear.', 'George Addair', 'courage'),
('Happiness is not something ready made. It comes from your own actions.', 'Dalai Lama', 'happiness'),
('The journey of a thousand miles begins with one step.', 'Lao Tzu', 'beginning'),
('You are never too old to set another goal or to dream a new dream.', 'C.S. Lewis', 'growth'),
('Believe you can and you're halfway there.', 'Theodore Roosevelt', 'confidence'),
('The only impossible journey is the one you never begin.', 'Tony Robbins', 'action'),
('Life is 10% what happens to you and 90% how you react to it.', 'Charles R. Swindoll', 'mindset'),
('Your limitation—it's only your imagination.', 'Unknown', 'potential'),
('Sometimes later becomes never. Do it now.', 'Unknown', 'action'),
('Great things never come from comfort zones.', 'Unknown', 'growth'),
('Dream it. Wish it. Do it.', 'Unknown', 'achievement'),
('Success doesn't just find you. You have to go out and get it.', 'Unknown', 'initiative'),
('The harder you work for something, the greater you'll feel when you achieve it.', 'Unknown', 'effort'),
('Dream bigger. Do bigger.', 'Unknown', 'ambition'),
('Don't stop when you're tired. Stop when you're done.', 'Unknown', 'persistence'),
('Wake up with determination. Go to bed with satisfaction.', 'Unknown', 'daily_mindset'),
('Do something today that your future self will thank you for.', 'Unknown', 'forward_thinking'),
('Little things make big days.', 'Unknown', 'mindfulness'),
('It's going to be hard, but hard does not mean impossible.', 'Unknown', 'challenge'),
('Don't wait for opportunity. Create it.', 'Unknown', 'proactive'),
('Sometimes we're tested not to show our weaknesses, but to discover our strengths.', 'Unknown', 'self_discovery'),
('The key to success is to focus on goals, not obstacles.', 'Unknown', 'focus'),
('Dream it. Believe it. Build it.', 'Unknown', 'creation');