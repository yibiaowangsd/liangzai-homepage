import type { Metadata } from "next";
import SoundRoom from "./SoundRoom";

export const metadata: Metadata = {
  title: "声音角落 · 小工具",
  description: "四种在设备上合成的环境音，配一个专注计时器。不自动播放，不需要账号。",
};

export default function Page() {
  return <SoundRoom />;
}
