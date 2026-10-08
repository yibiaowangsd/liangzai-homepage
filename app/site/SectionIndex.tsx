"use client";
import { useEffect, useState } from "react";
export default function SectionIndex({ items, className, label }: {items: {id: string; label: string}[]; className?: string; label: string}) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const update = () => {
      const sections = items.map(item => document.getElementById(item.id)).filter((el): el is HTMLElement => !!el);
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const current = sections.filter(el => el.getBoundingClientRect().top <= padding + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + 4).at(-1) || sections[0];
      if (current) setActive(current.id);
    };
    const category=new URLSearchParams(location.search).get("category");
    if(category && items.some(item=>item.id===category) && !location.hash)document.getElementById(category)?.scrollIntoView();
    update(); window.addEventListener("scroll", update, {passive: true});
    return () => window.removeEventListener("scroll", update);
  }, [items]);
  return <nav className={className} aria-label={label}>{items.map(item => <a key={item.id} href={"#" + item.id} aria-current={active === item.id ? "location" : undefined}>{item.label}</a>)}</nav>;
}
