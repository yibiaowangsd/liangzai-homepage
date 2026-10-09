"use client";

import { useEffect, useState, type FormEvent } from "react";

export const subscriptionCategories = {
  pqc: "后量子密码", protocol: "抗量子协议", standards: "标准动态", security: "网络安全", ai: "AI 前沿",
};
const categoryDescriptions: Record<string, string> = {
  pqc: "算法与密码迁移", protocol: "TLS、SSH 等协议", standards: "标准与规范动态", security: "漏洞与安全研究", ai: "模型与应用进展",
};
export const subscriptionApi = "https://api.wangyibiao.com/api";
export async function subscriptionRequest(path: string, body?: unknown, secret?: string) {
  const response = await fetch(subscriptionApi + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "提交失败，请稍后再试。");
  return result;
}
export function CategoryChoices({ selected, onChange, disabled }: {
  selected: string[]; onChange: (values: string[]) => void; disabled?: boolean;
}) {
  return <fieldset className="subscription-categories" disabled={disabled}><legend>订阅板块 <span>已选 {selected.length} / 5 · 可多选</span></legend>
    <div>{Object.entries(subscriptionCategories).map(([key, label]) => <label key={key}>
      <input type="checkbox" name="categories" value={key} checked={selected.includes(key)} onChange={event => onChange(event.target.checked ? [...selected, key] : selected.filter(value => value !== key))} />
      <span><strong>{label}</strong><small>{categoryDescriptions[key]}</small></span>
    </label>)}</div>
  </fieldset>;
}

