import assert from "node:assert/strict";
import test from "node:test";
import { isEditionDate, monthCells, shiftEditionDate, shiftEditionMonth } from "../app/news/calendar.ts";

test("calendar accepts real ISO dates and rejects impossible dates or duplicate query values", () => {
  for (const value of ["2026-10-10", "2028-02-29", "2026-12-31"]) assert.equal(isEditionDate(value), true);
  for (const value of [undefined, null, ["2026-10-10"], "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "2026-10-10T00:00:00Z"]) assert.equal(isEditionDate(value), false);
});

test("calendar weeks start on Monday and include leap days without introducing outside days", () => {
  const october = monthCells("2026-10");
  assert.deepEqual(october.slice(0, 7), [null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  assert.equal(october.filter(Boolean).length, 31);
  assert.equal(october.length % 7, 0);
  assert.equal(monthCells("2028-02").filter(Boolean).at(-1), "2028-02-29");
  assert.equal(monthCells("2026-02").filter(Boolean).at(-1), "2026-02-28");
});

test("keyboard day and month navigation clamps month ends and remains independent of browser timezone", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["Asia/Shanghai", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = timezone;
      assert.equal(shiftEditionDate("2026-10-01", -1), "2026-09-30");
      assert.equal(shiftEditionDate("2026-12-31", 1), "2027-01-01");
      assert.equal(shiftEditionMonth("2026-01-31", 1), "2026-02-28");
      assert.equal(shiftEditionMonth("2028-01-31", 1), "2028-02-29");
      assert.equal(shiftEditionMonth("2026-12-31", 1), "2027-01-31");
      assert.equal(shiftEditionMonth("2027-01-31", -1), "2026-12-31");
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
