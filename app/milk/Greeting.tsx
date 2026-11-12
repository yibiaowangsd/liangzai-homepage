"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const hour = () => new Date().getHours();

/** A greeting that follows the visitor's own clock; the server always says good morning. */
export default function Greeting() {
  const h = useSyncExternalStore(subscribe, hour, () => 8);
  const [latin, text] =
    h < 5 ? ["Still up?", "夜深了，奶还温着"]
    : h < 11 ? ["Good morning,", "早上好，奶已经温好"]
    : h < 14 ? ["Good noon,", "中午好，先喝一口再忙"]
    : h < 19 ? ["Good afternoon,", "下午好，来得正是时候"]
    : ["Good evening,", "晚上好，今天的还没喝完"];
  return <p className="mk-hello" suppressHydrationWarning><i className="milk-latin" suppressHydrationWarning>{latin}</i>{text}</p>;
}
