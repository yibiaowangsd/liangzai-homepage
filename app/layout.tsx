import type { Metadata } from "next";
import "./globals.css";
import "./experience/cinematic.css";
import { ExperienceProvider } from "./experience/Motion";
import { SiteHeader, SiteFooter } from "./experience/SiteChrome";

export const metadata: Metadata = {
  title: "量仔 Yibiao 的数字空间",
  description: "Yibiao 的数字空间，记录个人经历、密码工程与量仔的故事和交互实验。",
  other: { "codex-preview": "development" },
  icons: { icon: "/assets/liangzai-mark.svg", shortcut: "/assets/liangzai-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ExperienceProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </ExperienceProvider>
      </body>
    </html>
  );
}
