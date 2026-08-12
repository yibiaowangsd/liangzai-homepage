import type { Metadata } from "next";
import StoryBook from "./StoryBook";

export const metadata: Metadata = {
  title: "量子星守护者 · 量仔动画书",
  description: "翻开童话绘本，和量仔、奶龙一起迎战 Shor 大魔王。",
};

export default function StorybookPage() {
  return <StoryBook />;
}
