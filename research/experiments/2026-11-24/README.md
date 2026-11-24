# SSH composite host public-key fingerprints

The fixture contains **only public-key blobs** transcribed from the two “Public key” hexdumps in [draft-ietf-sshm-composite-sigs-01, Appendix A](https://datatracker.ietf.org/doc/html/draft-ietf-sshm-composite-sigs-01#appendix-A). Use the [version-pinned text](https://www.ietf.org/archive/id/draft-ietf-sshm-composite-sigs-01.txt), select only each block between the Public key and Private key headings, decode hex columns (ignore offsets and ASCII), and independently check sequential offsets. Compare the SHA-256 of the resulting byte stream with Section 6. The SSH public-key blob has two RFC 4251 strings (32-bit big-endian byte length and contents); remove both prefixes and the algorithm field only for the explicitly incorrect raw-only baseline.

Run from the repo root: `node --test tests/ssh-composite-host-identity.test.mjs`. This experiment does not generate keys, verify signatures, run SSH connections or publish DNS records.
