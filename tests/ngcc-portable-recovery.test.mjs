import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NGCC_WASM } from '../public/pqc-practice/ngcc-runtime.js';
import { NGCC_KEX_WASM } from '../public/pqc-practice/ngcc-kex-runtime.js';
const root = new URL('../', import.meta.url);
const publicRoot = new URL('public/pqc-practice/', root);
const evidence = JSON.parse(readFileSync(new URL('ngcc-recovery-2026-09-27.json', publicRoot)));
const catalog = JSON.parse(readFileSync(new URL('ngcc-catalog.json', publicRoot)));

test('NEV-AKE total includes both actual messages while retaining the submitted claim', () => {
  const candidate = catalog.candidates.find(c => c.id === 'kex-07');
  for (const p of candidate.parameters) {
    assert.equal(p.sizes.Passes, 2);
    assert.ok(p.reportedTotalMessageBytes > 0);
    assert.equal(p.sizes.TotalMessageBytes, 2 * p.reportedTotalMessageBytes);
  }
});
for (const row of evidence.records) {
  test(`${row.id}/${row.parameter}: release matches native parity evidence`, () => {
    const name = (row.id.startsWith('kex-') ? NGCC_KEX_WASM : NGCC_WASM)[row.id]?.[row.parameter];
    if (row.status !== 'verified') {
      assert.equal(name, null, 'unverified retry must stay unavailable');
      return;
    }
    assert.equal(row.native, 'passed');
    assert.equal(name, `ngcc-${row.id}-${row.parameter}`);
    for (const ext of ['mjs', 'wasm']) {
      assert.equal(createHash('sha256').update(readFileSync(new URL(`wasm/${name}.${ext}`, publicRoot))).digest('hex'), row.sha256[ext]);
    }
    const scratch = mkdtempSync(join(tmpdir(), 'ngcc-parity-'));
    try {
      const vectors = join(scratch, 'native.json');
      writeFileSync(vectors, JSON.stringify({ [row.parameter]: row.parity }));
      const checked = spawnSync(process.execPath, [fileURLToPath(new URL('scripts/check-ngcc-module.mjs', root)),
        fileURLToPath(new URL(`wasm/${name}.mjs`, publicRoot)), row.id, String(row.parameter), vectors],
        { encoding: 'utf8', timeout: 30000 });
      assert.equal(checked.status, 0, checked.stderr || String(checked.error || checked.stdout));
    } finally { rmSync(scratch, { recursive: true, force: true }); }
  });
}
