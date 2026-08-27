ALTER TABLE push_subscriptions ADD COLUMN locale TEXT NOT NULL DEFAULT 'uk';

CREATE TABLE IF NOT EXISTS news_item_summaries (
  news_id TEXT NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (news_id, locale)
);

INSERT OR IGNORE INTO news_item_summaries (news_id, locale, summary, created_at)
SELECT id, 'uk', summary_uk, fetched_at
FROM news_items
WHERE summary_uk IS NOT NULL AND summary_uk != '';
