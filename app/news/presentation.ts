import { parseTags, type NewsItem } from "./news-api.ts";
export const primaryCategories = ["pqc", "protocol", "standards"] as const;
export const topicTags = ["ML-KEM", "ML-DSA", "SLH-DSA", "TLS 1.3", "IKEv2", "SSH", "国密"] as const;
export function matchesTag(item: NewsItem, tag?: string) {
  if (!tag) return true;
  const text = [item.title, item.summary, ...parseTags(item.tags)].join(" ").toLowerCase();
  if (tag === "国密") return /国密|sm2|sm3|sm4|tlcp/i.test(text);
  return text.replaceAll(/[-\s]/g, "").includes(tag.toLowerCase().replaceAll(/[-\s]/g, ""));
}
export function articleSections(content: string, summary = "") {
  const sections = content.split(/^#{1,3}\s+/m);
  const observation = sections.find(section => /^(?:量仔观察|Yibiao 观察)/.test(section));
  const intro = observation ? observation.replace(/^[^\n]*\n?/, "").trim() : summary;
  const compiled = sections.find(section => /^(?:原文编译|原文要点|来源要点)/.test(section));
  const source = (compiled ? compiled.replace(/^[^\n]*\n?/, "") : content.split(/^#{1,3}\s+(?:量仔观察|Yibiao 观察)/m)[0]).trim();
  // Only a short source synopsis is displayed; link readers to the original for the full text.
  const excerpt = source.length <= 900 ? source : source.slice(0, 900).replace(/[^。！？.!?]*$/, "") + "…";
  return { intro, excerpt };
}
