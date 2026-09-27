#!/usr/bin/env python3
"""Compare native reference exchanges with the same browser bridge and seeds."""
import argparse
import ctypes as c
import hashlib
import json
import re
import subprocess
from pathlib import Path
from ngcc_instance import select_instance
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('harness', type=Path)
p.add_argument('candidate')
p.add_argument('output', type=Path)
a = p.parse_args()
repo = Path(__file__).resolve().parents[1]
candidate = next(x for x in json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())['candidates'] if x['id'] == a.candidate)
assert candidate['type'] == 'kex'
records = {}
scratch = repo / 'work/ngcc-wasm-rebuild/native-kex'
scratch.mkdir(parents=True, exist_ok=True)
# Library names are the pinned harness target labels, not display labels.
listing = subprocess.check_output(['make', '-s', 'list'], cwd=a.harness / a.candidate, text=True)
labels = [m.groups() for line in listing.splitlines() if (m := re.match(r'^(.+?)\s+->\s+(.+)$', line.strip()))]
for i, parameter in enumerate(candidate['parameters']):
    label = select_instance(labels, parameter)
    target = scratch / f'{a.candidate}-{i}.so'
    subprocess.run(['gcc', '-shared', '-fPIC', '-O2', '-DNGCC_BUILD_KEX',
        '-DNGCC_KEX_PASSES=' + str(parameter['sizes']['Passes']),
        str(repo / 'scripts/ngcc-wasm-bridge.c'),
        str(a.harness / a.candidate / 'lib' / f'lib{label}.so'), '-o', str(target)], check=True)
    lib = c.CDLL(str(target))
    pointer = c.POINTER(c.c_ubyte)
    lib.lab_seed.argtypes = [pointer, c.c_int]
    lib.lab_exchange.argtypes = [pointer]
    hashes = []
    for seed in (31, 72):
        out = (c.c_ubyte * parameter['sizes']['SharedSecretBytes'])()
        assert lib.lab_seed((c.c_ubyte * 48)(*[seed] * 48), 48) == 0
        assert lib.lab_exchange(out) == 0
        hashes.append(hashlib.sha256(bytes(out)).hexdigest())
    records[str(i)] = dict(zip(('first', 'second'), hashes))
a.output.parent.mkdir(parents=True, exist_ok=True)
a.output.write_text(json.dumps(records, indent=2) + '\n')
print(a.candidate, 'native parity vectors', len(records))
