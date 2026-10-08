import Link from "next/link";
import { EngineeringPage } from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "协议尺寸工具",
  "ClientHello、证书链、IKE 分片与标准算法参数。",
  "/tools",
);
export default function Page() {
  return (
    <EngineeringPage
      title="协议尺寸工具"
      intro="从标准材料长度开始，按显式模型估算协议开销。选择参数时先确认你需要的是材料字节、DER 体积还是线路字节。"
    >
      <div className="engineering-grid">
        {[
          {
            href: "/tools/packet-size",
            title: "报文尺寸计算器",
            text: "选择协商组、证书算法与 MTU，估算 ClientHello、TLS Certificate 与 IKE 加密分片。",
          },
          {
            href: "/tools/certificates",
            title: "证书体积对比",
            text: "以相同元数据和链长度，对比 RSA、ECDSA 与 ML-DSA；附两种真实测试证书。",
          },
          {
            href: "/parameters",
            title: "参数速查表",
            text: "18 组 NIST 标准参数：公钥、私钥、密文、签名长度与 CSV 下载。",
          },
          {
            href: "/lab/hybrid",
            title: "混合 KEM 演示",
            text: "真实运行 X25519 + ML-KEM-768，观察组合、上下文绑定与派生密钥一致性。",
          },
        ].map((item) => (
          <article key={item.href} className="engineering-card">
            <h2>
              <Link href={item.href}>{item.title}</Link>
            </h2>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </EngineeringPage>
  );
}
