#!/usr/bin/env python3
"""Bounded per-parameter native KAT; failures never validate WASM outputs."""
import argparse
import json
import re
import os
import signal
import subprocess
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('harness', type=Path)
parser.add_argument('candidate')
parser.add_argument('--seconds', type=int, default=75)
parser.add_argument('--budget', type=int, default=400)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
harness = args.harness.resolve()
directory = harness / args.candidate
catalog = json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())
candidate = next(c for c in catalog['candidates'] if c['id'] == args.candidate)
logs = repo / 'work/ngcc-wasm-rebuild'
logs.mkdir(parents=True, exist_ok=True)
try:
    result = subprocess.run(['make', '-s', 'list'], cwd=directory, capture_output=True, text=True, timeout=10)
    result.check_returncode()
    labels = {}
    for line in result.stdout.splitlines():
        match = re.match(r'^(.+?)\s+->\s+(.+)$', line)
        if match:
            label, source = match.groups()
            labels[source.rstrip('/')] = label
except (FileNotFoundError, subprocess.SubprocessError) as error:
    labels = {}
    (logs / (args.candidate + '.native.log')).write_text(f'Makefile list unavailable: {error}\n')
results = {}
start = time.monotonic()
for index, parameter in enumerate(candidate['parameters']):
    label = labels.get(parameter['source'].rstrip('/'))
    if not label:
        results[str(index)] = 'source_missing'
        continue
    if time.monotonic() - start >= args.budget:
        results[str(index)] = 'timeout'
        continue
    log = logs / f'{args.candidate}.{index}.native.log'
    process = subprocess.Popen(['make', '-s', '-j2', f'test-{label}'], cwd=directory,
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        data, _ = process.communicate(timeout=args.seconds)
        output = data.decode(errors='replace')
        # Submitted test-vector names sometimes differ in case or punctuation
        # from Makefile target labels; the invoked target is still unique.
        lines = [line for line in output.splitlines() if line.startswith(f'RESULT {args.candidate} ')]
        ok = process.returncode == 0 and len(lines) == 1 and re.search(r'\sPASS(?:\s|$)', lines[0]) is not None
        results[str(index)] = 'passed' if ok else 'failed'
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        data, _ = process.communicate()
        output = data.decode(errors='replace') + '\nTIMEOUT\n'
        results[str(index)] = 'timeout'
    log.write_text(output)
    print(args.candidate, label, results[str(index)], flush=True)
target = logs / (args.candidate + '.native-status.json')
target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
