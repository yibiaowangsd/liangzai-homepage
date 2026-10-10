import policy from '../news/edition-policy.json' with { type: 'json' };

export const CORE_CATEGORIES = Object.keys(policy.categories);
export const CATEGORY_LABELS = Object.fromEntries(Object.entries(policy.categories).map(([key, value]) => [key, value.label]));
export const LEGACY_CATEGORIES = policy.legacy_categories;
export const EDITION_V2_FROM = policy.effective_date;
export const beijingDate = value => new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);

// This check protects the replacement boundary. Article quality is also
// validated by news/validate-edition.py before the publishing workflow runs.
export function validateEdition(body, items) {
  const date = body.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('date must be a valid edition date');
  }
  const version = body.schema_version ?? 1;
  if (version !== 1 && version !== 2) throw new Error('unsupported edition schema_version');
  if (version === 1 && date >= EDITION_V2_FROM) throw new Error('edition must be schema_version 2');
  const categories = version === 2 ? CORE_CATEGORIES : LEGACY_CATEGORIES;
  const counts = Object.fromEntries(categories.map(key => [key, 0]));
  const slugs = new Set();
  if (!items.length || items.length > categories.length * policy.max_per_category) throw new Error('items must contain a non-empty, complete edition');
  for (const item of items) {
    if (!Object.hasOwn(counts, item.category) || item.status !== 'published' ||
        beijingDate(item.published_at) !== date || !item.slug.startsWith(date.replaceAll('-', '') + '-') || slugs.has(item.slug)) {
      throw new Error('items must have unique dated slugs, published status and valid edition categories');
    }
    slugs.add(item.slug);
    counts[item.category]++;
  }
  if (version === 1) {
    if (categories.some(key => counts[key] !== 5)) throw new Error('legacy items must contain five stories in each of five categories');
    return null;
  }
  const coverage = body.coverage;
  if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage) ||
      Object.keys(coverage).length !== categories.length || categories.some(key => !Object.hasOwn(coverage, key))) {
    throw new Error('coverage must describe all seven categories');
  }
  const normalized = {};
  for (const key of categories) {
    const entry = coverage[key];
    if (!entry || !Number.isInteger(entry.count) || entry.count !== counts[key] || entry.count > policy.max_per_category ||
        typeof entry.note !== 'string' || entry.note.trim().length > 600 ||
        (entry.count < policy.min_per_category && entry.note.trim().length < 12)) {
      throw new Error(`coverage.${key} must match items and explain any shortfall below three`);
    }
    normalized[key] = { count: entry.count, note: entry.note.trim() };
  }
  return { coverage: normalized, slugs: [...slugs].sort() };
}

// Compare the published snapshot, not a guessed minimum count. Missing or
// damaged manifests never trigger a partial digest.
export async function publishedCoverage(env, date, items, selected = null) {
  const manifest = await env.DB.prepare('SELECT coverage, slugs FROM news_editions WHERE date = ?').bind(date).first();
  if (manifest) {
    try {
      const coverage = JSON.parse(manifest.coverage);
      const slugs = JSON.parse(manifest.slugs);
      if (selected) {
        // A deliberate manual send still checks only its approved desks.
        // Automatic delivery below requires the full seven-desk snapshot.
        const available = items.filter(item => selected.includes(item.category));
        return selected.every(key => Number.isInteger(coverage[key]?.count) && coverage[key].count >= 0 &&
          coverage[key].count <= policy.max_per_category && typeof coverage[key].note === 'string' &&
          (coverage[key].count >= policy.min_per_category || coverage[key].note.trim().length >= 12) &&
          available.filter(item => item.category === key).length === coverage[key].count) &&
          available.every(item => slugs.includes(item.slug)) ? coverage : null;
      }
      const verified = validateEdition({ date, schema_version: 2, coverage }, items);
      return JSON.stringify(verified.slugs) === JSON.stringify(slugs) ? verified.coverage : null;
    } catch { return null; }
  }
  if (date >= EDITION_V2_FROM) return null;
  const required = selected || LEGACY_CATEGORIES;
  return required.every(key => items.filter(item => item.category === key).length >= 5) ? {} : null;
}
