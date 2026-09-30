const ALLOWED_ORIGINS = new Set([
  "https://wangyibiao.com",
  "https://www.wangyibiao.com",
]);

const ALLOWED_CATEGORIES = new Set([
  "pqc",
  "protocol",
  "standards",
  "security",
  "ai",
  "industry",
  "daily",
  "test",
]);

const ALLOWED_STATUSES = new Set(["draft", "published"]);
// Deployment probe: GitHub Actions owns production deployments for this dedicated API Worker.\nconst MAX_BATCH_ITEMS = 20;

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}

function optionalString(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("must be a string");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`must be <= ${maxLength} characters`);
  return normalized || null;
}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${field} must be <= ${maxLength} characters`);
  }
  return normalized;
}

function normalizeUrl(value, field) {
  const normalized = optionalString(value, 2048);
  if (!normalized) return null;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${field} must use http or https`);
  }
  return normalized;
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null || tags === "") return null;

  let values = tags;
  if (typeof tags === "string") {
    try {
      values = JSON.parse(tags);
    } catch {
      values = tags.split(",");
    }
  }

  if (!Array.isArray(values)) throw new Error("tags must be an array or JSON array string");

  const normalized = [...new Set(values.map((tag) => String(tag).trim()).filter(Boolean))]
    .slice(0, 20)
    .sort((a, b) => a.localeCompare(b));

  return normalized.length ? JSON.stringify(normalized) : null;
}

function normalizePublishedAt(value) {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("published_at must be a valid date/time");
  return date.toISOString();
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("news item must be an object");
  }

  const slug = requiredString(raw.slug, "slug", 160).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("slug must contain only lowercase letters, numbers, and single hyphens");
  }

  const title = requiredString(raw.title, "title", 300);
  const content = requiredString(raw.content, "content", 120000);
  const summary = optionalString(raw.summary, 2000);
  const category = optionalString(raw.category, 64) || "daily";
  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new Error(`unsupported category: ${category}`);
  }

  const status = optionalString(raw.status, 32) || "published";
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`unsupported status: ${status}`);
  }

  return {
    slug,
    title,
    summary,
    content,
    category,
    tags: normalizeTags(raw.tags),
    source_name: optionalString(raw.source_name, 300),
    source_url: normalizeUrl(raw.source_url, "source_url"),
    cover_image: normalizeUrl(raw.cover_image, "cover_image"),
    published_at: normalizePublishedAt(raw.published_at),
    status,
  };
}

function sameNews(existing, item) {
  return [
    "slug",
    "title",
    "summary",
    "content",
    "category",
    "tags",
    "source_name",
    "source_url",
    "cover_image",
    "published_at",
    "status",
  ].every((field) => (existing[field] ?? null) === (item[field] ?? null));
}

function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const authorization = request.headers.get("Authorization") || "";
  return authorization === `Bearer ${env.ADMIN_TOKEN}`;
}

