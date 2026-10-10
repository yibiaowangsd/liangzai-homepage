// Edition dates are calendar dates in Beijing, never browser-local timestamps.
export function isEditionDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function shiftEditionDate(value: string, days: number): string {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function shiftEditionMonth(value: string, months: number): string {
  const date = new Date(value + "T00:00:00Z");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(date);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  date.setUTCDate(Math.min(day, last.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

export function monthCells(month: string): (string | null)[] {
  const first = month + "-01";
  const offset = (new Date(first + "T00:00:00Z").getUTCDay() + 6) % 7;
  const end = shiftEditionDate(shiftEditionMonth(first, 1), -1);
  const length = Number(end.slice(-2));
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= length ? month + "-" + String(day).padStart(2, "0") : null;
  });
}

export function monthLabel(month: string): string {
  return Number(month.slice(0, 4)) + "年" + Number(month.slice(5)) + "月";
}
