export type NewsItem = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content?: string;
  category: string;
  tags: string | null;
  source_name: string | null;
  source_url: string | null;
  cover_image: string | null;
  published_at: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
};

export const NEWS_API = "https://api.wangyibiao.com";

export const categoryLabels: Record<string, string> = {
  pqc: "后量子密码",
  protocol: "抗量子协议",
  standards: "标准动态",
  security: "网络安全",
  ai: "AI 前沿",
  industry: "产业动态",
  daily: "每日前沿",
};

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const value = JSON.parse(tags);
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  } catch {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
}

export function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export async function getNewsList(category?: string): Promise<NewsItem[]> {
  const url = new URL("/api/news", NEWS_API);
  url.searchParams.set("limit", "100");
  if (category) url.searchParams.set("category", category);

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`News API returned ${response.status}`);
  }

  const payload = (await response.json()) as { data?: NewsItem[] };
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getNewsDetail(slug: string): Promise<NewsItem | null> {
  const response = await fetch(
    `${NEWS_API}/api/news/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`News API returned ${response.status}`);
  }
  return (await response.json()) as NewsItem;
}
