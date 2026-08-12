import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "量仔 · Shor 大魔王档案",
  description: "量仔与奶龙共同对抗 Shor 大魔王的传奇档案。",
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
