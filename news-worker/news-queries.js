// Walk the expression index once per distinct Beijing day, rather than
// scanning every article to build the calendar on each archive request.
export function editionDatesSql(category, includeManifest) {
  const where = "WHERE status = 'published'" + (category ? ' AND category = ?1' : '');
  return `WITH RECURSIVE article_dates(edition_date) AS (
    SELECT max(date(published_at, '+8 hours')) FROM news ${where}
    UNION ALL
    SELECT (SELECT max(date(published_at, '+8 hours')) FROM news ${where}
      AND date(published_at, '+8 hours') < article_dates.edition_date)
    FROM article_dates WHERE edition_date IS NOT NULL
  )
  SELECT edition_date FROM article_dates WHERE edition_date IS NOT NULL
  ${includeManifest ? 'UNION SELECT date AS edition_date FROM news_editions' : ''}
  ORDER BY edition_date DESC`;
}
