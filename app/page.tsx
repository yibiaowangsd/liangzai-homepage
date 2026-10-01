import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";
import NewsGate from "./experience/NewsGate";

export const metadata: Metadata = {
  title: "量仔 · 让想象穿越边界",
  description:
    "Yibiao 与量仔的数字宇宙。创作一片星空，阅读星际故事，走近密码原理，在真实算法实验与前沿新闻中继续探索。",
};

export default function Home() {
  return (
    <>
      <NewsGate />
      <QuantumHome />
    </>
  );
}
