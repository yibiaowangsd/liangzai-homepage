# Certificate compression boundary notebook

Run `python3 research/experiments/2026-11-17/compression.py` from repo root.
16 offline checks, Python standard library, zlib level 9. `results.json` records the executed zlib version and sizes. Byte fixtures are public deterministic **synthetic TLS-shaped structures, not valid X.509 certificates**. No private key, external request, ML-DSA, real TLS handshake, performance or memory benchmark is involved.

`bounded` is a research validation model, not a production decoder or exact model of a third-party TLS library. Its strict trailing-data rejection is a local test policy. The one-million-byte repeated fixture only checks bounded output behavior, not a network denial-of-service or CPU bound. Fixed lengths and expected failure cases are asserted; compressed sizes can change with zlib versions.
