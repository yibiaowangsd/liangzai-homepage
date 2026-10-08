import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "../../site/metadata";
import { notes } from "../notes";
import "../notes.css";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return notes.map(note => ({ slug: note.slug })); }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const note = notes.find(item => item.slug === slug);
  return note ? pageMetadata(note.title, note.summary, `/notes/${note.slug}`) : {};
}
export default async function NotePage({ params }: Props) {
  const { slug } = await params;
  const note = notes.find(item => item.slug === slug);
  if (!note) notFound();
  return <main id="main-content" className="notes-page notes-article">
    <Link className="notes-back" href="/notes">← 全部技术笔记</Link>
    <article><header><p className="notes-kicker">YIBIAO / {note.category} / <time dateTime={note.date}>{note.date}</time></p><h1>{note.title}</h1><p>{note.summary}</p></header>
      <section id="abstract" lang="en" className="notes-abstract" aria-labelledby="abstract-title"><h2 id="abstract-title">Abstract</h2><p>{note.english}</p></section>
      {note.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <footer className="notes-references"><h2>复现与来源</h2><ul>{note.links.map(link => <li key={link.href}><a href={link.href}>{link.label} ↗</a></li>)}</ul></footer>
    </article>
  </main>;
}
