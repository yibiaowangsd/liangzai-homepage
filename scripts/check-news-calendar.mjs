import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { expect } from "playwright/test";

// Render the production build against a deterministic archive. No live API,
// account, mail or robot delivery is involved in these interactions.
const dates = ["2026-10-10", "2026-10-08", "2026-10-02", "2026-09-30", "2026-09-28", "2026-08-31"];
const stories = dates.flatMap((date, index) => ["protocol", "pqc"].map((category, desk) => ({
  id: index * 2 + desk + 1, slug: date + "-" + category,
  title: date + " " + (category === "protocol" ? "协议部署进展" : "算法实现进展"),
  summary: "用于验证日历日期、栏目切换与文章返回位置的新闻。",
  content: "## 新闻正文\n\n日历选择的日期应在文章返回后保留。",
  category, tags: "[]", source_name: "测试来源", source_url: null,
  cover_image: "/news-covers/" + category + ".svg", published_at: date + "T08:00:00+08:00",
})));

function newsResponse(input) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.pathname.endsWith("/editions")) {
    const requestedDate = url.searchParams.get("date");
    const index = requestedDate ? dates.indexOf(requestedDate) : Math.min(dates.length - 1, Math.max(0, Number(url.searchParams.get("page") || 1) - 1));
    const date = dates[index];
    const category = url.searchParams.get("category");
    const items = stories.filter(item => item.slug.startsWith(date) && (!category || category === item.category));
    return Response.json({
      data: date ? [{ date, total: items.length, topics: Object.groupBy(items, item => item.category) }] : [],
      meta: { page: Math.max(1, index + 1), pageSize: 1, totalDays: dates.length, totalPages: dates.length, dates },
    });
  }
  if (url.pathname.endsWith("/featured")) return Response.json({ edition_date: dates[0], data: stories.slice(0, 2) });
  const item = stories.find(story => url.pathname.endsWith("/" + story.slug));
  return item ? Response.json(item) : new Response(null, { status: 404 });
}

