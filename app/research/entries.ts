import quicEntry from "../../research/2026-11-14-quic-pqc-flight-budget.json";
import firstEntry from "../../research/2026-11-08-tls-hybrid-binding.json";
import type { ResearchEntry } from "./types";
/** Explicit imports keep publishing deterministic; latest research appears first. */
export const researchEntries: ResearchEntry[] = [quicEntry, firstEntry].sort((a, b) => b.date.localeCompare(a.date));
