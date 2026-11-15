"""Offline SHA-256 HKDF dependency experiment. NOT a TLS/EKU implementation.
All inputs are public fixed fixtures; no network, credentials or live traffic.
Run: python3 research/experiments/2026-11-15/keyupdate.py
"""
import hashlib, hmac, json, platform
H = lambda x: hashlib.sha256(x).digest()
def extract(salt, ikm): return hmac.digest(salt, ikm, 'sha256')
def expand(prk, info, length):
    assert 0 <= length <= 255 * 32
    block, out = b'', b''
    for i in range(1, (length + 31) // 32 + 1):
        block = hmac.digest(prk, block + info + bytes([i]), 'sha256')
        out += block
    return out[:length]
def label(secret, name, context=b'', length=32):
    name = b'tls13 ' + name
    assert len(name) <= 255 and len(context) <= 255
    info = length.to_bytes(2, 'big') + bytes([len(name)]) + name + bytes([len(context)]) + context
    return expand(secret, info, length)
def update(s): return label(s, b'traffic upd')

def run():
    checks=[]
    def check(name, condition):
        if not condition: raise AssertionError(name)
        checks.append({'name':name,'passed':True})
    # RFC 5869 Appendix A.1: test the HKDF core independently.
    prk=extract(bytes(range(13)), b'\x0b'*22)
    check('rfc5869_extract_A1', prk.hex()=='077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5')
    check('rfc5869_expand_A1', expand(prk,bytes(range(0xf0,0xfa)),42).hex()=='3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865')
    honest=bytes(range(32)); stolen=honest
    generations=[]
    for epoch in range(1,9):
        honest=update(honest); stolen=update(stolen)
        check(f'stolen_traffic_secret_predicts_generation_{epoch}', honest==stolen)
        generations.append({'epoch':epoch,'secret_sha256':H(honest).hex()})
    check('distinct_fixture_generations',len({g['secret_sha256'] for g in generations})==8)
    check('key_and_iv_labels_differ',label(honest,b'key',length=16)[:12]!=label(honest,b'iv',length=12))
    check('public_nonce_does_not_heal',extract(stolen,b'public nonce')==extract(honest,b'public nonce'))
    # Illustrative fresh-secret dependency, NOT the full EKU transcript/state machine.
    fresh=H(b'public fixture standing in for a fresh secret')
    main=H(b'old fixture main'); salt=label(main,b'derived',H(b''))
    new=extract(salt,fresh)
    check('wrong_fresh_input_changes_fixture_output',extract(salt,bytes(32))!=new)
    check('known_fresh_input_predicts_fixture_output',extract(salt,fresh)==new)
    check('context_changes_fixture_output',label(new,b'c ap traffic',H(b'context A'))!=label(new,b'c ap traffic',H(b'context B')))
    return {'kind':'offline deterministic HKDF dependency checks, not protocol or performance testing','python':platform.python_version(),'hash':'SHA-256','all_inputs_public_fixtures':True,'checks':checks,'passed':len(checks),'generations':generations,'limits':['No cryptographic security proof','No TLS records, KEM, network, authentication or memory-erasure test','Different outputs are not proof of attacker ignorance']}
if __name__=='__main__': print(json.dumps(run(),ensure_ascii=False,indent=2))
