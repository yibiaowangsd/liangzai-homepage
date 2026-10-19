-- An explicit, once-per-edition supplement keeps the normal daily history intact.
-- Payloads and approved audiences are immutable once the campaign is created.
CREATE TABLE IF NOT EXISTS news_resend_campaigns (
  campaign_id TEXT PRIMARY KEY,
  edition_date TEXT NOT NULL UNIQUE,
  edition_hash TEXT NOT NULL,
  audience_hash TEXT NOT NULL,
  edition_snapshot TEXT NOT NULL,
  creation_nonce TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT
);

CREATE TABLE IF NOT EXISTS news_resend_jobs (
  campaign_id TEXT NOT NULL REFERENCES news_resend_campaigns(campaign_id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'robot')),
  subscriber_id TEXT NOT NULL,
  edition_date TEXT NOT NULL,
  subscription_version TEXT NOT NULL,
  categories TEXT NOT NULL,
  recipient_fingerprint TEXT NOT NULL,
  payload TEXT NOT NULL,
  delivery_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed','uncertain','cancelled')),
  next_part INTEGER NOT NULL DEFAULT 0,
  total_parts INTEGER NOT NULL CHECK (total_parts > 0),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  provider_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  PRIMARY KEY (campaign_id, channel, subscriber_id)
);
CREATE INDEX IF NOT EXISTS news_resend_queue
  ON news_resend_jobs(campaign_id, status, next_attempt_at, lease_until);
CREATE INDEX IF NOT EXISTS news_resend_reservations
  ON news_resend_jobs(channel, subscriber_id, edition_date, subscription_version);
