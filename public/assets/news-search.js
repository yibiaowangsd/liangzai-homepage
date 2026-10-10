/** @typedef {{href: string, name: string, description: string, category: string, date: string, source: string}} NewsSearchResult */

/** @param {string} query */
export function normalizeSearchQuery(query) {
  return query.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/** @param {string} timestamp */
export function newsEditionDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

/**
 * Shared by the React header and the standalone laboratory header.
 * @param {string} query
 * @param {{signal?: AbortSignal, fetcher?: typeof fetch}} [options]
 * @returns {Promise<{results: NewsSearchResult[], total: number}>}
 */
export async function searchPublishedNews(query, { signal, fetcher = globalThis.fetch } = {}) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return { results: [], total: 0 };
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 8000);
  try {
    const url = new URL('/api/news/search', 'https://api.wangyibiao.com');
    url.searchParams.set('q', normalized);
    url.searchParams.set('limit', '20');
    const response = await fetcher(url, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`News search returned ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data) || !Number.isSafeInteger(payload.meta?.total)) throw new Error('Invalid news search response');
    /** @type {NewsSearchResult[]} */
    const results = payload.data.filter(item => typeof item.slug === 'string' && typeof item.title === 'string').map(item => {
      const date = newsEditionDate(item.published_at);
      return {
        href: '/news/' + encodeURIComponent(item.slug) + (date ? '?date=' + date : ''),
        name: item.title, description: typeof item.summary === 'string' ? item.summary : '',
        category: typeof item.category === 'string' ? item.category : '',
        date, source: typeof item.source_name === 'string' ? item.source_name : '',
      };
    });
    return { results, total: payload.meta.total };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
