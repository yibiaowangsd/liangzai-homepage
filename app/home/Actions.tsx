"use client";

import Link from "next/link";
import { Orbit } from "lucide-react";
import { m, useMotionValue, useSpring } from "framer-motion";
import { type PointerEvent } from "react";
import { useMotionPreference } from "./Motion";
import s from "../QuantumHome.module.css";

/** The second line is visual only, so each action has one accessible label. */
export function RollingLabel({ children }: { children: string }) {
  return (
    <span className={s.rollingLabel}>
      <span className={s.rollingTrack}>
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    </span>
  );
}

export function TextLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link className={s.textLink} href={href}>
      <RollingLabel>{children}</RollingLabel>
    </Link>
  );
}

/** A fixed hit area surrounds the spring-driven surface; the target never drifts. */
export function ActionLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  const { enabled } = useMotionPreference();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, { stiffness: 250, damping: 24 });
  const y = useSpring(targetY, { stiffness: 250, damping: 24 });
  function reset() {
    targetX.set(0);
    targetY.set(0);
  }
  function move(event: PointerEvent<HTMLAnchorElement>) {
    if (!enabled || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    targetX.set((event.clientX - rect.left - rect.width / 2) * 0.07);
    targetY.set((event.clientY - rect.top - rect.height / 2) * 0.12);
  }
  return (
    <Link
      href={href}
      className={s.actionLink}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onBlur={reset}
    >
      <m.span
        className={s.actionSurface}
        style={{ x: enabled ? x : 0, y: enabled ? y : 0 }}
      >
        <span className={s.actionBeam} aria-hidden />
        <span className={s.actionFill} aria-hidden />
        <span className={s.actionOrb} aria-hidden>
          <Orbit size={20} strokeWidth={1.3} />
        </span>
        <RollingLabel>{children}</RollingLabel>
      </m.span>
    </Link>
  );
}
