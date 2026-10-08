import Link from "next/link";
import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { weeklyIssues } from "../engineering/weekly";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "工程周报",
  "工程更新与公开实验摘要；RSS 可订阅，自动邮件投递尚未接入。",
  "/weekly",
);
export default function Page() {
  return (
    <EngineeringPage
      title="工程周报"
      intro="汇总站点的工程进展与公开实验。先以网页和 RSS 发布，更新按实际进展记录，不承诺固定投递频率。"
    >
      <Section title="订阅方式">
        <p>
          目前没有邮件订阅服务，自动邮件投递尚未开通。邮件入口只用于联系、表达订阅意向，不会自动把你加入名单。
        </p>
        <div className="engineering-actions">
          <a href="/weekly/rss.xml">订阅周报 RSS</a>
          <a href="mailto:yibiao_wang@foxmail.com?subject=%E5%B7%A5%E7%A8%8B%E5%91%A8%E6%8A%A5%E8%AE%A2%E9%98%85%E6%84%8F%E5%90%91">
            邮件联系订阅意向
          </a>
          <Link href="/contact">全部联系与 RSS 入口</Link>
        </div>
      </Section>
      {weeklyIssues.map((issue) => (
        <section className="engineering-section" id={issue.id} key={issue.id}>
          <small>{issue.date}</small>
          <h2>{issue.title}</h2>
          <p>{issue.summary}</p>
          <ul>
            {issue.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </EngineeringPage>
  );
}
