ALTER TABLE push_deliveries ADD COLUMN expires_at INTEGER;

-- Legacy attempts have no target timestamp. A pending delivery cannot remain
-- relevant an hour after its next attempt (the send window is only 14 minutes).
UPDATE push_deliveries SET expires_at = next_attempt_at + 3600000
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_push_deliveries_expiry
ON push_deliveries(status, expires_at);
