CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  categories TEXT NOT NULL,
  applicant_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','unsubscribed')),
  consent_version TEXT NOT NULL,
  token_version TEXT NOT NULL,
  email_verified_at TEXT,
  confirmation_expires_at INTEGER,
  confirmation_sent_at TEXT,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS newsletter_review_queue ON newsletter_subscribers(status, created_at);
CREATE TABLE IF NOT EXISTS newsletter_request_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES newsletter_subscribers(id),
  edition_date TEXT NOT NULL,
  categories TEXT NOT NULL,
  token_version TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  provider_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  sent_at TEXT,
  UNIQUE(subscriber_id, edition_date)
);
CREATE INDEX IF NOT EXISTS newsletter_delivery_queue ON newsletter_deliveries(edition_date, status, lease_until);
