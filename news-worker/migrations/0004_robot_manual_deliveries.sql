-- A new send_id represents an explicit new click, not a new network attempt.
CREATE TABLE IF NOT EXISTS robot_manual_deliveries (
  send_id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES robot_subscribers(id),
  edition_date TEXT NOT NULL,
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  next_part INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','uncertain','cancelled')),
  lease_token TEXT,
  lease_until INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS robot_manual_daily ON robot_manual_deliveries(subscriber_id, edition_date);
CREATE UNIQUE INDEX IF NOT EXISTS robot_manual_active ON robot_manual_deliveries(subscriber_id) WHERE status IN ('pending','sending');
CREATE TABLE IF NOT EXISTS robot_manual_receipts (
  send_id TEXT NOT NULL REFERENCES robot_manual_deliveries(send_id),
  part INTEGER NOT NULL,
  result TEXT NOT NULL,
  PRIMARY KEY (send_id, part)
);
