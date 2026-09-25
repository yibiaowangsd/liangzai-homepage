import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { NGCC_HASH_WASM } from '../public/pqc-practice/ngcc-hash-runtime.js';

const check = fileURLToPath(new URL('../scripts/check-ngcc-module.mjs', import.meta.url));
for (const [id, modules] of Object.entries(NGCC_HASH_WASM)) {
  for (const [index, module] of modules.entries()) {
    if (!module) continue;
    test(`${id} parameter ${index} passes its WASM runtime check`, () => {
      const wasm = fileURLToPath(new URL(`../public/pqc-practice/wasm/${module}.mjs`, import.meta.url));
      const output = execFileSync(process.execPath, [check, wasm, id, String(index)],
        { encoding: 'utf8', timeout: 30000 });
      assert.match(output, /^VERIFIED /);
    });
  }
}
