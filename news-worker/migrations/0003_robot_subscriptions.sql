CREATE TABLE IF NOT EXISTS robot_subscribers (
  id TEXT PRIMARY KEY,
  webhook_hash TEXT NOT NULL UNIQUE,
  webhook_ciphertext TEXT NOT NULL,
  webhook_display TEXT NOT NULL,
  categories TEXT NOT NULL,
  applicant_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','unsubscribed')),
  mention_mode TEXT NOT NULL DEFAULT 'none' CHECK (mention_mode IN ('none','members')),
  mention_mobiles TEXT NOT NULL DEFAULT '[]',
  version TEXT NOT NULL,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS robot_subscribers_status ON robot_subscribers(status, created_at);
CREATE TABLE IF NOT EXISTS robot_subscription_deliveries (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES robot_subscribers(id),
  edition_date TEXT NOT NULL,
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  next_part INTEGER NOT NULL DEFAULT 0 CHECK (next_part BETWEEN 0 AND 5),
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
CREATE INDEX IF NOT EXISTS robot_subscription_delivery_queue ON robot_subscription_deliveries(edition_date, status, next_attempt_at);
-- The legacy singleton robot_deliveries table remains history only. No automatic
-- migration grants approval to a webhook previously stored in a deployment secret.
