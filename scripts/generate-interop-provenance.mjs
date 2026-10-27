import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const hash = async path => createHash('sha256').update(await readFile(new URL(path, root))).digest('hex');
const names = (await readdir(new URL('public/pqc-practice/wasm/', root))).filter(name => name.endsWith('.wasm')).sort();
const runtimes = {};
for (const name of names) {
  const runtimeId = name.slice(0, -5);
  runtimes[runtimeId] = { wasmSha256: await hash('public/pqc-practice/wasm/' + name), glueSha256: await hash('public/pqc-practice/wasm/' + runtimeId + '.mjs') };
}
const value = { schemaVersion: 1, nistUpstream: { repository: 'https://github.com/pqcrypto-cn/PQMagic', commit: (await readFile(new URL('public/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt', root), 'utf8')).trim() },
  ngccUpstream: { repository: 'https://github.com/ngcc-dev/ngcc-harness', snapshot: 'c5261784ef27e7363b1bbace3d687932fda35ccd', note: '本站适配构建与归档原版可能不同，构建及补丁记录见仓库 scripts/ 与 docs/pqc-practice.md。' },
  runnerSha256: await hash('public/pqc-practice/interop-core.js'), workerSha256: await hash('public/pqc-practice/worker.js'), runtimes };
await writeFile(new URL('public/pqc-practice/interop-provenance.json', root), JSON.stringify(value, null, 2) + '\n');
console.log(`Recorded ${names.length} WASM module fingerprints.`);