export default function SubscriptionForm({ action, token, initialCategory }: { action: string; token: string; initialCategory: string }) {
  const [selected, setSelected] = useState<string[]>(Object.hasOwn(subscriptionCategories, initialCategory) ? [initialCategory] : Object.keys(subscriptionCategories));
  const [channel, setChannel] = useState<"email" | "robot">("email");
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isAction = ["confirm", "manage", "unsubscribe"].includes(action);
  const needsDetails = action === "confirm" || action === "manage";
  useEffect(() => {
    if (!["manage", "confirm"].includes(action) || !token) return;
    let active = true;
    subscriptionRequest(`/subscriptions/${action === "confirm" ? "confirm" : "settings"}?token=${encodeURIComponent(token)}`).then(result => {
      if (active) { setSelected(result.categories); setEmail(result.email || ""); setVerified(Boolean(result.email_verified)); setLoaded(true); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "无法读取订阅信息。"); });
    return () => { active = false; };
  }, [action, token, attempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if ((!isAction || action === "manage") && !selected.length) { setError("请至少选择一个板块。"); return; }
    if (isAction && !token) { setError("链接不完整，请从邮件中重新打开。"); return; }
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const path = action === "manage" ? "/subscriptions/settings" : isAction ? `/subscriptions/${action}` : channel === "robot" ? "/robot-subscriptions" : "/subscriptions";
      const body = isAction ? { token, categories: selected } : {
        ...(channel === "robot" ? { webhook: form.get("webhook") } : { email: form.get("email") }), name: form.get("name"), reason: form.get("reason"), website: form.get("website"), categories: selected, consent: form.get("consent") === "on",
      };
      const result = await subscriptionRequest(path, body);
      if (!isAction) { setEmail(String(form.get("email") || "").trim()); setGroupName(String(form.get("name") || "").trim()); }
      setMessage(result.message); setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "网络异常，请稍后再试。"); }
    finally { setBusy(false); }
  }
  return <section className={`subscription-card subscription-form-card ${isAction ? "subscription-action-card" : ""}`} aria-label={isAction ? "管理日报订阅" : "日报订阅申请"} aria-busy={busy}>
    <div className="subscription-card-heading"><h2>{done && !isAction ? "申请已提交" : action === "confirm" ? done || verified ? "订阅已启用" : "最后一步，确认邮箱" : action === "unsubscribe" ? "退订日报" : action === "manage" ? "调整订阅板块" : "申请订阅"}</h2>
      {!isAction && <span className="subscription-review-badge">{done ? "等待审核" : "需管理员审核"}</span>}
    </div>
    {!isAction && !done && <ol className="subscription-steps" aria-label="订阅流程"><li><span>01</span>提交申请</li><li><span>02</span>管理员审核</li><li><span>03</span>{channel === "robot" ? "定时群推送" : "确认邮箱"}</li></ol>}
    {action === "confirm" && loaded && <>
      <div className="subscription-recipient"><span>{done || verified ? "日报收件邮箱" : "即将接收日报的邮箱"}</span><strong>{email}</strong><small>已通过管理员审核 · {done || verified ? "邮箱已确认" : "等待你确认邮箱"}</small></div>
      <p className="subscription-selection-label">你订阅的板块</p><ul className="subscription-topic-summary">{selected.map(key => <li key={key}>{subscriptionCategories[key as keyof typeof subscriptionCategories]}</li>)}</ul>
      {!done && !verified && <p className="subscription-footnote">确认后，完整日报发布时会向此邮箱发送所选板块，每日最多一封。如果这不是你的邮箱或申请，请关闭此页面。</p>}
      {verified && !done && <p role="status" className="subscription-message">此邮箱已确认，无需重复操作。下一份完整日报发布后将发送所选板块。</p>}
    </>}
    {needsDetails && token && !loaded && !error && <p role="status" className="subscription-loading">正在读取{action === "confirm" ? "收件邮箱和" : ""}订阅板块…</p>}
    {isAction && !token && <p role="alert" className="subscription-error">链接不完整，请从邮件中重新打开。</p>}
    {done && !isAction && <><div className="subscription-recipient"><span>{channel === "robot" ? "等待审核的群机器人" : "审核通过后，确认邮件将发送至"}</span><strong>{channel === "robot" ? groupName : email}</strong></div><p>{channel === "robot" ? "审核期间不会向群里发送消息。管理员通过申请后启用定时推送，并决定需要 @ 的成员。" : "请留意此邮箱的收件箱与垃圾邮件。完成审核和邮箱确认后，才会开始接收日报。"}</p></>}
    {action === "unsubscribe" && <p>确认退订后，将停止接收所有板块的日报。之后可重新申请。</p>}
    {action === "manage" && <p>修改板块将重新提交审核，审核期间暂停发送日报。</p>}
    {!done && !(action === "confirm" && verified) && <form onSubmit={submit}>
      {!isAction && <fieldset className="subscription-channels" disabled={busy}><legend>接收方式</legend><div>
        <label><input type="radio" name="channel" value="email" checked={channel === "email"} onChange={() => setChannel("email")} /><span><strong>邮箱日报</strong><small>一封邮件，汇总关注的板块</small></span></label>
        <label><input type="radio" name="channel" value="robot" checked={channel === "robot"} onChange={() => setChannel("robot")} /><span><strong>群机器人</strong><small>定时发到群，成员提醒由管理员设置</small></span></label>
      </div></fieldset>}
      {!isAction && channel === "robot" && <div className="subscription-robot-fields"><label className="subscription-field">机器人 webhook 地址<input name="webhook" type="url" autoComplete="off" spellCheck={false} maxLength={2048} required placeholder="复制机器人详情页的 webhook 地址" disabled={busy} aria-describedby="robot-webhook-help" /></label><p id="robot-webhook-help" className="subscription-field-help">支持 imtwo.zdxlz.com 的群机器人。地址包含密钥，请只填写你有权管理的机器人；服务端加密保存，不公开展示。</p><label className="subscription-field"><span className="subscription-field-label">群名称 / 申请人称呼</span><input name="name" maxLength={80} required placeholder="方便管理员识别这份申请" disabled={busy} /></label></div>}
      {!isAction && channel === "email" && <div className="subscription-contact-fields"><label className="subscription-field">邮箱地址<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" disabled={busy} /></label>
        <label className="subscription-field"><span className="subscription-field-label">称呼 <small>选填</small></span><input name="name" autoComplete="name" maxLength={80} placeholder="怎么称呼你？" disabled={busy} /></label>
      </div>}
      {(!isAction || action === "manage") && <CategoryChoices selected={selected} onChange={setSelected} disabled={busy || (action === "manage" && !loaded)} />}
      {!isAction && <><label className="subscription-field">申请理由<textarea name="reason" maxLength={500} required rows={2} placeholder="简述你的研究、工作或学习方向，供管理员审核（最多 500 字）。" disabled={busy} /></label>
        <div className="subscription-trap" aria-hidden="true"><label>网站<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="subscription-consent"><input name="consent" type="checkbox" required disabled={busy} /><span>{channel === "robot" ? "我有权配置此群机器人，并同意为审核与日报发送使用所填信息。通过审核后定时推送，@ 成员由管理员配置；调整或停止推送请联系管理员。" : "我同意为订阅审核与日报发送使用所填信息。审核通过并确认邮箱后开始接收，可随时退订。"}</span></label>
      </>}
      <button className="subscription-primary" type="submit" disabled={busy || (needsDetails && !loaded) || (isAction && !token)}>{busy ? "正在提交…" : action === "confirm" ? "确认邮箱并启用订阅" : action === "unsubscribe" ? "确认退订" : action === "manage" ? "提交板块调整审核" : "提交订阅申请"}</button>
    </form>}
    <p className="subscription-message" role="status">{message}</p>
    {error && <p className="subscription-error" role="alert">{error}</p>}
    {needsDetails && token && !loaded && error && <button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>重新读取订阅信息</button>}
    {!isAction && !done && <p className="subscription-footnote">{channel === "robot" ? "审核期间不发送群消息。完整日报发布后，所选板块逐条送达，每个板块一条消息。" : "审核期间不发送邮件。请使用本人邮箱；已订阅用户可通过日报中的「管理订阅板块」修改选择。"}</p>}
  </section>;
}
