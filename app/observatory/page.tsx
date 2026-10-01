import type { Metadata } from "next";
import Observatory from "./Observatory";

export const metadata: Metadata = {
  title: "灵感观测站 · 量仔",
  description:
    "以数学为笔，写一片星空。探索引力、共振与晶格，亲手调节光场、保存画面、分享你的生成式创作。",
};

export default function Page() {
  return <Observatory />;
}
