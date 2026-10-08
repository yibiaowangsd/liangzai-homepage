"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { useExperience } from "./Motion";
import { destinations } from "./destinations";
import JumpNavigation from "./JumpNavigation";
import ThemePicker from "../theme/ThemePicker";
import { navGroups, languageHref, localizedHref } from "../site/navigation";

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
  const en = path.startsWith("/en");
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
        {en ? "Skip to content" : "跳到主要内容"}
      </a>
      <header className="site-chrome" data-scene={path === "/" ? "home" : "page"}>
        <Link className="brand" href="/" aria-label={en ? "Yibiao Home" : "Yibiao 首页"}>
          <span className="brand-mark" aria-hidden="true">
            <img
              src="/assets/liangzai-mark.svg"
              width="36"
              height="36"
              alt=""
            />
          </span>
          <strong>
            Yibiao<span>{en ? "Cryptography Engineering" : "密码工程与实验"}</span>
          </strong>
        </Link>
        <nav className="desktop-nav" aria-label={en ? "Main navigation" : "主导航"}>
          {navGroups.map(group => <details name="primary-navigation" className="nav-group" key={group.name}>
            <summary>{en ? group.en : group.name}</summary>
            <div className="nav-group-menu">{group.links.map(item => <NavigationLink key={item.href} href={localizedHref(item.href, en)} aria-current={path === localizedHref(item.href, en) ? "page" : undefined}>{en ? item.en : item.name}</NavigationLink>)}</div>
          </details>)}
        </nav>
        <div className="chrome-actions">
          <ThemePicker en={en} />
          <a className="language-link" href={languageHref(path)} lang={en ? "zh-CN" : "en"}>{en ? "中文" : "EN"}</a>
          <JumpNavigation blocked={open} onOpen={() => setOpen(false)} />
          <button
            className="menu-toggle"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="site-atlas"
            onClick={() => setOpen(true)}
            aria-label={en ? "Open settings and directory" : "打开设置与目录"}
          >
            <span>{en ? "Settings" : "设置"}</span>
            <i aria-hidden="true">＋</i>
          </button>
        </div>
      </header>
      {open && (
        <dialog
          ref={dialog}
          className="site-atlas"
          id="site-atlas"
          aria-label={en ? "Settings and directory" : "设置与目录"}
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
            <span>Yibiao / {en ? "Cryptography Engineering" : "密码工程与实验"}</span>
            <button
              ref={close}
              type="button"
              onClick={() => setOpen(false)}
              aria-label={en ? "Close directory" : "关闭全站目录"}
            >
              {en ? "Close" : "关闭"} <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="site-preferences" aria-label={en ? "Display settings" : "显示设置"}>
            <ThemePicker en={en} />
            <button className="settings-motion" type="button" onClick={toggle} aria-pressed={paused}>
              {en ? (paused ? "Enable motion" : "Pause motion") : (paused ? "开启动效" : "暂停动效")}
            </button>
          </div>
          <div className="atlas-body">
            <div className="atlas-preview">
              <h2 id="atlas-title">
                {en ? "Choose your" : "去你想去"}
                <br />
                {en ? "destination" : "的地方"}
              </h2>
              <div className="atlas-preview-image">
                <img
                  src={previews[preview.href]}
                  alt=""
                  width="700"
                  height="600"
                />
              </div>
              <p>{en ? preview.descriptionEn : preview.description}</p>
            </div>
            <nav className="atlas-links" aria-label={en ? "Site directory" : "全站导航"}>
              {destinations.map((item, i) => (
                <NavigationLink
                  key={item.href}
                  href={localizedHref(item.href, en)}
                  onPointerEnter={() => setPreview(item)}
                  onFocus={() => setPreview(item)}
                  onClick={() => setOpen(false)}
                  aria-current={path === item.href ? "page" : undefined}
                >
                  <small>0{i + 1}</small>
                  <span>{en ? item.en : item.name}</span>

                </NavigationLink>
              ))}
            </nav>
          </div>
          <div className="atlas-bottom">
            <span>{en ? "Stay thoughtful. Stay curious." : "保持认真。保持好奇。"}</span>
            <span>{en ? "Esc to close / Ctrl + K to search" : "Esc 关闭 / Ctrl + K 搜索"}</span>
          </div>
        </dialog>
      )}
    </>
  );
}
export function SiteFooter() {
  const en = usePathname().startsWith("/en");
  return <footer className="studio-footer">
    <div className="studio-footer-top"><p>Yibiao · {en ? "Cryptography Engineering" : "密码工程与实验"}</p><a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a></div>
    <nav className="footer-groups" aria-label={en ? "Footer navigation" : "页脚导航"}>{navGroups.map(group => <div key={group.name}><span>{en ? group.en : group.name}</span>{group.links.map(link => <NavigationLink key={link.href} href={localizedHref(link.href, en)}>{en ? link.en : link.name}</NavigationLink>)}</div>)}</nav>
    <div className="studio-footer-bottom"><span>© 2026 Yibiao</span><span>{en ? "Mascot: Liangzai" : "吉祥物：量仔"}</span><a href="#main-content">{en ? "Back to top" : "回到顶部"}</a></div>
  </footer>;
}
