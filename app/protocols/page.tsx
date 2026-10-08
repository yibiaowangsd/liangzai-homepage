import Link from "next/link";
import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { protocols } from "../engineering/protocols";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "协议工程",
  "TLS、TLCP、SSH、IKEv2 的 PQC 扩展、尺寸、抗降级与互通证据。",
  "/protocols",
);
export default function Page() {
  return (
    <EngineeringPage
      title="把算法装进协议"
      intro="从协商字段到认证绑定，从报文增长到回退策略。每条协议路径都保留来源、验证状态和尚未覆盖的边界。"
    >
      <div className="engineering-grid">
        {protocols.map((p) => (
          <article className="engineering-card" key={p.slug}>
            <span className="engineering-tag">{p.status}</span>
            <h2>
              <Link href={"/protocols/" + p.slug}>{p.name}</Link>
            </h2>
            <p>{p.intro}</p>
            <Link href={"/protocols/" + p.slug}>方案与验证记录 →</Link>
          </article>
        ))}
      </div>
      <Section title="证据怎么读">
        <p>
          TLS 与 SSH 来自本站的临时密钥、回环服务和下载脚本；TLCP 与 IKEv2
          是带来源的方案分析。算法功能验证、协议互通与生产部署是三个独立阶段。
        </p>
        <div className="engineering-actions">
          <Link href="/benchmarks">查看实测数据</Link>
          <Link href="/migration">规划一次迁移</Link>
          <Link href="/lab/hybrid">运行混合 KEM</Link>
        </div>
      </Section>
    </EngineeringPage>
  );
}
