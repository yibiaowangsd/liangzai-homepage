"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Official greensock/gsap-skills: scoped React lifecycle, timelines,
// responsive matchMedia and transform-only continuous interactions.
// useGSAP is headless and registration wakes GSAP's ticker.
// Never create that timer while Cloudflare evaluates the SSR module.
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
}
export { gsap, useGSAP, ScrollTrigger, SplitText };
const MotionContext = createContext({
  enabled: false,
  paused: false,
  toggle: () => {},
});

const subscribeReduced = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getPaused = () => {
  try {
    return localStorage.getItem("liangzai-motion") === "paused";
  } catch {
    return false;
  }
};
const subscribeStorage = (notify: () => void) => {
  window.addEventListener("liangzai-motion-change", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("liangzai-motion-change", notify);
    window.removeEventListener("storage", notify);
  };
};

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    getReduced,
    () => true,
  );
  const savedPaused = useSyncExternalStore(
    subscribeStorage,
    getPaused,
    () => false,
  );
  function toggle() {
    const next = !(paused || savedPaused);
    try {
      localStorage.setItem("liangzai-motion", next ? "paused" : "active");
      window.dispatchEvent(new Event("liangzai-motion-change"));
    } catch {}
    setPaused(next);
  }
  return (
    <MotionContext.Provider
      value={{
        enabled: !paused && !savedPaused && !reduced,
        paused: paused || savedPaused || reduced,
        toggle,
      }}
    >
      <div
        className="experience"
        data-motion={!paused && !savedPaused && !reduced ? "active" : "paused"}
      >
        {children}
      </div>
    </MotionContext.Provider>
  );
}
export const useExperience = () => useContext(MotionContext);

export function usePageMotion(root: RefObject<HTMLElement | null>) {
  const { enabled } = useExperience();
  useGSAP(
    () => {
      if (!enabled || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 900px)",
          fine: "(hover: hover) and (pointer: fine)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          if (!context.conditions?.motion) return;
          const el = root.current!;
          const titles = el.querySelectorAll("[data-title]");
          titles.forEach((title) => {
            SplitText.create(title as HTMLElement, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit(split) {
                return gsap.from(split.lines, {
                  yPercent: 110,
                  autoAlpha: 0,
                  duration: 1.15,
                  stagger: 0.12,
                  ease: "power4.out",
                });
              },
            });
          });
          const intro = el.querySelectorAll("[data-intro]");
          if (intro.length)
            gsap.from(intro, {
              y: 26,
              autoAlpha: 0,
              duration: 1,
              stagger: 0.12,
              ease: "power3.out",
            });
          el.querySelectorAll("[data-reveal]").forEach((target) => {
            gsap.from(target, {
              y: 38,
              autoAlpha: 0,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: target, start: "top 92%", once: true },
            });
          });
          if (context.conditions?.desktop) {
            el.querySelectorAll<HTMLElement>("[data-parallax]").forEach(
              (target) => {
                gsap.to(target, {
                  yPercent: Number(target.dataset.parallax || 8),
                  ease: "none",
                  scrollTrigger: {
                    trigger: target.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                  },
                });
              },
            );
          }
          const cleanups: (() => void)[] = [];
          if (context.conditions?.fine) {
            el.querySelectorAll<HTMLElement>("[data-magnetic]").forEach(
              (target) => {
                const x = gsap.quickTo(target, "x", {
                  duration: 0.45,
                  ease: "power3.out",
                });
                const y = gsap.quickTo(target, "y", {
                  duration: 0.45,
                  ease: "power3.out",
                });
                const move = (event: PointerEvent) => {
                  const b = target.getBoundingClientRect();
                  x((event.clientX - b.left - b.width / 2) * 0.12);
                  y((event.clientY - b.top - b.height / 2) * 0.15);
                };
                const leave = () => {
                  x(0);
                  y(0);
                };
                target.addEventListener("pointermove", move);
                target.addEventListener("pointerleave", leave);
                cleanups.push(() => {
                  target.removeEventListener("pointermove", move);
                  target.removeEventListener("pointerleave", leave);
                });
              },
            );
          }
          return () => cleanups.forEach((fn) => fn());
        },
        root,
      );
      let active = true;
      const refresh = () => {
        if (active) ScrollTrigger.refresh();
      };
      document.fonts.ready.then(refresh);
      const images = [...root.current.querySelectorAll("img")].filter(
        (img) => !img.complete,
      );
      images.forEach((img) =>
        img.addEventListener("load", refresh, { once: true }),
      );
      return () => {
        active = false;
        images.forEach((img) => img.removeEventListener("load", refresh));
        mm.revert();
      };
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
}

export function MotionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePageMotion(ref);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
