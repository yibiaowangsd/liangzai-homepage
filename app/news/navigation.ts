import { coreCategories } from "./news-api";
import { isEditionDate } from "./calendar";

export type NewsSearchParams = {
  page?: string | string[];
  category?: string | string[];
  date?: string | string[];
};

type NewsContext = { page: number; category?: string; date?: string };

// Only carry supported listing state, never an arbitrary return URL.
export function parseNewsContext(params: NewsSearchParams): NewsContext {
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const page = Number(rawPage);
  const category = typeof params.category === "string" &&
    coreCategories.includes(params.category as (typeof coreCategories)[number])
    ? params.category
    : undefined;
  const date = isEditionDate(params.date) ? params.date : undefined;
  return { page: Number.isSafeInteger(page) && page > 0 ? page : 1, category, date };
}

export function newsListingHref({ page, category, date }: NewsContext): string {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  else if (page > 1) query.set("page", String(page));
  if (category) query.set("category", category);
  const suffix = query.toString();
  return suffix ? "/news?" + suffix : "/news";
}

export function newsStoryHref(slug: string, listingHref: string): string {
  // The query is explicit so refresh, new tabs, and browser history retain context.
  return "/news/" + encodeURIComponent(slug) + listingHref.slice("/news".length);
}
