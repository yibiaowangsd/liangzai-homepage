"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useExperience } from "./Motion";
import { runPageArrival } from "./page-arrival";

export default function PageArrival() {
  const pathname = usePathname();
  const { enabled } = useExperience();
  useEffect(() => {
    if (enabled) return runPageArrival();
  }, [pathname, enabled]);
  return null;
}
