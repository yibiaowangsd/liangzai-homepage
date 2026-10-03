import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker from "../news-worker/index.js";

function fixtureDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE news (
    id INTEGER PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, category TEXT,
    tags TEXT, source_name TEXT, source_url TEXT, cover_image TEXT,
    published_at TEXT, status TEXT
  )`);
  const insert = db.prepare("INSERT INTO news VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)");
  let id = 0;
  for (const date of ["2026-10-03", "2026-10-02", "2026-09-30"]) {
    for (const category of ["pqc", "protocol", "ai"]) {
      for (let index = 0; index < 7; index++) {
        id++;
        insert.run(id, `${date}-${category}-${index}`, `Story ${id}`, "Summary", category,
          `${date}T07:00:0${index}.000Z`, "published");
      }
    }
  }
  insert.run(++id, "unpublished", "Draft", "Summary", "pqc", "2026-10-04T07:00:00Z", "draft");
  // Adapt actual SQLite queries to the D1 interface used by the Worker.
  return {
    close: () => db.close(),
    env: { DB: { prepare(sql) {
      const statement = db.prepare(sql);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return statement.get(...args); },
        async all() { return { results: statement.all(...args) }; },
      };
    } } },
  };
}

test("edition API paginates complete published days, preserving categories and legacy parameters", async (t) => {
  const fixture = fixtureDatabase();
  const request = async (query = "") => {
    const response = await worker.fetch(new Request("https://api.wangyibiao.com/api/news/editions" + query), fixture.env);
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    await t.test("three distinct dates each get one full page, including the last day", async () => {
      for (const [index, date] of ["2026-10-03", "2026-10-02", "2026-09-30"].entries()) {
        const result = await request(`?page=${index + 1}`);
        assert.deepEqual(result.meta, { page: index + 1, pageSize: 1, totalDays: 3, totalPages: 3 });
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].date, date);
        assert.equal(result.data[0].total, 21);
        for (const category of ["pqc", "protocol", "ai"]) {
          assert.equal(result.data[0].topics[category].length, 7);
          assert.ok(result.data[0].topics[category].every((item) => item.slug.startsWith(date)));
        }
      }
    });
    await t.test("category filtering counts dates rather than stories and clamps old page links", async () => {
      for (const page of [1, 2, 3, 999]) {
        const result = await request(`?category=protocol&page=${page}&pageSize=3`);
        assert.deepEqual(result.meta, { page: Math.min(page, 3), pageSize: 1, totalDays: 3, totalPages: 3 });
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].total, 7);
        assert.equal(result.data[0].topics.protocol.length, 7);
        assert.equal(result.data[0].topics.pqc.length, 0);
      }
    });
    await t.test("missing, old and malformed pageSize values keep the one-day contract", async () => {
      for (const pageSize of ["", "1", "3", "100", "0", "-1", "1.5", "nope", "Infinity"]) {
        const result = await request(`?page=2&pageSize=${pageSize}`);
        assert.equal(result.meta.pageSize, 1);
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].date, "2026-10-02");
      }
      for (const page of ["", "0", "-2", "2.5", "2oops", "Infinity", "9007199254740992"]) {
        assert.equal((await request(`?page=${page}`)).meta.page, 1);
      }
    });
    await t.test("empty categories and unsupported categories retain explicit responses", async () => {
      assert.deepEqual(await request("?category=standards&page=999"), {
        data: [], meta: { page: 1, pageSize: 1, totalDays: 0, totalPages: 1 },
      });
      const response = await worker.fetch(new Request("https://api.wangyibiao.com/api/news/editions?category=invalid"), fixture.env);
      assert.equal(response.status, 400);
    });
  } finally { fixture.close(); }
});
