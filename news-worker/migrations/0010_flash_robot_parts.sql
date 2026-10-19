-- The eighth peer category needs a terminal cursor of 8. Keep every existing
-- delivery payload, receipt position, lease and daily uniqueness constraint.
CREATE TABLE robot_subscription_deliveries_v3 (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES robot_subscribers(id),
  edition_date TEXT NOT NULL,
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  next_part INTEGER NOT NULL DEFAULT 0 CHECK (next_part BETWEEN 0 AND 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','uncertain','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL,
  sent_at TEXT,
  UNIQUE(subscriber_id, edition_date)
);
INSERT INTO robot_subscription_deliveries_v3
  (id, subscriber_id, edition_date, version, payload, next_part, status, attempts,
   lease_until, lease_token, next_attempt_at, error, created_at, sent_at)
SELECT id, subscriber_id, edition_date, version, payload, next_part, status, attempts,
  lease_until, lease_token, next_attempt_at, error, created_at, sent_at
FROM robot_subscription_deliveries;
DROP TABLE robot_subscription_deliveries;
ALTER TABLE robot_subscription_deliveries_v3 RENAME TO robot_subscription_deliveries;
CREATE INDEX robot_subscription_delivery_queue ON robot_subscription_deliveries(edition_date, status, next_attempt_at);
