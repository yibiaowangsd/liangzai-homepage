"use client";
import { useState, type FormEvent } from "react";
import { subscriptionCategories, subscriptionRequest } from "../../subscribe/SubscriptionForm";

type Application = { id: string; email: string; categories: string; applicant_name: string; reason: string; status: string; email_verified_at: string | null; confirmation_sent_at: string | null; review_note: string; created_at: string };
const statuses: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", unsubscribed: "已退订", all: "全部" };
export default function ReviewConsole() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [rows, setRows] = useState<Application[]>([]);
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function load(status = filter, nextPage = page) {
    const result = await subscriptionRequest(`/admin/subscriptions?status=${status}&page=${nextPage}`, undefined, secret);
    setRows(result.data); setTotal(result.total); setReady(result.mail_ready); setAuthenticated(true); setFilter(status); setPage(nextPage);
  }
  async function refresh(status = filter, nextPage = page) {
    setBusy(true); setError("");
    try { await load(status, nextPage); } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取申请。"); }
    finally { setBusy(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await refresh("pending", 1); }
  async function review(row: Application, action: string) {
    if (action === "reject" && !notes[row.id]?.trim()) { setError("请填写拒绝理由。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await subscriptionRequest(`/admin/subscriptions/${row.id}/${action}`, { note: notes[row.id] || "" }, secret);
      setMessage(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "审核操作失败。"); }
    finally { try { await load(); } catch { /* Keep the original error and allow refresh. */ } setBusy(false); }
  }
  async function send() {
    setBusy(true); setMessage(""); setError("");
    try { const result = await subscriptionRequest("/admin/subscriptions/send", {}, secret); setMessage(result.message || `本轮发送 ${result.sent} 封，失败 ${result.failed || 0} 封。每轮最多 20 封，其余由自动任务继续。`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "发送失败。"); }
    finally { setBusy(false); }
  }
  return <section className="subscription-card">
    {!authenticated ? <form onSubmit={login}><label className="subscription-field">管理员审核口令<input type="password" value={secret} onChange={event => setSecret(event.target.value)} autoComplete="off" required disabled={busy} /></label><p className="subscription-footnote">口令仅保留在当前页面，关闭页面后需重新输入。</p><button className="subscription-primary" disabled={busy}>{busy ? "正在验证…" : "进入审核"}</button></form> : <>
      <div className="subscription-review-controls"><label>申请状态<select value={filter} onChange={event => void refresh(event.target.value, 1)} disabled={busy}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button disabled={busy} onClick={() => void refresh()}>刷新列表</button><button disabled={busy || !ready} onClick={() => void send()}>发送当日日报</button><button disabled={busy} onClick={() => { setSecret(""); setAuthenticated(false); setRows([]); setNotes({}); setMessage(""); setError(""); }}>退出</button></div>
      {!ready && <p className="subscription-error">邮件服务未配置：需在新闻 API Worker 设置 RESEND_API_KEY 与 NEWSLETTER_FROM。申请可收集和拒绝，配置后才能通过并发送确认邮件。</p>}
      <p>{statuses[filter]} · 共 {total} 份申请</p>
      <div className="subscription-applications">{rows.map(row => <article key={row.id}><header><h2>{row.email}</h2><span>{statuses[row.status]}{row.status === "approved" ? row.email_verified_at ? " · 邮箱已确认" : " · 等待邮箱确认" : ""}</span></header>
        <dl><dt>称呼</dt><dd>{row.applicant_name || "未填写"}</dd><dt>板块</dt><dd>{(JSON.parse(row.categories) as (keyof typeof subscriptionCategories)[]).map(key => subscriptionCategories[key]).join("、")}</dd><dt>申请理由</dt><dd>{row.reason}</dd><dt>提交时间</dt><dd>{row.created_at} UTC</dd>{row.review_note && <><dt>审核备注</dt><dd>{row.review_note}</dd></>}</dl>
        {["pending", "approved"].includes(row.status) && <><label className="subscription-field">拒绝理由<textarea value={notes[row.id] || ""} onChange={event => setNotes({ ...notes, [row.id]: event.target.value })} maxLength={500} rows={2} disabled={busy} /></label><div className="subscription-actions">
          {row.status === "pending" && <button disabled={busy || !ready} className="subscription-primary" onClick={() => void review(row, "approve")}>通过申请</button>}
          {row.status === "approved" && !row.email_verified_at && <button disabled={busy || !ready} onClick={() => void review(row, "resend")}>重发确认邮件</button>}
          <button disabled={busy} onClick={() => void review(row, "reject")}>{row.status === "approved" ? "撤销批准并停止发送" : "拒绝申请"}</button>
        </div></>}
      </article>)}{!rows.length && <p className="subscription-empty">暂无{statuses[filter]}申请。</p>}</div>
      <nav className="subscription-actions" aria-label="申请分页"><button disabled={busy || page <= 1} onClick={() => void refresh(filter, page - 1)}>上一页</button><span>第 {page} 页</span><button disabled={busy || page * 50 >= total} onClick={() => void refresh(filter, page + 1)}>下一页</button></nav>
    </>}
    <p role="status" className="subscription-message">{message}</p>{error && <p role="alert" className="subscription-error">{error}</p>}
  </section>;
}
