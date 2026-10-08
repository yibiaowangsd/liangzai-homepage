import { pageMetadata } from "../site/metadata";
import StoryBook from "./StoryBook";

export const metadata = pageMetadata("星际漫游", "量仔与奶龙的插画故事，含逐页旁白与文字稿。", "/storybook", "storybook");

export default function StorybookPage() {
  return <StoryBook />;
}
