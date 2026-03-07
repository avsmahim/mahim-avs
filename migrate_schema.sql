ALTER TABLE posts ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS permalink text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_description text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz;