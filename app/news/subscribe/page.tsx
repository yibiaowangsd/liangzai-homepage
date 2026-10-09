import type { Metadata } from "next";
import Link from "next/link";
import SubscriptionForm from "./SubscriptionForm";
import "./subscriptions.css";

export const metadata: Metadata = {
  title: "日报订阅 · 量仔",
  description: "选择感兴趣的新闻板块，申请审核通过并确认邮箱后接收量仔日报。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SubscribePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return (
    <main id="main-content" className="subscription-page">
      <Link className="subscription-back" href="/news">← 返回每日前沿</Link>
      <header><p className="subscription-eyebrow">量仔 · 每日前沿</p><h1>把关心的前沿，送到邮箱</h1>
        <p>选择新闻板块，完整日报发布后接收当天摘要与阅读链接。</p></header>
      <SubscriptionForm action={value("action")} token={value("token")} initialCategory={value("category")} />
    </main>
  );
}
