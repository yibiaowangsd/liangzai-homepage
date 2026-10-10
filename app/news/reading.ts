import { coreCategories, type NewsEdition } from "./news-api";

// Match the topic order on the edition page; never link to a different day.
export function nextEditionStory(edition: NewsEdition | undefined, slug: string, category?: string) {
  if (!edition) return null;
  const categories = category ? [category] : [...coreCategories, ...Object.keys(edition.topics).filter(key => !coreCategories.includes(key as (typeof coreCategories)[number]))];
  const stories = categories.flatMap(key => edition.topics[key] || []);
  const index = stories.findIndex(item => item.slug === slug);
  return index >= 0 ? stories[index + 1] || null : null;
}
