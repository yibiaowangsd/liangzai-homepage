"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, useExperience } from "./Motion";

const links = [
  ["/", "探索首页", "EXPLORE"],
  ["/storybook", "星际漫游", "STORY"],
  ["/archive", "量仔小传", "CHARACTER"],
  ["/pqc-arsenal", "密码图鉴", "ARSENAL"],
  ["/pqc-practice", "密码实验室", "PRACTICE"],
  ["/about", "关于我", "ABOUT ME"],
];
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { enabled, paused, toggle } = useExperience();
  useGSAP(
    () => {
      if (!open || !enabled) return;
      gsap.from("a", {
        y: 24,
        autoAlpha: 0,
        stagger: 0.065,
        duration: 0.65,
        ease: "power3.out",
      });
    },
    { scope: menu, dependencies: [open, enabled], revertOnUpdate: true },
  );
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = menu.current?.querySelector<HTMLAnchorElement>("a");
    first?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const items = [
          trigger.current,
          ...Array.from(menu.current?.querySelectorAll<HTMLElement>("a") || []),
        ].filter(Boolean) as HTMLElement[];
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && i === 0) {
          event.preventDefault();
          items[items.length - 1].focus();
        }
        if (!event.shiftKey && i === items.length - 1) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", resize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", key);
      desktop.removeEventListener("change", resize);
    };
  }, [open]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-chrome">
        <Link
          className="brand"
          href="/"
          aria-label="量仔首页"
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            <img src="/assets/liangzai-mark.svg" width="40" height="40" alt="" />
          </span>
          <strong>
            量仔<span>LIANGZAI</span>
          </strong>
        </Link>
        <nav className="desktop-nav" aria-label="主导航">
          {links.map(([href, text]) =>
            href.endsWith(".html") ? (
              <a href={href} key={href}>{text}</a>
            ) : (
              <Link
                href={href}
                key={href}
                aria-current={path === href ? "page" : undefined}
              >
                {text}
              </Link>
            ),
          )}
        </nav>
        <div className="chrome-actions">
          <button
            className="motion-switch"
            onClick={toggle}
            aria-pressed={paused}
            aria-label={paused ? "开启动效" : "暂停动效"}
          >
            <span className="equalizer" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{paused ? "动效关" : "动效开"}</span>
          </button>
          <button
            ref={trigger}
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label={open ? "关闭导航" : "打开导航"}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      {open && (
        <div ref={menu} id="mobile-menu" className="mobile-menu">
          <nav aria-label="移动导航">
            {links.map(([href, text, en], i) => {
              const content = <><small>0{i + 1} / {en}</small><span>{text}</span></>;
              return href.endsWith(".html") ? (
                <a key={href} href={href} onClick={() => setOpen(false)}>{content}</a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={path === href ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
          <p>STAY CURIOUS. GO BEYOND.</p>
        </div>
      )}
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="world-footer">
      <div>
        <Link className="footer-title" href="/">
          LIANGZAI
        </Link>
        <p>以好奇为起点。与未来，共振。</p>
      </div>
      <nav aria-label="页脚导航">
        {links.slice(1).map(([href, text]) =>
          href.endsWith(".html") ? (
            <a key={href} href={href}>{text}</a>
          ) : (
            <Link key={href} href={href}>{text}</Link>
          ),
        )}
      </nav>
      <div className="footer-bottom">
        <span>© 2026 LIANGZAI · A QUANTUM EXPLORATION</span>
        <a href="#main-content">回到顶部</a>
        <span>MADE OF CURIOSITY</span>
      </div>
    </footer>
  );
}
