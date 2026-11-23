export const rooms = [
  { key: "pet", href: "/pet", type: "互动 · 房间收集", title: "星团小屋", note: "摸摸团团、喂星果、一起捉星星，解锁它的小屋。", tone: "pink" },
  { key: "puzzle", href: "/daily-play", type: "每日挑战", title: "星阵点灯", note: "一按就会改变周围的灯。今晚的星阵，你能几步点亮？", tone: "lime" },
  { key: "pixel", href: "/pixel-postcard", type: "画画 · 寄给朋友", title: "像素明信片", note: "画一张小画，下载成图片，或者把它藏进链接里。", tone: "blue" },
] as const;

export function nextRoomIndex(prior: string | null, random: number) {
  const options = rooms.map((_, index) => index).filter((index) => rooms[index].key !== prior);
  return options[Math.min(options.length - 1, Math.max(0, Math.floor(random * options.length)))];
}
