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

export type NewsEdition = {
  date: string;
  total: number;
  topics: Record<string, NewsItem[]>;
};

export type EditionsPayload = {
  data: NewsEdition[];
  meta: {
    page: number;
    pageSize: number;
    totalDays: number;
    totalPages: number;
  };
};

export const NEWS_API = "https://api.wangyibiao.com";

export const coreCategories = ["pqc", "protocol", "standards", "security", "ai"] as const;

export const categoryLabels: Record<string, string> = {
  pqc: "后量子密码",
  protocol: "抗量子协议",
  standards: "标准动态",
  security: "网络安全",
  ai: "AI 前沿",
  industry: "产业动态",
  daily: "每日前沿",
};

export const categoryEnglish: Record<string, string> = {
  pqc: "POST-QUANTUM",
  protocol: "PROTOCOLS",
  standards: "STANDARDS",
  security: "SECURITY",
  ai: "ARTIFICIAL INTELLIGENCE",
};

export const categoryCovers: Record<string, string> = {
  pqc: "/news-covers/pqc.svg",
  protocol: "/news-covers/protocol.svg",
  standards: "/news-covers/standards.svg",
  security: "/news-covers/security.svg",
  ai: "/news-covers/ai.svg",
  industry: "/news-covers/ai.svg",
  daily: "/news-covers/pqc.svg",
};

export { coverFor } from "./keyword-cover";

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

export function formatEditionDate(value: string): string {
  const date = new Date(value + "T00:00:00+08:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export async function getNewsEditions(
  page = 1,
  pageSize = 3,
  category?: string,
): Promise<EditionsPayload> {
  const url = new URL("/api/news/editions", NEWS_API);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(Math.min(pageSize, 3)));
  if (category) url.searchParams.set("category", category);

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("News API returned " + response.status);
  }
  return (await response.json()) as EditionsPayload;
}

export async function getFeaturedNews(limit = 6): Promise<{
  edition_date: string | null;
  data: NewsItem[];
}> {
  const url = new URL("/api/news/featured", NEWS_API);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`News API returned ${response.status}`);
  }
  return (await response.json()) as { edition_date: string | null; data: NewsItem[] };
}

export async function getNewsDetail(slug: string): Promise<NewsItem | null> {
  const response = await fetch(
    NEWS_API + "/api/news/" + encodeURIComponent(slug),
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
