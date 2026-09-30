"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GateItem = {
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  source_name: string | null;
  cover_image: string | null;
};

type GatePayload = {
  edition_date: string | null;
  data: GateItem[];
};

const labels: Record<string, string> = {
  pqc: "后量子密码",
  protocol: "抗量子协议",
  standards: "标准动态",
  security: "网络安全",
  ai: "AI 前沿",
};

const covers: Record<string, string> = {
  pqc: "/news-covers/pqc.svg",
  protocol: "/news-covers/protocol.svg",
  standards: "/news-covers/standards.svg",
  security: "/news-covers/security.svg",
  ai: "/news-covers/ai.svg",
};

export default function NewsGate() {
  const [payload, setPayload] = useState<GatePayload | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.wangyibiao.com/api/news/featured?limit=6", {
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("news feed unavailable");
        return response.json() as Promise<GatePayload>;
      })
      .then((data) => {
        if (cancelled || !data.edition_date || !data.data?.length) return;
        const key = "liangzai-news-gate:" + data.edition_date;
        if (window.localStorage.getItem(key) === "dismissed") return;
        setPayload(data);
        window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 260);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !payload?.edition_date) return null;

  const dismiss = () => {
    window.localStorage.setItem(
      "liangzai-news-gate:" + payload.edition_date,
      "dismissed",
    );
    setOpen(false);
  };

  return (
    <div className="news-gate-backdrop" role="presentation">
      <section className="news-gate" role="dialog" aria-modal="true" aria-labelledby="news-gate-title">
        <button className="news-gate-close" type="button" onClick={dismiss} aria-label="进入首页并关闭今日简报">
          ×
        </button>

        <header>
          <div>
            <span>FRONTIER / DAILY · {payload.edition_date.replaceAll("-", ".")}</span>
            <h2 id="news-gate-title">今天，先看世界发生了什么。</h2>
          </div>
          <p>五个方向 · 每个方向 5 条 · 原始来源可追溯</p>
        </header>

        <div className="news-gate-grid">
          {payload.data.slice(0, 6).map((item, index) => (
            <Link
              className={"news-gate-card gate-" + index}
              href={"/news/" + item.slug}
              key={item.slug}
              onClick={dismiss}
            >
              <div className="gate-thumb">
                <img src={item.cover_image || covers[item.category] || covers.pqc} alt="" aria-hidden="true" />
              </div>
              <span>{labels[item.category] || item.category}</span>
              <h3>{item.title}</h3>
              <small>{item.source_name || "原始来源"}</small>
            </Link>
          ))}
        </div>

        <footer>
          <button type="button" onClick={dismiss}>进入首页</button>
          <Link href="/news" onClick={dismiss}>
            进入每日前沿 <span aria-hidden="true">↗</span>
          </Link>
        </footer>
      </section>
    </div>
  );
}
