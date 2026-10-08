import Link from "next/link";
import { EngineeringPage, Section } from "../../engineering/EngineeringPage";
import { pageMetadata } from "../../site/metadata";
import Calculator from "./Calculator";
export const metadata = pageMetadata(
  "报文尺寸计算器",
  "估算 ClientHello、证书链和 IKE 加密分片，公开公式与假设。",
  "/tools/packet-size",
);
export default function Page() {
  return (
    <EngineeringPage
      title="报文尺寸计算器"
      intro="选择算法并调整证书链、基础扩展与 MTU。所有计算在浏览器中完成；结果是尺寸预算，实际连接请用抓包和实现日志校准。"
    >
      <Calculator />
      <Section title="计算假设">
        <ul>
          <li>
            ClientHello 只发送一个 key_share：基础长度 + 4 B 扩展头 + 2 B
            向量长度 + 2 B 组号 + 2 B 公钥长度 + 材料。其余
            supported_groups、SNI、ALPN 等由基础长度涵盖。记录模型以 16,384 B
            分块、每块 5 B 头计算，不含 TCP/IP。
          </li>
          <li>
            Certificate：4 B 握手头 + 1 B 空请求上下文 + 3 B 列表长度 + 每张（3
            B 长度 + DER + 2 B 空扩展长度）。不含加密记录头、标签和 padding。
          </li>
          <li>
            证书公钥及签名按同算法链估算，ECDSA 采用 72 B DER
            签名上界。实际叶证书与签发者算法可以不同；DER
            元数据默认值只是输入假设。
          </li>
          <li>
            IKE 使用 RFC 7383 加密 SKF 模型、AES-GCM 显式 IV 8 B / 标签 16 B、4
            B 对齐及 pad-length。加入 IP、UDP、IKE 与可选 non-ESP marker；不包括
            IP/TCP 隧道外层、额外扩展头和其他 transform。
          </li>
          <li>
            IKE 分片协商、加密和认证成立后才适用此模型。初始未加密 IKE_SA_INIT
            不能据此得到保护；0 B 输入显示 0 个分片。
          </li>
          <li>
            512 / 1024 的 X25519
            混合选项仅用于材料预算，未声明为本站已验证的标准 TLS 组。
          </li>
        </ul>
        <div className="engineering-actions">
          <Link href="/tools/certificates">证书模型细节</Link>
          <Link href="/benchmarks">对照实测报文</Link>
        </div>
      </Section>
    </EngineeringPage>
  );
}
