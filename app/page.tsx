import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

export const metadata: Metadata = {
  title: "探索首页 量仔 LIANGZAI",
  description:
    "和量仔一起探索量子世界。穿越量子之门，阅读互动故事，探索密码图鉴，了解我的经历，让复杂科技触手可及。",
};

export default function Home() {
  return <QuantumHome />;
}
