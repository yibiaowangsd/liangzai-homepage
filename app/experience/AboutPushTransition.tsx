"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useExperience } from "./Motion";
import { useHomeEffects } from "./HomeEffects";
import catalog from "./three/model-catalog.json";
import { runAboutPush } from "./about-push";

const isAbout = (path: string) => path.replace(/\/$/, "") === "/about";

export default function AboutPushTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const { enabled } = useExperience();
  const { models } = useHomeEffects();
  const current = useRef({ pathname, router });
  const routeReady = useRef<(() => void) | null>(null);
  useEffect(() => {
    current.current = { pathname, router };
    if (isAbout(pathname)) routeReady.current?.();
  }, [pathname, router]);

  useEffect(() => {
    if (!enabled || !models) return;
    let active: { cancel: (navigate?: boolean) => void } | null = null;
    let warmed = false;
    const warmController = new AbortController();
    const aboutLink = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return null;
      const url = new URL(link.href, location.href);
      return url.origin === location.origin && isAbout(url.pathname) ? link : null;
    };
    const warm = (event: Event) => {
      if (warmed || !aboutLink(event.target) || isAbout(current.current.pathname)) return;
      warmed = true;
      current.current.router.prefetch("/about");
      void import("./three/about-push-scene").catch(() => {});
      for (const part of catalog.liangzai.parts) {
        void fetch(part.url, { signal: AbortSignal.any([warmController.signal, AbortSignal.timeout(2500)]) }).then(r => r.arrayBuffer()).catch(() => {});
      }
    };
    const click = (event: MouseEvent) => {
      if (active) {
        if (event.target instanceof Element && event.target.closest(".about-push__skip")) return;
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      const link = aboutLink(event.target);
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || isAbout(current.current.pathname)) return;
      const source = document.querySelector<HTMLElement>("body > .experience");
      if (!source) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const href = link.pathname + link.search + link.hash;
      active = runAboutPush(source, {
        navigate(ready) {
          routeReady.current = ready ?? null;
          current.current.router.push(href);
        },
        complete() { routeReady.current = null; active = null; },
      });
    };
    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("focusin", warm);
    document.addEventListener("click", click, true);
    return () => {
      warmController.abort();
      active?.cancel(true);
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
      document.removeEventListener("click", click, true);
    };
  }, [enabled, models]);
  return null;
}
