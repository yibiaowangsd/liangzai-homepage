import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "联系与订阅",
  "联系 Yibiao，订阅工程笔记和前沿新闻 RSS。",
  "/contact",
);
export default function Page() {
  return (
    <EngineeringPage
      title="联系与订阅"
      intro="欢迎交流 PQC 算法接入、TLS/TLCP、SSH、IKEv2 与密码敏捷。公开技术问题可以附上版本、参数和可复现的最小例子。"
    >
      <Section title="公开联系">
        <a href="mailto:yibiao_wang@foxmail.com">yibiao_wang@foxmail.com</a>
        <p>
          请使用测试材料描述问题；公司案例只讨论可公开的概括，不通过本站征集业务密钥或内部数据。
        </p>
        <a
          href="https://github.com/yibiaowangsd/liangzai-homepage/issues"
          target="_blank"
          rel="noreferrer"
        >
          GitHub 公开问题入口 ↗
        </a>
      </Section>
      <div className="engineering-grid">
        <article className="engineering-card">
          <h2>工程笔记 RSS</h2>
          <p>第一人称长文，关注算法验证、协议取舍与测量方法。</p>
          <a href="/notes/rss.xml">/notes/rss.xml</a>
        </article>
        <article className="engineering-card">
          <h2>前沿新闻 RSS</h2>
          <p>聚合公开报道、标准动态与短评，和原创笔记分开。</p>
          <a href="/rss.xml">/rss.xml</a>
        </article>
        <article className="engineering-card">
          <h2>工程周报</h2>
          <p>浏览站点更新与实验摘要；自动邮件投递尚未开通。</p>
          <a href="/weekly">周报页面与邮件入口 →</a>
        </article>
        <article className="engineering-card">
          <h2>安全问题</h2>
          <p>按安全联系说明报告资源、复现路径和影响范围。</p>
          <a href="/.well-known/security.txt">security.txt</a>
          <p>
            <a href="/lab/security">实验室安全与隐私声明</a>
          </p>
        </article>
      </div>
    </EngineeringPage>
  );
}
