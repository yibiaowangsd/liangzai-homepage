import type { Metadata } from "next";
import "./globals.css";
import "./experience/cinematic.css";
import "../public/assets/site-navigation.css";
import "./experience/news-gate.css";
import "./studio/system.css";
import { ExperienceProvider } from "./experience/Motion";
import { HomeEffectsProvider } from "./experience/HomeEffects";
import AboutPushTransition from "./experience/AboutPushTransition";
import PageArrival from "./experience/PageArrival";
import { SiteHeader, SiteFooter } from "./experience/SiteChrome";

export const metadata: Metadata = {
  title: "量仔 · 好奇心实验室",
  description:
    "Yibiao 的好奇心实验室。探索密码工程、每日新闻、模型鉴赏与真实算法实验。",
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
    <html lang="zh-CN">
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
