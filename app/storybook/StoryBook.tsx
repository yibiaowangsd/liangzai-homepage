"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./StoryBook.module.css";

type StoryPage = {
  chapter: string;
  title: string;
  body: string;
  quote: string;
  image: string;
  alt: string;
  caption: string;
  tone: "gold" | "violet" | "cyan";
  kind?: "cover" | "story" | "ending";
};

const pages: StoryPage[] = [
  {
    chapter: "AN INTERACTIVE PICTURE BOOK",
    title: "量子星守护者",
    body: "量仔与奶龙大战 Shor 大魔王的故事",
    quote: "点击右侧封面或“翻开故事”，进入量子星。",
    image: "/assets/book-v2/00-cover.webp",
    alt: "量仔和奶龙背靠背守护量子星的绘本封面",
    caption: "LIANGZAI × MILK DRAGON",
    tone: "cyan",
    kind: "cover",
  },
  {
    chapter: "CHAPTER 01 / 丰饶",
    title: "会发光的量子星",
    body: "在量子宇宙的银色星河边，漂浮着一颗名叫量子星的星球。量子星人依靠 RSA 神树守护秘密，又从 ECC 星核汲取能源。清晨，树根里的蓝光沿着街道流淌；夜晚，星核会替每一扇窗点亮温柔的灯。",
    quote: "那时的人们相信，这两道古老力量会永远守护家园。",
    image: "/assets/book-v2/01-peace.webp",
    alt: "巨大的发光神树与蓝色星核守护着和平繁荣的量子星城市",
    caption: "RSA SACRED TREE × ECC STAR CORE",
    tone: "gold",
  },
  {
    chapter: "CHAPTER 02 / 入侵",
    title: "天空被撕开了",
    body: "一天，金色天空忽然裂开。量子计算机飞船像一座黑色迷宫压向城市，飞船的主人 Shor 大魔王站在因子圆环中央。他看见神树和星核，贪婪地伸出了手——他能借助周期的力量，迅速拆开 RSA 的大整数，也能破解 ECC 依赖的离散对数难题。",
    quote: "把旧世界的钥匙交出来，它们在我面前已经没有秘密。",
    image: "/assets/book-v3/02-shor-arrival-fixed.webp",
    alt: "Shor 大魔王乘坐黑紫色量子计算机飞船降临量子星",
    caption: "THREAT SIGNAL / SHOR HAS ARRIVED",
    tone: "violet",
  },
  {
    chapter: "CHAPTER 03 / 苏醒",
    title: "地心深处的心跳",
    body: "第一道紫色闪电落下时，量子星深处响起久违的心跳。沉睡的守护神量仔睁开青色双眼。他听见每一条求救信号，也明白神树与星核正在失去昔日的屏障。即使抗量子能量还没有恢复，他仍沿着地底光路冲向天空。",
    quote: "守护不是等到准备好，而是在朋友需要时醒来。",
    image: "/assets/book-v2/03-awakening.webp",
    alt: "量仔在量子星深处的水晶圣所苏醒并沿青色能量轨迹冲向地表",
    caption: "GUARDIAN Q-∞ / ONLINE",
    tone: "cyan",
  },
  {
    chapter: "CHAPTER 04 / 初战",
    title: "旧力量挡不住新风暴",
    body: "量仔把 RSA 神树的枝光编成盾，又把 ECC 星核的能量聚成枪。可 Shor 的周期之刃每一次挥动，盾上的因子都会显现；星核射出的曲线，也被量子浪潮一层层推算。量仔的能量迅速下降，蓝色护盾布满裂纹。",
    quote: "数学没有背叛量子星，只是旧铠甲迎来了能够看穿它的新对手。",
    image: "/assets/book-v3/04-first-battle-fixed.webp",
    alt: "量仔独自用蓝色能量盾抵挡黑色因子圆环风暴",
    caption: "CLASSICAL DEFENCE / FAILING",
    tone: "violet",
  },
  {
    chapter: "CHAPTER 05 / 援军",
    title: "一团金色从天而降",
    body: "就在致命一击落下的刹那，一道金色身影撞进战场。游历群星的正义侠士奶龙用圆滚滚的肩膀挡住紫光，脚下却一步也没有退。他把量仔扶起来，像许多年前那样伸出手。",
    quote: "你负责找到答案，我负责在答案出现以前，替你多撑一会儿！",
    image: "/assets/book-v2/05-rescue.webp",
    alt: "奶龙从天而降撑起金色护盾，替受伤的量仔挡住 Shor 的致命紫光",
    caption: "THE OLD ALLIANCE / RECONNECTED",
    tone: "gold",
  },
  {
    chapter: "CHAPTER 06 / 苦战",
    title: "两个人仍在后退",
    body: "奶龙的勇气让神树再次发亮，量仔也从星核中抽出最后一束能量。可他们依赖的仍是 Shor 最熟悉的旧力量。因子风暴越转越快，两位战士伤痕累累，意识渐渐沉入黑暗。",
    quote: "旧力量仍在燃烧，却已经无法追上量子风暴。",
    image: "/assets/book-v2/06-duo-struggle.webp",
    alt: "量仔与奶龙在破碎的黑色因子圆环前共同抵抗风暴",
    caption: "ENERGY 03% / SIGNAL FADING",
    tone: "violet",
  },
  {
    chapter: "CHAPTER 07 / 回响",
    title: "尘封的记忆正在苏醒",
    body: "奶龙的勇气让神树再次发亮，量仔也从星核中抽出最后一束能量。可他们依赖的仍是 Shor 最熟悉的旧力量。因子风暴越转越快，两位战士伤痕累累，意识渐渐沉入黑暗。就在这时，一段被尘封的星际记忆同时浮现在他们心中。",
    quote: "真正的默契，不会因为漫长的分别而消失。",
    image: "/assets/book-v2/06-duo-struggle.webp",
    alt: "量仔与奶龙在破碎的黑色因子圆环前共同抵抗风暴",
    caption: "ENERGY 03% / MEMORY CHANNEL OPEN",
    tone: "violet",
  },
  {
    chapter: "CHAPTER 08 / 回忆",
    title: "他们本就是老战友",
    body: "很久以前，量仔与奶龙曾一起穿越无信号荒原、修补坍缩的星门，还在双月战役中击退吞光兽。量仔把混乱测成秩序，奶龙把恐惧熬成勇气；当青色与金色交织成双螺旋，他们便能使出响彻量子宇宙的合体绝技。",
    quote: "原来我们缺少的不是力量，而是再一次相信彼此。",
    image: "/assets/book-v2/07-memory.webp",
    alt: "过去的量仔和奶龙背靠背，用蓝金双螺旋能量击退宇宙怪兽",
    caption: "ARCHIVE MEMORY / DOUBLE-HELIX STRIKE",
    tone: "gold",
  },
  {
    chapter: "CHAPTER 09 / 合体",
    title: "合体绝技：靓龙",
    body: "量仔重新握住奶龙的手。青色测量之光与金色勇气之火绕着他们旋转，旧伤化作星尘，两个身影在耀眼的双螺旋中合而为一。金色龙首、蓝白战甲、量子天线与不肯后退的心——全新的守护形态靓龙，终于在风暴中央睁开双眼。",
    quote: "一个负责精确，一个负责勇敢；合在一起，就是新的可能。",
    image: "/assets/book-v2/08-fusion.webp",
    alt: "金色龙脸与蓝白机械战甲融合而成的靓龙悬浮在双螺旋光芒中",
    caption: "FUSION FORM / LIANGLONG",
    tone: "cyan",
  },
  {
    chapter: "CHAPTER 10 / 决战",
    title: "Kyber 与 Aigis",
    body: "靓龙右手召来青色晶格神剑 Kyber，左手展开金紫色神盾 Aigis。它们不再把安全寄托于大整数分解或椭圆曲线离散对数，而是来自 Shor 难以击穿的格困难世界。魔王第一次后退，深埋在因子圆环里的恐惧开始颤抖。",
    quote: "旧钥匙可以被看穿，那就锻造一把属于新时代的钥匙。",
    image: "/assets/book-v2/09-final-battle.webp",
    alt: "靓龙挥舞青色晶格剑和金紫护盾，与 Shor 大魔王展开最终决战",
    caption: "KYBER × AIGIS / POST-QUANTUM ARSENAL",
    tone: "cyan",
  },
  {
    chapter: "EPILOGUE / 尾声",
    title: "下一颗星，出发",
    body: "晶格剑划开因子风暴，Aigis 神盾把破碎的能量送回星空。Shor 的飞船化成无害纸片，RSA 神树和 ECC 星核也被保留下来，成为历史与新密码共同守护的文明记忆。黎明时，量仔和奶龙解除合体，向量子星人挥手告别。",
    quote: "他们没有停在胜利里，而是继续去寻找宇宙中下一条需要守护的信号。",
    image: "/assets/book-v3/10-epilogue-fixed.webp",
    alt: "黎明时，量仔与奶龙以侧后方背影走向飞船，并自然回头向量子星人挥手告别",
    caption: "THE ADVENTURE CONTINUES…",
    tone: "gold",
    kind: "ending",
  },
];

