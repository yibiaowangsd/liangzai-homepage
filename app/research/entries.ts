import recoveryEntry from "../../research/2026-11-15-tls-keyupdate-recovery.json";
import firstEntry from "../../research/2026-11-08-tls-hybrid-binding.json";
import type { ResearchEntry } from "./types";
/** Explicit imports keep publishing deterministic; latest research appears first. */
export const researchEntries: ResearchEntry[] = [recoveryEntry, firstEntry].sort((a, b) => b.date.localeCompare(a.date));
