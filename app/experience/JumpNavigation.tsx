"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { searchDestinations } from "./destinations";
import { normalizeSearchQuery, searchPublishedNews, type NewsSearchResult } from "../../public/assets/news-search.js";
import { categoryLabels } from "../news/news-api";
import "./jump-navigation.css";

export default function JumpNavigation({
  onOpen,
  blocked = false,
}: {
  onOpen: () => void;
  blocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [news, setNews] = useState<{ query: string; results: NewsSearchResult[]; total: number; status: "loading" | "ready" | "error" }>({ query: "", results: [], total: 0, status: "ready" });
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const items = useRef<HTMLUListElement>(null);
  const path = usePathname();
  const normalizedQuery = normalizeSearchQuery(query);
  const articleResults = news.query === normalizedQuery && normalizedQuery ? news.results : [];
  const destinations = searchDestinations(normalizedQuery);
  const searching = !!normalizedQuery && (news.query !== normalizedQuery || news.status === "loading");
  const searchFailed = news.query === normalizedQuery && news.status === "error";
  const results = [
    ...articleResults.map(item => ({ ...item, kind: "article" as const, detail: ["新闻", item.date, categoryLabels[item.category], item.source].filter(Boolean).join(" · ") })),
    ...destinations.map(item => ({ ...item, kind: "destination" as const, detail: "栏目" })),
  ];
  const openRef = useRef(onOpen);
  const blockedRef = useRef(blocked);
  useEffect(() => {
    openRef.current = onOpen;
    blockedRef.current = blocked;
  }, [onOpen, blocked]);
  useEffect(() => {
    if (!open || !normalizedQuery) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setNews({ query: normalizedQuery, results: [], total: 0, status: "loading" });
      try {
        const payload = await searchPublishedNews(normalizedQuery, { signal: controller.signal });
        if (!controller.signal.aborted) setNews({ query: normalizedQuery, ...payload, status: "ready" });
      } catch {
        if (!controller.signal.aborted) setNews({ query: normalizedQuery, results: [], total: 0, status: "error" });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, normalizedQuery]);
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (blockedRef.current) return;
        // A news or fusion modal retains ownership of the keyboard.
        if (document.querySelector("dialog[open]") && !dialog.current?.open)
          return;
        event.preventDefault();
        openRef.current();
        setOpen((previous) => !previous);
        setQuery("");
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const el = dialog.current;
    if (!el?.showModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    input.current?.focus();
    const dismissForNavigation = () => flushSync(() => setOpen(false));
    document.addEventListener("liangzai:close-directory", dismissForNavigation);
    return () => {
      document.removeEventListener("liangzai:close-directory", dismissForNavigation);
      if (el.open) el.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  // Native dialog traps focus; arrows move between actual links rather than synthetic options.
  function move(event: KeyboardEvent) {
    const links = Array.from(
      items.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
    );
    if (!links.length) return;
    if (event.key === "Enter" && event.target === input.current) {
      event.preventDefault();
      links[0].click();
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % links.length
        : index <= 0
          ? links.length - 1
          : index - 1;
    links[next].focus();
  }
  return (
    <>
      <button
        type="button"
        className="jump-trigger"
        disabled={blocked}
        aria-label="搜索全站，快捷键 Ctrl 或 Command 加 K"
        aria-haspopup="dialog"
        onClick={() => {
          onOpen();
          setQuery("");
          setOpen(true);
        }}
      >
        <span>搜索</span>
        <kbd>K</kbd>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="jump-dialog"
          aria-labelledby="jump-title"
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
          onClick={(event) => {
            if (event.target === dialog.current) {
              const b = dialog.current.getBoundingClientRect();
              if (
                event.clientX < b.left ||
                event.clientX > b.right ||
                event.clientY < b.top ||
                event.clientY > b.bottom
              )
                setOpen(false);
            }
          }}
        >
          <div className="jump-heading">
            <div>
              <p>查找文章与栏目</p>
              <h2 id="jump-title">搜索全站</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭搜索"
            >
              关闭 <kbd>Esc</kbd>
            </button>
          </div>
          <label className="jump-search" htmlFor="jump-query">
            <span>搜索</span>
            <input
              ref={input}
              id="jump-query"
              type="search"
              value={query}
              placeholder="搜索文章、算法或栏目，如 AWS、ML-KEM"
              autoComplete="off"
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={move}
              aria-controls="jump-results"
            />
          </label>
          <p className="jump-result-count" role="status">
            {!normalizedQuery ? "所有栏目" : searching ? "正在搜索新闻…" : searchFailed ? "新闻搜索暂时不可用，可继续浏览栏目" : `${news.total > articleResults.length ? `显示 ${articleResults.length} / ${news.total}` : articleResults.length} 篇新闻 · ${destinations.length} 个栏目`}
          </p>
          <ul
            ref={items}
            id="jump-results"
            className="jump-results"
            onKeyDown={move}
            aria-busy={searching}
          >
            {results.map((item, i) => {
              const content = (
                <>
                  <span className="jump-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small className="jump-result-detail">{item.detail}</small>
                    <small>{item.description}</small>
                  </span>
                  <span aria-hidden="true"></span>
                </>
              );
              const props = {
                className: "jump-result",
                onClick: () => setOpen(false),
                "aria-current":
                  path === item.href.split("?")[0] ? ("page" as const) : undefined,
              };
              return (
                <li key={item.href}>
                  {(i === 0 || i === articleResults.length) && <p className="jump-group-label">{item.kind === "article" ? "新闻文章" : "栏目导航"}</p>}
                  {item.href === "/pqc-practice" ? (
                    <a href={item.href} {...props}>
                      {content}
                    </a>
                  ) : (
                    <Link href={item.href} {...props}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          {normalizedQuery && !searching && !searchFailed && !results.length && (
            <p className="jump-empty">
              没有找到匹配的文章或栏目。试试其他关键词。
            </p>
          )}
          <div className="jump-help">
            <span>↑ ↓ 选择 · Enter 进入</span>
            <span>Ctrl / ⌘ K 随时打开</span>
          </div>
        </dialog>
      )}
    </>
  );
}
