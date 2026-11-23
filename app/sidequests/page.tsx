import type { Metadata } from "next";
import Link from "next/link";
import styles from "./shelf.module.css";

export const metadata: Metadata = {
  title: "小工具 · 量仔主页",
  description: "不必注册，打开就能用。用声音铺个背景，或找一个跨时区都合适的见面时间。",
};

export default function Page() {
  return <main id="main-content" className={styles.page}>
    <div className={styles.wrap}>
      <header className={styles.intro}>
        <p><span /> THE LITTLE WEB</p><h1>小工具</h1>
        <div className={styles.lede}>有时候想安静地做一件事，有时候要和另一个时区的人见面。这里各有一个工具，打开就能用。</div>
      </header>
      <section aria-label="工具列表" className={styles.grid}>
        <Link href="/sound-room" className={styles.card + " " + styles.sound}>
          <div className={styles.art} aria-hidden="true">
            <span>01 / SOUND ROOM</span>
            <svg viewBox="0 0 360 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 52h18l8-13 9 22 14-38 12 57 13-39 9 19 8-9h20l9-20 12 39 10-54 13 72 14-45 10 20 8-10h17l11-16 12 27 12-33 12 49 13-34 11 14h15l12-12 12 21 10-10h35"/><path opacity=".22" d="M8 51h342M45 6v88m88-88v88m88-88v88m88-88v88"/></svg>
          </div>
          <div className={styles.cardBody}><div><h2>声音角落</h2><p>混搭细雨、风声、海浪和壁炉，再开一段专注计时。</p></div><span aria-hidden="true">↗</span></div>
        </Link>
        <Link href="/time-desk" className={styles.card + " " + styles.time}>
          <div className={styles.art} aria-hidden="true">
            <span>02 / TIME DESK</span>
            <svg viewBox="0 0 360 100" fill="none" stroke="currentColor" strokeWidth="2"><path opacity=".24" d="M12 30h335M12 54h335M12 78h335M34 15v77m64-77v77m64-77v77m64-77v77m64-77v77m56-77v77"/><rect x="33" y="23" width="158" height="14" rx="7"/><rect x="102" y="47" width="151" height="14" rx="7"/><rect x="147" y="71" width="154" height="14" rx="7"/><path d="M166 15v78" strokeDasharray="2 4"/><circle cx="166" cy="54" r="4" fill="currentColor"/></svg>
          </div>
          <div className={styles.cardBody}><div><h2>时差桌</h2><p>把几座城市放在同一条时间线上，找出工作时间的交集。</p></div><span aria-hidden="true">↗</span></div>
        </Link>
      </section>
      <p className={styles.credits}>交互灵感来自 <a href="https://mynoise.net/" rel="noreferrer" target="_blank">myNoise</a>、<a href="https://pomofocus.io/" rel="noreferrer" target="_blank">Pomofocus</a> 和 <a href="https://www.timeanddate.com/worldclock/meeting.html" rel="noreferrer" target="_blank">timeanddate</a>。工具在浏览器中运行，无需登录。</p>
    </div>
  </main>;
}
