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
  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => {
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
      <header className="site-chrome">
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
            量仔<span>好奇心实验室</span>
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
          <ThemePicker />
          <JumpNavigation blocked={open} onOpen={() => setOpen(false)} />
          <button
            className="motion-switch"
            type="button"
            onClick={toggle}
            aria-pressed={paused}
            aria-label={paused ? "开启动效" : "暂停动效"}
          >
            <span className="equalizer" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{paused ? "静止" : "动态"}</span>
          </button>
          <button
            className="menu-toggle"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="site-atlas"
            onClick={() => setOpen(true)}
            aria-label="打开全站目录"
          >
            <span>目录</span>
            <i aria-hidden="true">＋</i>
          </button>
        </div>
      </header>
      {open && (
        <dialog
          ref={dialog}
          className="site-atlas"
          id="site-atlas"
          aria-labelledby="atlas-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button, a[href]",
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
            <span>量仔 / 好奇心实验室</span>
            <button
              ref={close}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭全站目录"
            >
              关闭 <span aria-hidden="true">×</span>
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
        <p>
          探索没有终点。
          <br />
          下一个想法，会是什么？
        </p>
        <Link href="/about" className="studio-footer-cta">
          一起保持好奇
        </Link>
      </div>
      <nav aria-label="页脚导航">
        {destinations.slice(1).map((item) => (
          <NavigationLink href={item.href} key={item.href}>
            {item.name}
          </NavigationLink>
        ))}
      </nav>
      <Link className="studio-footer-word" href="/" aria-label="量仔首页">
        LIANGZAI<span></span>
      </Link>
      <div className="studio-footer-bottom">
        <span>© 2026 量仔 · Yibiao</span>
        <span>一份持续生长的个人实验</span>
        <a href="#main-content">回到顶部 ↑</a>
      </div>
    </footer>
  );
}
