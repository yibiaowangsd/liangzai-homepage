"use client";

import Link from "next/link";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import PuffArt from "./PuffArt";
import { actions, chooseRoom, doAction, experience, isRoomOpen, readState, rooms, storageKey, type Action, type PetState, type RoomId } from "./state";
import styles from "./pet.module.css";

const updateEvent = "liangzai-puff-update";
let volatile: PetState | null = null;
function getStore() {
  if (volatile) return volatile;
  try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(updateEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(updateEvent, callback);
  };
}
const getServerStore = () => "";
function selectState(snapshot: string | PetState) {
  return typeof snapshot === "string" ? readState(snapshot) : snapshot;
}
function put(next: PetState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    volatile = null;
  } catch {
    volatile = next;
  }
  window.dispatchEvent(new Event(updateEvent));
  return volatile === null;
}
const actionsUI = {
  pet: { label: "摸一摸", detail: "亲密度 +1", icon: "♡", lines: ["团团把耳朵放平，眯成了两道弯弯。", "它把额头悄悄靠了过来。", "团团舒舒服服地伸了个懒腰。"] },
  feed: { label: "喂星果", detail: "亲密度 +2", icon: "✿", lines: ["星果咔嚓一声，里面是香甜的流星碎屑。", "团团留了一半星果给你。", "它把星果核收好，说下次要种一颗星星。"] },
  play: { label: "捉星星", detail: "三次点击 · 亲密度 +3", icon: "✦", lines: ["三颗星星，团团全收进了小口袋。", "捉住啦！今晚的小夜灯不用插电了。", "每一颗都是你和团团一起找回来的。"] },
};
const gameRounds = [
  [1, 2, 0], [0, 2, 1], [2, 0, 1],
];
const captions = ["左边的星", "中间的星", "右边的星"];

