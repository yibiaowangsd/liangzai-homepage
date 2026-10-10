import { handleRobotSubscriptions } from "./robot-subscriptions.js";
import { handleSubscriptions, sendDailyDigest, readBody, RequestError } from "./subscriptions.js";
import { robotConfigured, robotStatus, sendRobotDigest, sendRobotConnectionTest, sendManualRobotDigest } from "./robot.js";
import { CORE_CATEGORIES, validateEdition, beijingDate } from "./edition.js";

const ALLOWED_ORIGINS = new Set([
  "https://wangyibiao.com",
  "https://www.wangyibiao.com",
]);

const ALLOWED_CATEGORIES = new Set([
  ...CORE_CATEGORIES,
  "industry",
  "daily",
  "test",
]);

const ALLOWED_STATUSES = new Set(["draft", "published"]);
const MAX_BATCH_ITEMS = 35;

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
  if (normalized.startsWith("/")) return normalized;

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

async function publishItems(env, rawItems, edition = null) {
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
      if (edition) throw new Error('edition items must have unique slugs');
      duplicateSlugs.push(item.slug);
      continue;
    }
    seen.add(item.slug);
    items.push(item);
  }

  const manifest = edition ? validateEdition(edition, items) : null;
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

  const statements = changes.map(change => change.statement);
  let deleteIndex = -1;
  if (edition) {
    deleteIndex = statements.length;
    statements.push(env.DB.prepare(`DELETE FROM news WHERE status = 'published'
      AND date(published_at, '+8 hours') = ? AND slug NOT IN (${items.map(() => '?').join(',')})`)
      .bind(edition.date, ...items.map(item => item.slug)));
    if (manifest) statements.push(env.DB.prepare(`INSERT INTO news_editions (date, schema_version, coverage, slugs)
      VALUES (?, 2, ?, ?) ON CONFLICT(date) DO UPDATE SET schema_version = 2, coverage = excluded.coverage,
      slugs = excluded.slugs, updated_at = datetime('now')`)
      .bind(edition.date, JSON.stringify(manifest.coverage), JSON.stringify(manifest.slugs)));
    else statements.push(env.DB.prepare('DELETE FROM news_editions WHERE date = ?').bind(edition.date));
  }
  const results = statements.length ? await env.DB.batch(statements) : [];

  return {
    ok: true,
    items,
    removed: deleteIndex < 0 ? 0 : Number(results[deleteIndex].meta?.changes || 0),
    inserted: changes.filter((change) => change.type === "inserted").length,
    updated: changes.filter((change) => change.type === "updated").length,
    skipped,
    duplicate_slugs: duplicateSlugs,
    changed_slugs: changes.map((change) => change.slug),
  };
}

