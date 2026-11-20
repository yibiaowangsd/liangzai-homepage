import ikePpkEntry from "../../research/2026-11-20-ike-ppk-lineage.json";
import qkdPoolEntry from "../../research/2026-11-19-qkd-key-pool-budget.json";
import rejectionEntry from "../../research/2026-11-18-mlkem-rejection.json";
import compressionEntry from "../../research/2026-11-17-certificate-compression.json";
import sshEntry from "../../research/2026-11-16-ssh-binding.json";
import ikeEntry from "../../research/2026-11-09-ike-key-epochs.json";
import pskEntry from "../../research/2026-11-13-external-psk-qkd-tls-lifecycle.json";
import quicEntry from "../../research/2026-11-14-quic-pqc-flight-budget.json";
import recoveryEntry from "../../research/2026-11-15-tls-keyupdate-recovery.json";
import firstEntry from "../../research/2026-11-08-tls-hybrid-binding.json";
import type { ResearchEntry } from "./types";
/** Explicit imports keep publishing deterministic; latest research appears first. */
export const researchEntries: ResearchEntry[] = [ikePpkEntry, qkdPoolEntry, rejectionEntry, compressionEntry, sshEntry, recoveryEntry, quicEntry, pskEntry, ikeEntry, firstEntry].sort((a, b) => b.date.localeCompare(a.date));
