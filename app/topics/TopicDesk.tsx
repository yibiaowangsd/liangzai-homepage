"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import topicIndex from "./topic-index.json";
import { unreadEvents } from "../../news/topics.js";
import { readTracking, TRACKING_KEY, type TopicTracking } from "./tracking";

type Topic = typeof topicIndex.topics[number];
const empty: TopicTracking = { followed: false, seen: {} };
const reportStatus: Record<string, string> = { Confirmed: "原报告：已确认", Lead: "线索待验证", Probable: "缺陷确认，攻击待推导", "Proof gap": "证明缺口", Withdrawn: "已撤回" };

export default function TopicDesk({ topic }: { topic?: Topic }) {
  const [tracking, setTracking] = useState<Record<string, TopicTracking>>({});
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const read = () => { try { setTracking(readTracking(localStorage.getItem(TRACKING_KEY))); } catch { setNotice("浏览器无法保存阅读进度，本次仍可正常阅读。"); } };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  function save(slug: string, value: TopicTracking) {
    const next = { ...tracking, [slug]: value };
    setTracking(next);
    try { localStorage.setItem(TRACKING_KEY, JSON.stringify(next)); setNotice("已保存在当前浏览器。"); } catch { setNotice("本次操作已生效，但浏览器无法保存阅读进度。"); }
  }
  if (!topic) {
    const topics = topicIndex.topics.filter(item => (!onlyFollowed || tracking[item.slug]?.followed) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
    return <>
      <div className="dossier-toolbar"><label>查找专题<input type="search" value={query} placeholder="算法、协议或项目" onChange={event => setQuery(event.target.value)} /></label><button type="button" aria-pressed={onlyFollowed} onClick={() => setOnlyFollowed(value => !value)}>{onlyFollowed ? "显示全部专题" : "只看我追踪的"}</button><span role="status">{notice || "追踪和阅读进度仅保存在当前浏览器。"}</span></div>
      <div className="dossier-grid">{topics.map(item => {
        const state = tracking[item.slug] || empty;
        const unread = unreadEvents(item.events, state.seen).length;
        return <article className="dossier-card" key={item.slug}><div className="dossier-card-top"><span>{item.category}</span><button type="button" aria-label={`${state.followed ? "取消追踪" : "追踪"}${item.name}`} aria-pressed={state.followed} onClick={() => save(item.slug, { ...state, followed: !state.followed })}>{state.followed ? "已追踪" : "追踪"}</button></div><h2><Link href={`/topics/${item.slug}`}>{item.name}</Link></h2><p>{item.description}</p><div className="dossier-card-foot"><span>{item.events.length} 项进展 · {unread} 项未读</span><Link href={`/topics/${item.slug}`}>查看进展</Link></div>{item.events[0] && <p className="dossier-latest"><time>{item.events[0].date}</time>{item.events[0].title}</p>}</article>;
      })}</div>{!topics.length && <p className="dossier-empty">没有匹配的专题。可以切换到全部专题或更换关键词。</p>}
    </>;
  }
  const state = tracking[topic.slug] || empty;
  const unread = unreadEvents(topic.events, state.seen);
  const events = onlyUnread ? unread : topic.events;
  const newerReports = topic.events.filter(event => event.date > topic.reportSnapshot.sourceUpdated.slice(0, 10));
  return <>
    <div className="dossier-toolbar"><button type="button" aria-pressed={state.followed} onClick={() => save(topic.slug, { ...state, followed: !state.followed })}>{state.followed ? "已追踪此专题" : "追踪此专题"}</button><button type="button" aria-pressed={onlyUnread} onClick={() => setOnlyUnread(value => !value)}>{onlyUnread ? "显示全部进展" : `只看未读（${unread.length}）`}</button><button type="button" onClick={() => save(topic.slug, { ...state, seen: Object.fromEntries(topic.events.map(event => [event.id, event.version])) })}>将当前进展标为已读</button><span role="status">{notice || "打开页面不会自动清除未读标记。"}</span></div>
    <div className="dossier-layout"><section aria-label="专题进展时间线"><p className="dossier-date-note">以下日期为本站收录日期；研究或公告的原始日期与证据边界请查阅正文。</p><ol className="dossier-timeline">{events.map(event => <li key={event.id}><div className="dossier-event-meta"><time dateTime={event.date}>{event.date}</time><span>{state.seen[event.id] !== event.version ? "未读" : "已读"}</span>{event.revisions.length > 1 && <span>报道有更新</span>}</div><article><h2><Link href={`/news/${event.slug}`}>{event.title}</Link></h2><p>{event.summary}</p><div className="dossier-event-links"><span>{event.sourceName}</span><Link href={`/news/${event.slug}`}>阅读全文</Link>{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer">原始来源</a>}</div>{event.revisions.length > 1 && <details><summary>本站报道记录（{event.revisions.length} 版）</summary><ul>{event.revisions.map(revision => <li key={revision.version}><time>{revision.date}</time> <Link href={`/news/${revision.slug}`}>{revision.title}</Link></li>)}</ul></details>}</article></li>)}</ol>{!events.length && <p className="dossier-empty">{onlyUnread ? "当前进展已全部读过。后续新增或报道修订会重新显示。" : "已建立专题，暂未收录相关报道。"}</p>}</section>
    <aside className="dossier-aside"><section><h2>继续查证与验证</h2>{topic.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>)}{topic.algorithm && <a href={`/pqc-practice/?algorithm=${topic.algorithm}`}>打开对应算法资料与实验</a>}<Link href="/news/subscribe">订阅相关栏目日报</Link><p>专题追踪仅保存在当前浏览器；日报订阅仍按栏目选择并经过审核。</p></section>
    {topic.candidates.length > 0 && <section><h2>实验室报告快照</h2><p>核对：{topic.reportSnapshot.reviewed}<br />来源更新：{topic.reportSnapshot.sourceUpdated.slice(0, 10)}</p>{newerReports.length > 0 && <p className="dossier-caution">快照之后有 {newerReports.length} 项相关进展。请结合左侧报道查阅原报告，快照不代表当前完整结论。</p>}<ul className="dossier-findings">{topic.reportSnapshot.findings.map(finding => <li key={finding.id}><a href={finding.source_url} target="_blank" rel="noreferrer">{finding.id} · {finding.title}</a><small>{reportStatus[finding.status] || finding.status} · {finding.updated}</small></li>)}</ul><p>这些条目来自外部报告，针对其中注明的提交版本；不代表本站已复现或实现已获认证。</p></section>}</aside></div>
  </>;
}
