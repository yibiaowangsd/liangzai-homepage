"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { useExperience } from "./Motion";
import { destinations } from "./destinations";
import JumpNavigation from "./JumpNavigation";
import ThemePicker from "../theme/ThemePicker";

function NavigationLink({
  href,
  ...props
}: ComponentProps<"a"> & { href: string }) {
  return href === "/pqc-practice" ? (
    <a href={href} {...props} />
  ) : (
    <Link href={href} {...props} />
  );
}
const previews: Record<string, string> = {
  "/": "/assets/characters-v2/arsenal-liangzai-cutout.webp",
  "/models": "/assets/models/observatory/duo-front.webp",
  "/storybook": "/assets/book-v2/09-final-battle.webp",
  "/archive": "/assets/characters-v2/archive-origin.webp",
  "/pqc-arsenal": "/assets/pqc/ml-kem-studio-v2.webp",
  "/pqc-practice": "/assets/pqc/ml-dsa-studio-v2.webp",
  "/news": "/news-covers/security.svg",
  "/about": "/assets/characters-v2/archive-after.webp",
};
export function SiteHeader() {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState(destinations[0]);
  const dialog = useRef<HTMLDialogElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const { paused, toggle } = useExperience();
  useLayoutEffect(() => {
    if (!open) return;
    const el = dialog.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    close.current?.focus();
    // Capture-phase transitions must release the top layer and scroll lock first.
    const dismissForNavigation = () => flushSync(() => setOpen(false));
    document.addEventListener("liangzai:close-directory", dismissForNavigation);
    return () => {
      document.removeEventListener("liangzai:close-directory", dismissForNavigation);
      if (el.open) el.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-chrome" data-scene={path === "/" ? "home" : "page"}>
        <Link className="brand" href="/" aria-label="量仔首页">
          <span className="brand-mark" aria-hidden="true">
            <img
              src="/assets/liangzai-mark.svg"
              width="36"
              height="36"
              alt=""
            />
          </span>
          <strong>
            量仔<span>密码工程与实验</span>
          </strong>
        </Link>
        <nav className="desktop-nav" aria-label="主导航">
          {destinations
            .filter((item) =>
              ["/", "/pqc-practice", "/news", "/about"].includes(item.href),
            )
            .map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={path === item.href ? "page" : undefined}
              >
                {item.href === "/" ? "首页" : item.name}
              </NavigationLink>
            ))}
        </nav>
        <div className="chrome-actions">
          <JumpNavigation blocked={open} onOpen={() => setOpen(false)} />
          <button
            className="menu-toggle"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="site-atlas"
            onClick={() => setOpen(true)}
            aria-label="打开设置与目录"
          >
            <span>设置</span>
            <i aria-hidden="true">＋</i>
          </button>
        </div>
      </header>
      {open && (
        <dialog
          ref={dialog}
          className="site-atlas"
          id="site-atlas"
          aria-label="设置与目录"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button, a[href], select",
              ),
            );
            const first = items[0],
              last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <div className="atlas-top">
            <span>量仔 / 密码工程与实验</span>
            <button
              ref={close}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭全站目录"
            >
              关闭 <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="site-preferences" aria-label="显示设置">
            <ThemePicker />
            <button className="settings-motion" type="button" onClick={toggle} aria-pressed={paused}>
              {paused ? "开启动效" : "暂停动效"}
            </button>
          </div>
          <div className="atlas-body">
            <div className="atlas-preview">
              <h2 id="atlas-title">
                去你想去
                <br />
                的地方
              </h2>
              <div className="atlas-preview-image">
                <img
                  src={previews[preview.href]}
                  alt=""
                  width="700"
                  height="600"
                />
              </div>
              <p>{preview.description}</p>
            </div>
            <nav className="atlas-links" aria-label="全站导航">
              {destinations.map((item, i) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  onPointerEnter={() => setPreview(item)}
                  onFocus={() => setPreview(item)}
                  onClick={() => setOpen(false)}
                  aria-current={path === item.href ? "page" : undefined}
                >
                  <small>0{i + 1}</small>
                  <span>{item.name}</span>

                </NavigationLink>
              ))}
            </nav>
          </div>
          <div className="atlas-bottom">
            <span>保持认真。保持好奇。</span>
            <span>Esc 关闭 / Ctrl + K 搜索</span>
          </div>
        </dialog>
      )}
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="studio-footer">
      <div className="studio-footer-top">
        <p>Yibiao · 后量子密码工程</p>
        <a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer" className="studio-footer-cta">GitHub</a>
      </div>
      <nav className="footer-groups" aria-label="页脚导航">
        <div><span>作品</span><a href="https://github.com/yibiaowangsd/liangzai-homepage" target="_blank" rel="noreferrer">本站源码</a><Link href="/models">角色模型</Link></div>
        <div><span>阅读</span><Link href="/pqc-arsenal">算法原理</Link><Link href="/archive">量仔小传</Link></div>
        <div><span>关于</span><Link href="/about#journey">个人经历</Link><Link href="/about#contact">联系与交流</Link></div>
      </nav>
      <div className="studio-footer-bottom">
        <span>© 2026 量仔 · Yibiao</span>
        <span>算法 · 协议 · 工程实践</span>
        <a href="#main-content">回到顶部 ↑</a>
      </div>
    </footer>
  );
}
