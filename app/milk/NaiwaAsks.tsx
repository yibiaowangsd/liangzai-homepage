"use client";

import Link from "next/link";
import { useState } from "react";

/** Naiwa (奶蛙) keeps the questions; every one is answered somewhere on the site. */
const questions = [
  { ask: "呱。今天世界上，又发生了什么？", answer: "去读今日简报", href: "/news" },
  { ask: "为什么旧钥匙会被看穿？", answer: "去翻密码图鉴", href: "/pqc-arsenal" },
  { ask: "密钥真的能在浏览器里生出来吗？", answer: "去实验室试一次", href: "/pqc-practice" },
  { ask: "我和量仔是怎么认识的？", answer: "去听睡前故事", href: "/storybook" },
  { ask: "养我们的那个人，是谁？", answer: "去认识 Yibiao", href: "/about" },
];

export default function NaiwaAsks() {
  const [index, setIndex] = useState(0);
  const [bounce, setBounce] = useState(0);
  const current = questions[index];
  const Answer = current.href === "/pqc-practice" ? "a" : Link;
  return (
    <div className="mk-naiwa">
      <div className="mk-bubble" key={index}>
        <p aria-live="polite">{current.ask}</p>
        <Answer href={current.href}>{current.answer}<span aria-hidden="true"> →</span></Answer>
      </div>
      <button type="button" className="mk-naiwa-figure" data-bounce={bounce % 2 ? "a" : "b"}
        aria-label="戳一下奶蛙，换一个问题"
        onClick={() => { setIndex((index + 1) % questions.length); setBounce(bounce + 1); }}>
        <img src="/assets/naiwa/sit.webp" width="820" height="1230" alt="奶蛙：奶黄色、圆肚皮、绿眼圈的小家伙，抱着半瓶奶坐着" fetchPriority="high" />
      </button>
      <p className="mk-naiwa-hint" aria-hidden="true">戳一下，他会换个问题</p>
    </div>
  );
}
