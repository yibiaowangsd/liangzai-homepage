import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";

const title = "Yibiao · 后量子密码工程与实验";
const description = "Yibiao 的个人技术实践：TLS / TLCP、SSH 与 IKE 抗量子协议、ML-KEM 混合密钥协商、密码敏捷，以及可在浏览器运行的算法实验与前沿技术简报。";
const image = { url: "https://wangyibiao.com/share/default.png", width: 1200, height: 630, alt: "Yibiao · 后量子密码工程与实验" };
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://wangyibiao.com/" },
  openGraph: { title, description, url: "https://wangyibiao.com/", siteName: "Yibiao", locale: "zh_CN", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image.url] },
};

export default async function Home() {
  const person = { "@context": "https://schema.org", "@type": "Person", "@id": "https://wangyibiao.com/#person", name: "Yibiao", alternateName: "Wang Yibiao", url: "https://wangyibiao.com/about", sameAs: ["https://github.com/yibiaowangsd"], worksFor: { "@type": "Organization", name: "中电信量子集团" }, knowsAbout: ["Post-quantum cryptography", "Cryptographic engineering", "Security protocols"] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} /><QuantumHome /></>;
}
