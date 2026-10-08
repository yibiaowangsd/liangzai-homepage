import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  packetModel,
  certificateModel,
} from "../app/engineering/size-model.ts";
import { HybridDemo } from "../public/pqc-practice/hybrid-engine.mjs";
const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const input = {
  group: 2,
  baseline: 200,
  certificate: 3,
  chain: 3,
  overhead: 256,
  mtu: 1500,
  ipv6: false,
  natT: true,
  ikeBytes: 6000,
};
test("wire budget accounts for the independent TLS length fields and IKE headers", () => {
  const result = packetModel(input);
  assert.equal(result.hello, 1426); // 200 + extension(4) + vector(2) + group/length(4) + key(1216)
  assert.equal(result.recordBytes, 1431);
  assert.equal(result.der, 5539); // SPKI1974 + signature3309 + metadata256
  assert.equal(result.certificateMessage, 16640); // 8 + 3*(5539+5)
  assert.equal(result.ikeOverhead, 92); // IP20 + UDP8 + marker4 + IKE28 + SKF8 + IV8 + tag16
});
test("IKE encrypted fragments respect padding boundaries, zero payload and IPv6/NAT-T changes", () => {
  const ipv4 = packetModel({ ...input, ikeBytes: 0 });
  assert.equal(ipv4.ikeFragments, 0);
  assert.equal(
    packetModel({ ...input, ikeBytes: ipv4.ikeCapacity }).ikeFragments,
    1,
  );
  assert.equal(
    packetModel({ ...input, ikeBytes: ipv4.ikeCapacity + 1 }).ikeFragments,
    2,
  );
  assert.equal(
    packetModel({ ...input, ipv6: true }).ikeOverhead - ipv4.ikeOverhead,
    20,
  );
  assert.equal(
    ipv4.ikeOverhead - packetModel({ ...input, natT: false }).ikeOverhead,
    4,
  );
  assert.equal(certificateModel(1, 1, 256).der, 419);
  for (const patch of [
    { mtu: NaN },
    { mtu: 100 },
    { baseline: -1 },
    { chain: 0 },
    { chain: 1.5 },
    { group: 99 },
    { overhead: Infinity },
    { ikeBytes: -1 },
  ])
    assert.throws(() => packetModel({ ...input, ...patch }));
});
test("real X25519 and ML-KEM derive matching keys; ciphertext or context tampering diverges", async () => {
  const { default: factory } = await import(
    "../public/pqc-practice/wasm/mlkem768shake.mjs"
  );
  const wasmBinary = new Uint8Array(
    await readFile(
      new URL(
        "../public/pqc-practice/wasm/mlkem768shake.wasm",
        import.meta.url,
      ),
    ),
  );
  const wasmModule = await factory({ wasmBinary });
  for (const mode of ["normal", "ciphertext", "context"]) {
    const demo = new HybridDemo(wasmModule);
    const steps = [];
    for (let i = 0; i < 6; i++) steps.push(await demo.next(mode));
    assert.equal(steps[2].x25519Matches, true);
    assert.equal(steps[4].kemMatches, mode !== "ciphertext");
    assert.equal(steps[5].matches, mode === "normal");
    assert.equal(
      steps[5].aliceKeyFingerprint === steps[5].bobKeyFingerprint,
      mode === "normal",
    );
    assert.equal(demo.alice, null);
    assert.ok(demo.sk.every((v) => v === 0));
    assert.doesNotMatch(JSON.stringify(steps), /privateKey|sharedSecret/);
    await assert.rejects(() => demo.next());
  }
});
test("public engineering pages, protocol sections and feeds work without the news backend", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const fetch = (path) =>
    worker.fetch(
      new Request("https://wangyibiao.com" + path),
      { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
  const paths = [
    "/protocols",
    "/protocols/tls",
    "/protocols/tlcp",
    "/protocols/ssh",
    "/protocols/ikev2",
    "/projects",
    "/benchmarks",
    "/lab/hybrid",
    "/gm-pqc",
    "/migration",
    "/notes",
    "/notes/kat-is-not-enough",
    "/notes/tlcp-mlkem",
    "/notes/reading-handshake-benchmarks",
    "/tools",
    "/tools/packet-size",
    "/tools/certificates",
    "/parameters",
    "/contact",
    "/weekly",
    "/records",
    "/changelog",
    "/site-info",
    "/lab/security",
  ];
  for (const path of paths) {
    const response = await fetch(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(
      html.includes("https://wangyibiao.com" + path),
      path + " canonical",
    );
    assert.match(html, /id="main-content"/);
    assert.match(html, /<h1/);
    assert.doesNotMatch(html, /QKD|量子密钥分发/);
    if (/^\/protocols\/\w+$/.test(path))
      for (const section of [
        "方案图",
        "扩展点",
        "报文尺寸变化",
        "回退与抗降级策略",
        "互通结果",
        "踩坑记录",
      ])
        assert.ok(html.includes(section), path + section);
  }
  for (const path of ["/protocols/invalid", "/notes/invalid"])
    assert.equal((await fetch(path)).status, 404);
  for (const path of ["/notes/rss.xml", "/weekly/rss.xml"]) {
    const response = await fetch(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<guid isPermaLink="true">/);
  }
  const text = await read("public/.well-known/security.txt");
  assert.match(text, /Contact: mailto:yibiao_wang@foxmail.com/);
  assert.ok(new Date(text.match(/Expires: (.+)/)[1]).getTime() > Date.now());
  assert.equal(
    (await fetch("/security.txt")).headers.get("location"),
    "https://wangyibiao.com/.well-known/security.txt",
  );
});
test("generated downloads contain complete standard parameters and candidate rows with honest missing values", async () => {
  const csv = await read("public/downloads/pqc-parameters.csv");
  assert.equal(csv.trim().split("\n").length, 19);
  assert.match(csv, /"ML-KEM-768","KEM","3","1184","2400","1088",""/);
  const domestic = await read("public/downloads/ngcc-parameters.csv");
  assert.equal(domestic.trim().split("\n").length, 587);
  const checklist = await read("public/downloads/pqc-migration-checklist.md");
  assert.equal((checklist.match(/- \[ \]/g) || []).length, 24);
  const manifest = JSON.parse(await read("public/data/wasm-manifest.json"));
  const entry = manifest.files.find((e) =>
    e.path.endsWith("/mlkem768shake.wasm"),
  );
  assert.ok(entry);
  assert.equal(entry.sha256.length, 64);
});
