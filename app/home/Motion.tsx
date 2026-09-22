"use client";

import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent,
} from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useScroll,
  animate,
} from "framer-motion";
import s from "../QuantumHome.module.css";

const MotionContext = createContext({
  enabled: false,
  paused: false,
  toggle: () => {},
});
const subscribe = () => () => {};

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const enabled = hydrated && !paused && !reduced;
  return (
    <MotionContext.Provider
      value={{ enabled, paused, toggle: () => setPaused((p) => !p) }}
    >
      <LazyMotion features={domAnimation} strict>
        <div className={s.site} data-motion={enabled ? "active" : "paused"}>
          {children}
        </div>
      </LazyMotion>
    </MotionContext.Provider>
  );
}

export const useMotionPreference = () => useContext(MotionContext);

export function MotionToggle() {
  const { paused, toggle } = useMotionPreference();
  return (
    <button className={s.motionToggle} onClick={toggle} aria-pressed={paused}>
      {paused ? (
        <Play size={13} aria-hidden />
      ) : (
        <Pause size={13} aria-hidden />
      )}
      {paused ? "开启动效" : "暂停动效"}
    </button>
  );
}

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <m.div
      aria-hidden
      className={s.readingProgress}
      style={{ scaleX: scrollYProgress }}
    />
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const { enabled } = useMotionPreference();
  return (
    <m.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        seen || !enabled
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 24, filter: "blur(5px)" }
      }
      transition={{
        duration: enabled ? 0.7 : 0,
        delay: enabled ? delay : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  );
}

export function MagneticLink({
  children,
  href,
  secondary = false,
  className = "",
}: {
  children: ReactNode;
  href: string;
  secondary?: boolean;
  className?: string;
}) {
  const { enabled } = useMotionPreference();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, { stiffness: 220, damping: 22 });
  const y = useSpring(targetY, { stiffness: 220, damping: 22 });
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    targetX.set((event.clientX - rect.left - rect.width / 2) * 0.12);
    targetY.set((event.clientY - rect.top - rect.height / 2) * 0.2);
  }
  return (
    <m.div
      className={s.magnetic}
      style={{ x: enabled ? x : 0, y: enabled ? y : 0 }}
      onPointerMove={move}
      onPointerLeave={() => {
        targetX.set(0);
        targetY.set(0);
      }}
    >
      <Link
        href={href}
        className={`${secondary ? s.secondary : s.primary} ${className}`}
      >
        <span>{children}</span>
        <ArrowUpRight size={17} aria-hidden />
      </Link>
    </m.div>
  );
}

export function Counter({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const { enabled } = useMotionPreference();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!enabled || !inView) {
      node.textContent = String(value).padStart(2, "0");
      return;
    }
    const animation = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (current) => {
        node.textContent = String(Math.round(current)).padStart(2, "0");
      },
    });
    return () => animation.stop();
  }, [enabled, inView, value]);
  // Keep the accessible value stable while the decorative display counts up.
  return (
    <div className={s.stat}>
      <span ref={ref} className={s.statValue} aria-hidden>
        {String(value).padStart(2, "0")}
      </span>
      <span className={s.srOnly}>{value}</span>
      <h3>{label}</h3>
      <p>{detail}</p>
    </div>
  );
}
