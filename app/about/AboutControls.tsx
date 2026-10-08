"use client";
import { useState } from "react";
import SectionIndex from "../site/SectionIndex";
const sections = [{id: "journey", label: "我的经历"}, {id: "focus", label: "技术方向"}, {id: "projects", label: "个人项目"}, {id: "contact", label: "找到我"}];
export function AboutIndex({className}: {className: string}) { return <SectionIndex items={sections} className={className + " section-index"} label="个人主页目录" />; }
export function ContactEmail() {
  const [feedback, setFeedback] = useState("");
  return <span className="contact-email"><a href="mailto:yibiao_wang@foxmail.com">发送邮件</a><button type="button" aria-label="复制邮箱 yibiao_wang@foxmail.com" onClick={async () => {try {await navigator.clipboard.writeText("yibiao_wang@foxmail.com"); setFeedback("✓ 邮箱已复制");} catch {setFeedback("复制失败，请选中邮箱手动复制");}}}>yibiao_wang@foxmail.com ⧉</button><small role="status">{feedback}</small></span>;
}
