import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

export const metadata: Metadata = {
  title: "量仔 LIANGZAI · 好奇无界，未来可期",
  description:
    "和量仔一起探索量子世界。体验动态量子场，翻开互动故事，走进密码学实验室与 PQC 武器库，让复杂科技触手可及。",
};

export default function Home() {
  return <QuantumHome />;
}
