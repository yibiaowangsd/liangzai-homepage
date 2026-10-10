"use client";
import { useRef, useState, type FormEvent } from "react";
import { subscriptionCategories, subscriptionRequest } from "../../subscribe/SubscriptionForm";

type Application = { id: string; email?: string; webhook_display?: string; mention_mode?: string; mention_mobiles?: string; delivery_status?: string; manual_status?: string; delivery_error?: string; delivery_message?: string; next_part?: number; categories: string; applicant_name: string; reason: string; status: string; email_verified_at: string | null; confirmation_sent_at: string | null; review_note: string; created_at: string };
const statuses: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", unsubscribed: "已退订", all: "全部" };
function submittedAt(value: string) {
  const date = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
export default function ReviewConsole() {
  const sending = useRef(false);
  const [channel, setChannel] = useState<"email" | "robot">("email");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Record<string, { mode: string; mobiles: string }>>({});
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [rows, setRows] = useState<Application[]>([]);
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const endpoint = (kind = channel) => kind === "robot" ? "/admin/robot-subscriptions" : "/admin/subscriptions";
  async function load(status = filter, nextPage = page, kind = channel) {
    const result = await subscriptionRequest(`${endpoint(kind)}?status=${status}&page=${nextPage}`, undefined, secret);
    setRows(result.data); setTotal(result.total); setReady(kind === "robot" ? result.robot_ready : result.mail_ready); setAuthenticated(true); setFilter(status); setPage(nextPage); setChannel(kind);
  }
  async function refresh(status = filter, nextPage = page, kind = channel) {
    setBusy(true); setError(""); setMessage("");
    try { await load(status, nextPage, kind); setRejecting(null); setConfiguring(null); setMentions({}); } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取申请。"); }
    finally { setBusy(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await refresh("pending", 1); }
  async function review(row: Application, action: string) {
    if (action === "reject" && !notes[row.id]?.trim()) { setError("请填写拒绝理由。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await subscriptionRequest(`${endpoint()}/${row.id}/${action}`, { note: notes[row.id] || "", ...(channel === "robot" && action !== "reject" ? { mention_mode: mentions[row.id]?.mode || row.mention_mode || "none", mention_mobiles: mentions[row.id] ? mentions[row.id].mobiles.split(/[\s,，;；]+/).filter(Boolean) : JSON.parse(row.mention_mobiles || "[]") } : {}) }, secret);
      setMessage(result.message); setRejecting(null); setConfiguring(null); setMentions({});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "审核操作失败。"); }
    finally { try { await load(); } catch { /* Keep the original error and allow refresh. */ } setBusy(false); }
  }
  async function send() {
    setBusy(true); setMessage(""); setError("");
    try { const result = await subscriptionRequest("/admin/subscriptions/send", {}, secret); setMessage(result.message || `本轮发送 ${result.sent} 封，失败 ${result.failed || 0} 封。每轮最多 20 封，其余由自动任务继续。`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "发送失败。"); }
    finally { setBusy(false); }
  }
  async function sendRobot(row: Application) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true); setSendingId(row.id); setMessage(""); setError("");
    try {
      let step: { send_id: string; part: number; version?: string; date?: string } = { send_id: crypto.randomUUID(), part: 0 };
      for (let count = 0; count < Object.keys(subscriptionCategories).length; count++) {
        const result = await subscriptionRequest(`/admin/robot-subscriptions/${row.id}/send`, step, secret);
        const notice = `${row.applicant_name || "群机器人"}：${result.message}`;
        if (result.ok === false) { setMessage(""); setError(notice); break; }
        setMessage(notice);
        if (!result.more) break;
        step = { send_id: step.send_id, part: result.next_part, version: result.version, date: result.date };
      }
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "AbortError" ? cause.message : "连接中断，发送结果未确认。可点击「立刻发送」重新发送。");
    } finally { try { await load(); } catch { /* Preserve the send outcome if refresh fails. */ } sending.current = false; setSendingId(null); setBusy(false); }
  }
  function logout() {
    setChannel("email"); setConfiguring(null); setMentions({}); setSecret(""); setAuthenticated(false); setRows([]); setNotes({}); setRejecting(null); setMessage(""); setError(""); setReady(false); setTotal(0); setPage(1); setFilter("pending");
  }
  return <section className="review-console" aria-label="订阅审核工作台" aria-busy={busy}>
    <p role="status" className="subscription-message review-notice">{message}</p>
    {error && <p role="alert" className="subscription-error review-notice">{error}</p>}
    {!authenticated ? <div className="review-login">
      <div className="review-login-guide">
        <span className="review-section-label">审核流程</span>
        <h2>每一份订阅<br />先审核，再送达</h2>
        <p>查看申请理由和所选板块，决定是否通过。邮箱需收件人确认；群机器人通过审核后启用，@ 成员由管理员配置。</p>
        <ol><li><span>01</span><div><strong>查看申请</strong><p>核对接收方式、关注板块和申请理由。</p></div></li><li><span>02</span><div><strong>作出审核</strong><p>通过申请，或填写理由后拒绝。</p></div></li><li><span>03</span><div><strong>确认后送达</strong><p>邮箱确认后送达；群机器人按审核配置定时推送。</p></div></li></ol>
      </div>
      <form className="subscription-card review-login-form" onSubmit={login}>
        <span className="review-section-label">管理员入口</span><h2>进入审核工作台</h2><p>使用审核口令查看和处理订阅申请。</p>
        <label className="subscription-field">管理员审核口令<input type="password" value={secret} onChange={event => setSecret(event.target.value)} autoComplete="off" required disabled={busy} /></label>
        <button className="subscription-primary" disabled={busy}>{busy ? "正在验证…" : "进入审核"}</button>
        <p className="subscription-footnote">口令仅保留在当前页面，关闭页面后需重新输入。</p>
      </form>
    </div> : <>
      <nav className="review-channels" aria-label="订阅渠道"><button type="button" aria-pressed={channel === "email"} disabled={busy} onClick={() => void refresh("pending", 1, "email")}>邮箱订阅</button><button type="button" aria-pressed={channel === "robot"} disabled={busy} onClick={() => void refresh("pending", 1, "robot")}>群机器人</button></nav>
      <div className="review-toolbar">
        <div className="review-service" data-ready={ready}><span aria-hidden="true" /><div><strong>{channel === "robot" ? ready ? "机器人服务已就绪" : "机器人服务未就绪" : ready ? "邮件服务已就绪" : "邮件服务未就绪"}</strong><p>{ready ? channel === "robot" ? "审核通过后定时推送；成员提醒仅由管理员设置。" : "通过审核并确认邮箱后，按订阅板块发送。" : "可查看和拒绝申请；配置完成后才能通过并发送。"}</p></div></div>
        <div className="subscription-actions"><button disabled={busy} onClick={() => void refresh()}>刷新列表</button>{channel === "email" && <button disabled={busy || !ready} onClick={() => void send()}>发送当日日报</button>}<button disabled={busy} onClick={logout}>退出</button></div>
      </div>
      <div className="review-workspace">
        <aside className="review-sidebar"><h2>申请状态</h2><nav aria-label="申请状态">{Object.entries(statuses).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} disabled={busy} onClick={() => void refresh(key, 1)}>{label}<span aria-hidden="true">{key === filter ? "●" : ""}</span></button>)}</nav><p>{channel === "robot" ? "审核期间不发送群消息。通过后自动推送，每天一次；后台「立刻发送」可重复发送当日日报，手动发送后当天不再自动重复推送。" : "修改订阅板块的申请也会回到待审核列表。"}</p></aside>
        <div className="review-list-panel">
          <header className="review-list-heading"><div><h2>{filter === "all" ? "全部申请" : `${statuses[filter]}申请`}</h2><p>共 {total} 份 · 提交时间以北京时间显示</p></div><span className="review-page-count">第 {page} / {Math.max(1, Math.ceil(total / 50))} 页</span></header>
          <div className="review-applications">{rows.map(row => {
            const categories = JSON.parse(row.categories) as (keyof typeof subscriptionCategories)[];
            const draft = mentions[row.id] || { mode: row.mention_mode || "none", mobiles: (JSON.parse(row.mention_mobiles || "[]") as string[]).join("\n") };
            return <article className="review-application" key={row.id}>
              <header className="review-application-heading"><div><span className="review-applicant-name">{row.applicant_name || "未填写称呼"}</span><h2>{channel === "robot" ? row.webhook_display : row.email}</h2><p>提交于 {submittedAt(row.created_at)}</p></div><span className="review-status" data-status={row.status}>{statuses[row.status]}</span></header>
              <div className="review-application-body"><div><h3>订阅板块</h3><ul className="review-topics">{categories.map(key => <li key={key}>{subscriptionCategories[key]}</li>)}</ul></div><div><h3>申请理由</h3><p className="review-reason">{row.reason}</p></div></div>
              {row.review_note && <div className="review-record"><h3>审核备注</h3><p>{row.review_note}</p></div>}
              {row.status === "approved" && channel === "email" && <p className="review-confirmation" data-verified={!!row.email_verified_at}>{row.email_verified_at ? "邮箱已确认，订阅已启用。" : "等待收件人确认邮箱，确认后才会开始发送。"}</p>}
              {channel === "robot" && <div className="review-record"><h3>成员提醒</h3><p>{row.mention_mode === "members" ? `指定成员：${(JSON.parse(row.mention_mobiles || "[]") as string[]).join("、")}` : "不 @ 成员"}</p>{row.status === "approved" && <p className="review-confirmation" data-verified={!["uncertain", "failed", "cancelled"].includes(row.manual_status || row.delivery_status || "")}>今日推送 · {row.delivery_message || (row.delivery_status === "sent" ? "今日日报已发送" : row.delivery_status === "uncertain" ? "今日自动推送结果未确认，后台可立刻重发" : "等待完整日报与定时任务")}</p>}</div>}
              {["pending", "approved"].includes(row.status) && <div className="review-application-actions">
                <div className="subscription-actions">
                  {row.status === "pending" && <button disabled={busy || !ready} className="subscription-primary" onClick={() => channel === "robot" ? setConfiguring(configuring === row.id ? null : row.id) : void review(row, "approve")}>{channel === "robot" ? "配置并审核" : "通过申请"}</button>}
                  {channel === "robot" && row.status === "approved" && <button className="subscription-primary" disabled={busy || !ready} onClick={() => void sendRobot(row)}>{sendingId === row.id ? "正在发送…" : "立刻发送"}</button>}
                  {channel === "robot" && row.status === "approved" && <button disabled={busy || !ready} onClick={() => setConfiguring(configuring === row.id ? null : row.id)}>配置 @ 成员</button>}
                  {channel === "email" && row.status === "approved" && !row.email_verified_at && <button disabled={busy || !ready} onClick={() => void review(row, "resend")}>重发确认邮件</button>}
                  <button className="review-danger" disabled={busy} aria-expanded={rejecting === row.id} aria-controls={`rejection-${row.id}`} onClick={() => setRejecting(rejecting === row.id ? null : row.id)}>{row.status === "approved" ? "撤销批准并停止发送" : "拒绝申请"}</button>
                </div>
                {channel === "robot" && configuring === row.id && <div className="review-mention-config"><h3>{row.status === "pending" ? "审核与成员提醒" : "调整成员提醒"}</h3><label className="subscription-field">提醒方式<select value={draft.mode} disabled={busy} onChange={event => setMentions({ ...mentions, [row.id]: { ...draft, mode: event.target.value } })}><option value="none">不 @ 成员</option><option value="members">@ 指定成员</option></select></label>{draft.mode === "members" && <label className="subscription-field">成员手机号<textarea value={draft.mobiles} onChange={event => setMentions({ ...mentions, [row.id]: { ...draft, mobiles: event.target.value } })} rows={3} maxLength={340} disabled={busy} placeholder="每行一个手机号，也可用逗号分隔" /><span>最多 20 位成员，使用群成员登记的 11 至 15 位数字手机号。</span></label>}<p>每份日报仅在第一条消息提醒所选成员。申请人无法设置或修改 @ 对象。</p><div className="subscription-actions"><button className="subscription-primary" disabled={busy || !ready} onClick={() => void review(row, row.status === "pending" ? "approve" : "mentions")}>{row.status === "pending" ? "通过并启用" : "保存成员配置"}</button><button disabled={busy} onClick={() => { setConfiguring(null); setMentions({ ...mentions, [row.id]: { mode: row.mention_mode || "none", mobiles: (JSON.parse(row.mention_mobiles || "[]") as string[]).join("\n") } }); }}>取消</button></div></div>}
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