export default function PuffHouse() {
  const state = selectState(useSyncExternalStore(subscribe, getStore, getServerStore));
  const score = experience(state);
  const nextRoom = rooms.find(room => score < room.threshold);
  const progressMax = nextRoom?.threshold ?? rooms[rooms.length - 1].threshold;
  const [mood, setMood] = useState<Action | "idle">("idle");
  const [animation, setAnimation] = useState(0);
  const [status, setStatus] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [round, setRound] = useState<{ order: number[]; step: number } | null>(null);
  const gameStart = useRef<HTMLButtonElement>(null);
  const litStar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mood === "idle") return;
    const timer = window.setTimeout(() => setMood("idle"), 1100);
    return () => window.clearTimeout(timer);
  }, [mood, animation]);

  function finish(action: Action) {
    const before = selectState(getStore());
    const after = doAction(before, action);
    const saved = put(after);
    const unlocked = rooms.find(room => experience(before) < room.threshold && experience(after) >= room.threshold);
    const lines = actionsUI[action].lines;
    setMood(action);
    setAnimation(count => count + 1);
    setStatus(lines[(after.counts[action] - 1) % lines.length] + (unlocked ? ` 解锁房间：${unlocked.name}！` : ""));
    setStorageBlocked(!saved);
  }

  function openGame() {
    setRound({ order: gameRounds[state.counts.play % gameRounds.length], step: 0 });
    setStatus("团团想找回三颗星。点亮的那颗就是下一颗。");
    requestAnimationFrame(() => litStar.current?.focus());
  }

  function stopGame() {
    setRound(null);
    requestAnimationFrame(() => gameStart.current?.focus());
  }

  function catchStar(index: number) {
    if (!round) return;
    if (round.order[round.step] !== index) {
      setStatus(`这颗还没亮，先找${captions[round.order[round.step]]}。`);
      return;
    }
    if (round.step === 2) {
      stopGame();
      finish("play");
      return;
    }
    setRound({ ...round, step: round.step + 1 });
    requestAnimationFrame(() => litStar.current?.focus());
    setStatus(`找到 ${round.step + 1}/3 颗。下一颗是${captions[round.order[round.step + 1]]}。`);
  }

  function changeRoom(room: RoomId) {
    const before = selectState(getStore());
    if (!isRoomOpen(before, room)) return;
    setStorageBlocked(!put(chooseRoom(before, room)));
    setStatus(`来到${rooms.find(item => item.id === room)?.name}。`);
  }

  return (
    <main className={styles.house} id="main-content">
      <header className={styles.heading}>
        <p className={styles.eyebrow}><Link className="play-room-back" href="/play">好奇游乐场</Link> <span aria-hidden="true"> / </span>团团的小屋</p>
        <h1>星团小屋<span>.</span></h1>
        <p>团团住在这里。它不计较你隔多久回来，只关心今天又收到了什么小惊喜。</p>
      </header>

      <div className={styles.layout}>
        <section aria-label="和团团互动" className={styles.care}>
          <div className={styles.stage} data-room={state.room}>
            <div className={styles.orbit} aria-hidden="true" />
            <div className={styles.hill} aria-hidden="true" />
            <div className={styles.starlight} aria-hidden="true"><i>✦</i><i>·</i><i>✧</i><i>✦</i><i>·</i></div>
            <div className={styles.stageTop}>
              <span>团团的家</span><span>房间 · {rooms.find(room => room.id === state.room)?.name}</span>
            </div>
            <PuffArt key={animation} mood={mood} />
            <span className={styles.petLabel}>「团团」<small> / 星果收藏家</small></span>
          </div>

          <div className={styles.actionRow}>
            {actions.map(action => <button type="button" key={action} className={styles.action} ref={action === "play" ? gameStart : undefined}
              disabled={action === "play" && Boolean(round)}
              onClick={() => action === "play" ? openGame() : finish(action)}>
              <span aria-hidden="true">{actionsUI[action].icon}</span>
              <b>{actionsUI[action].label}</b>
              <small>{actionsUI[action].detail}</small>
            </button>)}
          </div>
          {round && <section className={styles.game} aria-label="捉星星小游戏">
            <div>
              <h2>捉星星 <span>{round.step}/3</span></h2>
              <button type="button" className={styles.cancel} onClick={() => { stopGame(); setStatus("先休息，星星下次还在。"); }}>结束小游戏</button>
            </div>
            <p>下一颗：{captions[round.order[round.step]]}。</p>
            <div className={styles.stars}>
              {captions.map((caption, index) => {
                const caught = round.order.slice(0, round.step).includes(index);
                return <button type="button" key={caption} ref={index === round.order[round.step] ? litStar : undefined}
                  aria-label={`${caption}${caught ? "（已找到）" : index === round.order[round.step] ? "（已点亮）" : ""}`}
                  data-target={index === round.order[round.step]} aria-disabled={caught}
                  onClick={() => !caught && catchStar(index)}>{caught ? "✓" : index === round.order[round.step] ? "✦" : "✧"}</button>;
              })}
            </div>
          </section>}
          <p role="status" className={styles.feedback}>{status || "团团正在口袋里数星星。"}</p>
          {storageBlocked && <p className={styles.storage} role="status">此浏览器未允许本地保存，刷新后本次进度可能丢失。</p>}
        </section>

        <aside className={styles.journal} aria-label="团团的成长和房间">
          <p className={styles.eyebrow}>CARE LOG / 团团手账</p>
          <div className={styles.score}><strong>{score}</strong><span>亲密度</span></div>
          <progress aria-label="解锁下一间房的亲密度进度" max={progressMax} value={Math.min(score, progressMax)} />
          <p className={styles.next}>{nextRoom ? `再攒 ${nextRoom.threshold - score} 点，开启${nextRoom.name}。` : "四个房间都开门啦！"}</p>

          <h2>团团的房间</h2>
          <div className={styles.rooms}>
            {rooms.map(room => {
              const open = isRoomOpen(state, room.id);
              return <button type="button" key={room.id} className={styles.room} disabled={!open}
                aria-pressed={room.id === state.room} onClick={() => changeRoom(room.id)}>
                <span className={styles.swatch} data-room={room.id} aria-hidden="true" />
                <span><b>{room.name}</b><small>{open ? room.note : `${room.threshold} 点亲密度解锁`}</small></span>
                <span aria-hidden="true">{room.id === state.room ? "✓" : open ? "›" : "·"}</span>
              </button>;
            })}
          </div>
          <p className={styles.privacy}>只保存在这台浏览器。不签到、不掉亲密度，离开多久都没关系。</p>
        </aside>
      </div>
    </main>
  );
}
