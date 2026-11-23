import { test } from "node:test";
import assert from "node:assert/strict";
import { displayTime, durations, remainingUntil } from "../app/sound-room/clock.ts";

test("focus countdown uses elapsed wall time and expires without going negative", () => {
  assert.deepEqual(durations, [5, 15, 25, 45]);
  assert.equal(remainingUntil(301_000, 1000), 300_000);
  assert.equal(displayTime(remainingUntil(301_000, 118_701)), "03:03");
  assert.equal(displayTime(remainingUntil(301_000, 302_000)), "00:00");
  assert.equal(displayTime(1), "00:01");
});

test("the new tool shelf and the sound room render independently", async () => {
  const {default: worker} = await import("../dist/server/index.js");
  const read = async path => {
    const r = await worker.fetch(new Request("https://example.test" + path), { ASSETS: { fetch: async () => new Response("missing", {status: 404})}}, {waitUntil() {}, passThroughOnException() {}});
    assert.equal(r.status, 200);
    return r.text();
  };
  const shelf = await read("/sidequests");
  assert.match(shelf, /href="\/sound-room"/);
  assert.match(shelf, /href="\/time-desk"/);
  const page = await read("/sound-room");
  assert.match(page, /播放声音/u);
  assert.match(page, /当前静音/u);
  assert.match(page, /25:00/u);
  assert.match(page, /href="\/sidequests"/);
});
