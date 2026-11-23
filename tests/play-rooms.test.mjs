import { test } from "node:test";
import assert from "node:assert/strict";
import { rooms, nextRoomIndex } from "../app/play/rooms.ts";

test("the playroom doors are unique same-origin routes", () => {
  assert.equal(new Set(rooms.map(x => x.href)).size, 3);
  for (const room of rooms) assert.match(room.href, /^\/[a-z-]+$/);
});

test("surprise door only picks an available room, never the same one consecutively", () => {
  assert.deepEqual([0, 1/3, 2/3, .99].map(r => nextRoomIndex(null, r)), [0, 1, 2, 2]);
  for (const {key} of rooms) {
    const seen = new Set([0, .25, .5, .99].map(r => rooms[nextRoomIndex(key, r)].key));
    assert.deepEqual(seen, new Set(rooms.map(x => x.key).filter(x => x !== key)));
  }
});
