import type { NewsItem } from "../news/news-api";

export function selectHomeSignals(items: NewsItem[] | undefined) {
  if (!Array.isArray(items)) return [];
  return ["pqc", "protocol", "standards"].flatMap(category => items.find(item => item && item.category === category && typeof item.slug === "string" && typeof item.title === "string") || []);
}

/** Keep the homepage excerpt short in the HTML, including with CSS disabled. */
export function signalSummary(summary: string | null, limit = 64) {
  if (!summary?.trim()) return "阅读原始来源与完整编译。";
  const sentence = summary.trim().match(/^[\s\S]*?[。！？](?:[”’」])?/)?.[0] || summary.trim();
  const characters = Array.from(sentence);
  return characters.length > limit ? characters.slice(0, limit - 1).join("") + "…" : sentence;
}