async function getEditions(env, page, pageSize, category) {
  const where = category ? "WHERE status = 'published' AND category = ?" : "WHERE status = 'published'";
  const args = category ? [category] : [];
  const includeManifest = !category || CORE_CATEGORIES.includes(category);
  // Include explicitly empty desks in v2 archives so readers see the coverage note.
  const datesQuery = `SELECT date(published_at, '+8 hours') AS edition_date FROM news ${where}
    ${includeManifest ? 'UNION SELECT date AS edition_date FROM news_editions' : ''}`;
  const countRow = await env.DB.prepare(`SELECT COUNT(DISTINCT edition_date) AS total_days FROM (${datesQuery})`).bind(...args).first();
  const totalDays = Number(countRow?.total_days || 0);
  const totalPages = Math.max(1, Math.ceil(totalDays / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * pageSize;
  const datesStatement = env.DB.prepare(`SELECT DISTINCT edition_date FROM (${datesQuery}) ORDER BY edition_date DESC LIMIT ? OFFSET ?`).bind(...args, pageSize, offset);

  const datesResult = await datesStatement.all();
  const dates = (datesResult.results || []).map((row) => row.edition_date).filter(Boolean);

  if (!dates.length) {
    return {
      data: [],
      meta: { page: safePage, pageSize, totalDays, totalPages },
    };
  }

  const placeholders = dates.map(() => "?").join(", ");
  const rowsStatement = category
    ? env.DB.prepare(`
        SELECT id, slug, title, summary, category, tags,
               source_name, source_url, cover_image, published_at
        FROM news
        WHERE status = 'published'
          AND category = ?
          AND date(published_at, '+8 hours') IN (${placeholders})
        ORDER BY published_at DESC, id DESC
      `).bind(category, ...dates)
    : env.DB.prepare(`
        SELECT id, slug, title, summary, category, tags,
               source_name, source_url, cover_image, published_at
        FROM news
        WHERE status = 'published'
          AND date(published_at, '+8 hours') IN (${placeholders})
        ORDER BY published_at DESC, id DESC
      `).bind(...dates);

  const rowsResult = await rowsStatement.all();
  const byDate = new Map(
    dates.map((date) => [
      date,
      {
        date,
        total: 0,
        topics: Object.fromEntries(CORE_CATEGORIES.map((key) => [key, []])),
      },
    ]),
  );

  for (const row of rowsResult.results || []) {
    const date = beijingDate(row.published_at);
    const edition = byDate.get(date);
    if (!edition) continue;
    edition.total += 1;
    if (!edition.topics[row.category]) edition.topics[row.category] = [];
    edition.topics[row.category].push(row);
  }

  const manifests = await env.DB.prepare(`SELECT date, schema_version, coverage FROM news_editions WHERE date IN (${placeholders})`).bind(...dates).all();
  for (const manifest of manifests.results || []) {
    const edition = byDate.get(manifest.date);
    if (edition) Object.assign(edition, { schema_version: manifest.schema_version, coverage: JSON.parse(manifest.coverage) });
  }

  return {
    data: dates.map((date) => byDate.get(date)),
    meta: { page: safePage, pageSize, totalDays, totalPages },
  };
}

async function getFeatured(env, limit) {
  const latest = await env.DB.prepare(`
    SELECT date(published_at, '+8 hours') AS edition_date
    FROM news
    WHERE status = 'published'
    ORDER BY published_at DESC, id DESC
    LIMIT 1
  `).first();

  const editionDate = latest?.edition_date;
  if (!editionDate) return { edition_date: null, data: [] };

  const result = await env.DB.prepare(`
    SELECT id, slug, title, summary, category, tags,
           source_name, source_url, cover_image, published_at
    FROM news
    WHERE status = 'published'
      AND date(published_at, '+8 hours') = ?
    ORDER BY published_at DESC, id DESC
    LIMIT 100
  `).bind(editionDate).all();

  const rows = result.results || [];
  const selected = [];
  const selectedSlugs = new Set();

  for (const category of CORE_CATEGORIES) {
    const item = rows.find((row) => row.category === category);
    if (item && !selectedSlugs.has(item.slug)) {
      selected.push(item);
      selectedSlugs.add(item.slug);
    }
  }

  for (const item of rows) {
    if (selected.length >= limit) break;
    if (!selectedSlugs.has(item.slug)) {
      selected.push(item);
      selectedSlugs.add(item.slug);
    }
  }

  return { edition_date: editionDate, data: selected.slice(0, limit) };
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
          robot_ready: robotConfigured(env),
        });
      }

      if (url.pathname === "/api/admin/robot/status" || url.pathname === "/api/admin/robot/send" || url.pathname === "/api/admin/robot/test") {
        if (!env.ADMIN_TOKEN) return json(request, { error: "Administrator is not configured" }, 503);
        if (!isAdmin(request, env)) return json(request, { error: "Unauthorized" }, 401);
        if (request.method === "GET" && url.pathname.endsWith("/status")) return json(request, await robotStatus(env));
        if (request.method === "POST" && url.pathname.endsWith("/test")) {
          try {
            const body = await readBody(request);
            return json(request, await sendRobotConnectionTest(env, body.subscriber_id, body.test_id));
          } catch (error) {
            if (error instanceof RequestError) return json(request, { error: error.message }, error.status);
            throw error;
          }
        }
        if (request.method === "POST" && url.pathname.endsWith("/send")) {
          try {
            const origin = request.headers.get("Origin");
            if (origin && !ALLOWED_ORIGINS.has(origin)) throw new RequestError("不允许的请求来源。", 403);
            const body = await readBody(request);
            if (body.subscriber_id === undefined) return json(request, { ok: true, message: "机器人日报由定时任务发送；主动发送须指定已批准的机器人。" }, 202);
            if (!/^[a-f0-9-]{36}$/.test(body.subscriber_id)) throw new RequestError("机器人参数无效。");
            return json(request, await sendManualRobotDigest(env, body.subscriber_id, { send_id: body.send_id, part: body.part, version: body.version, date: body.date }));
          } catch (error) {
            if (error instanceof RequestError) return json(request, { error: error.message }, error.status);
            throw error;
          }
        }
        return json(request, { error: "Method not allowed" }, 405);
      }

      const robotSubscriptionResponse = await handleRobotSubscriptions(request, env, json);
      if (robotSubscriptionResponse) return robotSubscriptionResponse;

      const subscriptionResponse = await handleSubscriptions(request, env, json);
      if (subscriptionResponse) return subscriptionResponse;

      if (request.method === "GET" && url.pathname === "/api/news/editions") {
        const requestedPage = Number(url.searchParams.get("page") || "1");
        const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        // One edition date per page. Keep accepting legacy pageSize query values,
        // but never split a day or combine several dates into one archive page.
        const pageSize = 1;
        const category = url.searchParams.get("category");
        if (category && !ALLOWED_CATEGORIES.has(category)) {
          return json(request, { error: "Unsupported category" }, 400);
        }

        return json(request, await getEditions(env, page, pageSize, category));
      }

      if (request.method === "GET" && url.pathname === "/api/news/featured") {
        const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "6", 10);
        const limit = Math.min(Math.max(parsedLimit || 6, 1), 10);
        return json(request, await getFeatured(env, limit));
      }

      if (request.method === "GET" && url.pathname === "/api/news") {
        const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
        const category = url.searchParams.get("category");

        let statement;
        if (category) {
          statement = env.DB.prepare(`
            SELECT id, slug, title, summary, category, tags,
                   source_name, source_url, cover_image, published_at
            FROM news
            WHERE status = 'published' AND category = ?
            ORDER BY published_at DESC, id DESC
            LIMIT ?
          `).bind(category, limit);
        } else {
          statement = env.DB.prepare(`
            SELECT id, slug, title, summary, category, tags,
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
        if (!env.ADMIN_TOKEN) return json(request, { error: "ADMIN_TOKEN is not configured" }, 503);
        if (!isAdmin(request, env)) return json(request, { error: "Unauthorized" }, 401);

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
        if (!env.ADMIN_TOKEN) return json(request, { error: "ADMIN_TOKEN is not configured" }, 503);
        if (!isAdmin(request, env)) return json(request, { error: "Unauthorized" }, 401);

        let body;
        try {
          body = await request.json();
        } catch {
          return json(request, { error: "Invalid JSON body" }, 400);
        }

        const result = await publishItems(env, body.items, body.date === undefined ? null : body);
        const date = body.date || null;
        const { items, ...publicResult } = result;

        return json(request, {
          ...publicResult,
          date,
        });
      }

      return json(request, { error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown error";
      const clientError = /required|must\b|unsupported|items/.test(message);
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
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(Promise.all([
      sendDailyDigest(env).then(result => console.log("newsletter_cron", JSON.stringify(result)))
        .catch(() => console.error("newsletter_cron_failed")),
      sendRobotDigest(env).then(result => console.log("robot_cron", JSON.stringify(result)))
        .catch(() => console.error("robot_cron_failed")),
    ]));
  },
};
