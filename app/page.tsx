import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";
import NewsGate from "./experience/NewsGate";

export const metadata: Metadata = {
  title: "量仔 · 好奇心不设限",
  description:
    "Yibiao 的好奇心实验室。密码工程、数学艺术、星际故事与真实算法实验。在严谨的数学里找浪漫，在真实的代码里造世界。",
};

export default function Home() {
  return (
    <>
      <NewsGate />
      <QuantumHome />
    </>
  );
}
