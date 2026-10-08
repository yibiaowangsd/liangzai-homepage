"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {window.addEventListener("liangzai:font-change", notify); return () => window.removeEventListener("liangzai:font-change", notify);};
export function FontSize({en = false}: {en?: boolean}) {
  const size = useSyncExternalStore(subscribe, () => document.documentElement.dataset.fontSize || "normal", () => "normal");
  return <label className="font-picker">{en ? "Text size" : "字号"} <select aria-label={en ? "Text size" : "字号"} value={size} onChange={event => window.dispatchEvent(new CustomEvent("liangzai:font-request", {detail:event.target.value}))}><option value="normal">{en ? "Standard" : "标准"}</option><option value="large">{en ? "Large" : "大字"}</option></select></label>;
}
export function SearchShortcut() {
  const shortcut = useSyncExternalStore(() => () => {}, () => /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K", () => "Ctrl K");
  return <kbd>{shortcut}</kbd>;
}
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {const update = () => setVisible(window.scrollY > 500); update(); window.addEventListener("scroll", update, {passive:true}); return () => window.removeEventListener("scroll", update);}, []);
  return <button type="button" className="floating-top" hidden={!visible} aria-label="回到顶部" onClick={() => {window.scrollTo({top:0, behavior:document.documentElement.dataset.reducedMotion === "true" ? "instant" : "smooth"}); const main=document.getElementById("main-content"); if(main){main.tabIndex=-1;main.focus({preventScroll:true});}}}>↑<span>回到顶部</span></button>;
}
