"use client";

import { useRouter } from "next/navigation";
import { nextRoomIndex, rooms } from "./rooms";
import styles from "./play.module.css";

const key = "liangzai.play.last-surprise";

export default function Surprise() {
  const router = useRouter();
  return <button type="button" className={styles.surprise} onClick={() => {
    let prior: string | null = null;
    try { prior = sessionStorage.getItem(key); } catch {}
    const room = rooms[nextRoomIndex(prior, Math.random())];
    try { sessionStorage.setItem(key, room.key); } catch {}
    router.push(room.href);
  }}><span aria-hidden="true">✦</span> 随便开一扇门</button>;
}
