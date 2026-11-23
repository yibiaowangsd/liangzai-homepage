import type { Metadata } from "next";
import TimeDesk from "./TimeDesk";

export const metadata: Metadata = {
  title: "时差桌 · 量仔",
  description: "拖动一天的时间轴，查看各城市当地时间、工作时段交集和跨日提醒。",
};

export default function TimeDeskPage() {
  return <TimeDesk />;
}
