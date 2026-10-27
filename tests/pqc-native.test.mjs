import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('native ABI runner separates real negative outcomes from execution errors and scrubs reports', { skip: process.platform !== 'linux' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'liangzai-native-test-'));
  try {
    // Deliberately tiny non-cryptographic fixture tests the ctypes ABI and reporting,
    // not algorithm correctness. Real algorithm tests live in pqc-interop.test.mjs.
    const cSource = join(directory, 'fixture.c'), library = join(directory, 'fixture.so');
    await writeFile(cSource, '#include <stdint.h>\nint lab_public_bytes(void){return 2;}\nint lab_private_bytes(void){return 2;}\nint lab_output_bytes(void){return 2;}\nint lab_shared_bytes(void){return 2;}\nint lab_dec(uint8_t *ss,uint8_t *ct,uint8_t *sk){if(ct[0]==255)return -1;ss[0]=5;ss[1]=ct[0]==3?6:7;return 0;}\n');
    const compile = spawnSync('cc', ['-shared', '-fPIC', cSource, '-o', library], { encoding: 'utf8' });
    assert.equal(compile.status, 0, compile.stderr);
    const suite = { library: 'ngcc', family: 'kem-01', variant: '0', hash: 'shake' };
    const row = (id, ciphertext, matches) => ({ id, suite, operation: 'decapsulate', inputs: { privateKey: { encoding: 'hex', value: '0102' }, ciphertext: { encoding: 'hex', value: ciphertext } }, expected: { sharedSecret: { encoding: 'hex', value: '0506' }, matches } });
    const input = join(directory, 'pack.json'), output = join(directory, 'result.json');
    await writeFile(input, JSON.stringify({ format: 'liangzai-pqc-testpack', schemaVersion: 1, cases: [row('valid', '0304', true), row('tampered', '0404', false), row('error', 'ff04', false)] }));
    const run = spawnSync('python3', [fileURLToPath(new URL('../public/pqc-practice/testpack-native.py', import.meta.url)), input, '--library', library, '--suite', 'ngcc/kem-01/0/shake', '--output', output], { encoding: 'utf8' });
    assert.equal(run.status, 1, 'one execution error makes the run unsuccessful');
    const result = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(result.passed, 2); assert.equal(result.errors, 1); assert.equal(result.failed, 0);
    assert.match(result.provenance.nativeLibrarySha256, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(JSON.stringify(result), /privateKey|ciphertext|sharedSecret|"inputs"|"value"/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
