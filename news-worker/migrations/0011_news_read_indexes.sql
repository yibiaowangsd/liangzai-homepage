-- Match the existing Beijing date expression exactly, including historical
-- timestamps with UTC offsets. No article, manifest or delivery data changes.
CREATE INDEX IF NOT EXISTS idx_news_published_day
  ON news(date(published_at, '+8 hours'), published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_published_category_day
  ON news(category, date(published_at, '+8 hours'), published_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_published_order
  ON news(published_at DESC, id DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_published_category_order
  ON news(category, published_at DESC, id DESC) WHERE status = 'published';
PRAGMA optimize;
