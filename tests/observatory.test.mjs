import assert from "node:assert/strict";
import test from "node:test";
import {
  destinations,
  searchDestinations,
} from "../app/experience/destinations.ts";

test("jump search resolves Chinese and algorithm queries without inventing destinations", () => {
  assert.equal(searchDestinations("模型 奶龙")[0].href, "/models");
  assert.equal(searchDestinations("ML-KEM")[0].href, "/pqc-arsenal");
  assert.equal(searchDestinations("签名 wasm")[0].href, "/pqc-practice");
  assert.equal(searchDestinations("  NEWS  ")[0].href, "/news");
  assert.deepEqual(searchDestinations("不存在的目的地"), []);
  assert.deepEqual(searchDestinations(""), destinations);
  assert.equal(searchDestinations("笔记")[0].href, "/notes");
  assert.deepEqual(searchDestinations("观测站"), []);
  assert.equal(
    new Set(destinations.map((item) => item.href)).size,
    destinations.length,
  );
});

test("retired observatory links return to the homepage", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/observatory?form=wave"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/");
});
