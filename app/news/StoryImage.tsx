import { keywordCover, type CoverStory } from "./keyword-cover";
import "./story-image.css";
export default function StoryImage({ item, eager = false }: { item: CoverStory; eager?: boolean }) {
  const cover = keywordCover(item);
  return <span className="story-image-frame"><img className="story-image" data-treatment="editorial" src={cover.image} alt="" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} aria-hidden="true" /><span className="story-keyword" aria-hidden="true">{cover.keyword}</span></span>;
}
