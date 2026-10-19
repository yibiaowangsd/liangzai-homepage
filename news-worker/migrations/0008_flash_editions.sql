-- Preserve historical v2 manifests while enabling the eighth, short-news desk.
-- D1 applies the migration as a transaction; no news or subscription rows change.
CREATE TABLE news_editions_v3 (
  date TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL CHECK (schema_version IN (2, 3)),
  coverage TEXT NOT NULL,
  slugs TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO news_editions_v3 (date, schema_version, coverage, slugs, updated_at)
  SELECT date, schema_version, coverage, slugs, updated_at FROM news_editions;
DROP TABLE news_editions;
ALTER TABLE news_editions_v3 RENAME TO news_editions;
