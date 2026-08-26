CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary_uk TEXT,
  language TEXT NOT NULL DEFAULT 'und',
  image_url TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS news_items_published_at ON news_items(published_at DESC);

CREATE TABLE IF NOT EXISTS news_feed_state (
  source TEXT PRIMARY KEY,
  refreshed_at TEXT NOT NULL
);
