"use client";
import { useEffect, useRef, useState } from "react";
import { useExperience } from "./Motion";
import type { HeroScene } from "./three/hero-scene";
import type { ArrivalPhase } from "./three/arrival-state";
import type { ModelMode, ModelView } from "./three/character-assets";
import "./guardian-3d.css";

const labels={liangzai:"量仔",nailong:"奶龙",duo:"量仔与奶龙"};
const clouds={liangzai:"量子星云",nailong:"奶龙星云",duo:"双星共鸣"};
export default function InteractiveGuardian() {
  const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<HeroScene|null>(null);
  const {enabled}=useExperience();
  const motion=useRef(enabled),selection=useRef<ModelMode>("liangzai"),request=useRef(0);
  const [status,setStatus]=useState<"loading"|"ready"|"fallback">("loading");
  const [phase,setPhase]=useState<ArrivalPhase>("nebula");
  const [mode,setMode]=useState<ModelMode>("liangzai"),[view,setView]=useState<ModelView>("reset");
  useEffect(()=>{motion.current=enabled;runtime.current?.setMotion(enabled);},[enabled]);
  useEffect(()=>{
    let alive=true;
    const controller=new AbortController();
    const fallback=()=>{if(alive){runtime.current?.dispose();runtime.current=null;setStatus("fallback");}};
    void (async()=>{
      try{
        const {createHeroScene}=await import("./three/hero-scene");
        if(!alive||!canvas.current)return;
        const instance=createHeroScene(canvas.current,fallback,controller.signal,next=>{if(alive)setPhase(next);});
        runtime.current=instance;instance.setMotion(motion.current);
        const version=++request.current;
        await instance.setModel(selection.current);
        if(alive&&version===request.current)setStatus("ready");
      }catch{fallback();}
    })();
    return()=>{alive=false;request.current++;controller.abort();runtime.current?.dispose();runtime.current=null;};
  },[]);
  async function selectModel(next:ModelMode){
    if(next===selection.current&&status!=="fallback")return;
    selection.current=next;setMode(next);setPhase("nebula");setView("reset");
    const instance=runtime.current,version=++request.current;
    if(!instance)return;
    setStatus("loading");
    try{await instance.setModel(next);if(version===request.current)setStatus("ready");}
    catch{if(version===request.current){instance.dispose();if(runtime.current===instance)runtime.current=null;setStatus("fallback");}}
  }
  function selectView(next:ModelView){setView(next);runtime.current?.setView(next);}
  const formed=phase==="formed",fallback=status==="fallback";
  const instruction=fallback?"3D 暂不可用，可切换图片视角":status==="loading"?"星云正在苏醒":formed?"拖动旋转 · 点击角色，发现回应":phase==="revealing"?"星光凝实，伙伴降临":phase==="gathering"?"继续长按，让星光凝聚成形":"划过星云，拨动星尘 · 长按唤醒"+labels[mode];
  return (
    <div className="guardian-stage" data-status={status} data-model={mode} data-arrival={phase} aria-busy={status==="loading"}>
      <div className="guardian-atmosphere" aria-hidden="true" />
      <div className="guardian-nebula-backdrop" aria-hidden="true"><i /><i /><i /></div>
      {fallback&&<div className="guardian-fallback" aria-hidden="true">
        <img src={`/assets/models/observatory/${mode}-${view}.webp`} alt="" decoding="async" width="768" height="864" />
      </div>}
      <canvas ref={canvas} className="guardian-canvas" tabIndex={status==="ready"?0:-1} role="img"
        aria-label={formed?`${labels[mode]}三维模型。拖动旋转，点击身体部位互动，方向键旋转，回车唤起星光。`:`${clouds[mode]}。长按鼠标或按住空格、回车，粒子将凝聚为${labels[mode]}。松开可让未成形的星光散开。`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter Space" />
      <div className="guardian-arrival-flare" aria-hidden="true" />
      <div className="guardian-scene-label"><span className="guardian-live-dot" />{formed?labels[mode]:clouds[mode]}<span>{formed?"已唤醒":"等待共鸣"}</span></div>
      <div className="guardian-models" role="group" aria-label="选择展示模型">
        {([["liangzai","量仔","01"],["nailong","奶龙","02"],["duo","同时展示","01 + 02"]] as const).map(([id,label,code])=>(
          <button key={id} aria-pressed={mode===id} onClick={()=>void selectModel(id)}><span>{label}</span><small>{code}</small></button>
        ))}
      </div>
      <div className="guardian-controls">
        {!formed&&!fallback&&<div className="guardian-hold-mark" aria-hidden="true"><span /><i /></div>}
        <div className="guardian-instruction" role="status" aria-live="polite">{instruction}</div>
        {!formed&&!fallback&&<div className="guardian-formation-track" aria-hidden="true"><span /></div>}
        {(formed||fallback)&&<div className="guardian-actions" role="group" aria-label="选择模型视角">
          {([["front","正面"],["side","侧面"],["back","背面"]] as const).map(([id,label])=>(
            <button key={id} aria-pressed={view===id} onClick={()=>selectView(id)}>{label}</button>
          ))}
          <button onClick={()=>selectView("reset")} aria-label="重置模型视角">复位</button>
        </div>}
      </div>
    </div>
  );
}
