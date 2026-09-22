"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import s from "../QuantumHome.module.css";

const links = [
  { href: "#universe", label: "探索宇宙" },
  { href: "#lab", label: "技术实验室" },
  { href: "/storybook", label: "量仔故事" },
  { href: "#about", label: "关于量仔" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    function outside(event: PointerEvent) {
      if (header.current && !header.current.contains(event.target as Node))
        setOpen(false);
    }
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  return (
    <header ref={header} className={s.header}>
      <div className={s.navbar}>
        <Link className={s.brand} href="/" aria-label="量仔首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>
            量仔<small>LIANGZAI</small>
          </span>
        </Link>
        <nav aria-label="主导航" className={s.desktopNav}>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/pqc-arsenal" className={s.navCta}>
          进入武器库
          <ArrowUpRight size={14} aria-hidden />
        </Link>
        <button
          ref={toggle}
          className={s.menuButton}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="移动端导航"
        className={s.mobileNav}
        hidden={!open}
      >
        {links.map((link, index) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            <span>
              <small>0{index + 1}</small>
              {link.label}
            </span>
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        ))}
      </nav>
    </header>
  );
}
