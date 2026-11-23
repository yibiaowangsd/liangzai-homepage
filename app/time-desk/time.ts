export const cities = [
  { id: 'Asia/Shanghai', name: '北京', code: 'BJS' },
  { id: 'Asia/Tokyo', name: '东京', code: 'TYO' },
  { id: 'Asia/Singapore', name: '新加坡', code: 'SIN' },
  { id: 'Asia/Kolkata', name: '新德里', code: 'DEL' },
  { id: 'Asia/Dubai', name: '迪拜', code: 'DXB' },
  { id: 'Europe/London', name: '伦敦', code: 'LON' },
  { id: 'Europe/Berlin', name: '柏林', code: 'BER' },
  { id: 'America/New_York', name: '纽约', code: 'NYC' },
  { id: 'America/Los_Angeles', name: '洛杉矶', code: 'LAX' },
  { id: 'Australia/Sydney', name: '悉尼', code: 'SYD' },
  { id: 'Pacific/Auckland', name: '奥克兰', code: 'AKL' },
] as const;

export type City = (typeof cities)[number];
export const stepMinutes = 15;
export const dayMinutes = 1440;
const minuteMs = 60000;
const hourMs = 60 * minuteMs;
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
const formatters = new Map<string, Intl.DateTimeFormat>();

export function utcDateOf(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function utcStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(+date) && utcDateOf(date) === value ? +date : NaN;
}

export function timeLabel(minute: number) {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function localAt(base: number, minute: number, timeZone: City['id']) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      calendar: 'iso8601', numberingSystem: 'latn', timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
    });
    formatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(base + minute * minuteMs).map(p => [p.type, p.value]));
  const date = `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`;
  const start = utcStart(date);
  const weekday = new Date(start).getUTCDay();
  const localMinute = Number(parts.hour) * 60 + Number(parts.minute);
  const offset = parts.timeZoneName.replace('GMT', 'UTC');
  return {
    date, weekday: weekdays[weekday], minute: localMinute,
    offset: offset === 'UTC' ? 'UTC+00:00' : offset,
    dayDelta: (start - base) / (24 * hourMs),
    working: weekday >= 1 && weekday <= 5 && localMinute >= 9 * 60 && localMinute < 18 * 60,
  };
}

export function buildSchedule(base: number, selected: readonly City[]) {
  const allRows = selected.map(city => {
    const slots = Array.from({ length: dayMinutes / stepMinutes }, (_, i) => localAt(base, i * stepMinutes, city.id));
    const offsets = [...new Set(slots.map(slot => slot.offset))];
    return { city, slots, offsets };
  });
  const overlap = Array.from({ length: dayMinutes / stepMinutes }, (_, i) =>
    allRows.length > 0 && allRows.every(row => row.slots[i].working));
  const windows: { start: number; end: number }[] = [];
  for (let i = 0; i < overlap.length; i++) {
    if (!overlap[i]) continue;
    const last = windows.at(-1);
    if (last?.end === i * stepMinutes) last.end += stepMinutes;
    else windows.push({ start: i * stepMinutes, end: (i + 1) * stepMinutes });
  }
  return { allRows, overlap, windows };
}

export function dayNote(delta: number) {
  if (delta === -1) return '前一日';
  if (delta === 1) return '次日';
  return '同日';
}
