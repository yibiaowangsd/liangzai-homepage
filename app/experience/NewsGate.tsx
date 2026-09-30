"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  isNewsEditionDismissed,
  openNewsGateModal,
  rememberNewsEditionDismissed,
} from "./news-gate-modal.ts";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    if (payload?.edition_date) {
      rememberNewsEditionDismissed(payload.edition_date);
    }
    setOpen(false);
  }, [payload]);

  useEffect(() => {
    let cancelled = false;
    let openTimer: number | undefined;
    const controller = new AbortController();
    fetch("https://api.wangyibiao.com/api/news/featured?limit=6", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("news feed unavailable");
        return response.json() as Promise<GatePayload>;
      })
      .then((data) => {
        if (cancelled || !data.edition_date || !data.data?.length) return;
        if (isNewsEditionDismissed(data.edition_date)) return;
        setPayload(data);
        openTimer = window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 260);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(openTimer);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    return openNewsGateModal(dialogRef.current, closeButtonRef.current, dismiss);
  }, [open, dismiss]);

  if (!open || !payload?.edition_date) return null;

  return (
    <dialog ref={dialogRef} className="news-gate" aria-labelledby="news-gate-title" aria-describedby="news-gate-description">
      <button ref={closeButtonRef} className="news-gate-close" type="button" onClick={dismiss} aria-label="进入首页并关闭今日简报">
        ×
      </button>

      <header>
        <div>
          <span>FRONTIER / DAILY · {payload.edition_date.replaceAll("-", ".")}</span>
          <h2 id="news-gate-title">今天，先看世界发生了什么。</h2>
        </div>
        <p id="news-gate-description">五个方向 · 每个方向 5 条 · 原始来源可追溯</p>
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
    </dialog>
  );
}
