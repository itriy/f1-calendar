CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  remind_day INTEGER NOT NULL DEFAULT 1 CHECK (remind_day IN (0, 1)),
  remind_hour INTEGER NOT NULL DEFAULT 1 CHECK (remind_hour IN (0, 1)),
  remind_start INTEGER NOT NULL DEFAULT 1 CHECK (remind_start IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS push_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  race_key TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('day', 'hour', 'start')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  delivered_at INTEGER,
  UNIQUE (subscription_id, race_key, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_due ON push_deliveries(status, next_attempt_at);