const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  return url.startsWith("https://api.wangyibiao.com/api/news") ? Promise.resolve(newsResponse(input)) : nativeFetch(input, init);
};
const { default: worker } = await import("../dist/server/index.js");
const clientRoot = resolve("dist/client");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };
async function asset(input) {
  const file = resolve(clientRoot, "." + decodeURIComponent(new URL(typeof input === "string" ? input : input.url).pathname));
  if (!file.startsWith(clientRoot + sep)) return new Response(null, { status: 404 });
  try {
    if (!(await stat(file)).isFile()) return new Response(null, { status: 404 });
    return new Response(await readFile(file), { headers: { "Content-Type": types[extname(file)] || "application/octet-stream" } });
  } catch (error) {
    if (error.code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, { headers: incoming.headers });
    const file = await asset(request);
    const response = file.status === 404 ? await worker.fetch(request, { ASSETS: { fetch: asset } }, { waitUntil(promise) { void promise.catch(console.error); }, passThroughOnException() {} }) : file;
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const output = resolve("outputs/news-calendar");
await mkdir(output, { recursive: true });

try {
  for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await browserType.launch();
    try {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      await context.route("https://api.wangyibiao.com/api/news**", async route => {
        const response = newsResponse(route.request().url());
        await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));
      page.on("console", message => { if (message.type() === "error" && /hydration|did not match|React error/i.test(message.text())) errors.push(message.text()); });

      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base + "/news?category=protocol", { waitUntil: "networkidle" });
        const trigger = page.locator(".news-day-controls .news-date-trigger");
        assert.equal(await trigger.boundingBox().then(bounds => bounds.height >= 44), true);
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "选择日刊日期" });
        await dialog.waitFor({ state: "visible" });
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        const bounds = await dialog.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${engine} calendar fits ${width}`);
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900 + 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await dialog.locator('td[aria-selected="true"] button').getAttribute("data-date"), "2026-10-10");
        assert.equal(await dialog.locator('[data-date="2026-10-09"]').getAttribute("aria-disabled"), "true");
        await page.screenshot({ path: resolve(output, `${engine}-${width}.png`), fullPage: false });
        await dialog.locator('[data-date="2026-10-09"]').click({ force: true });
        assert.equal(new URL(page.url()).searchParams.get("date"), null, "Unpublished days never navigate");
        assert.equal(await dialog.isVisible(), true);
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await expect(trigger, "Escape restores trigger focus").toBeFocused();

        await trigger.click();
        await dialog.waitFor({ state: "visible" });
        await page.getByRole("heading", { name: "前沿新闻", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });

        await trigger.click();
        await dialog.waitFor({ state: "visible" });
        await dialog.getByRole("button", { name: "上一个月", exact: true }).click();
        await expect(dialog.getByLabel("选择月份")).toHaveValue("2026-09");
        await dialog.locator('[data-date="2026-09-30"]').click();
        await page.waitForURL("**/news?date=2026-09-30&category=protocol");
        await page.locator('.news-day-controls time[datetime="2026-09-30"]').waitFor();
        await page.reload({ waitUntil: "networkidle" });
        assert.equal(await page.locator(".news-day-controls time").getAttribute("datetime"), "2026-09-30");
        const article = page.locator('.lead-copy h2 a');
        assert.equal(await article.getAttribute("href"), "/news/2026-09-30-protocol?date=2026-09-30&category=protocol");
        await article.click();
        await page.locator(".article-back").waitFor();
        await page.locator(".article-back").click();
        await page.waitForURL("**/news?date=2026-09-30&category=protocol");
        await page.locator('.news-day-controls time[datetime="2026-09-30"]').waitFor();
      }

      await page.goto(base + "/news?date=2026-10-10&category=protocol", { waitUntil: "networkidle" });
      const trigger = page.locator(".news-day-controls .news-date-trigger");
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "选择日刊日期" });
      await dialog.waitFor({ state: "visible" });
      await dialog.locator('[data-date="2026-10-10"]').focus();
      await page.keyboard.press("ArrowLeft");
      await expect(page.locator("button:focus")).toHaveAttribute("data-date", "2026-10-09");
      await page.keyboard.press("Enter");
      assert.equal(await dialog.isVisible(), true);
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("Enter");
      await page.waitForURL("**/news?date=2026-10-08&category=protocol");
      await page.locator('.news-day-controls time[datetime="2026-10-08"]').waitFor();
      await trigger.click();
      await dialog.waitFor({ state: "visible" });
      await dialog.getByLabel("选择月份").selectOption("2026-08");
      await expect(dialog.getByRole("button", { name: "上一个月", exact: true })).toBeDisabled();
      await dialog.getByRole("button", { name: "最新一期", exact: true }).click();
      await page.waitForURL("**/news?date=2026-10-10&category=protocol");
      await page.locator('.news-day-controls time[datetime="2026-10-10"]').waitFor();

      await page.locator(".news-category-menu summary").click();
      await page.getByRole("navigation", { name: "新闻方向" }).getByRole("link", { name: "后量子算法", exact: true }).click();
      await page.waitForURL("**/news?date=2026-10-10&category=pqc");
      await page.locator('.lead-copy h2 a[href*="-pqc"]').waitFor();
      await expect(page.locator(".news-category-menu")).toHaveJSProperty("open", false);
      await page.locator(".news-category-menu summary").click();
      await page.keyboard.press("Escape");
      await expect(page.locator(".news-category-menu")).toHaveJSProperty("open", false);
      await page.locator(".news-category-menu summary").click();
      await page.getByRole("heading", { name: "前沿新闻", exact: true }).click();
      await expect(page.locator(".news-category-menu")).toHaveJSProperty("open", false);
      await page.locator(".edition-label .news-date-trigger").click();
      await page.getByRole("dialog", { name: "选择日刊日期" }).waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.locator(".edition-head .news-date-trigger").click();
      await page.getByRole("dialog", { name: "选择日刊日期" }).waitFor({ state: "visible" });
      await page.keyboard.press("Escape");

      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "midnight"));
      await page.locator(".news-day-controls .news-date-trigger").click();
      const darkDialog = page.getByRole("dialog", { name: "选择日刊日期" });
      await darkDialog.waitFor({ state: "visible" });
      assert.equal(await darkDialog.evaluate(element => getComputedStyle(element).backgroundColor), "rgb(24, 36, 47)");
      await page.screenshot({ path: resolve(output, `${engine}-midnight.png`), fullPage: false });
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 390, height: 420 });
      await page.locator(".news-day-controls .news-date-trigger").click();
      await darkDialog.waitFor({ state: "visible" });
      await expect.poll(async () => {
        const bounds = await darkDialog.boundingBox();
        return bounds && bounds.y >= 0 && bounds.y + bounds.height <= 421;
      }, { message: `${engine} calendar fits a short viewport` }).toBe(true);
      await page.screenshot({ path: resolve(output, `${engine}-short.png`), fullPage: false });
      assert.deepEqual(errors, [], `${engine} has no page or hydration errors`);
      console.log(`${engine}: calendar selection, keyboard, history, categories and responsive checks passed`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally {
  globalThis.fetch = nativeFetch;
  await new Promise(resolve => server.close(resolve));
}
