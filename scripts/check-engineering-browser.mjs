import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { serveBuiltSite } from "./lib/serve-built-site.mjs";
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
const { server, base } = await serveBuiltSite();
let browser;
await mkdir("outputs/engineering", { recursive: true });
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200, path);
      await page.locator(".engineering-heading h1").waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      assert.ok(overflow <= 1, `${path} ${width}px overflows by ${overflow}px`);
      if (
        [
          "/protocols/tls",
          "/benchmarks",
          "/lab/hybrid",
          "/tools/packet-size",
          "/gm-pqc",
        ].includes(path)
      )
        await page.screenshot({
          path: `outputs/engineering/${path.replaceAll("/", "-").slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.goto(base + "/tools/packet-size");
  await page.getByLabel("路径 MTU B").fill("1280");
  await page.getByLabel("IP 版本").selectOption("6");
  assert.equal(
    await page.getByRole("row", { name: "IKE 每片有效明文上限 1167" }).count(),
    1,
  );
  await page.getByLabel("待分片 IKE 加密明文 B").fill("1168");
  assert.equal(
    await page.getByRole("row", { name: "IKE 加密分片数估算 2" }).count(),
    1,
  );
  await page.getByLabel("路径 MTU B").fill("100");
  await page.getByRole("alert").waitFor();
  await page.goto(base + "/gm-pqc");
  await page.getByLabel("搜索候选名称或编号").fill("Aigis");
  assert.ok((await page.locator("tbody tr").count()) > 0);
  await page.getByLabel("搜索候选名称或编号").fill("does-not-exist");
  assert.equal(await page.locator("tbody tr").count(), 0);
  await page.goto(base + "/migration");
  const first = page.getByRole("checkbox").first();
  await first.check();
  await page.reload();
  assert.equal(await page.getByRole("checkbox").first().isChecked(), true);
  await page.getByRole("button", { name: "清空勾选" }).click();
  assert.equal(await page.getByRole("checkbox").first().isChecked(), false);
  await page.goto(base + "/lab/hybrid");
  const sent = [];
  page.on("request", (request) => {
    if (request.method() === "POST") sent.push(request.url());
  });
  for (const mode of ["normal", "ciphertext", "context"]) {
    if (mode !== "normal")
      await page.getByRole("button", { name: "重新开始并释放 Worker" }).click();
    await page.getByLabel("实验条件").selectOption(mode);
    for (let i = 1; i <= 6; i++) {
      await page
        .getByRole("button", {
          name: i === 1 ? "开始本地实验" : "下一步",
          exact: true,
        })
        .click();
      await page.waitForFunction(
        (count) =>
          document.querySelectorAll(".engineering-flow li").length === count,
        i,
      );
    }
    await page
      .getByText(
        mode === "normal"
          ? "双方派生密钥一致"
          : "双方派生密钥不一致，不能建立会话",
        { exact: true },
      )
      .waitFor();
  }
  assert.deepEqual(sent, [], "cryptography must not upload inputs");
  await page.screenshot({
    path: "outputs/engineering/hybrid-complete.png",
    fullPage: true,
  });
  await page.getByLabel("页面主题").selectOption("midnight");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.activeElement?.blur();
  });
  await page.screenshot({
    path: "outputs/engineering/hybrid-midnight.png",
    fullPage: true,
  });
  for (const path of [
    "/downloads/pqc-parameters.csv",
    "/downloads/ngcc-parameters.csv",
    "/downloads/pqc-migration-checklist.md",
    "/downloads/crypto-inventory.csv",
    "/data/wasm-manifest.json",
    "/.well-known/security.txt",
  ])
    assert.equal((await page.request.get(base + path)).status(), 200, path);
  await page.goto(base + "/pqc-practice/audit.html?candidate=kem-01");
  await page.waitForFunction(
    () => document.querySelector("#audit-query").value === "kem-01",
  );
  assert.deepEqual(errors, [], "browser exceptions");
  console.log(
    `PASS: ${paths.length} routes × 2 widths; calculator, filters, persistence, 3 real hybrid runs, downloads and audit deep link`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
