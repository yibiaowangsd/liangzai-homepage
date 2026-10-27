export type TopicTracking = { followed: boolean; seen: Record<string, string> };
export const TRACKING_KEY = 'liangzai-topic-tracking-v1';
export function readTracking(value: string | null): Record<string, TopicTracking> {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, item]) => /^[a-z0-9-]+$/.test(key) && item && typeof item === 'object').map(([key, item]) => {
      const row = item as Partial<TopicTracking>;
      const seen = row.seen && typeof row.seen === 'object' ? Object.fromEntries(Object.entries(row.seen).filter(([id, version]) => /^[a-f0-9]{24}$/.test(id) && typeof version === 'string' && /^[a-f0-9]{64}$/.test(version))) : {};
      return [key, { followed: row.followed === true, seen }];
    }));
  } catch { return {}; }
}
