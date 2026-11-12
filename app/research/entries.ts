import firstEntry from "../../research/2026-11-08-tls-hybrid-binding.json";
import ikeEntry from "../../research/2026-11-09-ike-key-epochs.json";
import type { ResearchEntry } from "./types";
/** Explicit imports keep publishing deterministic; latest research appears first. */
export const researchEntries: ResearchEntry[] = [firstEntry, ikeEntry].sort((a, b) => b.date.localeCompare(a.date));