const narrationTracks = [
  "/assets/narration-v2/00-intro.mp3",
  "/assets/narration-v2/01-quantum-star.mp3",
  "/assets/narration-v2/02-shor-arrives.mp3",
  "/assets/narration-v2/03-awakening.mp3",
  "/assets/narration-v2/04-first-battle.mp3",
  "/assets/narration-v2/05-rescue.mp3",
  "/assets/narration-v2/06-struggle.mp3",
  "/assets/narration-v2/07-memory-awakens.mp3",
  "/assets/narration-v2/08-old-allies.mp3",
  "/assets/narration-v2/09-fusion.mp3",
  "/assets/narration-v2/10-final-battle.mp3",
  "/assets/narration-v2/11-epilogue.mp3",
];

type AudioState = "loading" | "playing" | "paused" | "blocked" | "ended";

function TextPage({ page, index, onOpen }: { page: StoryPage; index: number; onOpen?: () => void }) {
  return (
    <div className={`${styles.textPageInner} ${styles[page.tone]} ${page.kind ? styles[page.kind] : ""}`}>
      <p className={styles.chapter}>{page.chapter}</p>
      <h1>{page.title}</h1>
      <p className={styles.storyCopy}>{page.body}</p>
      <blockquote>{page.quote}</blockquote>
      {page.kind === "cover" && onOpen && (
        <button className={styles.openStory} type="button" onClick={onOpen}>翻开故事 <span>→</span></button>
      )}
      {page.kind === "ending" && (
        <Link className={styles.archiveCta} href="/archive">查看量仔主页 <span>→</span></Link>
      )}
      <div className={styles.pageFoot}>
        <span>量子星守护者</span>
        <b>{String(index + 1).padStart(2, "0")}</b>
      </div>
    </div>
  );
}

