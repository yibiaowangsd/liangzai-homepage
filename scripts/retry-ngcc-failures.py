#!/usr/bin/env python3
"""Retry failed builds into scratch; never publish without native and WASM checks.

Usage: python scripts/retry-ngcc-failures.py /path/to/pinned/ngcc-harness
Use --previous-attempt to repeat the 2026-09-26 selection after statuses change.
"""
import argparse
import concurrent.futures
import datetime
import importlib.util
import json
import shutil
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('harness', type=Path)
parser.add_argument('--previous-attempt', action='store_true')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
harness = args.harness.resolve()
if not shutil.which('emcc'):
    parser.error('activate Emscripten 6.0.10 first')
spec = importlib.util.spec_from_file_location('builder', repo / 'scripts/build-ngcc-expanded.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
root = repo / 'work' / ('retry-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S'))
b.WASM = root / 'wasm'
b.LOGS = root / 'logs'
for path in (b.WASM, b.LOGS):
    path.mkdir(parents=True)
old = json.loads((repo / 'public/pqc-practice/ngcc-build-status.json').read_text())['results']
targets = {}
for cid, rows in old.items():
    selected = [i for i, r in enumerate(rows) if
                (r.get('retry_previous_status', r['status']) if args.previous_attempt else r['status'])
                in ('compile_failed', 'timeout')]
    if selected:
        targets[cid] = selected
(root / 'targets.json').write_text(json.dumps(targets, indent=2))
with (root / 'api.log').open('w') as log:
    subprocess.run(['make', '-s', '-C', str(harness / 'api'), 'harness'],
                   stdout=log, stderr=subprocess.STDOUT, timeout=60, check=True)
# These changes repair only the harness build, without changing the algorithms.
subprocess.run(['python3', str(repo / 'scripts/patch-ngcc-retry-build.py'), str(harness)], check=True)


def clean(cid):
    subprocess.run(['make', '-s', 'clean'], cwd=harness / cid,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20, check=True)


def native(cid, index):
    with (root / f'{cid}-{index}.native.log').open('w') as log:
        subprocess.run(['python3', str(repo / 'scripts/check-ngcc-native.py'), str(harness), cid,
                        '--seconds', '120', '--budget', '125', '--from-index', str(index),
                        '--to-index', str(index + 1)], stdout=log, stderr=subprocess.STDOUT,
                       timeout=145, check=True)
    return json.loads((repo / 'work/ngcc-wasm-rebuild' / f'{cid}.native-status.json').read_text())[str(index)]


def retry(cid):
    candidate = next(c for c in b.CATALOG['candidates'] if c['id'] == cid)
    directory = harness / cid
    if not (directory / 'Makefile').exists():
        with (root / f'{cid}.source.log').open('w') as log:
            subprocess.run(['python3', str(repo / 'scripts/stage-ngcc-official.py'), cid, str(harness)],
                           stdout=log, stderr=subprocess.STDOUT, timeout=330, check=True)
    labels = b.instances(directory)
    clean(cid)
    native_results = {}
    if candidate['type'] == 'hash':
        for index in targets[cid]:
            native_results[index] = native(cid, index)
        with (root / f'{cid}.vectors.log').open('w') as log:
            subprocess.run(['python3', str(repo / 'scripts/ngcc-native-hash-vectors.py'), str(harness), cid],
                           stdout=log, stderr=subprocess.STDOUT, timeout=60, check=True)
        shutil.copy(repo / 'work/ngcc-wasm-rebuild' / f'{cid}.vectors.json', b.LOGS / f'{cid}.vectors.json')
        clean(cid)
    records = []
    for index in targets[cid]:
        parameter = candidate['parameters'][index]
        label = b.select_instance(labels, parameter)
        if not label:
            row = {'id': cid, 'parameter': index, 'status': 'source_missing'}
        else:
            # Outputs are isolated here; a provisional pass cannot affect the website.
            row = b.build_one(harness, candidate, parameter, index, label, 90,
                              native_results.get(index, 'passed'))
            if row['status'] == 'verified' and candidate['type'] != 'hash':
                clean(cid)
                result = native(cid, index)
                clean(cid)
                if result != 'passed':
                    row['status'] = 'native_timeout' if result == 'timeout' else 'native_failed'
            if row['status'] != 'verified':
                for suffix in ('.mjs', '.wasm'):
                    (b.WASM / f'ngcc-{cid}-{index}{suffix}').unlink(missing_ok=True)
                row.pop('module', None)
        row['previous_status'] = old[cid][index]['status']
        records.append(row)
        (root / f'{cid}.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(cid, index, row['status'], flush=True)
    return records


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    futures = {pool.submit(retry, cid): cid for cid in targets}
    for future in concurrent.futures.as_completed(futures):
        cid = futures[future]
        try:
            future.result()
        except Exception as error:
            (root / f'{cid}.runner-error.txt').write_text(str(error) + '\n')
            print(cid, 'runner failed:', error, flush=True)
print('Results:', root)
