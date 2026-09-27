#!/usr/bin/env python3
"""Emit native KEM output digests for deterministic browser parity checks.

The libraries must first pass their submitted KAT. This is an additional
native/WASM parity gate, not a replacement for that KAT.
"""
import argparse
import ctypes as c
import hashlib
import json
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('harness', type=Path)
p.add_argument('candidate')
p.add_argument('output', type=Path)
p.add_argument('--indices', required=True)
a = p.parse_args()
repo = Path(__file__).resolve().parents[1]
candidate = next(x for x in json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())['candidates'] if x['id'] == a.candidate)
assert candidate['type'] == 'kem'
u64 = c.c_ulonglong
pointer = c.POINTER(c.c_ubyte)
length = c.POINTER(u64)
records = {}
for i in map(int, a.indices.split(',')):
    parameter = candidate['parameters'][i]
    lib = c.CDLL(str(a.harness / a.candidate / 'lib' / f"lib{parameter['name']}.so"))
    lib.ngcc_seed.argtypes = [pointer, u64]
    lib.kem_keygen.argtypes = [pointer, length, pointer, length]
    lib.kem_enc.argtypes = [pointer, u64, pointer, length, pointer, length]
    lib.kem_dec.argtypes = [pointer, u64, pointer, u64, pointer, length]
    sizes = parameter['sizes']
    pk = (c.c_ubyte * sizes['PublicKeyBytes'])()
    sk = (c.c_ubyte * sizes['SecretKeyBytes'])()
    ct = (c.c_ubyte * sizes['CiphertextBytes'])()
    ss = (c.c_ubyte * sizes['SharedSecretBytes'])()
    recovered = (c.c_ubyte * len(ss))()
    pk_n, sk_n, ct_n, ss_n, rec_n = [u64() for _ in range(5)]
    assert lib.ngcc_seed((c.c_ubyte * 48)(*[31] * 48), 48) == 0
    assert lib.kem_keygen(pk, c.byref(pk_n), sk, c.byref(sk_n)) == 0
    assert (pk_n.value, sk_n.value) == (len(pk), len(sk))
    assert lib.ngcc_seed((c.c_ubyte * 48)(*[72] * 48), 48) == 0
    assert lib.kem_enc(pk, pk_n, ss, c.byref(ss_n), ct, c.byref(ct_n)) == 0
    assert (ct_n.value, ss_n.value) == (len(ct), len(ss))
    assert lib.kem_dec(sk, sk_n, ct, ct_n, recovered, c.byref(rec_n)) == 0
    assert rec_n.value == len(ss) and bytes(recovered) == bytes(ss)
    records[str(i)] = {name: hashlib.sha256(bytes(data)).hexdigest() for name, data in [('pk', pk), ('sk', sk), ('ct', ct), ('ss', ss)]}
a.output.parent.mkdir(parents=True, exist_ok=True)
a.output.write_text(json.dumps(records, indent=2) + '\n')
print(a.candidate, 'native parity vectors', len(records))