function ArtPage({ page, onOpen }: { page: StoryPage; onOpen?: () => void }) {
  return (
    <figure className={styles.artPageInner}>
      <img src={page.image} alt={page.alt} draggable={false} />
      {page.kind === "cover" && onOpen && (
        <button className={styles.coverHotspot} type="button" onClick={onOpen} aria-label="翻开故事" />
      )}
      <figcaption>{page.caption}</figcaption>
    </figure>
  );
}

function MobileSpread({ page, index, onOpen }: { page: StoryPage; index: number; onOpen?: () => void }) {
  return (
    <div className={styles.mobileSpread}>
      <ArtPage page={page} onOpen={onOpen} />
      <TextPage page={page} index={index} onOpen={onOpen} />
    </div>
  );
}

export default function StoryBook() {
  const [current, setCurrent] = useState(0);
  const [target, setTarget] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [turning, setTurning] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("loading");
  const touchStart = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrationPage = useRef(0);

  const turnTo = useCallback(
    (nextIndex: number) => {
      if (turning || nextIndex === current || nextIndex < 0 || nextIndex >= pages.length) return;
      const nextDirection = nextIndex > current ? "forward" : "backward";
      setDirection(nextDirection);
      setTarget(nextIndex);
      setTurning(true);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      timer.current = setTimeout(() => {
        setCurrent(nextIndex);
        setTurning(false);
      }, reduceMotion ? 90 : 820);
    },
    [current, turning],
  );

  const playNarration = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.ended) {
      narrationPage.current = 0;
      audio.src = narrationTracks[0];
      audio.load();
      turnTo(0);
    }
    void audio.play().catch(() => setAudioState("blocked"));
  }, [turnTo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const attemptAutoplay = () => {
      void audio.play().catch(() => setAudioState("blocked"));
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      attemptAutoplay();
    } else {
      audio.addEventListener("canplay", attemptAutoplay, { once: true });
    }

    return () => audio.removeEventListener("canplay", attemptAutoplay);
  }, []);

  const advanceNarration = useCallback(() => {
    const nextPage = narrationPage.current + 1;
    if (nextPage >= narrationTracks.length) {
      setAudioState("ended");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    narrationPage.current = nextPage;
    turnTo(nextPage);
    audio.src = narrationTracks[nextPage];
    audio.load();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    audioTimer.current = setTimeout(() => {
      void audio.play().catch(() => setAudioState("blocked"));
    }, reduceMotion ? 100 : 700);
  }, [turnTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        turnTo(current + 1);
      }
      if (event.key === "ArrowLeft") turnTo(current - 1);
      if (event.key === "Home") turnTo(0);
      if (event.key === "End") turnTo(pages.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, turnTo]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (audioTimer.current) clearTimeout(audioTimer.current);
      audioRef.current?.pause();
    },
    [],
  );

  const toggleNarration = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
    } else {
      playNarration();
    }
  };

  const audioLabel = audioState === "playing"
    ? "暂停旁白"
    : audioState === "ended"
      ? "重新播放旁白"
      : "继续旁白";

  const leftIndex = turning && direction === "backward" ? target : current;
  const rightIndex = turning && direction === "forward" ? target : current;

  return (
    <main className={styles.storyShell}>
      <audio
        ref={audioRef}
        className={styles.audioElement}
        src={narrationTracks[0]}
        preload="auto"
        autoPlay
        playsInline
        onPlay={() => setAudioState("playing")}
        onPause={() => {
          if (!audioRef.current?.ended) setAudioState("paused");
        }}
        onEnded={advanceNarration}
      />
      <header className={styles.storyNav}>
        <Link href="/archive" className={styles.brand} aria-label="查看量仔主页">
          量仔档案馆 <span>Q-∞</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/archive">量仔主页</Link>
          <Link href="/pqc-arsenal">PQC 武器库</Link>
          <button
            type="button"
            onClick={toggleNarration}
            aria-label={audioLabel}
          >
            <i className={audioState === "playing" ? styles.voicePulse : ""} aria-hidden="true" />
            {audioLabel}
          </button>
        </div>
      </header>

      <section className={styles.reader} aria-label="量子星守护者动画书">
        {audioState === "blocked" && (
          <button className={styles.audioUnlock} type="button" onClick={playNarration}>
            浏览器已暂停自动播放，轻触开启故事旁白
          </button>
        )}
        <div className={styles.readerIntro}>
          <p>INTERACTIVE PICTURE BOOK / 约 5 分钟</p>
          <p aria-live="polite">{pages[current].chapter} · {pages[current].title}</p>
        </div>

        <div
          className={styles.bookStage}
          onPointerDown={(event) => { touchStart.current = event.clientX; }}
          onPointerUp={(event) => {
            if (touchStart.current === null) return;
            const delta = event.clientX - touchStart.current;
            touchStart.current = null;
            if (Math.abs(delta) > 48) turnTo(current + (delta < 0 ? 1 : -1));
          }}
        >
          <div className={styles.bookCover} aria-hidden="true" />
          <div className={styles.book}>
            <div className={`${styles.paperPage} ${styles.leftPage}`}>
              <TextPage page={pages[leftIndex]} index={leftIndex} onOpen={() => turnTo(1)} />
            </div>
            <div className={`${styles.paperPage} ${styles.rightPage}`}>
              <ArtPage page={pages[rightIndex]} onOpen={() => turnTo(1)} />
            </div>

            {turning && (
              <div className={`${styles.turnLeaf} ${direction === "forward" ? styles.turnForward : styles.turnBackward}`}>
                <div className={`${styles.leafFace} ${styles.leafFront}`}>
                  <ArtPage page={pages[direction === "forward" ? current : target]} />
                </div>
                <div className={`${styles.leafFace} ${styles.leafBack}`}>
                  <TextPage page={pages[direction === "forward" ? target : current]} index={direction === "forward" ? target : current} />
                </div>
              </div>
            )}

            <div className={styles.mobileStatic}>
              <MobileSpread page={pages[turning ? target : current]} index={turning ? target : current} onOpen={() => turnTo(1)} />
            </div>
            {turning && (
              <div className={`${styles.mobileTurn} ${direction === "forward" ? styles.mobileTurnForward : styles.mobileTurnBackward}`}>
                <MobileSpread page={pages[current]} index={current} onOpen={() => turnTo(1)} />
              </div>
            )}

            <button
              type="button"
              className={`${styles.pageEdge} ${styles.prevEdge}`}
              onClick={() => turnTo(current - 1)}
              disabled={current === 0 || turning}
              aria-label="上一页"
            />
            <button
              type="button"
              className={`${styles.pageEdge} ${styles.nextEdge}`}
              onClick={() => turnTo(current + 1)}
              disabled={current === pages.length - 1 || turning}
              aria-label="下一页"
            />
          </div>
        </div>

        <div className={styles.controls}>
          <button type="button" onClick={() => turnTo(current - 1)} disabled={current === 0 || turning}>
            <span aria-hidden="true">←</span> 上一页
          </button>
          <div className={styles.progress} aria-label={`第 ${current + 1} 页，共 ${pages.length} 页`}>
            {pages.map((page, index) => (
              <button
                type="button"
                key={page.title}
                className={index === current ? styles.activeDot : ""}
                onClick={() => turnTo(index)}
                disabled={turning}
                aria-label={`跳到第 ${index + 1} 页：${page.title}`}
                aria-current={index === current ? "page" : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={() => turnTo(current + 1)} disabled={current === pages.length - 1 || turning}>
            {current === 0 ? "翻开故事" : "下一页"} <span aria-hidden="true">→</span>
          </button>
        </div>
        <p className={styles.hint}>点击书页边缘、滑动或使用 ← → 键翻页</p>
      </section>

      <footer className={styles.storyFooter}>
        <p>注：Kyber 是 ML-KEM 标准化前的名称；绘本以神兵隐喻后量子密码。</p>
        <Link href="/archive">查看量仔主页 ↗</Link>
      </footer>
    </main>
  );
}
