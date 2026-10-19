import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

const title = "量仔 · 前沿新闻与技术简报";
const description = "每日追踪后量子密码、抗量子迁移与协议、标准动态、网络安全、AI 前沿和 NGCC 公钥征集。阅读专题解读与快讯，查阅原始来源，也可进入密码实验室验证真实算法。";
const image = { url: "https://wangyibiao.com/assets/cinematic/vault-entrance-v2.webp", width: 1672, height: 941, alt: "蓝色光线照亮的密码之门 · 量仔前沿新闻与技术简报" };
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://wangyibiao.com/" },
  openGraph: { title, description, url: "https://wangyibiao.com/", siteName: "Yibiao · 量仔", locale: "zh_CN", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image.url] },
};

export default function Home() {
  return <QuantumHome />;
}
