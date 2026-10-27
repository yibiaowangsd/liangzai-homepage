import { notFound } from "next/navigation";
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
  return <main id="main-content" className="dossier-page"><header className="dossier-heading"><Link className="dossier-back" href="/topics">全部技术档案</Link><p className="dossier-eyebrow">{topic.category} · 持续追踪</p><h1>{topic.name}</h1><p>{topic.description}</p><div className="dossier-heading-meta"><span>{topic.events.length} 项进展</span><span>收录至 {index.throughDate}</span></div></header><TopicDesk topic={topic} /></main>;
}
