import Link from "next/link";
import { notFound } from "next/navigation";
import { EngineeringPage } from "../../engineering/EngineeringPage";
import { notes } from "../../engineering/notes";
import { pageMetadata } from "../../site/metadata";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);
  return note ? pageMetadata(note.title, note.summary, "/notes/" + slug) : {};
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);
  if (!note) notFound();
  return (
    <EngineeringPage
      title={note.title}
      intro={note.summary}
      eyebrow={`工程笔记 · Yibiao · ${note.date}`}
    >
      <article className="engineering-article">
        {note.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </article>
      <div className="engineering-actions">
        {note.links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link href="/notes">全部笔记</Link>
      </div>
    </EngineeringPage>
  );
}
