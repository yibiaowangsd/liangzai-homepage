CREATE TABLE IF NOT EXISTS robot_deliveries (
  edition_date TEXT PRIMARY KEY,
  destination_hash TEXT NOT NULL,
  payload TEXT NOT NULL,
  next_part INTEGER NOT NULL DEFAULT 0 CHECK(next_part BETWEEN 0 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','uncertain')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL,
  sent_at TEXT
);
