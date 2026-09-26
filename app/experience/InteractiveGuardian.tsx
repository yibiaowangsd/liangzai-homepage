"use client";
import { useEffect, useRef, useState } from "react";
import { useExperience } from "./Motion";
import type { HeroScene } from "./three/hero-scene";
import type { FusionPhase } from "./three/fusion-state";
import type { ArrivalPhase } from "./three/arrival-state";
import type { ModelMode, ModelView } from "./three/character-assets";
import "./guardian-3d.css";

const labels={liangzai:"量仔",nailong:"奶龙",duo:"量仔与奶龙"};
const clouds={liangzai:"量子星云",nailong:"奶龙星云",duo:"双星共鸣"};
export default function InteractiveGuardian() {
  const shell=useRef<HTMLDialogElement>(null);
  const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<HeroScene|null>(null);
  const {enabled}=useExperience();
  const motion=useRef(enabled),selection=useRef<ModelMode>("liangzai"),request=useRef(0);
  const [status,setStatus]=useState<"loading"|"ready"|"fallback">("loading");
  const [phase,setPhase]=useState<ArrivalPhase>("nebula");
  const [fusion,setFusion]=useState<FusionPhase>("idle");
  const fused=fusion==="fused"||fusion==="docked";
  const [hasFusion,setHasFusion]=useState(false);
  const immersive=fusion==="merging"||fusion==="fused";
  useEffect(()=>{const dialog=shell.current;if(!dialog)return;if(immersive&&!dialog.matches(":modal")){dialog.close();dialog.showModal();}else if(!immersive&&dialog.matches(":modal")){dialog.close();dialog.show();}},[immersive]);
  const [mode,setMode]=useState<ModelMode>("liangzai"),[view,setView]=useState<ModelView>("reset");
  useEffect(()=>{motion.current=enabled;runtime.current?.setMotion(enabled);},[enabled]);
  useEffect(()=>{
    let alive=true;
    const controller=new AbortController();
    const fallback=()=>{if(alive){runtime.current?.dispose();runtime.current=null;setFusion("idle");setStatus("fallback");}};
    void (async()=>{
      try{
        const {createHeroScene}=await import("./three/hero-scene");
        if(!alive||!canvas.current)return;
        const instance=createHeroScene(canvas.current,fallback,controller.signal,next=>{if(alive)setPhase(next);},next=>{if(alive){setFusion(next);if(next==="fused"||next==="docked")setHasFusion(true);}});
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
    selection.current=next;setMode(next);setView("reset");
    const instance=runtime.current,version=++request.current;
    if(!instance)return;
    setStatus("loading");
    try{await instance.setModel(next);if(version===request.current)setStatus("ready");}
    catch{if(version===request.current){instance.dispose();if(runtime.current===instance)runtime.current=null;setFusion("idle");setStatus("fallback");}}
  }
  function selectView(next:ModelView){setView(next);runtime.current?.setView(next);}
  const formed=phase==="formed",fallback=status==="fallback";
  const instruction=fusion==="merging"?"量子与勇气，正在成为同一种力量":fused?"量子奶龙仔 · 拖动探索全新形态，点击胸核唤起共鸣":fusion==="charging"?"继续长按，开启双星融合":fallback?"3D 暂不可用，可切换图片视角":status==="loading"?"星云正在苏醒":formed?(mode==="duo"?"继续长按，融合为量子奶龙仔 · 拖动或点击仍可互动":"拖动旋转 · 点击角色，发现回应"):phase==="revealing"?"星光凝实，伙伴降临":phase==="gathering"?"继续长按，让星光凝聚成形":"划过星云，拨动星尘 · 长按唤醒"+labels[mode];
  return (
    <dialog ref={shell} open className="guardian-stage" aria-label={immersive?"量子奶龙仔融合空间":"角色星云展台"} onCancel={event=>{event.preventDefault();runtime.current?.exitFusion();}} data-fusion={fusion} data-status={status} data-model={mode} data-arrival={phase} aria-busy={status==="loading"}>
      {immersive&&<><button className="guardian-fusion-back" onClick={()=>runtime.current?.exitFusion()}>返回首页展台</button><div className="guardian-fusion-heading"><p>量仔 × 奶龙</p><h2>{fused?"量子奶龙仔":"双星融合"}</h2><span>{fused?"量子之力，勇气之心。":"两份力量，一个全新的守护者。"}</span></div></>}
      <div className="guardian-atmosphere" aria-hidden="true" />
      <div className="guardian-nebula-backdrop" aria-hidden="true"><i /><i /><i /></div>
      {fallback&&<div className="guardian-fallback" aria-hidden="true">
        <img src={`/assets/models/observatory/${mode}-${view}.webp`} alt="" decoding="async" width="768" height="864" />
      </div>}
      <canvas ref={canvas} className="guardian-canvas" tabIndex={status==="ready"?0:-1} role="img"
        aria-label={fused?"量子奶龙仔合体模型。拖动或方向键旋转，点击模型或回车互动，Escape 返回首页展台。":fusion==="merging"?"正在融合为量子奶龙仔，Escape 取消并返回首页展台。":formed?`${labels[mode]}三维模型。拖动旋转，点击身体部位互动，方向键旋转；双人模式按住空格或回车开始融合，其余模式回车唤起星光。`:`${clouds[mode]}。长按鼠标或按住空格、回车，粒子将凝聚为${labels[mode]}。松开可让未成形的星光散开。`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter Space" />
      <div className="guardian-arrival-flare" aria-hidden="true" />
      <div className="guardian-scene-label"><span className="guardian-live-dot" />{fused?"量子奶龙仔":formed?labels[mode]:clouds[mode]}<span>{formed?"已唤醒":"等待共鸣"}</span></div>
      {!immersive&&<div className="guardian-models" role="group" aria-label="选择展示模型">
        {([["liangzai","量仔","01"],["nailong","奶龙","02"],["duo","同时展示","01 + 02"]] as const).map(([id,label,code])=>(
          <button key={id} aria-pressed={mode===id} onClick={()=>void selectModel(id)}><span>{id==="duo"&&hasFusion?"合体形态":label}</span><small>{code}</small></button>
        ))}
      </div>}
      <div className="guardian-controls">
        {!formed&&!fallback&&<div className="guardian-hold-mark" aria-hidden="true"><span /><i /></div>}
        <div className="guardian-instruction" role="status" aria-live="polite">{instruction}</div>
        {!formed&&!fallback&&<div className="guardian-formation-track" aria-hidden="true"><span /></div>}
        {fusion==="charging"&&<div className="guardian-fusion-track" aria-hidden="true"><span /></div>}
        {(formed||fallback)&&fusion!=="merging"&&<div className="guardian-actions" role="group" aria-label="选择模型视角">
          {([["front","正面"],["side","侧面"],["back","背面"]] as const).map(([id,label])=>(
            <button key={id} aria-pressed={view===id} onClick={()=>selectView(id)}>{label}</button>
          ))}
          <button onClick={()=>selectView("reset")} aria-label="重置模型视角">复位</button>
        </div>}
      </div>
    </dialog>
  );
}
