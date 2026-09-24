"""Fix the two reported Aigis-Enc+ rejection defects in a source copy.

This applies only to the pinned official submission kem.c. Honest ciphertext
results remain identical; malformed ciphertexts use the intended fallback key.
"""

import hashlib
import sys
from pathlib import Path


EXPECTED = "8916ea6ece9aff6399a513c14ccf14a83df3411fa7acc92beea05d2505e69e69"


def main():
    source_dir, output_dir = map(Path, sys.argv[1:3])
    data = (source_dir / "kem.c").read_bytes()
    if hashlib.sha256(data).hexdigest() != EXPECTED:
        raise ValueError("Aigis-Enc+ kem.c changed; review the fix before building")
    code = data.decode("utf-8-sig").replace("\r\n", "\n")
    fixes = {
        "memcpy(buf2, sk-SEED_BYTES, SEED_BYTES );":
            "memcpy(buf2, sk + SK_BYTES - SEED_BYTES, SEED_BYTES );",
        "cmov(buf, buf2, SEED_BYTES, fail);":
            "cmov(ss, buf2, SEED_BYTES, fail);",
    }
    for old, new in fixes.items():
        if code.count(old) != 1:
            raise ValueError(f"Expected one fix location: {old}")
        code = code.replace(old, new)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "kem.c").write_text(code, encoding="utf-8")


if __name__ == "__main__":
    main()
