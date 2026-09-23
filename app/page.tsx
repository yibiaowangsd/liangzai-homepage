import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

export const metadata: Metadata = {
  title: "量仔 LIANGZAI · 让想象，穿越边界",
  description:
    "和量仔一起探索量子世界。穿越量子之门，阅读互动故事，探索 PQC 武器库，认识量仔背后的人，让复杂科技触手可及。",
};

export default function Home() {
  return <QuantumHome />;
}
