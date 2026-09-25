#!/usr/bin/env python3
"""Publish only paired WASM modules with verified per-parameter build records."""
import json
import os
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
public = repo / 'public/pqc-practice'
catalog = json.loads((public / 'ngcc-catalog.json').read_text())['candidates']
logs = repo / 'work/ngcc-wasm-rebuild'
curated = set('''hash-01 hash-02 hash-04 hash-05 hash-09 hash-10 hash-11 hash-12 hash-14 hash-17 hash-18 hash-19 hash-20 hash-21 hash-22 hash-24 hash-25 hash-26 hash-27 hash-31 hash-32 hash-35
kem-01 kem-02 kem-03 kem-04 kem-06 kem-07 kem-08 kem-09 kem-10 kem-14 kem-17 kem-18 kem-21 kem-22 kem-23 kem-24 kem-27 kem-29 kem-31 kem-32 kem-33 kem-36 kem-37 kem-38 kem-39 kem-40
sign-01 sign-03 sign-04 sign-07 sign-09 sign-10 sign-11 sign-12 sign-15 sign-16 sign-18 sign-25 sign-27 sign-29 sign-32 sign-33 sign-34
kex-02 kex-03 kex-05 kex-07 kex-08 kex-09'''.split())
attempts = {}
for filename in logs.glob('*.results.json'):
    for row in json.loads(filename.read_text()):
        attempts[(row['id'], row['parameter'])] = row

def generate(kind, filename, label):
    entries = []
    for candidate in catalog:
        if candidate['type'] not in kind:
            continue
        modules = []
        for index, _ in enumerate(candidate['parameters']):
            key = (candidate['id'], index)
            basename = f"ngcc-{candidate['id']}-{index}"
            js = public / 'wasm' / (basename + '.mjs')
            binary = public / 'wasm' / (basename + '.wasm')
            state = attempts.get(key, {}).get('status')
            if state == 'verified' and not (js.is_file() and binary.is_file()):
                raise RuntimeError(f'{basename} has a verified record but missing module')
            if js.is_file() != binary.is_file():
                raise RuntimeError(f'{basename} has only one of its paired files')
            # Previous modules were checked in earlier workflows; new ones
            # require their explicit verified record from this workflow.
            if js.is_file() and (state in (None, 'verified', 'existing_verified')):
                modules.append(repr(basename))
            else:
                modules.append('null')
        if any(module != 'null' for module in modules):
            entries.append(f"  {candidate['id']!r}: [{', '.join(modules)}],")
    heading = '// Generated from source build results; only verified paired modules are selectable.\n'
    text = heading + f'export const {label} = Object.freeze({{\n' + '\n'.join(entries) + '\n});\n'
    if label == 'NGCC_WASM':
        text += '\nexport const ngccModule = (candidate, parameter) => NGCC_WASM[candidate]?.[Number(parameter)] || null;\n'
    (public / filename).write_text(text)

generate({'kem', 'sig'}, 'ngcc-runtime.js', 'NGCC_WASM')
generate({'hash'}, 'ngcc-hash-runtime.js', 'NGCC_HASH_WASM')
generate({'kex'}, 'ngcc-kex-runtime.js', 'NGCC_KEX_WASM')

results = {}
for candidate in catalog:
    records = []
    for index, _ in enumerate(candidate['parameters']):
        row = attempts.get((candidate['id'], index), {})
        basename = f"ngcc-{candidate['id']}-{index}"
        pair = all((public / 'wasm' / (basename + suffix)).is_file()
                   for suffix in ('.mjs', '.wasm'))
        status = row.get('status', 'verified' if pair else
                         'not_attempted' if candidate['id'] in curated else 'source_not_in_snapshot')
        records.append({'status': status, **({'log': row['log']} if 'log' in row else {})})
    results[candidate['id']] = records
manifest = {'source_revision': 'c5261784ef27e7363b1bbace3d687932fda35ccd',
            'toolchain': 'Emscripten 6.0.10',
            'run_url': 'https://github.com/yibiaowangsd/liangzai-homepage/actions/runs/' + os.getenv('GITHUB_RUN_ID', '0'),
            'results': results}
(public / 'ngcc-build-status.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
from collections import Counter
print('Build record:', Counter(row['status'] for rows in results.values() for row in rows))
