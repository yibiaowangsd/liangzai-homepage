"use client";

import { useSyncExternalStore } from "react";
import type { Messages } from "../i18n/site-language";

const subscribe = () => () => {};
const hour = () => new Date().getHours();

/** A greeting that follows the visitor's own clock; the server always says good morning. */
export default function Greeting({ copy }: { copy: Messages["home"]["greeting"] }) {
  const h = useSyncExternalStore(subscribe, hour, () => 8);
  const [greeting, text] =
    h < 5 ? copy.late
    : h < 11 ? copy.morning
    : h < 14 ? copy.noon
    : h < 19 ? copy.afternoon
    : copy.evening;
  return <p className="mk-hello" suppressHydrationWarning><i className="milk-latin" suppressHydrationWarning>{greeting}</i>{text}</p>;
}
