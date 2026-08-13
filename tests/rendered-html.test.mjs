import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
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
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /量子星守护者/);
  assert.match(html, /翻开故事/);
  assert.match(html, /quantum-star-guardian-narration-v1\.mp3/);
  assert.match(html, /继续旁白/);
  assert.doesNotMatch(html, /开始配音/);
});

test("renders the interactive storybook route", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("storybook-test", `${process.pid}-${Date.now()}`);
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
  const html = await response.text();
  assert.match(html, /量子星守护者/);
  assert.match(html, /quantum-star-guardian-narration-v1\.mp3/);
  assert.match(html, /继续旁白/);
  assert.match(html, /Kyber 与 Aigis/);
  assert.match(html, /合体绝技：靓龙/);
});

test("keeps the former homepage at the archive route", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("archive-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/archive"), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
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
