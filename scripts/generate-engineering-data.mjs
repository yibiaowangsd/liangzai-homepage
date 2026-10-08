import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NGCC_WASM } from "../public/pqc-practice/ngcc-runtime.js";
import { NGCC_KEX_WASM } from "../public/pqc-practice/ngcc-kex-runtime.js";
import { NGCC_HASH_WASM } from "../public/pqc-practice/ngcc-hash-runtime.js";
import { parameters } from "../app/engineering/parameters.ts";
import { migrationStages } from "../app/engineering/migration.ts";
const base = new URL("../public/pqc-practice/", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("ngcc-catalog.json", base), "utf8"),
);
const rows = [],
  candidates = [];
for (const candidate of catalog.candidates) {
  let runnable = 0;
  for (const [index, parameter] of candidate.parameters.entries()) {
    const moduleName = (
      candidate.type === "kex"
        ? NGCC_KEX_WASM
        : candidate.type === "hash"
          ? NGCC_HASH_WASM
          : NGCC_WASM
    )[candidate.id]?.[index];
    let paired = false;
    if (moduleName) {
      try {
        await Promise.all([
          access(new URL(`wasm/${moduleName}.mjs`, base)),
          access(new URL(`wasm/${moduleName}.wasm`, base)),
        ]);
        paired = true;
      } catch {
        /* Missing pairs are not counted. */
      }
    }
    if (paired) runnable++;
    rows.push([
      candidate.id,
      candidate.name,
      candidate.type,
      parameter.label || parameter.name,
      parameter.sizes?.PublicKeyBytes ?? "",
      parameter.sizes?.CiphertextBytes ?? "",
      parameter.sizes?.SignatureBytes ?? "",
      paired ? "runnable" : "unavailable",
      parameter.source || "",
      candidate.page,
    ]);
  }
  candidates.push({
    id: candidate.id,
    name: candidate.name,
    type: candidate.type,
    total: candidate.parameters.length,
    runnable,
    page: candidate.page,
  });
}
const csv = (rows) =>
  "\uFEFF" +
  rows
    .map((row) =>
      row
        .map((value) => '"' + String(value).replaceAll('"', '""') + '"')
        .join(","),
    )
    .join("\n") +
  "\n";
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await mkdir(new URL("../public/downloads/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../app/engineering/candidates.json", import.meta.url),
  JSON.stringify(
    {
      source: catalog.source,
      revision: catalog.revision,
      totals: {
        candidates: candidates.length,
        parameters: rows.length,
        runnable: candidates.reduce((sum, c) => sum + c.runnable, 0),
      },
      candidates,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  new URL("../public/downloads/ngcc-parameters.csv", import.meta.url),
  csv([
    [
      "candidate_id",
      "candidate",
      "kind",
      "parameter",
      "public_key_bytes",
      "ciphertext_bytes",
      "signature_bytes",
      "runtime_status",
      "reference_directory",
      "source",
    ],
    ...rows,
  ]),
);
await writeFile(
  new URL("../public/downloads/pqc-parameters.csv", import.meta.url),
  csv([
    [
      "parameter",
      "kind",
      "nist_category",
      "public_key_bytes",
      "secret_key_bytes",
      "ciphertext_bytes",
      "signature_bytes",
      "source",
    ],
    ...parameters.map((p) => [
      p.name,
      p.kind,
      p.level,
      p.publicKey,
      p.secretKey,
      p.ciphertext ?? "",
      p.signature ?? "",
      p.source,
    ]),
  ]),
);
await writeFile(
  new URL("../public/downloads/pqc-migration-checklist.md", import.meta.url),
  "# PQC 迁移与密码敏捷检查表\n\n用于自建测试与经授权的部署评估。勾选不是验收证明；零停机必须按实际协议生命周期演练。\n\n" +
    migrationStages
      .map(
        (s, i) =>
          `## ${i + 1}. ${s.name}\n\n${s.goal}\n\n退出条件：${s.exit}\n\n${s.checks.map((c) => "- [ ] " + c).join("\n")}`,
      )
      .join("\n\n") +
    "\n\n## 变更验收记录\n\n- 资产 / 负责人：\n- 两端实现与版本：\n- 算法 / 参数 / 认证：\n- 灰度范围与停止阈值：\n- 回退负责人、审批与有效期：\n- 复现报告与未覆盖风险：\n",
);
await writeFile(
  new URL("../public/downloads/crypto-inventory.csv", import.meta.url),
  csv([
    [
      "asset",
      "owner",
      "endpoint_or_protocol",
      "implementation_version",
      "key_exchange",
      "authentication",
      "confidentiality_period",
      "pki_hsm_dependencies",
      "peer_versions",
      "priority",
      "canary_plan",
      "rollback_owner",
      "evidence",
    ],
    Array(13).fill(""),
  ]),
);
const files = [];
for (const name of (await readdir(new URL("wasm/", base))).sort()) {
  if (!/\.(wasm|mjs)$/.test(name)) continue;
  const data = await readFile(new URL(`wasm/${name}`, base));
  files.push({
    path: `/pqc-practice/wasm/${name}`,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
await writeFile(
  new URL("../public/data/wasm-manifest.json", import.meta.url),
  JSON.stringify(
    {
      description:
        "SHA-256 of repository assets; integrity inventory, not a build attestation or security certification",
      pqmagicCommit: (
        await readFile(new URL("PQMagic-UPSTREAM_COMMIT.txt", base), "utf8")
      ).trim(),
      candidateRevision: catalog.revision,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${candidates.length} candidates / ${rows.length} parameters / ${candidates.reduce((sum, c) => sum + c.runnable, 0)} runnable; CSVs and WASM inventory generated`,
);
