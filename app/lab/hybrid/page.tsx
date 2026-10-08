import Link from "next/link";
import { EngineeringPage, Section } from "../../engineering/EngineeringPage";
import { pageMetadata } from "../../site/metadata";
import Demo from "./Demo";
export const metadata = pageMetadata(
  "混合 KEM 实验",
  "真实 X25519 + ML-KEM-768 → HKDF，可视化完整本地流程与篡改实验。",
  "/lab/hybrid",
  "lab",
);
export default function Page() {
  return (
    <EngineeringPage
      title="X25519 + ML-KEM → KDF"
      intro="两个秘密，两个独立计算的端点，一次明确的上下文绑定。逐步运行真实算法，观察公开材料如何传递、秘密如何组合。"
      eyebrow="密码实验室 · 混合密钥协商"
    >
      <Demo />
      <Section title="这条派生路径的含义">
        <p>
          固定长度组合 32 B X25519 秘密与 32 B ML-KEM 秘密，再执行
          HKDF-SHA-256；公开 transcript 的摘要作为
          salt，实验标识、算法和角色作为 info。每个端点使用自己观察到的
          transcript 独立计算。
        </p>
        <p>
          这是教学用密钥计划，并非 TLS 1.3 的完整实现、标准 ECDHE-MLKEM
          组合器或生产安全证明。真实协议还必须认证身份、绑定完整协商、处理全零
          X25519、错误码、抗降级、重放与
          Finished。此处通过同一浏览器中的比较演示密钥确认，未实现网络身份认证。
        </p>
        <p>
          密文篡改展示 ML-KEM 的隐式拒绝；上下文篡改展示 KDF
          的域隔离。匹配失败必须停止会话，不能退回任一单独秘密。
        </p>
        <div className="engineering-actions">
          <Link href="/protocols/tls">进入 TLS 协议路径</Link>
          <a href="/lab/security">安全、隐私与构建来源</a>
          <a href="/pqc-practice">返回主实验室</a>
        </div>
      </Section>
    </EngineeringPage>
  );
}
