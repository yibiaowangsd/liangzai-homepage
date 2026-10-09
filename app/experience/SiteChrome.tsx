"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";
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
function SiteSettings() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusFirst = useRef(false);
  const { paused, toggle } = useExperience();
  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      root.current?.querySelector("select")?.focus();
      focusFirst.current = false;
    }
    const dismiss = () => setOpen(false);
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("liangzai:close-settings", dismiss);
    document.addEventListener("liangzai:close-directory", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("liangzai:close-settings", dismiss);
      document.removeEventListener("liangzai:close-directory", dismiss);
    };
  }, [open]);
  return <div className="site-settings" ref={root}>
    <button ref={trigger} className="menu-toggle" type="button" aria-label="打开显示设置" aria-expanded={open} aria-controls="site-settings-panel" onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (open) root.current?.querySelector("select")?.focus();
        else { focusFirst.current = true; setOpen(true); }
      }
    }}><span>设置</span><i aria-hidden="true">⌄</i></button>
    {open && <section className="site-settings-panel" id="site-settings-panel" aria-label="显示设置">
      <h2>显示设置</h2>
      <div className="settings-row"><span>页面主题</span><ThemePicker /></div>
      <div className="settings-row"><span>页面动效</span><button className="settings-motion" type="button" onClick={toggle} aria-pressed={paused}>{paused ? "开启动效" : "暂停动效"}</button></div>
      <p>动效同时遵循系统的减少动态效果设置。</p>
    </section>}
  </div>;
}
export function SiteHeader() {
  const path = usePathname();
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
          <JumpNavigation onOpen={() => document.dispatchEvent(new Event("liangzai:close-settings"))} />
          <SiteSettings key={path} />
        </div>
      </header>
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
