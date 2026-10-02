"use client";
import { useEffect, useRef, useState } from "react";
import "./story-image.css";
import { keywordCover, sourceCover, type CoverStory } from "./keyword-cover";

export default function StoryImage({ item, eager = false }: { item: CoverStory; eager?: boolean }) {
  const image = useRef<HTMLImageElement>(null);
  const source = sourceCover(item), fallback = keywordCover(item);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const useSource = !!source && source !== failedSource;
  useEffect(() => {
    // A source can fail before hydration attaches onError; reconcile cached failures too.
    const frame = requestAnimationFrame(() => {
      if (useSource && image.current?.complete && image.current.naturalWidth === 0) setFailedSource(source);
    });
    return () => cancelAnimationFrame(frame);
  }, [source, useSource]);
  return <span className="story-image-frame">
    <img ref={image} className="story-image" data-treatment={useSource ? "source" : "editorial"}
      src={useSource ? source : fallback.image} alt="" loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined} aria-hidden="true"
      onError={() => { if (useSource) setFailedSource(source); }} />
    {!useSource && <span className="story-keyword" aria-hidden="true">{fallback.keyword}</span>}
  </span>;
}
