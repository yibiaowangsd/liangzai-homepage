import Link from "next/link";
import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import snapshot from "../engineering/projects.json";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "公开作品",
  "公开 GitHub 项目、浏览器算法实验与可复现的协议测试。",
  "/projects",
);
const descriptions: Record<
  string,
  { result: string; metric: string; status: string; href?: string }
> = {
  "liangzai-homepage": {
    result: "算法实验、协议分析和复现数据汇集成个人工程站点。",
    metric: "119 个候选 / 586 组参数",
    status: "个人维护 · 可运行",
    href: "/gm-pqc",
  },
  PQMagic: {
    result:
      "公开分支增加 OpenSSL provider 模块框架与构建说明；提交记录可核对。",
    metric: "2 个算法入口：ML-KEM-512 / ML-DSA-65",
    status: "个人 fork · 原型",
    href: "/records",
  },
  Tongsuo: {
    result: "保留公开密码库分支，作为国密协议学习与实现阅读入口。",
    metric: "1 个公开 fork",
    status: "公开 fork · 无独立实测成果声明",
  },
  pqcrypto: {
    result: "保留 Rust 后量子密码绑定的公开分支，用于跨语言接口学习。",
    metric: "1 个公开 fork",
    status: "公开 fork · 无独立实测成果声明",
  },
};
export default function Page() {
  return (
    <EngineeringPage
      title="公开作品"
      intro="按公开仓库和可复现实验整理。fork、原型与已运行成果分别标注，数字都能回到参数、提交或测试报告。"
    >
      <div className="engineering-grid">
        {snapshot.repositories.map((repo) => {
          const d = descriptions[repo.name];
          return (
            <article className="engineering-card" key={repo.name}>
              <span className="engineering-tag">{d.status}</span>
              <h2>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  {repo.name} ↗
                </a>
              </h2>
              <p>{d.result}</p>
              <strong>{d.metric}</strong>
              <p>
                <small>
                  {repo.language || "语言未标注"} · 最后推送{" "}
                  {repo.pushed_at.slice(0, 10)} · {repo.stargazers_count} stars
                </small>
              </p>
              {d.href && <Link href={d.href}>查看工程记录 →</Link>}
            </article>
          );
        })}
      </div>
      <Section title="自建测试环境的成果">
        <TableEvidence />
        <div className="engineering-actions">
          <Link href="/benchmarks">原始数据与复现脚本</Link>
          <Link href="/lab/hybrid">X25519 + ML-KEM 可视化</Link>
        </div>
      </Section>
      <p>
        <small>
          GitHub 快照：{snapshot.capturedAt.slice(0, 10)}。PQMagic 分支相对上游
          ahead {snapshot.pqmagicCompare.ahead_by} / behind{" "}
          {snapshot.pqmagicCompare.behind_by}
          ；这些是分支差异，不是上游合并贡献数量。公司项目仅在个人经历中概括为抗量子
          TLS/TLCP 协议改造、抗量子算法库。
        </small>
      </p>
    </EngineeringPage>
  );
}
function TableEvidence() {
  return (
    <div className="engineering-grid">
      <article className="engineering-card">
        <h3>TLS 1.3 三方案</h3>
        <p>经典、混合、纯 PQC 协商与认证在本地完成 CA 校验的握手。</p>
        <strong>3 组方案 / 6 项客户端互通</strong>
      </article>
      <article className="engineering-card">
        <h3>SSH 三种 KEX</h3>
        <p>使用固定测试主机密钥完成用户认证与远程测试命令。</p>
        <strong>3 组 KEX / OpenSSH 10.0p2</strong>
      </article>
    </div>
  );
}
