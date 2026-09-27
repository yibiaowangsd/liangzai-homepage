"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { runPageArrival } from "./page-arrival";

export default function PageArrival() {
  const pathname = usePathname();
  // Only navigation starts an entry, never hydration of motion preferences or
  // toggling motion back on. The runner reads and observes browser preferences.
  useLayoutEffect(() => runPageArrival(pathname), [pathname]);
  return null;
}
