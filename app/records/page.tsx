import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import snapshot from "../engineering/projects.json";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "公开记录",
  "可核对的开源维护记录，以及演讲和论文收录边界。",
  "/records",
);
export default function Page() {
  return (
    <EngineeringPage
      title="公开记录"
      intro="只收录可以公开、能链接到原始记录的内容。个人分支维护和上游合并贡献分开呈现。"
    >
      <Section title="开源与个人分支维护">
        <div className="engineering-grid">
          <article className="engineering-card">
            <h3>本站开源维护</h3>
            <p>浏览器算法实验、参数索引、公开协议分析与复现工具。</p>
            <a
              href="https://github.com/yibiaowangsd/liangzai-homepage"
              target="_blank"
              rel="noreferrer"
            >
              仓库与提交记录 ↗
            </a>
          </article>
          <article className="engineering-card">
            <h3>PQMagic 个人 fork</h3>
            <p>
              公开分支新增独立 OpenSSL provider 框架，包含 ML-KEM-512 /
              ML-DSA-65 入口。原型支持范围以代码和构建说明为准。
            </p>
            <a
              href="https://github.com/yibiaowangsd/PQMagic/pull/1"
              target="_blank"
              rel="noreferrer"
            >
              个人分支 PR #1 ↗
            </a>
          </article>
        </div>
        <ul>
          {snapshot.pqmagicCompare.commits
            .filter((c) => !c.message.startsWith("Merge "))
            .map((c) => (
              <li key={c.sha}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.message.split("\n")[0]}
                </a>{" "}
                · <code>{c.sha.slice(0, 8)}</code>
              </li>
            ))}
        </ul>
        <p>
          <small>
            核对日期 {snapshot.capturedAt.slice(0, 10)}。分支提交与 fork
            内合并不计作上游已合并贡献；尚未收录可核对的 PQMagic 上游合并记录。
          </small>
        </p>
      </Section>
      <Section title="演讲">
        <p>尚未收录带公开活动页、幻灯片或录播链接的记录。</p>
      </Section>
      <Section title="论文">
        <p>尚未收录带正式公开出版链接且已确认可展示的记录。</p>
      </Section>
      <Section title="公司经历的公开边界">
        <p>
          本人工作仅概括为抗量子 TLS/TLCP
          协议改造、抗量子算法库等工作。站点方案与测量使用公开资料、自建测试环境和临时数据，不发布内部项目名称、客户、部署细节或性能数字。
        </p>
      </Section>
    </EngineeringPage>
  );
}
