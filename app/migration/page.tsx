import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
import Checklist from "./Checklist";
export const metadata = pageMetadata(
  "PQC 迁移指南",
  "资产盘点、优先级、灰度与回退，密码敏捷和零停机部署检查表。",
  "/migration",
);
export default function Page() {
  return (
    <EngineeringPage
      title="PQC 迁移指南"
      intro="迁移先从资产、身份和部署约束开始，再选择算法。用阶段退出条件组织一次能观察、能复现、能恢复的变更。"
    >
      <div className="engineering-actions">
        <a href="/downloads/pqc-migration-checklist.md" download>
          下载完整检查表 Markdown
        </a>
        <a href="/downloads/crypto-inventory.csv" download>
          下载资产台账 CSV 模板
        </a>
        <a href="/benchmarks">先复现协议基线</a>
      </div>
      <Checklist />
      <Section title="如何使用零停机检查表">
        <p>
          零停机是需要演练与监控证明的部署目标。双栈能力、滚动替换、连接排空、旧证书恢复与负载均衡并不能保证所有协议或长连接都无中断；先按实际生命周期验证，再约定可接受的中断预算。
        </p>
        <p>
          不要把可回退理解为允许攻击者触发回退。每次策略放宽都应来自管理面，保留负责人、有效期和最低安全要求；客户端自动重试不应静默更换为经典组。
        </p>
      </Section>
    </EngineeringPage>
  );
}
