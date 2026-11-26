import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultLocale, localeCookie, locales } from "../app/i18n/locales.ts";
import { searchDestinations } from "../app/experience/destinations.ts";

const codes = ["zh-CN", "en", "ja", "ko", "fr", "de", "es", "ru"];
const catalogs = Object.fromEntries(await Promise.all(codes.map(async code => [
  code,
  JSON.parse(await readFile(new URL(`../app/i18n/messages/${code}.json`, import.meta.url), "utf8")),
])));

function strings(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
}

test("all eight dictionaries cover the same copy and keep interpolation fields", () => {
  assert.deepEqual(Object.keys(locales), codes);
  const reference = strings(catalogs[defaultLocale]);
  const fields = value => value.match(/\{\w+\}/g)?.sort() ?? [];
  for (const code of codes) {
    const messages = new Map(strings(catalogs[code]));
    assert.equal(messages.size, reference.length, code);
    for (const [path, value] of reference) {
      const localized = messages.get(path);
      assert.equal(typeof localized, "string", `${code}${path}`);
      if (value || code !== defaultLocale) assert.ok(localized.trim(), `${code}${path}`);
      assert.deepEqual(fields(localized), fields(value), `${code}${path}`);
    }
  }
  assert.equal(searchDestinations("krypto-labor", catalogs.de.chrome.destinations)[0].href, "/pqc-practice");
  assert.equal(searchDestinations("签名 wasm", catalogs.de.chrome.destinations)[0].name, "Krypto-Labor");
});

test("the homepage and about page render the language selected by the visitor", async t => {
  const fetchNews = t.mock.method(globalThis, "fetch", async input => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin + url.pathname, "https://api.wangyibiao.com/api/news/featured");
    return Response.json({
      edition_date: "2026-10-02",
      data: [{ id: 1, slug: "language-fixture", title: "中文简报样本", summary: "中文内容", category: "protocol", cover_image: null, source_name: "测试来源" }],
    });
  });
  const { default: worker } = await import("../dist/server/index.js?site-language-test");
  async function render(path, preference) {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: preference ? { cookie: `${localeCookie}=${preference}` } : {} }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    return response.text();
  }

  for (const code of codes) {
    const { chrome, home, about } = catalogs[code];
    const html = await render("/", code);
    assert.match(html, new RegExp(`<html lang="${code}"`));
    for (const label of [chrome.settings.language, chrome.footer.night, home.hero.title, home.metadata.title, home.noon.labTitle]) {
      assert.ok(html.includes(label), `${code} home: ${label}`);
    }
    assert.match(html, /<h3 lang="zh-CN">中文简报样本<\/h3>/);
    const profile = await render("/about", code);
    for (const label of [about.metadata.title, about.journey.title, about.card.specialty]) {
      assert.ok(profile.includes(label), `${code} about: ${label}`);
    }
  }
  const articles = await render("/archive", "fr");
  assert.match(articles, /<html lang="fr"/);
  assert.match(articles, /<div lang="zh-CN" style="display:contents">/);
  assert.match(await render("/", "__proto__"), /<html lang="zh-CN"/);
  assert.match(await render("/"), /<html lang="zh-CN"/);
  assert.equal(fetchNews.mock.callCount(), codes.length + 2);
});
