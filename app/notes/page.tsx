import Link from "next/link";
import { pageMetadata } from "../site/metadata";
import { notes } from "./notes";
import "./notes.css";

export const metadata = pageMetadata("技术笔记", "Yibiao 的密码工程实现记录：算法材料、参数验证与实现边界。每篇附英文摘要。", "/notes");
export default function NotesPage() {
  return <main id="main-content" className="notes-page">
    <header><p className="notes-kicker">YIBIAO / FIELD NOTES</p><h1>技术笔记</h1><p>把实现留下来，也把方法与边界写清楚。</p><p lang="en">Notes on cryptographic implementations, parameters and verification. Each article includes an English abstract.</p></header>
    <div className="portal-actions"><a className="notes-back" href="/notes/rss.xml">订阅笔记 RSS ↗</a><Link className="notes-back" href="/weekly">工程周报 ↗</Link></div>
    <div className="notes-index">{notes.map(note => <article key={note.slug}><p className="notes-kicker"><time dateTime={note.date}>{note.date}</time> / {note.category}</p><h2><Link href={`/notes/${note.slug}`}>{note.title} ↗</Link></h2><p>{note.summary}</p><p lang="en">{note.english}</p></article>)}</div>
  </main>;
}
