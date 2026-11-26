export const locales = {
  "zh-CN": { name: "简体中文", short: "中", openGraph: "zh_CN" },
  en: { name: "English", short: "EN", openGraph: "en_US" },
  ja: { name: "日本語", short: "JA", openGraph: "ja_JP" },
  ko: { name: "한국어", short: "KO", openGraph: "ko_KR" },
  fr: { name: "Français", short: "FR", openGraph: "fr_FR" },
  de: { name: "Deutsch", short: "DE", openGraph: "de_DE" },
  es: { name: "Español", short: "ES", openGraph: "es_ES" },
  ru: { name: "Русский", short: "RU", openGraph: "ru_RU" },
} as const;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "zh-CN";
export const localeCookie = "liangzai-locale";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && Object.hasOwn(locales, value);
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (placeholder, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}
