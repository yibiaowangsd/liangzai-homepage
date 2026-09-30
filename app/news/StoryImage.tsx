import { coverFor, type NewsItem } from "./news-api";

export default function StoryImage({
  item,
  eager = false,
}: {
  item: Pick<NewsItem, "cover_image" | "category">;
  eager?: boolean;
}) {
  const src = coverFor(item);
  // Bundled category art can fill its frame; source graphics must not lose text or logos.
  const editorial = /^(?:https:\/\/wangyibiao\.com)?\/news-covers\/[^/]+\.svg$/.test(src);

  return (
    <img
      className="story-image"
      data-treatment={editorial ? "editorial" : "source"}
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      aria-hidden="true"
    />
  );
}
