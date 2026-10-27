import type { Metadata } from "next";
import LifeReview from "./LifeReview";
import "./wo.css";
export const metadata: Metadata = { title: "我 · 网页回顾", description: "在自己的浏览器中读取「我」App 记录，回看时间轴、多日变化和已有记忆。", robots: { index: false, follow: false } };
export default function WoPage() {
  return <main id="main-content" className="wo-page"><header className="wo-heading"><p className="wo-eyebrow">我 · 生活回顾</p><h1>把时间，慢慢展开</h1><p>「我」App 的网页阅读端。用更大的屏幕，回看自己的生活片段。</p><a href="https://github.com/yibiaowangsd/myapp" target="_blank" rel="noreferrer">了解 Android App</a></header><LifeReview /></main>;
}
