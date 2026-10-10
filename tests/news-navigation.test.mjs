import assert from "node:assert/strict";
import test from "node:test";

const story = (index) => ({
  id: index,
  slug: `return-context-${index}`,
  title: `新闻 ${index}`,
  summary: "导航回归测试",
  content: "正文",
  category: "protocol",
  tags: null,
  source_name: "测试来源",
  source_url: null,
  cover_image: null,
  published_at: "2026-10-02T07:00:00Z",
});
const stories = Array.from({ length: 5 }, (_, index) => story(index));
const decodeHref = (value) => value.replaceAll("&amp;", "&");

test("all news entry points round-trip their category and archive page", async (t) => {
  const originalFetch = globalThis.fetch;
  let servedPage;
  const editionRequests = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, "https://api.wangyibiao.com");
    if (url.pathname === "/api/news/editions") {
      editionRequests.push(url);
      return Response.json({
        data: url.searchParams.get("date") === "2026-10-01" ? [] : [{ date: "2026-10-02", total: stories.length, topics: { protocol: stories } }],
        meta: { page: servedPage ?? Number(url.searchParams.get("page")), pageSize: 1, totalDays: 3, totalPages: 3, dates: ["2026-10-03", "2026-10-02", "2026-09-30"] },
      });
    }
    return Response.json(stories.find((item) => url.pathname.endsWith(item.slug)));
  };
  try {
    const { default: worker } = await import("../dist/server/index.js");
    async function render(path) {
      const response = await worker.fetch(
        new Request("http://localhost" + path, { headers: { accept: "text/html" } }),
        { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
        { waitUntil() {}, passThroughOnException() {} },
      );
      assert.equal(response.status, 200);
      const main = (await response.text()).match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
      assert.ok(main);
      return main;
    }
    for (const query of ["", "?category=protocol", "?page=2", "?page=2&category=protocol", "?date=2026-10-02", "?date=2026-10-02&category=protocol"]) {
      await t.test(`listing → article → return ${query || "(default)"}`, async () => {
        const listing = await render("/news" + query);
        assert.match(listing, /<a\b(?=[^>]*class="news-subscribe-link")[^>]*href="\/news\/subscribe(?:\?category=protocol)?"/);
        const links = [...listing.matchAll(/<a\b[^>]*href="(\/news\/[^\"]+)"[^>]*>/g)]
          .map((match) => decodeHref(match[1]))
          .filter((href) => new URL(href, "http://localhost").pathname !== "/news/subscribe");
        assert.ok(links.length >= 20, "Hero, deck, topic, and brief links are all covered");
        for (const href of links) assert.equal(new URL(href, "http://localhost").search, query);
        const detail = await render(links[0]);
        const back = detail.match(/<a\b(?=[^>]*class="article-back")[^>]*href="([^"]+)"/);
        assert.ok(back);
        assert.equal(decodeHref(back[1]), "/news" + query);
        // A direct reload of the article has the same return link, without history/referrer.
        assert.equal(await render(links[0]), detail);
      });
    }
    await t.test("direct articles and invalid queries safely return to the default listing", async () => {
      for (const suffix of ["", "?page=-2&category=unknown", "?page=2oops", "?page=2.5", "?page=1&page=2&category=ai&category=pqc", "?date=nope", "?date=2026-02-29", "?date=2026-10-02&date=2026-10-03", "?returnTo=https://example.com"]) {
        const detail = await render("/news/" + stories[0].slug + suffix);
        assert.match(detail, /<a\b(?=[^>]*class="article-back")[^>]*href="\/news"/);
      }
    });
    await t.test("article links use the page actually returned by the API", async () => {
      servedPage = 3;
      const listing = await render("/news?page=999&category=protocol");
      assert.match(listing, /href="\/news\/return-context-0\?page=3&amp;category=protocol"/);
      assert.doesNotMatch(listing, /href="\/news\/[^\"]*page=999/);
    });
    await t.test("date selection overrides a stale page and persists through category changes", async () => {
      const listing = await render("/news?page=999&date=2026-10-02&category=protocol");
      assert.equal(editionRequests.at(-1).searchParams.get("date"), "2026-10-02");
      assert.match(listing, /href="\/news\/return-context-0\?date=2026-10-02&amp;category=protocol"/);
      assert.match(listing, /href="\/news\?date=2026-10-02&amp;category=ai"/);
      assert.match(listing, /href="\/news\?date=2026-10-02"/);
      assert.doesNotMatch(listing, /href="\/news\/[^\"]*page=/);
    });
    await t.test("unpublished date links explain the missing edition and offer the calendar", async () => {
      const listing = await render("/news?date=2026-10-01&category=protocol");
      assert.match(listing, /该日期暂无日报/);
      assert.match(listing, /class="news-date-trigger"/);
      assert.match(listing, /href="\/news\?category=protocol">阅读最新一期/);
      assert.doesNotMatch(listing, /return-context-0/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
