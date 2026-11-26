"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useExperience } from "./Motion";
import { defaultLocale } from "../i18n/locales";
import { useSiteLanguage } from "../i18n/LocaleProvider";
import LanguagePicker from "../i18n/LanguagePicker";
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
  const { chrome: { settings } } = useSiteLanguage();
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
    <button ref={trigger} className="menu-toggle" type="button" aria-label={settings.open} aria-expanded={open} aria-controls="site-settings-panel" onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (open) root.current?.querySelector("select")?.focus();
        else { focusFirst.current = true; setOpen(true); }
      }
    }}>
      <span>{settings.button}</span>
      <svg className="settings-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      <svg className="settings-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14M7 3v4m6 1v4m-5 1v4" /></svg>
    </button>
    {open && <section className="site-settings-panel" id="site-settings-panel" aria-label={settings.title}>
      <h2>{settings.title}</h2>
      <div className="settings-row"><span>{settings.theme}</span><ThemePicker /></div>
      <div className="settings-row"><span>{settings.motion}</span><button className="settings-motion" type="button" onClick={toggle} aria-pressed={paused}>{paused ? settings.resume : settings.pause}</button></div>
      <p>{settings.note}</p>
    </section>}
  </div>;
}
export function SiteHeader() {
  const path = usePathname();
  const { locale, chrome } = useSiteLanguage();
  return (
    <>
      <a className="skip-link" href="#main-content">
        {chrome.brand.skip}
      </a>
      <header className="site-chrome" data-localized={locale !== defaultLocale || undefined} data-scene={path === "/" ? "home" : path === "/storybook" ? "night" : "page"}>
        <Link className="brand" href="/" aria-label={chrome.brand.home}>
          <span className="brand-mark" aria-hidden="true">
            <img
              src="/assets/liangzai-mark.svg"
              width="36"
              height="36"
              alt=""
            />
          </span>
          <strong>
            {chrome.brand.name}<span>{chrome.brand.tagline}</span>
          </strong>
        </Link>
        <nav className="desktop-nav" aria-label={chrome.nav.label}>
          {destinations
            .filter((item) =>
              ["/", "/pqc-practice", "/news", "/tracking", "/topics", "/research", "/sidequests", "/about"].includes(item.href),
            )
            .map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={path === item.href ? "page" : (item.href !== "/" && path.startsWith(`${item.href}/`)) || (item.href === "/sidequests" && ["/sound-room", "/time-desk"].includes(path)) ? "location" : undefined}
              >
                {item.href === "/" ? chrome.nav.home : chrome.destinations[item.href].name}
              </NavigationLink>
            ))}
        </nav>
        <div className="chrome-actions">
          <JumpNavigation onOpen={() => document.dispatchEvent(new Event("liangzai:close-settings"))} />
          <LanguagePicker />
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
  const { chrome: { footer, destinations: links } } = useSiteLanguage();
  return (
    <footer className="milk-footer" data-flush={path === "/storybook" || undefined} data-size={storyRoutes.has(path) ? undefined : "compact"}>
      <img className="milk-footer-sleeper" src="/assets/naiwa/sleep.webp" width="1140" height="760" alt={footer.sleeper} loading="lazy" decoding="async" />
      <span className="milk-footer-zzz" aria-hidden="true">z z z</span>
      <div className="milk-footer-top">
        <div>
          <p className="milk-footer-night">{footer.night}</p>
          <p>{footer.note}</p>
        </div>
        <nav className="milk-footer-groups" aria-label={footer.nav}>
          <div><span>{footer.reading}</span><Link href="/news">{links["/news"].name}</Link><Link href="/tracking">{links["/tracking"].name}</Link><Link href="/research">{links["/research"].name}</Link><Link href="/topics">{footer.topics}</Link><Link href="/pqc-arsenal">{footer.algorithms}</Link></div>
          <div><span>{footer.family}</span><Link href="/archive">{links["/archive"].name}</Link><Link href="/storybook">{links["/storybook"].name}</Link><Link href="/models">{footer.models}</Link><Link href="/wo">{links["/wo"].name}</Link><Link href="/play">{links["/play"].name}</Link><Link href="/sidequests">{links["/sidequests"].name}</Link></div>
          <div><span>{footer.about}</span><Link href="/about#journey">{footer.journey}</Link><Link href="/about#contact">{footer.contact}</Link><a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a><a href="https://github.com/yibiaowangsd/liangzai-homepage" target="_blank" rel="noreferrer">{footer.source}</a></div>
        </nav>
      </div>
      <div className="milk-footer-bottom">
        <span>© 2026 Yibiao · {footer.signature}</span>
        <a href="#main-content">{footer.top} <span aria-hidden="true">↑</span></a>
      </div>
    </footer>
  );
}
