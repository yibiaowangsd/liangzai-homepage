#!/usr/bin/env python3
"""Record three short digests from native submitted libraries before WASM rebuild."""
import ctypes
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from ngcc_instance import select_instance

repo = Path(__file__).resolve().parents[1]
harness = Path(sys.argv[1]).resolve()
candidate_id = sys.argv[2]
candidate = next(c for c in json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())['candidates']
                 if c['id'] == candidate_id)
if candidate['type'] != 'hash':
    raise ValueError('native vectors only apply to hashes')
listing = subprocess.check_output(['make', '-s', 'list'], cwd=harness / candidate_id, text=True, timeout=10)
labels = list((label.strip(), source.strip().rstrip('/')) for label, source in
              (re.match(r'^(.+?)\s+->\s+(.+)$', line).groups() for line in listing.splitlines()
               if re.match(r'^(.+?)\s+->\s+(.+)$', line)))
results = {}
for index, parameter in enumerate(candidate['parameters']):
    label = select_instance(labels, parameter)
    if not label:
        continue
    library = harness / candidate_id / 'lib' / ('lib' + label + '.so')
    if not library.is_file():
        continue
    crypt = ctypes.CDLL(str(library)).CryptHash
    crypt.argtypes = [ctypes.c_int, ctypes.POINTER(ctypes.c_ubyte), ctypes.c_ulonglong,
                      ctypes.POINTER(ctypes.c_ubyte)]
    crypt.restype = ctypes.c_int
    bits = parameter['sizes']['DigestBits']
    output_bytes = parameter['sizes']['DigestBytes']
    expected = {}
    for name, message in [('empty', b''), ('abc', b'abc'), ('abc-bang', b'abc!')]:
        src = (ctypes.c_ubyte * max(len(message), 1))(*message)
        dst = (ctypes.c_ubyte * output_bytes)()
        if crypt(bits, src, len(message) * 8, dst) != 0:
            raise RuntimeError(f'{candidate_id} {label} native CryptHash failed on {name}')
        expected[name] = hashlib.sha256(bytes(dst)).hexdigest()
    results[str(index)] = expected
    print(f'NATIVE {candidate_id} {label}: {len(expected)} digest vectors', flush=True)
target = repo / 'work/ngcc-wasm-rebuild' / f'{candidate_id}.vectors.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(results, indent=2) + '\n')
