"use client";
import { useState, type FormEvent } from "react";
import { subscriptionCategories, subscriptionRequest } from "../../subscribe/SubscriptionForm";

type Application = { id: string; email: string; categories: string; applicant_name: string; reason: string; status: string; email_verified_at: string | null; confirmation_sent_at: string | null; review_note: string; created_at: string };
const statuses: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", unsubscribed: "已退订", all: "全部" };
function submittedAt(value: string) {
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
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
  const [rejecting, setRejecting] = useState<string | null>(null);
  async function load(status = filter, nextPage = page) {
    const result = await subscriptionRequest(`/admin/subscriptions?status=${status}&page=${nextPage}`, undefined, secret);
    setRows(result.data); setTotal(result.total); setReady(result.mail_ready); setAuthenticated(true); setFilter(status); setPage(nextPage);
  }
  async function refresh(status = filter, nextPage = page) {
    setBusy(true); setError(""); setMessage("");
    try { await load(status, nextPage); setRejecting(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取申请。"); }
    finally { setBusy(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await refresh("pending", 1); }
  async function review(row: Application, action: string) {
    if (action === "reject" && !notes[row.id]?.trim()) { setError("请填写拒绝理由。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await subscriptionRequest(`/admin/subscriptions/${row.id}/${action}`, { note: notes[row.id] || "" }, secret);
      setMessage(result.message); setRejecting(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "审核操作失败。"); }
    finally { try { await load(); } catch { /* Keep the original error and allow refresh. */ } setBusy(false); }
  }
  async function send() {
    setBusy(true); setMessage(""); setError("");
    try { const result = await subscriptionRequest("/admin/subscriptions/send", {}, secret); setMessage(result.message || `本轮发送 ${result.sent} 封，失败 ${result.failed || 0} 封。每轮最多 20 封，其余由自动任务继续。`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "发送失败。"); }
    finally { setBusy(false); }
  }
  function logout() {
    setSecret(""); setAuthenticated(false); setRows([]); setNotes({}); setRejecting(null); setMessage(""); setError(""); setReady(false); setTotal(0); setPage(1); setFilter("pending");
  }
  return <section className="review-console" aria-label="订阅审核工作台" aria-busy={busy}>
    <p role="status" className="subscription-message review-notice">{message}</p>
    {error && <p role="alert" className="subscription-error review-notice">{error}</p>}
    {!authenticated ? <div className="review-login">
      <div className="review-login-guide">
        <span className="review-section-label">审核流程</span>
        <h2>每一份订阅<br />先审核，再送达</h2>
        <p>查看申请理由和所选板块，决定是否通过。收件人确认邮箱后，才会开始接收日报。</p>
        <ol><li><span>01</span><div><strong>查看申请</strong><p>核对邮箱、关注板块和申请理由。</p></div></li><li><span>02</span><div><strong>作出审核</strong><p>通过申请，或填写理由后拒绝。</p></div></li><li><span>03</span><div><strong>确认后送达</strong><p>由收件人确认邮箱，随后自动发送。</p></div></li></ol>
      </div>
      <form className="subscription-card review-login-form" onSubmit={login}>
        <span className="review-section-label">管理员入口</span><h2>进入审核工作台</h2><p>使用审核口令查看和处理订阅申请。</p>
        <label className="subscription-field">管理员审核口令<input type="password" value={secret} onChange={event => setSecret(event.target.value)} autoComplete="off" required disabled={busy} /></label>
        <button className="subscription-primary" disabled={busy}>{busy ? "正在验证…" : "进入审核"}</button>
        <p className="subscription-footnote">口令仅保留在当前页面，关闭页面后需重新输入。</p>
      </form>
    </div> : <>
      <div className="review-toolbar">
        <div className="review-service" data-ready={ready}><span aria-hidden="true" /><div><strong>{ready ? "邮件服务已就绪" : "邮件服务未就绪"}</strong><p>{ready ? "通过审核并确认邮箱后，按订阅板块发送。" : "可查看和拒绝申请；配置完成后才能通过并发送。"}</p></div></div>
        <div className="subscription-actions"><button disabled={busy} onClick={() => void refresh()}>刷新列表</button><button disabled={busy || !ready} onClick={() => void send()}>发送当日日报</button><button disabled={busy} onClick={logout}>退出</button></div>
      </div>
      <div className="review-workspace">
        <aside className="review-sidebar"><h2>申请状态</h2><nav aria-label="申请状态">{Object.entries(statuses).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} disabled={busy} onClick={() => void refresh(key, 1)}>{label}<span aria-hidden="true">{key === filter ? "●" : ""}</span></button>)}</nav><p>修改订阅板块的申请也会回到待审核列表。</p></aside>
        <div className="review-list-panel">
          <header className="review-list-heading"><div><h2>{filter === "all" ? "全部申请" : `${statuses[filter]}申请`}</h2><p>共 {total} 份 · 提交时间以北京时间显示</p></div><span className="review-page-count">第 {page} / {Math.max(1, Math.ceil(total / 50))} 页</span></header>
          <div className="review-applications">{rows.map(row => {
            const categories = JSON.parse(row.categories) as (keyof typeof subscriptionCategories)[];
            return <article className="review-application" key={row.id}>
              <header className="review-application-heading"><div><span className="review-applicant-name">{row.applicant_name || "未填写称呼"}</span><h2>{row.email}</h2><p>提交于 {submittedAt(row.created_at)}</p></div><span className="review-status" data-status={row.status}>{statuses[row.status]}</span></header>
              <div className="review-application-body"><div><h3>订阅板块</h3><ul className="review-topics">{categories.map(key => <li key={key}>{subscriptionCategories[key]}</li>)}</ul></div><div><h3>申请理由</h3><p className="review-reason">{row.reason}</p></div></div>
              {row.review_note && <div className="review-record"><h3>审核备注</h3><p>{row.review_note}</p></div>}
              {row.status === "approved" && <p className="review-confirmation" data-verified={!!row.email_verified_at}>{row.email_verified_at ? "邮箱已确认，订阅已启用。" : "等待收件人确认邮箱，确认后才会开始发送。"}</p>}
              {["pending", "approved"].includes(row.status) && <div className="review-application-actions">
                <div className="subscription-actions">
                  {row.status === "pending" && <button disabled={busy || !ready} className="subscription-primary" onClick={() => void review(row, "approve")}>通过申请</button>}
                  {row.status === "approved" && !row.email_verified_at && <button disabled={busy || !ready} onClick={() => void review(row, "resend")}>重发确认邮件</button>}
                  <button className="review-danger" disabled={busy} aria-expanded={rejecting === row.id} aria-controls={`rejection-${row.id}`} onClick={() => setRejecting(rejecting === row.id ? null : row.id)}>{row.status === "approved" ? "撤销批准并停止发送" : "拒绝申请"}</button>
                </div>
                {rejecting === row.id && <div className="review-rejection" id={`rejection-${row.id}`}><label className="subscription-field">拒绝理由<textarea value={notes[row.id] || ""} onChange={event => setNotes({ ...notes, [row.id]: event.target.value })} maxLength={500} rows={3} disabled={busy} placeholder="写明原因，便于后续复核" /></label><div className="subscription-actions"><button className="review-danger" disabled={busy} onClick={() => void review(row, "reject")}>{row.status === "approved" ? "确认撤销" : "确认拒绝"}</button><button disabled={busy} onClick={() => setRejecting(null)}>取消</button></div></div>}
              </div>}
            </article>;
          })}{!rows.length && <div className="review-empty"><span aria-hidden="true">✓</span><h3>暂无{filter === "all" ? "订阅" : statuses[filter]}申请</h3><p>{filter === "pending" ? "新的申请和板块调整会出现在这里。" : "可以切换申请状态，查看其他记录。"}</p></div>}</div>
          <nav className="review-pagination" aria-label="申请分页"><button disabled={busy || page <= 1} onClick={() => void refresh(filter, page - 1)}>上一页</button><span>每页最多 50 份申请</span><button disabled={busy || page * 50 >= total} onClick={() => void refresh(filter, page + 1)}>下一页</button></nav>
        </div>
      </div>
    </>}
  </section>;
}
