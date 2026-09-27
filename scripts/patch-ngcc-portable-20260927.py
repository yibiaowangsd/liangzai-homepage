#!/usr/bin/env python3
"""Guard x86-only helpers and replace a Linux-only errno include.

Apply only to the pinned, disposable ngcc-harness checkout before building.
Native arithmetic stays unchanged; WASM uses the equivalent leading-zero
instruction and the already-submitted portable Keccak rotation path.
"""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('harness', type=Path)
args = parser.parse_args()


def replace(path, before, after):
    text = path.read_text()
    if after in text:
        return
    if text.count(before) != 1:
        raise ValueError(f'pinned source differs: {path}')
    path.write_text(text.replace(before, after))


for cid in ('kem-06', 'kem-07', 'kem-10'):
    root = args.harness / cid / 'Implementations/Reference_Implementation'
    headers = sorted(root.glob('*/src/rbc-*/rbc_*.h'))
    headers = [p for p in headers if '#include <x86intrin.h>' in p.read_text()]
    elements = sorted(root.glob('*/src/rbc-*/rbc_elt.c'))
    permutations = sorted(root.glob('*/lib/XKCP/opt64/KeccakP-1600-opt64.c'))
    if any(len(paths) != 3 for paths in (headers, elements, permutations)):
        raise ValueError(f'{cid}: expected three pinned instances')
    for p in headers:
        replace(p, '#include <x86intrin.h>', '#if !defined(__EMSCRIPTEN__)\n#include <x86intrin.h>\n#endif')
    for p in elements:
        old = '    __asm__ volatile("bsr %1,%0;" : "=r"(index) : "r"(e[i]));'
        replace(p, old, '#if defined(__EMSCRIPTEN__)\n'
                '    /* Zero limbs are masked below; | 1 avoids clz(0). */\n'
                '    index = 63 - __builtin_clzll(e[i] | UINT64_C(1));\n'
                '#else\n' + old + '\n#endif')
    for p in permutations:
        replace(p, '#elif defined(KeccakP1600_useSHLD)',
                '#elif defined(KeccakP1600_useSHLD) && !defined(__EMSCRIPTEN__)')
    print(cid, 'portable field-degree helper and Keccak rotation')

paths = sorted((args.harness / 'kex-07').glob('Implementations and Test_Vectors/Implementations/Reference_Implementation/*/cca.c'))
if len(paths) != 9:
    raise ValueError('kex-07: expected nine pinned instances')
for p in paths:
    replace(p, '#include <asm-generic/errno.h>', '#include <errno.h>')
print('kex-07', 'standard errno.h')
