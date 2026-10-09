import type { Metadata } from "next";
import Link from "next/link";
import ReviewConsole from "./ReviewConsole";
import "../../subscribe/subscriptions.css";
import "./review.css";

export const metadata: Metadata = { title: "日报订阅审核 · 量仔", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SubscriptionReviewPage() {
  return <main id="main-content" className="subscription-page subscription-review">
    <Link className="subscription-back" href="/news">← 返回每日前沿</Link>
    <header><p className="subscription-eyebrow">量仔 · 订阅管理</p><h1>日报订阅审核</h1><p>审核申请与所选板块。通过后由收件人确认邮箱，才会开始发送日报。</p></header>
    <ReviewConsole />
  </main>;
}
