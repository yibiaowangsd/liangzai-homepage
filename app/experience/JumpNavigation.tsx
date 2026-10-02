"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { searchDestinations } from "./destinations";
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
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const items = useRef<HTMLUListElement>(null);
  const path = usePathname();
  const results = searchDestinations(query);
  const openRef = useRef(onOpen);
  const blockedRef = useRef(blocked);
  useEffect(() => {
    openRef.current = onOpen;
    blockedRef.current = blocked;
  }, [onOpen, blocked]);
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
  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    if (!el?.showModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
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
        aria-label="打开跃迁导航，快捷键 Ctrl 或 Command 加 K"
        aria-haspopup="dialog"
        onClick={() => {
          onOpen();
          setQuery("");
          setOpen(true);
        }}
      >
        <span>跃迁</span>
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
              <p>找到下一个目的地</p>
              <h2 id="jump-title">从好奇心，跃迁。</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭跃迁导航"
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
              placeholder="试试「星空」「算法」「新闻」"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={move}
              aria-controls="jump-results"
            />
          </label>
          <p className="jump-result-count" role="status">
            {query ? `${results.length} 个目的地` : "所有目的地"}
          </p>
          <ul
            ref={items}
            id="jump-results"
            className="jump-results"
            onKeyDown={move}
          >
            {results.map((item, i) => {
              const content = (
                <>
                  <span className="jump-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span aria-hidden="true"></span>
                </>
              );
              const props = {
                className: "jump-result",
                onClick: () => setOpen(false),
                "aria-current":
                  path === item.href ? ("page" as const) : undefined,
              };
              return (
                <li key={item.href}>
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
          {!results.length && (
            <p className="jump-empty">
              还没有这个目的地。试试「故事」「实验」或清空搜索。
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
