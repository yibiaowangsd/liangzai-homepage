import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Surprise from "./Surprise";
import { rooms } from "./rooms";
import styles from "./play.module.css";

export const metadata: Metadata = {
  title: "好奇游乐场 · 量仔主页",
  description: "这里有一只等你来玩的站宠、每天不同的星阵谜题，以及可以寄出去的像素明信片。",
};

const art: Record<(typeof rooms)[number]["key"], ReactNode> = {
  pet: <svg viewBox="0 0 320 144" aria-hidden="true">
    <path d="M28 117h264" stroke="#b45f86" strokeDasharray="3 5" />
    <ellipse cx="160" cy="115" rx="61" ry="8" fill="#cf7197"/>
    <path d="M198 91c26-23 39-18 34-4-4 10-11 16-24 17M143 53q-12-22 0-29 5 13 15 19m14-4q9-17 21-16-2 18-13 27" fill="#83baa6" stroke="#354a46" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M109 78c6-25 24-39 49-39 29 0 49 17 55 40 7 26-10 35-53 35s-57-11-51-36Z" fill="#b7dbc5" stroke="#354a46" strokeWidth="3.5"/>
    <ellipse cx="161" cy="97" rx="25" ry="15" fill="#f9e8ac"/>
    <path d="m161 87 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#e69855"/>
    <circle cx="139" cy="73" r="4" fill="#354a46"/><circle cx="182" cy="73" r="4" fill="#354a46"/>
    <ellipse cx="129" cy="81" rx="7" ry="4" fill="#f4a093"/><ellipse cx="192" cy="81" rx="7" ry="4" fill="#f4a093"/>
    <path d="M153 77q4 5 8 1 4 4 8-2" fill="none" stroke="#354a46" strokeWidth="2.8" strokeLinecap="round"/>
    <path d="M242 31v20m-10-10h20M79 67v14m-7-7h14" fill="none" stroke="#8c3865" strokeWidth="2"/>
  </svg>,
  puzzle: <svg viewBox="0 0 320 144" aria-hidden="true">
    <rect x="104" y="18" width="112" height="108" rx="16" fill="#192615" stroke="#557539" strokeWidth="2"/>
    {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => <rect key={i} x={118+i%4*22} y={31+Math.floor(i/4)*22} width="17" height="17" rx="4" fill={[1,4,6,7,9,12,14].includes(i) ? "#e7fc83" : "#34482b"} />)}
    <path d="m62 51 2 8 8 2-8 2-2 8-2-8-8-2 8-2Zm191 38 2 8 8 2-8 2-2 8-2-8-8-2 8-2Zm-5-58 0 16m-8-8h16" fill="#6a8b3d" stroke="#6a8b3d" strokeWidth="1.5"/>
  </svg>,
  pixel: <svg viewBox="0 0 320 144" aria-hidden="true">
    <g transform="rotate(-8 159 70)"><rect x="90" y="25" width="145" height="93" rx="5" fill="#5552a7" opacity=".3" transform="translate(5 7)"/>
    <rect x="90" y="25" width="145" height="93" rx="5" fill="#fff5e5" stroke="#382958" strokeWidth="2"/>
    <rect x="99" y="35" width="79" height="73" fill="#5249a3"/>
    <path d="M99 81h12V70h12v-9h11v10h9v-8h12v12h11v17h12v16H99z" fill="#a692eb"/>
    <path d="M99 96h14V86h13v10h12v12H99z" fill="#e571bc"/>
    <path d="M121 43h14v14h-14zm33 5h5v5h-5zm12 8h4v4h-4z" fill="#fff3a0"/>
    <path d="M190 69h32m-32 10h25m-25 10h32m-32 10h17" stroke="#a89ac7" strokeWidth="2" />
    <rect x="205" y="36" width="19" height="20" fill="#fd9db3" stroke="#8c5273" strokeDasharray="1 2"/>
    </g><path d="M61 58v15m-7-8h15m184 16v12m-6-6h12" stroke="#54488f" strokeWidth="2"/>
  </svg>,
};

