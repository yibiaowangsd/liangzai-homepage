const CACHE_SECONDS = 60;

function observedDatabase(database, stats) {
  const measure = async operation => {
    const result = await operation();
    stats.queries++;
    stats.rows_read += Number(result.meta?.rows_read || 0);
    stats.rows_written += Number(result.meta?.rows_written || 0);
    stats.sql_ms += Number(result.meta?.timings?.sql_duration_ms ?? result.meta?.duration ?? 0);
    return result;
  };
  function statement(original) {
    return {
      bind(...args) { return statement(original.bind(...args)); },
      all() { return measure(() => original.all()); },
      async first(column) {
        // D1 first() discards metadata; all() preserves the same LIMIT 1 result.
        if (!original.all) return original.first(column);
        const result = await measure(() => original.all());
        const row = result.results?.[0] ?? null;
        return column && row ? row[column] : row;
      },
    };
  }
  return { prepare(sql) { return statement(database.prepare(sql)); } };
}

function annotate(response, cache, stats) {
  const result = new Response(response.body, response);
  result.headers.set('X-News-Cache', cache);
  result.headers.set('X-News-Rows-Read', String(stats.rows_read));
  result.headers.set('Server-Timing', `d1;dur=${stats.sql_ms.toFixed(3)}`);
  return result;
}

// Only explicitly validated public news GETs enter this wrapper. Subscription,
// admin, POST, token-bearing and error responses are never cached.
export async function publicNewsRead(request, env, ctx, json, options, load) {
  const started = performance.now();
  const stats = { queries: 0, rows_read: 0, rows_written: 0, sql_ms: 0 };
  let state = 'BYPASS';
  const done = response => {
    if (ctx) console.log(JSON.stringify({ event: 'news_read', route: options.route, cache: state,
      status: response.status, ...stats, elapsed_ms: Math.round(performance.now() - started) }));
    return annotate(response, state, stats);
  };
  const canCache = request.method === 'GET' && !request.headers.has('Authorization') && !request.headers.has('Cookie');
  const cache = canCache && typeof caches !== 'undefined' ? caches.default : null;
  const now = Date.now();
  const bucket = Math.floor(now / (CACHE_SECONDS * 1000));
  const key = new URL(`/__news_cache/v1/${env.NEWS_RELEASE_SHA || 'local'}/${bucket}/${options.route}`, request.url);
  for (const [name, value] of Object.entries(options.key).sort(([a], [b]) => a.localeCompare(b))) key.searchParams.set(name, String(value));
  const cacheKey = new Request(key, { method: 'GET' });
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        state = 'HIT';
        return done(json(request, await cached.json()));
      }
      state = 'MISS';
    } catch { state = 'BYPASS'; }
  }

  // Cache hits do not reach D1 or consume the cold-request allowance. Limits
  // use Cloudflare's binding, not D1 counters or per-isolate mutable maps.
  const limiter = options.route === 'search' ? env.NEWS_SEARCH_LIMITER : env.NEWS_READ_LIMITER;
  const identity = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const allowed = !limiter || (await limiter.limit({ key: identity })).success;
    const searchAllowed = options.route !== 'search' || !env.NEWS_SEARCH_MISS_LIMITER ||
      (allowed && (await env.NEWS_SEARCH_MISS_LIMITER.limit({ key: 'cold-search' })).success);
    if (!allowed || !searchAllowed) {
      state = 'LIMITED';
      const response = json(request, { error: 'Too many requests', message: '请求过于频繁，请稍后重试。' }, 429);
      response.headers.set('Retry-After', '60');
      return done(response);
    }
    const data = await load({ ...env, DB: observedDatabase(env.DB, stats) });
    const response = data instanceof Response ? data : json(request, data);
    if (cache && response.status === 200) {
      const stored = response.clone();
      stored.headers.delete('Access-Control-Allow-Origin');
      stored.headers.delete('Access-Control-Allow-Methods');
      stored.headers.delete('Access-Control-Allow-Headers');
      stored.headers.delete('Vary');
      stored.headers.set('Cache-Control', `public, max-age=${Math.max(1, CACHE_SECONDS - Math.floor(now / 1000) % CACHE_SECONDS)}`);
      const write = Promise.resolve().then(() => cache.put(cacheKey, stored)).catch(() => console.error('news_cache_write_failed'));
      if (ctx) ctx.waitUntil(write); else await write;
    }
    return done(response);
  } catch (error) {
    state = 'ERROR';
    const unavailable = /D1_|D1_ERROR|database|quota|rows?.*limit|limit.*rows?/i.test(error.message || '');
    console.error(JSON.stringify({ event: 'news_read_failed', route: options.route, unavailable }));
    const response = json(request, { error: unavailable ? 'Service Unavailable' : 'Internal Server Error',
      message: '新闻服务暂时无法读取，请稍后重试。' }, unavailable ? 503 : 500);
    if (unavailable) response.headers.set('Retry-After', '60');
    return done(response);
  }
}
