import dailyEntry from "../../research/2026-11-13-external-psk-qkd-tls-lifecycle.json";
import firstEntry from "../../research/2026-11-08-tls-hybrid-binding.json";
import type { ResearchEntry } from "./types";
/** Explicit imports keep publishing deterministic; latest research appears first. */
export const researchEntries: ResearchEntry[] = [dailyEntry, firstEntry].sort((a, b) => b.date.localeCompare(a.date));
