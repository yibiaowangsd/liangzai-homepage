import { notFound } from "next/navigation";
import PageIntro from "../../milk/PageIntro";
import Link from "next/link";
import TopicDesk from "../TopicDesk";
import index from "../topic-index.json";
import "../topics.css";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = index.topics.find(item => item.slug === slug);
  return { title: `${topic?.name || "专题"} · 技术进展档案`, description: topic?.description };
}
export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = index.topics.find(item => item.slug === slug);
  if (!topic) notFound();
  return <main id="main-content" className="dossier-page">
    <PageIntro
      latin="Tracking,"
      kicker={`${topic.category} · 持续追踪`}
      title={topic.name}
      dynamicTitle
      back={<Link className="milk-intro-back" href="/topics">全部技术档案</Link>}
      meta={<><span className="milk-chip" data-tone="accent">{topic.events.length} 项进展</span><span>收录至 {index.throughDate}</span></>}
    >
      <p>{topic.description}</p>
    </PageIntro>
    <div className="dossier-body"><TopicDesk topic={topic} /></div>
  </main>;
}
