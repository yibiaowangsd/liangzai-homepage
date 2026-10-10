// Search the published archive, including article bodies, without returning them.
export function parseNewsSearch(params) {
  const query = (params.get('q') || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  const terms = query.toLowerCase().split(' ').filter(Boolean);
  if (params.getAll('q').length > 1 || query.length > 120 || terms.length > 12) return null;
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (params.getAll('limit').length > 1 || !Number.isSafeInteger(limit) || limit < 1) return null;
  return { query, terms, limit: Math.min(limit, 20) };
}

export async function getNewsSearch(env, { query, terms, limit }) {
  if (!terms.length) return { data: [], meta: { query, count: 0, total: 0, limit } };
  const text = "lower(coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '') || ' ' || coalesce(tags, '') || ' ' || coalesce(source_name, ''))";
  // Only fixed SQL and placeholder counts are interpolated. %, _ and quotes
  // remain literal search characters; every user value is bound separately.
  const where = "status = 'published' AND " + terms.map(() => `instr(${text}, ?) > 0`).join(' AND ');
  const [count, result] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM news WHERE ${where}`).bind(...terms).first(),
    env.DB.prepare(`
      SELECT slug, title, substr(summary, 1, 260) AS summary, category,
             source_name, published_at
      FROM news WHERE ${where}
      ORDER BY CASE
        WHEN lower(title) = ? THEN 0
        WHEN instr(lower(title), ?) > 0 THEN 1
        WHEN instr(lower(coalesce(summary, '')), ?) > 0 THEN 2
        ELSE 3 END, published_at DESC, id DESC
      LIMIT ?
    `).bind(...terms, query.toLowerCase(), query.toLowerCase(), query.toLowerCase(), limit).all(),
  ]);
  const data = result.results || [];
  return { data, meta: { query, count: data.length, total: Number(count?.total || 0), limit } };
}
