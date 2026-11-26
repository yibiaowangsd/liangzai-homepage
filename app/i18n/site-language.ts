import { cache } from "react";
import { cookies } from "next/headers";
import type chinese from "./messages/zh-CN.json";
import { defaultLocale, isLocale, localeCookie, type Locale } from "./locales";

export type Messages = typeof chinese;

const dictionaries = {
  "zh-CN": () => import("./messages/zh-CN.json"),
  en: () => import("./messages/en.json"),
  ja: () => import("./messages/ja.json"),
  ko: () => import("./messages/ko.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  es: () => import("./messages/es.json"),
  ru: () => import("./messages/ru.json"),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>;

export const getSiteLanguage = cache(async () => {
  const preference = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(preference) ? preference : defaultLocale;
  const { default: messages } = await dictionaries[locale]();
  return { locale, messages };
});
