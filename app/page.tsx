import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

export const metadata: Metadata = {
  title: "量仔 · 探索与实践",
  description:
    "Yibiao 的好奇心实验室。密码工程、真实算法实验、每日新闻与角色故事。从数学原理到真实代码，让想法可以运行。",
};

export default function Home() {
  return <QuantumHome />;
}
