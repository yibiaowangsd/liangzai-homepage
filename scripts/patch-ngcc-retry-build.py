#!/usr/bin/env python3
"""Apply build-only repairs to a disposable pinned harness checkout.

DKEM defines its own DRNG global: tell the official shim to reference it.
HEP-QC's vector header uses size_t without including its declaration.
No cryptographic arithmetic or randomness algorithm is changed.
"""
import subprocess
import re
import sys
from pathlib import Path
harness = Path(sys.argv[1])
for cid in ('kem-13', 'kem-17'):
    directory = harness / cid
    listing = subprocess.check_output(['make', '-s', 'list'], cwd=directory, text=True, timeout=10)
    labels = [m[1] for line in listing.splitlines() if (m := re.match(r'^(.+?)\s+->\s+', line))]
    if len(labels) != (3 if cid == 'kem-13' else 4):
        raise ValueError(f'{cid}: pinned parameter count differs')
    path = directory / 'Makefile'
    text = path.read_text()
    if '# liangzai portability retry' in text:
        continue
    variable, flags = ('SHIMDEFS_ALL', '-DNGCC_NO_DRNG') if cid == 'kem-13' else ('CFLAGS', '-include stddef.h')
    path.write_text(text + '\n# liangzai portability retry\n' + '\n'.join(f'{variable}_{label} += {flags}' for label in labels) + '\n')
    subprocess.run(['make', '-s', 'clean'], cwd=directory, check=True, timeout=20)
    print(cid, flags)
