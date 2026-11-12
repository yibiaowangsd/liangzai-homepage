"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const CAPACITY = 240;
const routes = new Set(["/", "/about", "/archive"]);

/** The page measured in millilitres: scrolling drinks the bottle, and an
 *  empty bottle becomes the way back to the top. Updates bypass React. */
export default function BottleGauge() {
  const path = usePathname();
  const root = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const shown = routes.has(path);

  useEffect(() => {
    const el = root.current;
    if (!shown || !el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      const drunk = range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
      const left = Math.round(((1 - drunk) * CAPACITY) / 10) * 10;
      el.style.setProperty("--level", String(1 - drunk));
      el.dataset.empty = String(left === 0);
      if (label.current) label.current.textContent = left === 0 ? "喝完啦\n再来一瓶" : `还剩\n${left} ml`;
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    const observer = new ResizeObserver(request);
    observer.observe(document.body);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("scroll", request);
      removeEventListener("resize", request);
      observer.disconnect();
    };
  }, [shown, path]);

  if (!shown) return null;
  return (
    <button ref={root} type="button" className="milk-gauge" aria-label="回到页面顶部，再来一瓶"
      onClick={() => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>
      <svg viewBox="0 0 34 132" aria-hidden="true" fill="none">
        <defs><clipPath id="milk-gauge-body"><rect x="3" y="30" width="28" height="99" rx="9" /></clipPath></defs>
        <path d="M13 12c0-4 1.6-9 4-9s4 5 4 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="7" y="13" width="20" height="13" rx="4" fill="currentColor" />
        <g clipPath="url(#milk-gauge-body)">
          <rect x="3" y="30" width="28" height="99" fill="#fff" />
          <rect className="milk-gauge-milk" x="3" y="34" width="28" height="95" fill="#dfe6ff" />
        </g>
        <rect x="3" y="30" width="28" height="99" rx="9" stroke="currentColor" strokeWidth="1.6" />
        {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${i % 2 ? 23 : 20} ${46 + i * 17}h${i % 2 ? 5 : 8}`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />)}
      </svg>
      <span ref={label} className="milk-gauge-label">{`还剩\n${CAPACITY} ml`}</span>
    </button>
  );
}
