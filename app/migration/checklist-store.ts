import { migrationStages } from "../engineering/migration";
const key = "yibiao-pqc-migration-checklist-v1";
const event = "yibiao:checklist-change";
const valid = new Set(
  migrationStages.flatMap((s, i) => s.checks.map((_, j) => i + "-" + j)),
);
const initial = { checked: [] as string[], storage: true, ready: false };
let cached = initial,
  raw: string | null | undefined;
export function serverSnapshot() {
  return initial;
}
export function checklistSnapshot() {
  if (!cached.storage) return cached;
  try {
    const next = localStorage.getItem(key);
    if (next !== raw) {
      let parsed: unknown = [];
      try {
        parsed = JSON.parse(next || "[]");
      } catch {
        /* Discard corrupt settings. */
      }
      cached = {
        checked: Array.isArray(parsed)
          ? [
              ...new Set(
                parsed.filter((v) => typeof v === "string" && valid.has(v)),
              ),
            ]
          : [],
        storage: true,
        ready: true,
      };
      raw = next;
    }
  } catch {
    cached = { ...cached, storage: false, ready: true };
  }
  return cached;
}
export function subscribeChecklist(onChange: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) onChange();
  };
  window.addEventListener(event, onChange);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(event, onChange);
    window.removeEventListener("storage", storage);
  };
}
export function saveChecklist(checked: string[]) {
  const next = [...new Set(checked.filter((v) => valid.has(v)))];
  try {
    localStorage.setItem(key, JSON.stringify(next));
    raw = undefined;
  } catch {
    cached = { checked: next, storage: false, ready: true };
  }
  if (!cached.storage) cached = { checked: next, storage: false, ready: true };
  window.dispatchEvent(new Event(event));
}
