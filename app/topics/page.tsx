import type { Metadata } from "next";
import Link from "next/link";
import TopicDesk from "./TopicDesk";
import index from "./topic-index.json";
import "./topics.css";
export const metadata: Metadata = { title: "技术进展档案 · 量仔", description: "按算法、协议和项目持续追踪变化，连接相关新闻、原始报告与本地验证。" };
export default function TopicsPage() {
  return <main id="main-content" className="dossier-page"><header className="dossier-heading"><p className="dossier-eyebrow">持续追踪 · 有据可查</p><h1>技术进展档案</h1><p>把分散在每天的消息，连成一个持续更新的专题。<br />看新增进展，也回查此前结论与原始证据。</p><div className="dossier-heading-meta"><span>收录至 {index.throughDate}</span><Link href="/news">阅读当日简报</Link></div></header><TopicDesk /></main>;
}
