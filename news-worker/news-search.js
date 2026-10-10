// Search the published archive, including article bodies, without returning them.
const NAME_ALIASES = [['tongsuo', '铜锁']];
const SEPARATORS = /[-\s‐‑–—_./]/g;

function compactLatin(term) {
  return /^[a-z\d]+(?:[-‐‑–—_./][a-z\d]+)*$/.test(term) ? term.replace(SEPARATORS, '') : '';
}

// One missing, extra or substituted character, or one adjacent transposition.
// Short acronyms stay literal; bounded ASCII patterns fit D1's 50-byte limit.
function typoPatterns(word) {
  if (!/^[a-z\d]{5,32}$/.test(word) || !/[a-z]/.test(word)) return [];
  const patterns = new Set();
  for (let i = 0; i < word.length; i++) {
    patterns.add(word.slice(0, i) + '_' + word.slice(i + 1));
    patterns.add(word.slice(0, i) + word.slice(i + 1));
    if (i + 1 < word.length) patterns.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  for (let i = 0; i <= word.length; i++) patterns.add(word.slice(0, i) + '_' + word.slice(i));
  return [...patterns];
}

function expandTerm(term) {
  const compact = compactLatin(term);
  const patterns = typoPatterns(compact);
  const literal = new Set([term]);
  for (const aliases of NAME_ALIASES) {
    if (aliases.some(alias => alias === term ||
      (compact.length >= 3 && alias.includes(compact)) ||
      patterns.some(pattern => new RegExp(pattern.replaceAll('_', '.')).test(alias)))) {
      for (const alias of aliases) literal.add(alias);
    }
  }
  return {
    literal: [...literal],
    compact: [...new Set([...literal].map(compactLatin).filter(Boolean))],
    fuzzy: patterns.map(pattern => '%' + pattern + '%'),
  };
}

export function parseNewsSearch(params) {
  const query = (params.get('q') || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  const terms = query.toLowerCase().split(' ').filter(Boolean);
  if (params.getAll('q').length > 1 || query.length > 120 || terms.length > 12) return null;
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (params.getAll('limit').length > 1 || !Number.isSafeInteger(limit) || limit < 1) return null;
  return { query, terms, limit: Math.min(limit, 20) };
}

// Column names are internal constants. All user text and expanded patterns
// travel in one bound JSON value, never in SQL syntax or wildcard input.
function matchesTerms(rawColumn, compactColumn, fuzzy = false) {
  return `NOT EXISTS (SELECT 1 FROM search_terms AS term WHERE NOT (
    EXISTS (SELECT 1 FROM json_each(term.value, '$.literal') AS token WHERE instr(${rawColumn}, token.value) > 0)
    OR EXISTS (SELECT 1 FROM json_each(term.value, '$.compact') AS token WHERE instr(${compactColumn}, token.value) > 0)
    ${fuzzy ? `OR EXISTS (SELECT 1 FROM json_each(term.value, '$.fuzzy') AS token WHERE ${compactColumn} LIKE token.value)` : ''}
  ))`;
}

function compactSql(column) {
  return [' ', '-', '‐', '‑', '–', '—', '_', '.', '/'].reduce((sql, separator) => `replace(${sql}, '${separator}', '')`, column);
}

export async function getNewsSearch(env, { query, terms, limit }) {
  if (!terms.length) return { data: [], meta: { query, count: 0, total: 0, limit } };
  const text = "lower(coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '') || ' ' || coalesce(tags, '') || ' ' || coalesce(source_name, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(source_url, ''))";
  const result = await env.DB.prepare(`
    WITH search_terms AS MATERIALIZED (SELECT value FROM json_each(?)),
    documents AS MATERIALIZED (
      SELECT id, slug, title, substr(summary, 1, 260) AS summary, category, source_name, published_at,
        lower(coalesce(title, '')) AS title_text,
        ${compactSql("lower(coalesce(title, ''))")} AS title_compact,
        lower(coalesce(summary, '')) AS summary_text,
        ${compactSql("lower(coalesce(summary, ''))")} AS summary_compact,
        ${text} AS full_text, ${compactSql(text)} AS full_compact
      FROM news WHERE status = 'published'
    ), matches AS (
      SELECT *, CASE
        WHEN title_text = ? THEN 0
        WHEN ${matchesTerms('title_text', 'title_compact')} THEN 1
        WHEN ${matchesTerms('summary_text', 'summary_compact')} THEN 2
        WHEN ${matchesTerms('full_text', 'full_compact')} THEN 3
        ELSE 4 END AS relevance
      FROM documents WHERE ${matchesTerms('full_text', 'full_compact', true)}
    )
    SELECT slug, title, summary, category, source_name, published_at, COUNT(*) OVER () AS total_matches
    FROM matches ORDER BY relevance, published_at DESC, id DESC LIMIT ?
  `).bind(JSON.stringify(terms.map(expandTerm)), query.toLowerCase(), limit).all();
  const rows = result.results || [];
  const data = rows.map(row => ({ slug: row.slug, title: row.title, summary: row.summary, category: row.category, source_name: row.source_name, published_at: row.published_at }));
  return { data, meta: { query, count: data.length, total: Number(rows[0]?.total_matches || 0), limit } };
}
