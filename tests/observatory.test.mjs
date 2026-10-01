import assert from "node:assert/strict";
import test from "node:test";
import {
  artQuery,
  createArtPoints,
  defaultArt,
  readArtSettings,
} from "../app/observatory/art-state.ts";
import {
  destinations,
  searchDestinations,
} from "../app/experience/destinations.ts";

test("shared compositions reproduce every parameter, including endpoint values", () => {
  for (const mode of ["orbit", "wave", "lattice"])
    for (const palette of ["ice", "amber", "iris"]) {
      for (const values of [
        { seed: 1, density: 20, energy: 0 },
        { seed: 999999, density: 100, energy: 100 },
      ]) {
        const settings = { mode, palette, ...values };
        assert.deepEqual(
          readArtSettings(new URLSearchParams(artQuery(settings))),
          settings,
        );
      }
    }
});

test("untrusted URL and saved parameters remain finite, bounded and in supported modes", () => {
  assert.deepEqual(readArtSettings(new URLSearchParams()), defaultArt);
  assert.deepEqual(
    readArtSettings(
      new URLSearchParams(
        "form=unknown&color=evil&seed=Infinity&density=NaN&energy=",
      ),
    ),
    defaultArt,
  );
  assert.deepEqual(
    readArtSettings(
      new URLSearchParams("seed=-10&density=100000000&energy=12.7"),
    ),
    { ...defaultArt, seed: 1, density: 100, energy: 13 },
  );
});

test("art seeds produce a stable bounded point cloud and different seeds change the composition", () => {
  const first = createArtPoints(104729),
    again = createArtPoints(104729),
    different = createArtPoints(104730);
  assert.equal(first.length, 1600);
  assert.deepEqual(first, again);
  assert.notDeepEqual(first, different);
  for (const point of first) {
    for (const key of ["x", "y", "z"])
      assert.ok(point[key] >= 0 && point[key] < 1);
    assert.ok(point.size >= 0.45 && point.size < 1.65);
    assert.ok(point.phase >= 0 && point.phase < Math.PI * 2);
  }
});

test("jump search resolves Chinese and algorithm queries without inventing destinations", () => {
  assert.equal(searchDestinations("星空")[0].href, "/observatory");
  assert.equal(searchDestinations("ML-KEM")[0].href, "/pqc-arsenal");
  assert.equal(searchDestinations("签名 wasm")[0].href, "/pqc-practice");
  assert.equal(searchDestinations("  NEWS  ")[0].href, "/news");
  assert.deepEqual(searchDestinations("不存在的目的地"), []);
  assert.equal(searchDestinations("").length, 8);
  assert.equal(
    new Set(destinations.map((item) => item.href)).size,
    destinations.length,
  );
});

test("the studio is server-rendered with working navigation and a static initial composition", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(
    new Request("http://localhost/observatory"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /以数学为笔/);
  assert.match(html, /静止观测/);
  for (const label of [
    "选择形态",
    "星光密度",
    "流动强度",
    "保存画面",
    "分享创作",
  ])
    assert.ok(html.includes(label), label);
  for (const route of [
    "/observatory",
    "/pqc-arsenal",
    "/pqc-practice",
    "/news",
    "/about",
  ])
    assert.ok(html.includes(`href="${route}"`), route);
  assert.doesNotMatch(
    html,
    /(?:src|href)="[^"]*(?:hero-scene|InteractiveGuardian)[^"]*\.js/,
  );
});
