import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "量子星守护者 · 量仔动画书",
  description: "翻开量仔与奶龙共同守护量子星、迎战 Shor 大魔王的互动动画书。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
