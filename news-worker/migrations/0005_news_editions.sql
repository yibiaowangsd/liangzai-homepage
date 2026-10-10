-- A variable-length edition is complete only after the articles and this
-- manifest have been committed together. No change to historical news rows.
CREATE TABLE IF NOT EXISTS news_editions (
  date TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL CHECK (schema_version = 2),
  coverage TEXT NOT NULL,
  slugs TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
