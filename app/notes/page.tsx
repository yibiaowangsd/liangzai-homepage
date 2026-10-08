import Link from "next/link";
import { EngineeringPage } from "../engineering/EngineeringPage";
import { notes } from "../engineering/notes";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "工程笔记",
  "关于算法验证、TLCP 接入与握手性能的第一人称工程长文。",
  "/notes",
);
export default function Page() {
  return (
    <EngineeringPage
      title="工程笔记"
      intro="我对算法和协议工程的判断，连同证据与边界一起记录。这里写长文；新闻摘要与原始报道另见前沿新闻。"
    >
      <div className="engineering-actions">
        <a href="/notes/rss.xml">订阅笔记 RSS</a>
        <Link href="/weekly">周报与订阅说明</Link>
      </div>
      {notes.map((note) => (
        <article className="engineering-section" key={note.slug}>
          <small>{note.date} · Yibiao</small>
          <h2>
            <Link href={"/notes/" + note.slug}>{note.title}</Link>
          </h2>
          <p>{note.summary}</p>
          <Link href={"/notes/" + note.slug}>阅读全文 →</Link>
        </article>
      ))}
    </EngineeringPage>
  );
}
