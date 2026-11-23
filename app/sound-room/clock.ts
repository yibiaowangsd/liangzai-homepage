export const durations = [5, 15, 25, 45] as const;

export function remainingUntil(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

export function displayTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return [Math.floor(seconds / 60), seconds % 60].map(n => String(n).padStart(2, "0")).join(":");
}
