"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { defaultLocale, type Locale } from "./locales";
import type { Messages } from "./site-language";

type SiteLanguage = { locale: Locale; chrome: Messages["chrome"] };
const LocaleContext = createContext<SiteLanguage | null>(null);

export function LocaleProvider({ locale, chrome, children }: SiteLanguage & { children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale, chrome }}>{children}</LocaleContext.Provider>;
}

export function useSiteLanguage() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider is missing");
  return context;
}

export function PageLanguage({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { locale } = useSiteLanguage();
  const contentLanguage = path === "/" || path === "/about" ? locale : defaultLocale;
  return <div lang={contentLanguage} style={{ display: "contents" }}>{children}</div>;
}
