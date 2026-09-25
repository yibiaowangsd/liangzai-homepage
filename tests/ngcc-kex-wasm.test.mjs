import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { NGCC_KEX_WASM } from '../public/pqc-practice/ngcc-kex-runtime.js';

const verifier = fileURLToPath(new URL('../scripts/check-ngcc-module.mjs', import.meta.url));
for (const [id, names] of Object.entries(NGCC_KEX_WASM)) {
  for (const [index, name] of names.entries()) {
    if (!name) continue;
    test(`${id} parameter ${index} runs full submitted exchange twice`, () => {
      const module = fileURLToPath(new URL(`../public/pqc-practice/wasm/${name}.mjs`, import.meta.url));
      const result = execFileSync(process.execPath, [verifier, module, id, String(index)],
        { encoding: 'utf8', timeout: 30000 });
      assert.match(result, /^VERIFIED /);
    });
  }
}
