import type { Metadata } from "next";
import "./globals.css";
import "../public/assets/site-typography.css";
import "./experience/cinematic.css";
import "../public/assets/site-navigation.css";
import "./studio/system.css";
import "../public/theme/site-shell.css";
import "../public/theme/site-theme.css";
import "./studio/scenes.css";
import { ExperienceProvider } from "./experience/Motion";
import AboutPushTransition from "./experience/AboutPushTransition";
import { BackToTop } from "./site/SiteUtilities";
import DocumentLanguage from "./site/DocumentLanguage";
import PageArrival from "./experience/PageArrival";
import { SiteHeader, SiteFooter } from "./experience/SiteChrome";

export const metadata: Metadata = {
  title: "Yibiao · 密码工程与实验",
  description:
    "Yibiao 的密码工程与实验。探索密码工程、前沿新闻与真实算法实验。",
  metadataBase: new URL("https://wangyibiao.com"),
  alternates: { types: { "application/rss+xml": "https://wangyibiao.com/rss.xml" } },
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
        <link rel="alternate" type="application/rss+xml" title="Yibiao 工程笔记" href="/notes/rss.xml" />
        <link rel="alternate" type="application/rss+xml" title="Yibiao 工程周报" href="/weekly/rss.xml" />
        <meta name="theme-color" content="#F6F5EF" suppressHydrationWarning />
        {/* Synchronous by design: a saved theme must apply before the first paint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme/site-theme.js?v=20261004-editorial" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme/site-utilities.js" />
      </head>
      <body className="studio-theme">
        <ExperienceProvider>
          <DocumentLanguage />
          <PageArrival />
          <AboutPushTransition />
          <SiteHeader />
          {children}
          <SiteFooter />
          <BackToTop />
        </ExperienceProvider>
      </body>
    </html>
  );
}
