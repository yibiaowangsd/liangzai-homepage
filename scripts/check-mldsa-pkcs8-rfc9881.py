#!/usr/bin/env python3
"""Recheck RFC 9881's public ML-DSA-44 examples with local OpenSSL 3.5.9 and optional Go 1.27.4."""
import argparse
import base64
import hashlib
import os
import re
import subprocess
import tempfile
from pathlib import Path

FIXTURES = (
    ("valid-seed", 54, "c823cb6a31172daa8af670a22c0f049af972bf1cb39a4a95971aa8c0c659dff4"),
    ("valid-expanded", 2588, "35cb529103b3a9ed502fecb438a671ff11bb05fb4afa99301d06240883a74106"),
    ("valid-both", 2626, "e355e29f28e537fcf3aff28354016415146d7f801a57136c241bb6e9addfaa30"),
    ("invalid-both", 2626, "a2cf7a6f0389b4d1be8c1bd5e46da0eb5cc2bc787c3f9b2ec050f19ee0d42c01"),
    ("invalid-tr", 2588, "9f258d3fed62e43a772ae43e40b76019e73b4032ea08c548410b64d2c68f4278"),
    ("invalid-t0", 2588, "3d6f7b341a6833bce053c0e17a4c8c787cc12e0f4964a87370b26ee8e58dc6d5"),
)
SPKI_SHA256 = "837832708c5236d951581f1fddf2b79991b3424a0486d16da1ddad0fd69701be"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def check(text, openssl, directory, go):
    good = text.split("\nC.1.1.  ML-DSA-44 Private Key Examples\n", 1)[1].split("\nC.1.2.", 1)[0]
    bad = text.split("\nC.4.  Example Inconsistent Seed and Expanded Private Keys\n", 1)[1]
    pem = r"-----BEGIN PRIVATE KEY-----\n(.*?)-----END PRIVATE KEY-----"
    blocks = [re.findall(pem, part, re.S) for part in (good, bad)]
    require([len(b) for b in blocks] == [3, 3], "Unexpected RFC example count")

    def call(*args):
        return subprocess.run([openssl, *args], cwd=directory, capture_output=True, timeout=15)

    print(call("version").stdout.decode().strip())
    print(call("list", "-providers", "-provider", "default").stdout.decode().strip())
    (directory / "msg.txt").write_bytes(b"RFC 9881 positive-control signing check\n")
    for (name, length, digest), block in zip(FIXTURES, blocks[0] + blocks[1]):
        data = base64.b64decode("".join(block.split()), validate=True)
        require(len(data) == length and hashlib.sha256(data).hexdigest() == digest, name + ": fixture differs")
        der = name + ".der"
        (directory / der).write_bytes(data)
        exported = call("pkey", "-provider", "default", "-inform", "DER", "-in", der, "-pubout", "-outform", "DER")
        if name.startswith("invalid-"):
            expected = b"does not match seed" if name == "invalid-both" else b"does not match its pubkey part"
            require(exported.returncode != 0 and not exported.stdout and expected in exported.stderr, name + ": unexpected diagnostic")
            print(f"{name}: {length} B; import rejected; not signed")
            continue
        require(exported.returncode == 0 and hashlib.sha256(exported.stdout).hexdigest() == SPKI_SHA256, name + ": unexpected SPKI")
        if name == "valid-seed":
            (directory / "reference.spki").write_bytes(exported.stdout)
        signature = name + ".sig"
        sign = call("pkeyutl", "-provider", "default", "-sign", "-inkey", der, "-keyform", "DER",
                    "-rawin", "-in", "msg.txt", "-out", signature)
        require(sign.returncode == 0 and (directory / signature).stat().st_size == 2420, name + ": sign failed")
        verify = call("pkeyutl", "-provider", "default", "-verify", "-pubin", "-inkey", "reference.spki",
                      "-keyform", "DER", "-rawin", "-in", "msg.txt", "-sigfile", signature)
        require(verify.returncode == 0, name + ": verify failed")
        print(f"{name}: {length} B; reference SPKI matched; 2420 B signature verified")

    if go:
        helper = Path(__file__).with_name("check-mldsa-pkcs8-go.go").resolve()
        compiled = subprocess.run([go, "version"], capture_output=True, check=True, timeout=15)
        print(compiled.stdout.decode().strip())
        subprocess.run([go, "run", str(helper)], cwd=directory, check=True, timeout=180,
                       env={**os.environ, "GOTOOLCHAIN": "local", "GOPROXY": "off",
                            "GOCACHE": str(directory / "go-cache")})
        verified = call("pkeyutl", "-provider", "default", "-verify", "-pubin", "-inkey", "reference.spki",
                        "-keyform", "DER", "-rawin", "-in", "msg.txt", "-sigfile", "go.sig")
        require(verified.returncode == 0, "OpenSSL could not verify Go signature")
        print("Go -> OpenSSL: 2420 B signature verified")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rfc", type=Path, help="Local rfc9881.txt from the RFC Editor")
    parser.add_argument("--openssl", default="openssl")
    parser.add_argument("--go", type=Path, help="Optional path to the Go 1.27.4 executable")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="rfc9881-public-") as temporary:
        check(args.rfc.read_text(encoding="utf-8"), args.openssl, Path(temporary), args.go.resolve() if args.go else None)
