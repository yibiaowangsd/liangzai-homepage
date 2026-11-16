import overview from "./data/overview.json";
import standards from "./data/standard.json";
import components from "./data/components.json";
import policies from "./data/policies.json";
import articles from "./data/articles.json";

export const trackingRoot = "/tracking";
export const sourceRoot = "https://pqc.tencent.com";
export const catalogDate = "2026-11-16";

type ContentTag =
  | "a" | "article" | "aside" | "br" | "caption" | "code" | "dd" | "details"
  | "div" | "dl" | "dt" | "em" | "h2" | "h3" | "h4" | "header" | "li"
  | "nav" | "ol" | "p" | "section" | "small" | "span" | "strong" | "summary"
  | "sup" | "table" | "tbody" | "td" | "th" | "thead" | "time" | "tr" | "ul";

export type ContentNode = string | {
  tag: ContentTag;
  children: ContentNode[];
  id?: string;
  href?: string;
  style?: string;
  title?: string;
  scope?: string;
  colspan?: string;
  rowspan?: string;
  datetime?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-current"?: "page";
  "aria-hidden"?: "true";
  region?: string;
  scene?: string;
};

export type TrackingPage = {
  title: string;
  description: string;
  nodes: ContentNode[];
  meta?: ContentNode[];
  toc?: { id: string; label: string }[];
  regions?: { id: string; title: string }[];
  scenes?: { id: string; title: string; count: number }[];
  benchmark?: { library: string; parameters: string[] };
};

export const catalog = { ...overview, ...standards, ...components, ...policies, ...articles } as Record<string, TrackingPage>;
export const sections = [
  { path: "", name: "总览" },
  { path: "algorithms", name: "标准资料" },
  { path: "products", name: "组件选型" },
  { path: "performance", name: "性能评估" },
  { path: "policies", name: "政策法规" },
  { path: "articles", name: "文章" },
];

export function findPage(path: string) {
  return Object.hasOwn(catalog, path) ? catalog[path] : undefined;
}

export function trackingHref(path: string) {
  return path ? trackingRoot + "/" + path : trackingRoot;
}

export function sourceHref(path: string, locale = "zh") {
  return sourceRoot + "/" + locale + "/" + (path ? path + "/" : "");
}

export function sectionPath(path: string) {
  const group = path.split("/")[0];
  return group === "protocols" || group === "resources" ? "algorithms" : group;
}

const inlineTags = new Set<ContentTag>(["a", "code", "em", "small", "span", "strong", "sup", "time"]);

function contentText(nodes: ContentNode[]): string {
  return nodes.map(node => {
    if (typeof node === "string") return node;
    const label = contentText(node.children);
    return inlineTags.has(node.tag) ? label : " " + label + " ";
  }).join("");
}

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[‐‑‒–—]/g, "-").trim();
}

let searchIndex: { path: string; title: string; lead: string; body: string; page: TrackingPage }[] | undefined;

export function searchTracking(query: string) {
  const exact = normalize(query);
  const words = exact.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  searchIndex ??= Object.entries(catalog).map(([path, page]) => ({
    path,
    page,
    title: normalize(page.title),
    lead: normalize(page.description + " " + path.replaceAll("/", " ")),
    body: normalize(contentText([...(page.meta ?? []), ...page.nodes])),
  }));
  return searchIndex.flatMap(({ path, page, title, lead, body }) => {
    const combined = [title, lead, body].join(" ");
    if (!words.every(word => combined.includes(word))) return [];
    const score = (title === exact ? 40 : 0)
      + words.reduce((sum, word) => sum + (title.includes(word) ? 8 : lead.includes(word) ? 3 : 1), 0);
    return [{ path, title: page.title, description: page.description, score }];
  }).sort((a, b) => b.score - a.score);
}
