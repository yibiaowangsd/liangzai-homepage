"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TrackingAnchor() {
  const path = usePathname();
  useEffect(() => {
    function openSection() {
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!id) return;
      const anchor = document.getElementById(id);
      const history = anchor?.closest<HTMLDetailsElement>("details");
      if (history && !history.open) {
        history.open = true;
        anchor?.scrollIntoView();
      }
    }
    openSection();
    window.addEventListener("hashchange", openSection);
    return () => window.removeEventListener("hashchange", openSection);
  }, [path]);
  return null;
}
