import type { Metadata } from "next";
import "./globals.css";
import "../public/assets/site-typography.css";
import "./experience/cinematic.css";
import "../public/assets/site-navigation.css";
import "./experience/news-gate.css";
import "./studio/system.css";
import "../public/theme/site-theme.css";
import "./studio/scenes.css";
import { ExperienceProvider } from "./experience/Motion";
import { HomeEffectsProvider } from "./experience/HomeEffects";
import AboutPushTransition from "./experience/AboutPushTransition";
import PageArrival from "./experience/PageArrival";
import { SiteHeader, SiteFooter } from "./experience/SiteChrome";

export const metadata: Metadata = {
  title: "量仔 · 前沿新闻与技术实践",
  description:
    "量仔的前沿新闻与技术实践。跟进密码、协议、标准、网络安全与 AI 的新进展，探索真实算法实验与角色故事。",
  other: { "codex-preview": "development" },
  icons: {
    icon: "/assets/liangzai-mark.svg",
    shortcut: "/assets/liangzai-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F6F5EF" suppressHydrationWarning />
        {/* Synchronous by design: a saved theme must apply before the first paint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme/site-theme.js?v=20261004-editorial" />
      </head>
      <body className="studio-theme">
        <HomeEffectsProvider>
          <ExperienceProvider>
            <PageArrival />
            <AboutPushTransition />
            <SiteHeader />
            {children}
            <SiteFooter />
          </ExperienceProvider>
        </HomeEffectsProvider>
      </body>
    </html>
  );
}