export default function Page() {
  return <main className={styles.page} id="main-content">
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><i /> THE PLAYROOM / 随时开放</p>
          <h1>好奇<span>游乐场</span></h1>
          <p className={styles.intro}>陪一只小动物，解一道谜题，再寄一张自己画的明信片。今天想先玩什么？</p>
          <Surprise />
        </div>
        <svg viewBox="0 0 430 298" className={styles.heroArt} aria-hidden="true">
          <defs><pattern id="play-dot-field" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.4" fill="#8171a9" /></pattern></defs>
          <rect x="4" y="4" width="422" height="290" rx="36" fill="url(#play-dot-field)" opacity=".35"/>
          <ellipse cx="220" cy="239" rx="169" ry="31" fill="none" stroke="#7b639f" strokeWidth="2" strokeDasharray="3 6"/>
          <g transform="rotate(-12 128 154)">
            <rect x="61" y="115" width="117" height="117" rx="29" fill="#fb8eb6" stroke="#261b3b" strokeWidth="6"/>
            <rect x="58" y="108" width="117" height="117" rx="29" fill="#ffbfd6" stroke="#261b3b" strokeWidth="6"/>
            <path d="M102 156q-8-17 0-20 6 12 14 12m12-2q5-14 18-17-2 15-9 22m15 25q15-13 19-5 4 9-14 19" fill="#83baa6" stroke="#354a46" strokeWidth="3" strokeLinejoin="round"/><path d="M82 173c3-16 17-25 35-25 21 0 36 11 40 29 5 18-9 24-39 24-28 0-40-8-36-28Z" fill="#b7dbc5" stroke="#354a46" strokeWidth="3"/>
            <path d="M102 174h1m27 0h1m-18 7q4 5 8 0" stroke="#354a46" strokeWidth="4" strokeLinecap="round"/>
          </g>
          <g transform="rotate(12 303 177)">
            <rect x="223" y="127" width="146" height="112" rx="18" fill="#a394f5" stroke="#261b3b" strokeWidth="6"/>
            <rect x="223" y="120" width="146" height="112" rx="18" fill="#c1b8ff" stroke="#261b3b" strokeWidth="6"/>
            <rect x="239" y="135" width="114" height="82" rx="4" fill="#332557"/>
            <path d="M242 195h13v-12h14v-17h13v15h13v9h14v-16h14v12h14v10h13v18H242Z" fill="#9e8de5"/>
            <path d="M309 150h11v11h-11zm19 9h6v6h-6zm-42-15h5v5h-5z" fill="#f8d97b"/>
          </g>
          <g transform="rotate(11 221 111)">
            <rect x="172" y="45" width="99" height="111" rx="22" fill="#b6d15e" stroke="#261b3b" strokeWidth="6"/>
            <rect x="168" y="39" width="99" height="111" rx="22" fill="#e2f88f" stroke="#261b3b" strokeWidth="6"/>
            <path d="M216 61v65m-32-32h65m-55-22 46 46m-46 0 46-46" stroke="#4c5e33" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="217" cy="94" r="14" fill="#29342a"/>
            <circle cx="217" cy="94" r="4" fill="#eff7be"/>
          </g>
          <path d="M57 53v29M42 67h29m269-26v28m-14-14h28m43 115v19m-10-9h20" stroke="#f7dc9c" strokeWidth="2.3" strokeLinecap="round"/>
          <circle cx="277" cy="264" r="3" fill="#f7dc9c"/><circle cx="159" cy="260" r="2.5" fill="#f7dc9c"/>
        </svg>
      </header>
      <section className={styles.rooms} aria-label="游乐项目">
        {rooms.map(room => <Link key={room.key} href={room.href} data-tone={room.tone} className={styles.card}>
          <div className={styles.cardArt}>{art[room.key]}</div>
          <div className={styles.cardBody}><p>{room.type}</p><h2>{room.title}</h2><span>{room.note}</span></div>
        </Link>)}
      </section>
      <footer className={styles.foot}>
        <p>不必注册。宠物和每日谜题进度留在这台浏览器；明信片画完记得下载或复制链接。</p>
        <p>从 <a href="https://poki.com/" target="_blank" rel="noreferrer">Poki</a> 的打开即玩、<a href="https://support.chess.com/en/articles/8708990-how-does-the-daily-puzzle-work" target="_blank" rel="noreferrer">Chess.com</a> 的每日谜题和 <a href="https://www.piskelapp.com/" target="_blank" rel="noreferrer">Piskel</a> 的浏览器像素画获得灵感；玩法和画面为本站实现。</p>
        <Link href="/sidequests">找点实用的：小工具</Link>
      </footer>
    </div>
  </main>;
}
