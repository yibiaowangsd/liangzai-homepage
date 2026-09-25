#!/usr/bin/env python3
"""Define zero-bit rotations in a temporary MoFang source checkout.

The submitted helper evaluates x >> 64 when shift is zero. That shift is
undefined in C, and clang's WASM build can differ from the native GCC KAT.
This patch changes only the zero-rotation case; the official native KAT and
independent native/WASM digests must still match before any module is shipped.
"""
import sys
from pathlib import Path

root = Path(sys.argv[1]) / 'hash-19/MoFang/Implementations/Reference_Implementation'
old = 'return (x << shift) | (x >> (64 - shift));'
new = 'if (shift == 0) return x;\n    return (x << shift) | (x >> (64 - shift));'
files = sorted(root.glob('MoFang-*/CryptHash_AlgorithmInstance.c'))
if len(files) != 6:
    raise SystemExit(f'expected six MoFang source files, found {len(files)}')
for path in files:
    source = path.read_text()
    if source.count(old) != 1:
        raise SystemExit(f'unexpected rotation source: {path}')
    path.write_text(source.replace(old, new, 1))
    print(f'guarded zero-bit rotation: {path}')
