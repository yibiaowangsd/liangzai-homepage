import type { Metadata } from "next";
import StoryBook from "./StoryBook";

export const metadata: Metadata = {
  title: "星际漫游 量子星守护者",
  description: "一个睡前故事：翻开绘本，和量仔、奶龙（也就是奶蛙）一起迎战 Shor 大魔王。",
};

export default function StorybookPage() {
  return <StoryBook />;
}
