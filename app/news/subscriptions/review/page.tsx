import type { Metadata } from "next";
import Link from "next/link";
import ReviewConsole from "./ReviewConsole";
import "../../subscribe/subscriptions.css";
import "./review.css";

export const metadata: Metadata = { title: "日报订阅审核 · 量仔", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SubscriptionReviewPage() {
  return <main id="main-content" className="subscription-page subscription-review">
    <Link className="subscription-back" href="/news">← 返回每日前沿</Link>
    <header><p className="subscription-eyebrow">量仔 · 订阅管理</p><h1>日报订阅审核</h1><p>审核邮箱和群机器人申请，配置各自的发送板块。邮箱确认后发送；群机器人可同时配置 @ 成员。</p></header>
    <ReviewConsole />
  </main>;
}
