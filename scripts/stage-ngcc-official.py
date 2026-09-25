#!/usr/bin/env python3
"""Stage one checksum-verified official NGCC submission for bounded CI builds.

Only our generic harness Makefile is used. Submission Makefiles and binaries
are copied as reference material but are never executed or linked.
"""
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
candidate_id, harness_arg = sys.argv[1:3]
harness = Path(harness_arg).resolve()
catalog = json.loads((repo / 'public/pqc-practice/ngcc-catalog.json').read_text())
candidate = next(c for c in catalog['candidates'] if c['id'] == candidate_id)
entry = json.loads((repo / 'scripts/ngcc-official-archives.json').read_text())['candidates'][candidate_id]
scratch = repo / 'work/ngcc-official-source' / candidate_id
scratch.mkdir(parents=True, exist_ok=True)
archive = scratch / 'official.zip'
subprocess.run(['curl', '-fSL', '--retry', '2', '--connect-timeout', '12',
                '--max-time', '300', '--silent', '--show-error', '-o', str(archive),
                entry['url']], check=True, timeout=315)
if archive.stat().st_size != entry['bytes']:
    raise ValueError(f'{candidate_id}: official ZIP size differs from pinned manifest')
with archive.open('rb') as stream:
    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
if digest != entry['sha256']:
    raise ValueError(f'{candidate_id}: official ZIP SHA-256 differs from pinned manifest')

unpacked = scratch / 'unpacked'
unpacked.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as zipped:
    for member in zipped.infolist():
        path = Path(member.filename.replace('\\', '/'))
        if path.is_absolute() or '..' in path.parts:
            raise ValueError(f'{candidate_id}: unsafe archive entry {member.filename!r}')
    invalid = zipped.testzip()
    if invalid:
        raise ValueError(f'{candidate_id}: corrupt ZIP entry {invalid!r}')
    zipped.extractall(unpacked)

sources = [Path(item['source']) for item in candidate['parameters']]
prefixes = set()
for directory in unpacked.rglob(sources[0].name):
    if not directory.is_dir():
        continue
    parts = directory.relative_to(unpacked).parts
    if tuple(parts[-len(sources[0].parts):]) == sources[0].parts:
        prefix = unpacked.joinpath(*parts[:-len(sources[0].parts)])
        if all((prefix / source).is_dir() for source in sources):
            prefixes.add(prefix)
if not prefixes:
    raise FileNotFoundError(f'{candidate_id}: catalog source paths absent from official ZIP')
source_root = min(prefixes, key=lambda path: len(path.parts))
destination = harness / candidate_id
destination.mkdir(parents=True, exist_ok=True)
shutil.copytree(source_root, destination, dirs_exist_ok=True)

lines = [f'NGCC_ID := {candidate_id}', f'NGCC_TYPE := {candidate["type"]}',
         f'NGCC_ALG := {candidate_id}', 'include ../api/link_rules.mk', '']
labels = []
for item in candidate['parameters']:
    label = Path(item['source']).name
    source_dir = destination / item['source']
    if label in labels or not source_dir.is_dir():
        raise ValueError(f'{candidate_id}: duplicate label or missing source {label}')
    labels.append(label)
    if not (source_dir / 'CryptHash_AlgorithmInstance.h').is_file() and candidate['type'] == 'hash':
        alternatives = [p for p in source_dir.glob('CryptHash*.h')
                        if 'ALGORITHM_INSTANCE' in p.read_text(errors='replace')]
        if len(alternatives) != 1:
            raise ValueError(f'{candidate_id} {label}: cannot select the submitted API header')
        lines.append(f'SHIMDEFS_{label} := -DNGCC_INSTANCE_HEADER=\\\"{alternatives[0].name}\\\"')
    lines.append(f'$(eval $(call ngcc_instance,{label},{item["source"]}))')
lines.extend(['', 'include ../api/link_finish.mk', ''])
(destination / 'Makefile').write_text('\n'.join(lines))
print(f'{candidate_id}: verified official ZIP {digest}, {len(labels)} parameter sources', flush=True)
shutil.rmtree(scratch)
