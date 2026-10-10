import type { Metadata } from "next";
import Link from "next/link";
import SubscriptionForm from "./SubscriptionForm";
import policy from "../../../news/edition-policy.json";
import "./subscriptions.css";

export const metadata: Metadata = {
  title: "日报订阅 · 量仔",
  description: "选择新闻板块，通过邮箱或群机器人接收量仔日报；两种方式均需管理员审核。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SubscribePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const action = value("action");
  const isAction = ["confirm", "manage", "unsubscribe"].includes(action);
  return (
    <main id="main-content" className={`subscription-page ${isAction ? "subscription-action-page" : "subscription-apply-page"}`}>
      <Link className="subscription-back" href="/news">← 返回每日前沿</Link>
      <div className="subscription-layout">
        <header className="subscription-intro">
          <p className="subscription-eyebrow">量仔 · 日报订阅</p>
          <h1>{isAction ? action === "confirm" ? "确认你的订阅邮箱" : action === "manage" ? "关注随你，板块随选" : "管理你的日报订阅" : <>每日前沿，<br /><span>按你的关注送达</span></>}</h1>
          <p>{isAction ? action === "confirm" ? "请核对收件邮箱与订阅板块，确认后开始接收日报。" : "通过邮件中的专属链接，管理自己的订阅。" : "关注后量子算法、迁移、协议、标准、安全、AI 与 NGCC 公钥征集。选择邮箱或群机器人，完整日报发布后按你的订阅送达。"}</p>
          {!isAction && <>
            <div className="subscription-benefits"><span>自选 {Object.keys(policy.categories).length} 个板块</span><span>邮箱 / 群机器人</span><span>审核后启用</span></div>
            <section className="subscription-preview" aria-labelledby="subscription-preview-title">
              <p className="subscription-eyebrow">你会收到什么</p><h2 id="subscription-preview-title">一份精简的阅读清单</h2>
              <ul><li><strong>关心的进展</strong><span>每个所选板块优先选编 {policy.min_per_category}—{policy.max_per_category} 条，资料不足时说明。</span></li><li><strong>先读摘要，再看原文</strong><span>新闻摘要、完整报道与原始来源链接。</span></li><li><strong>由你决定接收内容</strong><span>邮箱可通过邮件管理；机器人由管理员调整或停止推送。</span></li></ul>
            </section>
          </>}
        </header>
        <SubscriptionForm key={`${action}:${value("token")}`} action={action} token={value("token")} initialCategory={value("category")} />
      </div>
    </main>
  );
}
