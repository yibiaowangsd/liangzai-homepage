import Link from "next/link";
import {
  EngineeringPage,
  Section,
  Sources,
} from "../engineering/EngineeringPage";
import data from "../engineering/candidates.json";
import { pageMetadata } from "../site/metadata";
import Dashboard from "./Dashboard";
export const metadata = pageMetadata(
  "国密 × PQC",
  "国内候选算法接入看板、国密基线与 PQC 迁移解读。",
  "/gm-pqc",
);
export default function Page() {
  return (
    <EngineeringPage
      title="国密 × PQC"
      intro="一边是 SM2 / SM3 / SM4 和 TLCP 的现有协议语义，一边是国内 PQC 征集候选与标准化进展。把来源、接入状态和工程判断放在一起读。"
    >
      <div className="engineering-metrics">
        {[
          [data.totals.candidates, "候选算法"],
          [data.totals.parameters, "参数实例"],
          [data.totals.runnable, "当前可运行参数"],
          [data.totals.parameters - data.totals.runnable, "待接入参数"],
        ].map(([value, label]) => (
          <div className="engineering-metric" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <Section title="接入进度追踪">
        <Dashboard />
        <div className="engineering-actions">
          <a href="/downloads/ngcc-parameters.csv" download>
            下载 586 组参数记录 CSV
          </a>
          <a href="/pqc-practice/audit.html">完整构建记录</a>
          <a href="https://ngcc.dev/reports/index.html">安全报告索引</a>
        </div>
      </Section>
      <Section title="我如何解读这些数字">
        <p>
          可运行表示本快照中已登记并收录配对模块，功能与安全证据仍须逐项核对。没有收录源码、构建失败、依赖平台专有指令与接口不兼容应分别记录；任何一种都不能简单归纳为“算法不可用”。
        </p>
        <p>
          候选不是已获批国密标准。SM2 身份认证、SM3 摘要、SM4 对称保护与 PQC KEM
          /
          签名各自承担不同角色。组合设计需要说明消息编码、密钥派生、认证覆盖、参数协商和失败路径。
        </p>
        <p>
          下一步优先选择接口清晰、可复现、错误路径可测的候选，先完成独立算法验证，再进入
          TLCP 测试套件。KAT
          通过与安全报告结论分开跟踪；报告针对的归档提交也可能与浏览器修补版本不同。
        </p>
      </Section>
      <Section title="数据口径与更新">
        <p>
          本看板由 ngcc-catalog.json 与三个运行映射生成，构建时核对文件配对，CSV
          与页面同步。目录固定来源提交 <code>{data.revision}</code>
          ，不声称是征集活动的实时官方统计。
        </p>
        <p>
          协议路径：<Link href="/protocols/tlcp">TLCP + 国密 + PQC</Link>
          。笔记：<Link href="/notes/tlcp-mlkem">TLCP 接入 ML-KEM 的取舍</Link>
          。
        </p>
      </Section>
      <Sources
        items={[
          {
            label: "ngcc-harness 目录快照",
            href: `${data.source}/tree/${data.revision}`,
          },
          {
            label: "国家密码管理局公开资料",
            href: "https://www.oscca.gov.cn/",
          },
          {
            label: "ngcc.dev 原始报告",
            href: "https://ngcc.dev/reports/index.html",
          },
        ]}
      />
    </EngineeringPage>
  );
}
