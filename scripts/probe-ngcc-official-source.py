#!/usr/bin/env python3
"""Check official submission ZIPs absent from the pinned curated build snapshot.

Read only archive metadata. Never execute downloaded files or publish them as
verified browser modules without the native KAT and per-parameter WASM checks.
"""
import argparse
import hashlib
import json
import tempfile
import urllib.request
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--shard', type=int, required=True)
parser.add_argument('--shards', type=int, default=4)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
catalog = json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())['candidates']
not_curated = '''sign-02 sign-05 sign-06 sign-08 sign-13 sign-14 sign-17 sign-19 sign-20 sign-21 sign-22 sign-23 sign-24 sign-26 sign-28 sign-30 sign-31
kem-05 kem-11 kem-12 kem-13 kem-15 kem-16 kem-19 kem-20 kem-25 kem-26 kem-28 kem-30 kem-34 kem-35 kem-41
kex-01 kex-04 kex-06
hash-03 hash-06 hash-07 hash-08 hash-13 hash-15 hash-16 hash-23 hash-28 hash-29 hash-30 hash-33 hash-34'''.split()
assert len(not_curated) == 48 and len(set(not_curated)) == 48
selected = [c for c in catalog if c['id'] in not_curated]
records = []
for offset, candidate in enumerate(selected):
    if offset % args.shards != args.shard:
        continue
    row = {'id': candidate['id'], 'archive': candidate['archive']}
    try:
        if not candidate['archive'].startswith('https://www.niccs.org.cn/niccs/Proposal/'):
            raise ValueError('official download host/path unexpected')
        request = urllib.request.Request(candidate['archive'], headers={'User-Agent': 'NGCC-source-audit/1.0'})
        with urllib.request.urlopen(request, timeout=15) as response, tempfile.TemporaryFile() as output:
            total = 0
            digest = hashlib.sha256()
            while chunk := response.read(65536):
                total += len(chunk)
                if total > 32 * 1024 * 1024:
                    raise ValueError('source archive exceeds 32 MiB probe limit')
                digest.update(chunk); output.write(chunk)
            output.seek(0)
            with zipfile.ZipFile(output) as archive:
                names = archive.namelist()
                if len(names) > 100000:
                    raise ValueError('too many archive entries')
                source = [name for name in names if name.lower().endswith(('.c', '.cc', '.cpp', '.s'))]
                row.update(status='source_archive' if source else 'no_c_or_cpp',
                           bytes=total, sha256=digest.hexdigest(), entries=len(names),
                           source_files=len(source), sample=source[:3])
    except Exception as error:
        row.update(status='fetch_or_archive_failed', reason=str(error)[:240])
    records.append(row)
    print(f"{row['id']}: {row['status']}", flush=True)
output = repo / 'work/ngcc-official-probe'
output.mkdir(parents=True, exist_ok=True)
(output / f'shard-{args.shard}.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
