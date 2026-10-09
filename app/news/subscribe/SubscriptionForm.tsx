"use client";

import { useEffect, useState, type FormEvent } from "react";

export const subscriptionCategories = {
  pqc: "后量子密码", protocol: "抗量子协议", standards: "标准动态", security: "网络安全", ai: "AI 前沿",
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
  return <fieldset className="subscription-categories" disabled={disabled}><legend>订阅板块 <span>可多选，至少一项</span></legend>
    <div>{Object.entries(subscriptionCategories).map(([key, label]) => <label key={key}>
      <input type="checkbox" name="categories" value={key} checked={selected.includes(key)} onChange={event => onChange(event.target.checked ? [...selected, key] : selected.filter(value => value !== key))} />
      <span>{label}</span>
    </label>)}</div>
  </fieldset>;
}

export default function SubscriptionForm({ action, token, initialCategory }: { action: string; token: string; initialCategory: string }) {
  const [selected, setSelected] = useState<string[]>(Object.hasOwn(subscriptionCategories, initialCategory) ? [initialCategory] : Object.keys(subscriptionCategories));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const isAction = ["confirm", "manage", "unsubscribe"].includes(action);
  useEffect(() => {
    if (action !== "manage" || !token) return;
    let active = true;
    subscriptionRequest(`/subscriptions/settings?token=${encodeURIComponent(token)}`).then(result => {
      if (active) { setSelected(result.categories); setLoaded(true); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "无法读取订阅信息。"); });
    return () => { active = false; };
  }, [action, token]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if ((!isAction || action === "manage") && !selected.length) { setError("请至少选择一个板块。"); return; }
    if (isAction && !token) { setError("链接不完整，请从邮件中重新打开。"); return; }
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const path = action === "manage" ? "/subscriptions/settings" : isAction ? `/subscriptions/${action}` : "/subscriptions";
      const body = isAction ? { token, categories: selected } : {
        email: form.get("email"), name: form.get("name"), reason: form.get("reason"), website: form.get("website"), categories: selected, consent: form.get("consent") === "on",
      };
      const result = await subscriptionRequest(path, body);
      setMessage(result.message); setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "网络异常，请稍后再试。"); }
    finally { setBusy(false); }
  }
  return <section className="subscription-card" aria-label={isAction ? "管理日报订阅" : "日报订阅申请"}>
    <h2>{action === "confirm" ? "确认邮箱" : action === "unsubscribe" ? "退订日报" : action === "manage" ? "调整订阅板块" : "申请订阅"}</h2>
    {!isAction && <ol className="subscription-steps"><li>提交申请</li><li>管理员审核</li><li>邮件确认后开始接收</li></ol>}
    {action === "confirm" && <p>申请通过审核后，仍需你确认邮箱。点击下方按钮启用日报订阅。</p>}
    {action === "unsubscribe" && <p>确认退订后，将停止接收所有板块的日报。之后可重新申请。</p>}
    {action === "manage" && <p>修改板块将重新提交审核，审核期间暂停发送日报。</p>}
    {!done && <form onSubmit={submit}>
      {!isAction && <><label className="subscription-field">邮箱地址<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" disabled={busy} /></label>
        <label className="subscription-field">称呼 <span>选填</span><input name="name" autoComplete="name" maxLength={80} disabled={busy} /></label>
      </>}
      {(!isAction || action === "manage") && <CategoryChoices selected={selected} onChange={setSelected} disabled={busy || (action === "manage" && !loaded)} />}
      {!isAction && <><label className="subscription-field">申请理由<textarea name="reason" maxLength={500} required rows={3} placeholder="想关注哪些研究、工作或学习方向？供管理员审核，最多 500 字。" disabled={busy} /></label>
        <div className="subscription-trap" aria-hidden="true"><label>网站<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="subscription-consent"><input name="consent" type="checkbox" required disabled={busy} /><span>我同意为审核与发送日报使用所填信息。审核通过并确认邮箱后才开始接收，每日最多一封，可随时退订。</span></label>
      </>}
      <button className="subscription-primary" type="submit" disabled={busy || (action === "manage" && !loaded) || (isAction && !token)}>{busy ? "正在提交…" : action === "confirm" ? "确认邮箱并启用订阅" : action === "unsubscribe" ? "确认退订" : action === "manage" ? "提交板块调整审核" : "提交订阅申请"}</button>
    </form>}
    <p className="subscription-message" role="status">{message}</p>
    {error && <p className="subscription-error" role="alert">{error}</p>}
    {!isAction && <p className="subscription-footnote">审核期间不发送邮件。请使用本人邮箱；信息仅用于订阅审核与日报服务。已订阅用户通过日报中的「管理订阅板块」修改选择。</p>}
  </section>;
}
