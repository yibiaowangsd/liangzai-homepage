"use client";
import { useState } from "react";
export function DensityControl() {
  const [density,setDensity]=useState("compact");
  return <fieldset className="news-density"><legend>列表密度</legend>{[["compact","紧凑"],["detailed","详细"]].map(([value,label])=><button key={value} type="button" aria-pressed={density===value} onClick={()=>{setDensity(value); const main=document.querySelector('.newsroom'); if(main instanceof HTMLElement)main.dataset.density=value;}}>{label}</button>)}</fieldset>;
}
export function EditionPicker({options,current}: {options:{label:string;href:string}[];current:string}) {
  return <label className="edition-picker">日期归档 <select aria-label="跳转到日期或期数" value={current} onChange={event=>{window.location.href=event.target.value;}}>{options.map(option=><option key={option.href} value={option.href}>{option.label}</option>)}</select></label>;
}
