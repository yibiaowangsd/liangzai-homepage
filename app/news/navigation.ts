import { coreCategories } from "./news-api.ts";

export type NewsSearchParams = {
  page?: string | string[];
  category?: string | string[];
  tag?: string | string[];
};

type NewsContext = { page: number; category?: string; tag?: string };

// Only carry supported listing state, never an arbitrary return URL.
export function parseNewsContext(params: NewsSearchParams): NewsContext {
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const page = Number(rawPage);
  const category = typeof params.category === "string" &&
    coreCategories.includes(params.category as (typeof coreCategories)[number])
    ? params.category
    : undefined;
  const tag = typeof params.tag === "string" && ["ML-KEM", "ML-DSA", "SLH-DSA", "TLS 1.3", "IKEv2", "SSH", "国密"].includes(params.tag) ? params.tag : undefined;
  return { page: Number.isSafeInteger(page) && page > 0 ? page : 1, category, tag };
}

export function newsListingHref({ page, category, tag }: NewsContext): string {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (category) query.set("category", category);
  if (tag) query.set("tag", tag);
  const suffix = query.toString();
  return suffix ? "/news?" + suffix : "/news";
}

export function newsStoryHref(slug: string, listingHref: string): string {
  // The query is explicit so refresh, new tabs, and browser history retain context.
  return "/news/" + encodeURIComponent(slug) + listingHref.slice("/news".length);
}
