import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const result = load('../research/experiments/2026-11-23/loopback-result.json');
const entry = load('../research/2026-11-23-cadi-runtime.json');

test('the three independent TLS sessions keep authentication fixed while the selected group changes', () => {
  const expected = ['X25519', 'X25519MLKEM768', 'X25519'];
  assert.equal(result.host, 'loopback only');
  assert.match(result.cert_pem_sha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(result.attempts.map(x => x.config_epoch), [1, 2, 3]);
  assert.deepEqual(result.attempts.map(x => x.configured_group), expected);
  assert.deepEqual(result.attempts.map(x => x.negotiated_group), expected);
  for (const x of result.attempts) {
    assert.equal(x.certificate_verify, 'ecdsa_secp256r1_sha256');
    assert.equal(x.cipher, 'TLS_AES_128_GCM_SHA256');
    assert.equal(x.tls, 'TLSv1.3');
    assert.equal(x.verified_hostname_and_trust, true);
    assert.equal(x.completed_http_response, true);
  }
});

test('published experiment rows match sanitized observed evidence', () => {
  const rows = entry.sections.find(x => x.id === 'experiment').table.rows;
  assert.deepEqual(rows, result.attempts.map(x => [
    String(x.config_epoch),
    x.configured_group + ' → ' + x.negotiated_group,
    x.certificate_verify,
    '主机名及信任通过 / 200',
  ]));
  assert.match(entry.scope, /不是 YANG\/CBOM 互通/u);
});
