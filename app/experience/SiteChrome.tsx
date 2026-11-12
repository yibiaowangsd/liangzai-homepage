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
  return href.startsWith("/pqc-practice") ? (
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
    }}><span>设置</span><svg className="settings-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></button>
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
      <header className="site-chrome" data-scene={path === "/" ? "home" : path === "/storybook" ? "night" : "page"}>
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
            量仔<span>前沿新闻与技术实践</span>
          </strong>
        </Link>
        <nav className="desktop-nav" aria-label="主导航">
          {destinations
            .filter((item) =>
              ["/", "/pqc-practice", "/news", "/topics", "/research", "/about"].includes(item.href),
            )
            .map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={path === item.href || (item.href !== "/" && path.startsWith(`${item.href}/`)) ? "page" : undefined}
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
/** Story pages end with the full night; work pages fold it smaller. */
const storyRoutes = new Set(["/", "/about", "/archive", "/models", "/storybook"]);

export function SiteFooter() {
  const path = usePathname();
  return (
    <footer className="milk-footer" data-flush={path === "/storybook" || undefined} data-size={storyRoutes.has(path) ? undefined : "compact"}>
      <img className="milk-footer-sleeper" src="/assets/naiwa/sleep.webp" width="1140" height="760" alt="喝完奶、趴着睡着的奶蛙，空奶瓶倒在身边" loading="lazy" decoding="async" />
      <span className="milk-footer-zzz" aria-hidden="true">z z z</span>
      <div className="milk-footer-top">
        <div>
          <p className="milk-footer-night">嘘，奶蛙睡着了</p>
          <p>今天这一瓶喝完了。明早 08:10，新的简报会重新温好；在那之前，轻一点翻页。</p>
        </div>
        <nav className="milk-footer-groups" aria-label="页脚导航">
          <div><span>阅读</span><Link href="/news">前沿新闻</Link><Link href="/research">深度研究</Link><Link href="/topics">技术进展档案</Link><Link href="/pqc-arsenal">算法原理</Link></div>
          <div><span>家里</span><Link href="/archive">量仔小传</Link><Link href="/storybook">星际漫游</Link><Link href="/models">角色模型</Link><Link href="/wo">我 · 网页回顾</Link></div>
          <div><span>关于</span><Link href="/about#journey">个人经历</Link><Link href="/about#contact">联系与交流</Link><a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a><a href="https://github.com/yibiaowangsd/liangzai-homepage" target="_blank" rel="noreferrer">本站源码</a></div>
        </nav>
      </div>
      <div className="milk-footer-bottom">
        <span>© 2026 Yibiao · 量仔与奶蛙</span>
        <a href="#main-content">回到顶部 ↑</a>
      </div>
    </footer>
  );
}
