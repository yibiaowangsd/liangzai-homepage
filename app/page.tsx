import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

export const metadata: Metadata = {
  title: "量仔 LIANGZAI · 小小量仔，大有可为",
  description:
    "欢迎进入量仔的量子宇宙。认识量子星守护者，翻开互动动画书，探索 PQC 武器库，让好奇心连接每一种可能。",
};

export default function Home() {
  return <QuantumHome />;
}
