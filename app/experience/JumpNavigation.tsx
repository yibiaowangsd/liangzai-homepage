"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { searchDestinations } from "./destinations";
import { normalizeSearchQuery, searchPublishedNews, type NewsSearchResult } from "../../public/assets/news-search.js";
import { defaultLocale, formatMessage } from "../i18n/locales";
import { useSiteLanguage } from "../i18n/LocaleProvider";
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
  const { locale, chrome } = useSiteLanguage();
  const copy = chrome.search;
  const categories: Record<string, string> = chrome.categories;
  const normalizedQuery = normalizeSearchQuery(query);
  const articleResults = news.query === normalizedQuery && normalizedQuery ? news.results : [];
  const destinations = searchDestinations(normalizedQuery, chrome.destinations);
  const searching = !!normalizedQuery && (news.query !== normalizedQuery || news.status === "loading");
  const searchFailed = news.query === normalizedQuery && news.status === "error";
  const results = [
    ...articleResults.map(item => ({
      ...item,
      kind: "article" as const,
      detail: [copy.article, item.date, Object.hasOwn(categories, item.category) ? categories[item.category] : "", item.source].filter(Boolean).join(" · "),
    })),
    ...destinations.map(item => ({ ...item, kind: "destination" as const, detail: copy.section })),
  ];
  const number = new Intl.NumberFormat(locale);
  const articles = number.format(articleResults.length);
  const sections = number.format(destinations.length);
  const resultCount = news.total > articleResults.length
    ? formatMessage(copy.partial, { count: articles, total: number.format(news.total), sections })
    : formatMessage(copy.results, { articles, sections });
  const resultStatus = !normalizedQuery ? copy.all : searching ? copy.loading : searchFailed ? copy.error
    : resultCount;
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
        aria-label={copy.open}
        aria-haspopup="dialog"
        onClick={() => {
          onOpen();
          setQuery("");
          setOpen(true);
        }}
      >
        <svg className="jump-search-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
        <span>{copy.button}</span>
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
              <p>{copy.find}</p>
              <h2 id="jump-title">{copy.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.closeLabel}
            >
              {copy.close} <kbd>Esc</kbd>
            </button>
          </div>
          <label className="jump-search" htmlFor="jump-query">
            <span>{copy.button}</span>
            <input
              ref={input}
              id="jump-query"
              type="search"
              value={query}
              placeholder={copy.placeholder}
              autoComplete="off"
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={move}
              aria-controls="jump-results"
            />
          </label>
          <p className="jump-result-count" role="status">
            {resultStatus}
          </p>
          <ul
            ref={items}
            id="jump-results"
            className="jump-results"
            onKeyDown={move}
            aria-busy={searching}
          >
            {results.map((item, i) => {
              const article = item.kind === "article";
              const content = (
                <>
                  <span className="jump-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong lang={article ? defaultLocale : undefined}>{item.name}</strong>
                    <small className="jump-result-detail">{item.detail}</small>
                    <small lang={article ? defaultLocale : undefined}>{item.description}</small>
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
                  {(i === 0 || i === articleResults.length) && <p className="jump-group-label">{article ? copy.articles : copy.sections}</p>}
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
              {copy.empty}
            </p>
          )}
          <div className="jump-help">
            <span>{copy.keys}</span>
            <span>{copy.shortcut}</span>
          </div>
        </dialog>
      )}
    </>
  );
}
