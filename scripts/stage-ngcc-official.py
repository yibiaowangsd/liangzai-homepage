#!/usr/bin/env python3
"""Stage one checksum-verified official NGCC submission for bounded CI builds.

Only our generic harness Makefile is used. Submission Makefiles and binaries
are copied as reference material but are never executed or linked.
"""
import hashlib
import json
import re
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
for index, item in enumerate(candidate['parameters']):
    label = Path(item['source']).name
    if label in labels:
        label = re.sub(r'[^A-Za-z0-9_-]', '_',
                       Path(item['source']).parent.name + '-' + label)
    if label in labels:
        label += f'-{index}'
    source_dir = destination / item['source']
    if label in labels or not source_dir.is_dir():
        raise ValueError(f'{candidate_id}: duplicate label or missing source {label}')
    labels.append(label)
    if candidate_id == 'hash-16':
        # The submitted LLH main file already includes llh_core.c directly.
        lines.append(f'SRCS_{label} := CryptHash_AlgorithmInstance.c drng.c')
        vectors = list(destination.rglob(f'KAT_2_12_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
        else:
            nearby = sorted(p.name for p in destination.rglob('KAT_*.txt'))[:12]
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}; '
                  f'archive KAT examples: {nearby}', flush=True)
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
        # Larger variants retain the 128-bit NTT header path in the submission.
        actual_header = ntt[0].relative_to(source_dir).with_name('ntt_ref.h').as_posix()
        poly_header = source_dir / 'poly_ntt.h'
        original = poly_header.read_text()
        if 'ntt/q15361n256/ntt_ref.h' in original and actual_header != 'ntt/q15361n256/ntt_ref.h':
            poly_header.write_text(original.replace('ntt/q15361n256/ntt_ref.h', actual_header))
        excluded = ('KAT_', 'PQCgenKAT', 'test', 'bench', 'main')
        direct = [p.name for p in source_dir.glob('*.c') if not p.name.startswith(excluded)]
        relative_ntt = ntt[0].relative_to(source_dir).as_posix()
        lines.append(f'SRCS_{label} := {" ".join(sorted(direct))} {relative_ntt}')
    elif candidate_id == 'sign-17':
        submitted_name = f'{label}-reference'
        vectors = list(destination.rglob(f'KAT_SIG_{submitted_name}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
            lines.append(f'KATNAME_{label} := {submitted_name}')
        else:
            nearby = sorted(p.name for p in destination.rglob('KAT_*.txt'))[:12]
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}; '
                  f'archive KAT examples: {nearby}', flush=True)
    elif candidate_id == 'kem-34':
        # The unrelated kex.c requires an absent kem.h and is outside the KEM API.
        c_files = [p.name for p in source_dir.glob('*.c')
                   if p.name != 'kex.c' and not p.name.startswith('KAT_')]
        lines.append(f'SRCS_{label} := {" ".join(sorted(c_files))}')
    elif candidate_id == 'sign-20':
        level = label.split('-')[-1]
        if level not in ('128', '256', '384', '512'):
            raise ValueError(f'{candidate_id} {label}: invalid level')
        core = ('fq_arith', 'rsdp', 'restr', 'mpc', 'keygen', 'sign', 'verify')
        adapters = ('SIG_AlgorithmInstance', 'utils_adapter', 'hash_adapter',
                    'drng', 'auxfunc')
        source_files = [f'src/{name}.c' for name in core]
        source_files += [f'api_pkc/{name}.c' for name in adapters]
        if any(not (source_dir / name).is_file() for name in source_files):
            raise ValueError(f'{candidate_id} {label}: submitted adapter source missing')
        lines.append(f'SRCS_{label} := {" ".join(source_files)}')
        lines.append(f'INC_{label} := -Isrc/{label}/api_pkc -Isrc/{label}/include')
        lines.append(f'DEFS_{label} := -DQINGLUAN_{level}')
        lines.append(f'SHIMDEFS_{label} := -DNGCC_INSTANCE_HEADER=\\\"api_pkc/SIG_AlgorithmInstance.h\\\"')
    elif candidate_id == 'sign-22':
        mode = label.rsplit('-', 1)[-1]
        if mode not in ('128', '256', '384', '512'):
            raise ValueError(f'{candidate_id} {label}: invalid Rhyme mode')
        core = ('poly', 'ntt', 'ntt_tables', 'sampler', 'encoding', 'packing',
                'sign', 'zpntt', 'symmetric-shake')
        keygen = ('kg_main', 'kg_solver', 'kg_zint', 'kg_ntt', 'kg_primes')
        source_files = [f'src/{name}.c' for name in core]
        source_files += [f'src/keygen/{name}.c' for name in keygen]
        source_files += ['rhyme_xof.c', 'randombytes.c', 'auxfunc.c',
                         'drng.c', 'SIG_AlgorithmInstance.c']
        if 'SHAKE' in label:
            source_files.append('src/fips202.c')
        else:
            source_files.extend(('sm3.c', 'sm3_xof.c'))
        if any(not (source_dir / name).is_file() for name in source_files):
            raise ValueError(f'{candidate_id} {label}: submitted Rhyme source missing')
        lines.append(f'SRCS_{label} := {" ".join(source_files)}')
        lines.append(f'INC_{label} := -Isrc/{label}/include -Isrc/{label}/src/keygen')
        lines.append(f'CFLAGS_{label} := -DRHYME_NO_AES -DRHYME_MODE={mode}')
        lines.append(f'KATNAME_{label} := {label}')
        vectors = list(destination.rglob(f'KAT_SIG_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
        else:
            examples = sorted(p.name for p in destination.rglob('KAT_SIG_*.txt'))[:20]
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}; '
                  f'archive KAT examples: {examples}', flush=True)
    elif candidate_id in ('sign-14', 'sign-21'):
        # The submission Makefiles select the SM3 pseudo-XOF by default.
        lines.append(f'CFLAGS_{label} := -DXOF_PSEUDO')
        vectors = list(destination.rglob(f'KAT_SIG_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
    elif candidate_id == 'kem-41':
        # SPEED_KEM/cpucycles are executable benchmark code, not KEM sources.
        c_files = [p.name for p in source_dir.glob('*.c')
                   if p.name not in ('SPEED_KEM.c', 'cpucycles.c')
                   and not p.name.startswith('KAT_')]
        lines.append(f'SRCS_{label} := {" ".join(sorted(c_files))}')
    elif candidate_id == 'kem-30':
        vectors = list(destination.rglob(f'KAT_KEM_{label}.txt'))
        if len(vectors) == 1:
            directory = vectors[0].parent.relative_to(destination).as_posix()
            lines.append(f'KATDIR_{label} := {directory}')
        else:
            print(f'{candidate_id} {label}: reference vector matches: {len(vectors)}', flush=True)
    elif candidate_id == 'sign-13':
        # The submitted reference Makefile selects the seeded DRNG adapter;
        # its other randomness backends and benchmarks are separate programs.
        level = re.fullmatch(r'GreatWall(128|192|256|512)[fs]', label)
        if not level:
            raise ValueError(f'{candidate_id} {label}: invalid level')
        core = ('SIG_AlgorithmInstance drng api aes aes_impl block block_impl '
                'faest greatwall greatwall_impl hash '
                'KeccakHash KeccakP-1600-reference KeccakSponge owf_proof '
                'polynomials polynomials_impl prgs quicksilver '
                'randomness_randombytes small_vole transpose universal_hash '
                'util vector_com vole_check vole_commit').split()
        selected = [name + '.c' for name in core]
        selected.append(f'greatwall-{level.group(1)}-matrix.c')
        if any(not (source_dir / name).is_file() for name in selected):
            raise ValueError(f'{candidate_id} {label}: submitted GreatWall source missing')
        lines.append(f'SRCS_{label} := {" ".join(selected)}')
    elif candidate_id == 'sign-05':
        # The submitted Makefiles enumerate SM4 and optional Ballet utilities;
        # the generic top-level C glob omits those nested library sources.
        fallback = source_dir / 'fallbacks.h'
        if not fallback.is_file():
            raise FileNotFoundError(f'{candidate_id} {label}: missing compatibility header')
        # Emscripten's libc already declares these functions. The native
        # reference build still uses the unchanged submitted fallback body.
        fallback.write_text('#ifndef __EMSCRIPTEN__\n' + fallback.read_text()
                            + '\n#endif /* !__EMSCRIPTEN__ */\n')
        direct = [p.name for p in source_dir.glob('*.c')
                  if not p.name.startswith('KAT_') and not p.stem.endswith('_bench')]
        utilities = [p.relative_to(source_dir).as_posix()
                     for folder in ('utils_sm4', 'utils_ballet')
                     for p in (source_dir / folder).glob('*.c')]
        lines.append(f'SRCS_{label} := {" ".join(sorted(direct + utilities))}')
        include_dirs = [folder for folder in ('utils_sm4', 'utils_ballet')
                        if (source_dir / folder).is_dir()]
        lines.append(f'INC_{label} := '
                     + ' '.join(f'-Isrc/{label}/{folder}' for folder in include_dirs))
        flags = ['-include', 'fallbacks.h', '-DSM4_SBOX_TABLE']
        if 'utils_ballet' in include_dirs:
            flags.extend(('-DUSE_BALLET=1', '-DHAVE_BALLET_CORE=1'))
        lines.append(f'CFLAGS_{label} := {" ".join(flags)}')
    elif candidate_id == 'sign-28':
        selected = ['SIG_AlgorithmInstance.c', 'lib/auxfunc.c', 'lib/drng.c',
                    'lib/blake2/ref/blake2b-ref.c']
        selected += sorted(p.relative_to(source_dir).as_posix()
                           for p in (source_dir / 'src').glob('*.c'))
        lines.append(f'SRCS_{label} := {" ".join(selected)}')
        lines.append(f'INC_{label} := -Isrc/{label}/lib -Isrc/{label}/src '
                     f'-Isrc/{label}/lib/blake2/ref')
    elif candidate_id == 'kem-20':
        family = 'Frost-CC' if '-CC-' in label else 'Frost'
        frost_dir = source_dir / family / 'src'
        reference = frost_dir / 'frost_macrify_reference.c'
        if not reference.is_file():
            raise FileNotFoundError(f'{candidate_id} {label}: missing reference macro implementation')
        shutil.copyfile(reference, frost_dir / 'frost_macrify.c')
        selected = ['KEM_AlgorithmInstance.c', 'auxfunc.c', 'drng.c',
                    'randombytes_adapter.c', 'common/aes/aes_c.c',
                    'common/sha3/fips202.c']
        selected += sorted(p.relative_to(source_dir).as_posix()
                           for p in frost_dir.glob('*.c')
                           if not p.name.startswith('frost_macrify'))
        lines.append(f'SRCS_{label} := {" ".join(selected)}')
        lines.append(f'INC_{label} := -Isrc/{label}/{family}/src '
                     f'-Isrc/{label}/common/aes -Isrc/{label}/common/sha3')
    elif candidate_id == 'kem-35':
        # The archive's directory with spaces cannot be passed verbatim in
        # compiler flags. Link the copied source to a stable local alias.
        alias = destination / '_ngcc_shared'
        if not alias.exists():
            alias.symlink_to('Implementations and Test_Vectors/Implementations/_shared',
                            target_is_directory=True)
        shared = source_dir / '../../../_shared'
        if not (shared / 'scloudplus_core/include/scloudplus_param_common.h').is_file():
            raise FileNotFoundError(f'{candidate_id} {label}: missing shared parameters')
        selected = ['../../../_shared/api_pkc/KEM_AlgorithmInstance.c',
                    '../../../_shared/api_pkc/drng.c']
        selected += sorted('../../../_shared/scloudplus_core/common/' + p.name
                           for p in (shared / 'scloudplus_core/common').glob('*.c'))
        selected += sorted('../../../_shared/scloudplus_core/ref/' + p.name
                           for p in (shared / 'scloudplus_core/ref').glob('*.c'))
        lines.append(f'SRCS_{label} := {" ".join(selected)}')
        lines.append(f'INC_{label} := -I_ngcc_shared/api_pkc '
                     f'-I_ngcc_shared/scloudplus_core/include '
                     f'-I_ngcc_shared/scloudplus_core/common '
                     f'-I_ngcc_shared/scloudplus_core/ref -Isrc/{label}')
    elif candidate_id == 'sign-19':
        backend = 'SHAKE' if '-SHAKE-' in label else 'SM3'
        core = ('address counter merkle octopus randombytes sign tfors utils '
                'utilsx1 gwots gwotsx1 SIG_AlgorithmInstance drng').split()
        extra = ('hash_shake fips202 thash_shake_simple' if backend == 'SHAKE'
                 else 'auxfunc hash_sm3 sm3_drng thash_sm3_simple').split()
        selected = [name + '.c' for name in core + extra]
        if any(not (source_dir / name).is_file() for name in selected):
            raise ValueError(f'{candidate_id} {label}: submitted Phoenix source missing')
        lines.append(f'SRCS_{label} := {" ".join(selected)}')
        lines.append(f'CFLAGS_{label} := -DPARAMS={label.lower()} '
                     f'-DALLOW_DEEP_TREES -DSUBMISSION_DRNG '
                     f'-DPARAMNAME=\\\"{label}\\\"')
    elif candidate_id == 'sign-30':
        lines.append(f'CFLAGS_{label} := -DUSE_SHA3')
    instance_header = {'hash': 'CryptHash_AlgorithmInstance.h',
                       'kem': 'KEM_AlgorithmInstance.h',
                       'sig': 'SIG_AlgorithmInstance.h',
                       'kex': 'KEX_AlgorithmInstance.h'}[candidate['type']]
    if candidate_id != 'sign-20' and not (source_dir / instance_header).is_file():
        prefix = {'hash': 'CryptHash', 'kem': 'KEM', 'sig': 'SIG',
                  'kex': 'KEX'}[candidate['type']]
        alternatives = [p for p in source_dir.glob(prefix + '*.h')
                        if 'ALGORITHM_INSTANCE' in p.read_text(errors='replace')]
        if not alternatives:
            alternatives = [p for p in source_dir.glob('*_AlgorithmInstance.h')
                            if 'ALGORITHM_INSTANCE' in p.read_text(errors='replace')]
        if not alternatives:
            alternatives = list(source_dir.rglob(instance_header))
        if len(alternatives) != 1:
            nearby = sorted(p.name for p in source_dir.rglob('*.h'))[:80]
            raise ValueError(f'{candidate_id} {label}: cannot select the submitted API header; headers: {nearby}')
        parent = alternatives[0].parent.relative_to(source_dir)
        if parent.parts:
            lines.append(f'INC_{label} += -Isrc/{label}/{parent.as_posix()}')
        lines.append(f'SHIMDEFS_{label} := -DNGCC_INSTANCE_HEADER=\\\"{alternatives[0].name}\\\"')
    lines.append(f'$(eval $(call ngcc_instance,{label},{item["source"]}))')
lines.extend(['', 'include ../api/link_finish.mk', ''])
(destination / 'Makefile').write_text('\n'.join(lines))
print(f'{candidate_id}: verified official ZIP {digest}, {len(labels)} parameter sources', flush=True)
shutil.rmtree(scratch)
