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
    if candidate_id == 'hash-16':
        # The submitted LLH main file already includes llh_core.c directly.
        lines.append(f'SRCS_{label} := CryptHash_AlgorithmInstance.c drng.c')
        vectors = list(destination.rglob(f'KAT_CryptHash_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
        else:
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}', flush=True)
    elif candidate_id == 'hash-23':
        # QILIN's local uint64_t/uint8_t aliases conflict with the system shim.
        header = source_dir / 'CryptHash_AlgorithmInstance.h'
        original = header.read_text()
        aliases = 'typedef unsigned long long uint64_t;\ntypedef unsigned char uint8_t;'
        if aliases not in original:
            raise ValueError(f'{candidate_id} {label}: expected typedefs not found')
        header.write_text(original.replace(aliases, '#include <stdint.h>', 1))
    elif candidate_id == 'hash-30':
        width = label.split('-')[2]
        if width not in ('1280', '1536'):
            raise ValueError(f'{candidate_id} {label}: unknown permutation width')
        lines.append(f'SRCS_{label} := CryptHash_AlgorithmInstance.c drng.c '
                     f'../../../lib/low/ZuD-{width}/plain/ZuD{width}-plain.c')
        lines.append(f'INC_{label} := -IZC-DM/Implementations/lib/common')
    elif candidate_id == 'hash-34':
        # Use the reference submission's scalar branch for wasm32.
        lines.append(f'CFLAGS_{label} := -DWCHAIN_DISABLE_SIMD')
    elif candidate_id == 'sign-08':
        fft = source_dir / 'fft.c'
        original = fft.read_text()
        if '__int64_t' not in original:
            raise ValueError(f'{candidate_id} {label}: expected nonportable integer absent')
        fft.write_text(original.replace('__int64_t', 'int64_t'))
        sign = source_dir / 'sign.c'
        original = sign.read_text()
        if 'DRNG_ctx drng_algorithm;' not in original:
            raise ValueError(f'{candidate_id} {label}: expected duplicate DRNG absent')
        sign.write_text(original.replace('DRNG_ctx drng_algorithm;',
                                         'extern DRNG_ctx drng_algorithm;', 1))
    elif candidate_id == 'sign-23':
        ntt = list((source_dir / 'ntt').glob('*/ntt_ref.c'))
        if len(ntt) != 1:
            raise ValueError(f'{candidate_id} {label}: expected one scalar NTT source')
        excluded = ('KAT_', 'PQCgenKAT', 'test', 'bench', 'main')
        direct = [p.name for p in source_dir.glob('*.c') if not p.name.startswith(excluded)]
        relative_ntt = ntt[0].relative_to(source_dir).as_posix()
        lines.append(f'SRCS_{label} := {" ".join(sorted(direct))} {relative_ntt}')
    elif candidate_id == 'sign-17':
        vectors = list(destination.rglob(f'KAT_SIG_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
        else:
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}', flush=True)
    instance_header = {'hash': 'CryptHash_AlgorithmInstance.h',
                       'kem': 'KEM_AlgorithmInstance.h',
                       'sig': 'SIG_AlgorithmInstance.h',
                       'kex': 'KEX_AlgorithmInstance.h'}[candidate['type']]
    if not (source_dir / instance_header).is_file():
        prefix = {'hash': 'CryptHash', 'kem': 'KEM', 'sig': 'SIG',
                  'kex': 'KEX'}[candidate['type']]
        alternatives = [p for p in source_dir.glob(prefix + '*.h')
                        if 'ALGORITHM_INSTANCE' in p.read_text(errors='replace')]
        if len(alternatives) != 1:
            raise ValueError(f'{candidate_id} {label}: cannot select the submitted API header')
        lines.append(f'SHIMDEFS_{label} := -DNGCC_INSTANCE_HEADER=\\\"{alternatives[0].name}\\\"')
    lines.append(f'$(eval $(call ngcc_instance,{label},{item["source"]}))')
lines.extend(['', 'include ../api/link_finish.mk', ''])
(destination / 'Makefile').write_text('\n'.join(lines))
print(f'{candidate_id}: verified official ZIP {digest}, {len(labels)} parameter sources', flush=True)
shutil.rmtree(scratch)
