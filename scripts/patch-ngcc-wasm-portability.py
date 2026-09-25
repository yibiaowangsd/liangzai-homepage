#!/usr/bin/env python3
"""Port BAG-Piglet's measurement-only x86 cycle counter for wasm32.

The native source is untouched. The guarded change applies only to the CI
checkout that builds browser modules; it does not alter the cryptographic
computation or the x86 native KAT. The exact source snippet is checked.
"""
import sys
from pathlib import Path

harness = Path(sys.argv[1])
old = 'static inline uint64_t cputimer(void) {\n#if defined(_WIN32)\n'
new = ('static inline uint64_t cputimer(void) {\n'
       '#if defined(__EMSCRIPTEN__)\n'
       '  return (uint64_t) clock(); /* diagnostic timer only */\n'
       '#elif defined(_WIN32)\n')
paths = sorted((harness / 'kem-04').glob('Implementations/Reference_Implementation/*/src/common/tools.h'))
if len(paths) != 4:
    raise RuntimeError(f'expected four pinned BAG-Piglet timing headers, found {len(paths)}')
for path in paths:
    source = path.read_text()
    if source.count(old) != 1:
        raise RuntimeError(f'pinned timer layout changed: {path}')
    path.write_text(source.replace(old, new))
    print('WASM-only diagnostic timer portability guard:', path)
