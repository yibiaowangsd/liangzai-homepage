"use client";

import Link from "next/link";
import StoryImage from "../news/StoryImage";
import policy from "../../news/edition-policy.json";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

const labels: Record<string, string> = Object.fromEntries(
  Object.entries(policy.categories).map(([key, value]) => [key, value.label]),
);


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
    setPayload(null);
  }, [payload]);

  useEffect(() => {
    let cancelled = false;
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
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    return openNewsGateModal(
      dialogRef.current,
      closeButtonRef.current,
      dismiss,
    );
  }, [open, dismiss]);

  if (!payload?.edition_date) return null;
  if (!open)
    return (
      <aside className="news-edition-note" aria-label="今日新闻已更新">
        <button type="button" onClick={() => setOpen(true)}>
          <span>
            今日信号{" "}
            <time dateTime={payload.edition_date}>
              {payload.edition_date.slice(5).replace("-", ".")}
            </time>
          </span>
          <strong>
            看看世界的新进展 <i aria-hidden="true"></i>
          </strong>
        </button>
        <button type="button" onClick={dismiss} aria-label="关闭今日新闻提示">
          ×
        </button>
      </aside>
    );

  return (
    <dialog
      ref={dialogRef}
      className="news-gate"
      aria-labelledby="news-gate-title"
      aria-describedby="news-gate-description"
    >
      <button
        ref={closeButtonRef}
        className="news-gate-close"
        type="button"
        onClick={dismiss}
        aria-label="进入首页并关闭今日简报"
      >
        ×
      </button>

      <header>
        <div>
          <h2 id="news-gate-title">今日前沿</h2>
          <time dateTime={payload.edition_date}>
            {payload.edition_date.replaceAll("-", ".")}
          </time>
        </div>
        <p id="news-gate-description">值得关注的技术新闻与解读</p>
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
              <StoryImage item={item} />
            </div>
            <span>{labels[item.category] || item.category}</span>
            <h3>{item.title}</h3>
            <small>{item.source_name || "原始来源"}</small>
          </Link>
        ))}
      </div>

      <footer>
        <button type="button" onClick={dismiss}>
          浏览首页
        </button>
        <Link href="/news" onClick={dismiss}>
          查看全部新闻{" "}

        </Link>
      </footer>
    </dialog>
  );
}
