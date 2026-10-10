"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function NewsCategoryMenu({ className, children }: { className: string; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) {
        menu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return <details
    ref={menu}
    className={className}
    onClick={event => {
      if (event.target instanceof Element && event.target.closest("a")) event.currentTarget.open = false;
    }}
    onKeyDown={event => {
      if (event.key === "Escape" && event.currentTarget.open) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}
  >{children}</details>;
}