async function publishItems(env, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("items must be a non-empty array");
  }
  if (rawItems.length > MAX_BATCH_ITEMS) {
    throw new Error(`items must contain at most ${MAX_BATCH_ITEMS} entries`);
  }

  const seen = new Set();
  const duplicateSlugs = [];
  const items = [];

  for (const raw of rawItems) {
    const item = normalizeItem(raw);
    if (seen.has(item.slug)) {
      duplicateSlugs.push(item.slug);
      continue;
    }
    seen.add(item.slug);
    items.push(item);
  }

  const changes = [];
  let skipped = duplicateSlugs.length;

  for (const item of items) {
    const existing = await env.DB.prepare(`
      SELECT
        slug, title, summary, content, category, tags,
        source_name, source_url, cover_image, published_at, status
      FROM news
      WHERE slug = ?
      LIMIT 1
    `).bind(item.slug).first();

    if (existing && sameNews(existing, item)) {
      skipped += 1;
      continue;
    }

    const statement = env.DB.prepare(`
      INSERT INTO news (
        slug,
        title,
        summary,
        content,
        category,
        tags,
        source_name,
        source_url,
        cover_image,
        published_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        category = excluded.category,
        tags = excluded.tags,
        source_name = excluded.source_name,
        source_url = excluded.source_url,
        cover_image = excluded.cover_image,
        published_at = excluded.published_at,
        status = excluded.status,
        updated_at = datetime('now')
    `).bind(
      item.slug,
      item.title,
      item.summary,
      item.content,
      item.category,
      item.tags,
      item.source_name,
      item.source_url,
      item.cover_image,
      item.published_at,
      item.status,
    );

    changes.push({ type: existing ? "updated" : "inserted", slug: item.slug, statement });
  }

  if (changes.length) {
    await env.DB.batch(changes.map((change) => change.statement));
  }

  return {
    ok: true,
    inserted: changes.filter((change) => change.type === "inserted").length,
    updated: changes.filter((change) => change.type === "updated").length,
    skipped,
    duplicate_slugs: duplicateSlugs,
    changed_slugs: changes.map((change) => change.slug),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/api/health")) {
        const database = await env.DB.prepare("SELECT 1 AS ok").first();
        return json(request, {
          ok: database?.ok === 1,
          service: "liangzai-news-api",
          database: database?.ok === 1,
        });
      }

      if (request.method === "GET" && url.pathname === "/api/news") {
        const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
        const category = url.searchParams.get("category");

        let statement;
        if (category) {
          statement = env.DB.prepare(`
            SELECT
              id, slug, title, summary, category, tags,
              source_name, source_url, cover_image, published_at
            FROM news
            WHERE status = 'published' AND category = ?
            ORDER BY published_at DESC, id DESC
            LIMIT ?
          `).bind(category, limit);
        } else {
          statement = env.DB.prepare(`
            SELECT
              id, slug, title, summary, category, tags,
              source_name, source_url, cover_image, published_at
            FROM news
            WHERE status = 'published'
            ORDER BY published_at DESC, id DESC
            LIMIT ?
          `).bind(limit);
        }

        const result = await statement.all();
        return json(request, {
          data: result.results || [],
          meta: { count: result.results?.length || 0, limit },
        });
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/news/")) {
        const slug = decodeURIComponent(url.pathname.slice("/api/news/".length)).trim().toLowerCase();
        if (!slug) return json(request, { error: "News not found" }, 404);

        const item = await env.DB.prepare(`
          SELECT *
          FROM news
          WHERE slug = ? AND status = 'published'
          LIMIT 1
        `).bind(slug).first();

        if (!item) return json(request, { error: "News not found" }, 404);
        return json(request, item);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/news") {
        if (!env.ADMIN_TOKEN) {
          return json(request, { error: "ADMIN_TOKEN is not configured" }, 503);
        }
        if (!isAdmin(request, env)) {
          return json(request, { error: "Unauthorized" }, 401);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json(request, { error: "Invalid JSON body" }, 400);
        }

        const result = await publishItems(env, [body.item || body]);
        return json(request, result, result.inserted ? 201 : 200);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/news/batch") {
        if (!env.ADMIN_TOKEN) {
          return json(request, { error: "ADMIN_TOKEN is not configured" }, 503);
        }
        if (!isAdmin(request, env)) {
          return json(request, { error: "Unauthorized" }, 401);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json(request, { error: "Invalid JSON body" }, 400);
        }

        const result = await publishItems(env, body.items);
        return json(request, {
          ...result,
          date: typeof body.date === "string" ? body.date : null,
        });
      }

      return json(request, { error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown error";
      const clientError = /required|must be|unsupported|items/.test(message);
      return json(
        request,
        {
          error: clientError ? "Invalid request" : "Internal Server Error",
          message,
        },
        clientError ? 400 : 500,
      );
    }
  },
};
