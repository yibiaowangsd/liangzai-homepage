"use client";

import Link from "next/link";
import { useState } from "react";
import type { Messages } from "../i18n/site-language";

/** Naiwa (奶蛙) keeps the questions; every one is answered somewhere on the site. */
const questions = [
  { id: "news", href: "/news" },
  { id: "algorithms", href: "/pqc-arsenal" },
  { id: "lab", href: "/pqc-practice" },
  { id: "story", href: "/storybook" },
  { id: "about", href: "/about" },
] as const;

export default function NaiwaAsks({ copy }: { copy: Messages["home"]["naiwa"] }) {
  const [index, setIndex] = useState(0);
  const [bounce, setBounce] = useState(0);
  const current = questions[index];
  const [ask, answer] = copy.questions[current.id];
  const Answer = current.href === "/pqc-practice" ? "a" : Link;
  return (
    <div className="mk-naiwa">
      <div className="mk-bubble" key={index}>
        <p aria-live="polite">{ask}</p>
        <Answer href={current.href}>{answer}<span aria-hidden="true"> →</span></Answer>
      </div>
      <button type="button" className="mk-naiwa-figure" data-bounce={bounce % 2 ? "a" : "b"}
        aria-label={copy.action}
        onClick={() => { setIndex((index + 1) % questions.length); setBounce(bounce + 1); }}>
        <img src="/assets/naiwa/sit.webp" width="820" height="1230" alt={copy.alt} fetchPriority="high" />
      </button>
      <p className="mk-naiwa-hint" aria-hidden="true">{copy.hint}</p>
    </div>
  );
}
