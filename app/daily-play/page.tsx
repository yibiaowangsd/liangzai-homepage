import type { Metadata } from "next";
import StarGrid from "./StarGrid";
import "./daily-play.css";

export const metadata: Metadata = {
  title: "星阵点灯 · 每日谜题",
  description: "每天一局星阵点灯。点击一颗星，翻转它和上下左右的星，试着点亮全部二十颗。",
};

export default function DailyPlayPage() {
  return <StarGrid />;
}
