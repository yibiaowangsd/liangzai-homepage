import assert from "node:assert/strict";
import test from "node:test";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the homepage with the integrated practice destination", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /小小量仔/);
  assert.match(html, /大有可为/);
  for (const route of ["/storybook", "/archive", "/pqc-arsenal", "/pqc-practice", "/about"]) {
    assert.ok(html.includes(`href="${route}"`), `Homepage links to ${route}`);
  }
  assert.match(html, /进入 PQC 武器实战/);
  assert.match(html, /开启动效|暂停动效/);
  assert.match(html, /让想象/);
  assert.match(html, /观看宇宙序章/);
  assert.doesNotMatch(html, /<video\b/);
  assert.doesNotMatch(html, /<audio\b/);
});

test("renders the interactive storybook route", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("storybook-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/storybook", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /量子星守护者/);
  assert.match(html, /narration-v3\/00-intro\.mp3/);
  assert.match(html, /继续旁白/);
  assert.match(html, /跳到第 7 页：两个人仍在后退/);
  assert.match(html, /跳到第 8 页：他们本就是老战友/);
  assert.doesNotMatch(html, /CHAPTER 07 \/ 回响/);
  assert.match(html, /共 11 页/);
  assert.match(html, /Kyber 与 Aigis/);
  assert.match(html, /合体绝技：靓龙/);
});

test("renders the redesigned character archive", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("archive-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/archive"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PERSONAL FILE 000/);
  assert.match(html, /PQC 武器库/);
});

test("renders the PQC arsenal route with all four algorithms", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("arsenal-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/pqc-arsenal", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PQC 武器库/);
  assert.match(html, /旧武器为何失效/);
  assert.match(html, /Module-LWE 核心样本/);
  assert.match(html, /Implicit reject/);
  assert.match(html, /HASH TREES/);
  assert.match(html, /FIPS 206/);
  for (const algorithm of ["ML-KEM", "ML-DSA", "SLH-DSA", "FN-DSA"]) {
    assert.match(html, new RegExp(algorithm));
  }
});

test("renders the human profile without invented credentials or private contact details", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/about"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /量仔背后的人/);
  assert.match(html, /WANG YIBIAO/);
  assert.match(html, /PQC 与 QKD/);
  assert.match(html, /https:\/\/github.com\/yibiaowangsd/);
  assert.doesNotMatch(html, /foxmail|博士|首席|教授/);
});

test("SSR animation module does not start a Worker-forbidden timer", async () => {
  const assets = new URL("../dist/server/ssr/assets/", import.meta.url);
  const motionBundle = (await readdir(assets)).find((name) =>
    /^Motion-.*\.js$/.test(name),
  );
  assert.ok(
    motionBundle,
    "Animation SSR module exists in the production build",
  );
  const script = `
    globalThis.setTimeout = () => { throw new Error("Timer during SSR module initialization"); };
    globalThis.setInterval = () => { throw new Error("Interval during SSR module initialization"); };
    await import(${JSON.stringify(new URL(motionBundle, assets).href)});
  `;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(child.status, 0, child.stderr || String(child.error || ""));
});
