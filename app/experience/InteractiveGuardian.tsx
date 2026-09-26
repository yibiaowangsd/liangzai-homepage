"use client";
import { useEffect, useRef, useState } from "react";
import { useExperience } from "./Motion";
import type { HeroScene } from "./three/hero-scene";
import type { ModelMode, ModelView } from "./three/character-assets";
import "./guardian-3d.css";

const labels={liangzai:"量仔",nailong:"奶龙",duo:"量仔与奶龙"};
export default function InteractiveGuardian() {
  const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<HeroScene|null>(null);
  const {enabled}=useExperience();
  const motion=useRef(enabled),selection=useRef<ModelMode>("liangzai"),request=useRef(0);
  const [status,setStatus]=useState<"preview"|"loading"|"ready"|"fallback">("preview");
  const [activated,setActivated]=useState(false);
  const [mode,setMode]=useState<ModelMode>("liangzai"),[view,setView]=useState<ModelView>("reset");
  const viewRef=useRef<ModelView>("reset");
  useEffect(()=>{motion.current=enabled;runtime.current?.setMotion(enabled);},[enabled]);
  useEffect(()=>{
    if(!activated)return;
    let alive=true;
    const controller=new AbortController();
    const fallback=()=>{if(alive){runtime.current?.dispose();runtime.current=null;setStatus("fallback");}};
    void (async()=>{
      try{
        const {createHeroScene}=await import("./three/hero-scene");
        if(!alive||!canvas.current)return;
        const instance=createHeroScene(canvas.current,fallback,controller.signal);
        runtime.current=instance;
        const version=++request.current;
        await instance.setModel(selection.current);
        if(alive&&version===request.current){instance.setView(viewRef.current);instance.setMotion(motion.current);setStatus("ready");}
      }catch{fallback();}
    })();
    return()=>{alive=false;request.current++;controller.abort();runtime.current?.dispose();runtime.current=null;};
  },[activated]);
  async function selectModel(next:ModelMode){
    if(next===selection.current&&runtime.current&&status==="ready")return;
    selection.current=next;setMode(next);
    const instance=runtime.current,version=++request.current;
    if(!activated){setStatus("loading");setActivated(true);return;}
    if(!instance)return;
    setStatus("loading");instance.setMotion(false);
    try{await instance.setModel(next);if(version===request.current){instance.setView(viewRef.current);instance.setMotion(motion.current);setStatus("ready");}}
    catch{if(version===request.current){instance.dispose();if(runtime.current===instance)runtime.current=null;setStatus("fallback");}}
  }
  function performAction(action:"greet"|"spin"|"jump"){runtime.current?.perform(action);}
  function selectView(next:ModelView){viewRef.current=next;setView(next);runtime.current?.setView(next);}
  return (
    <div className="guardian-stage" data-status={status} data-model={mode} aria-busy={status==="loading"}>
      <div className="guardian-atmosphere" aria-hidden="true" />
      <div className="guardian-fallback" aria-hidden="true">
        <img src={`/assets/models/observatory/${mode}-${view}.webp`} alt="" fetchPriority="high" decoding="async" width="768" height="864" />
      </div>
      <canvas ref={canvas} className="guardian-canvas" tabIndex={status==="ready"?0:-1} role="img"
        aria-label={status==="ready"?`${labels[mode]}三维模型。横向和纵向拖动均可完整旋转，四个方向键调整角度，回车唤起星光。`:`${labels[mode]}模型预览`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter" />
      <div className="guardian-scene-label"><span className="guardian-live-dot" /> THE EXPLORERS <span>STELLAR / 01</span></div>
      <div className="guardian-models" role="group" aria-label="选择展示模型">
        {([["liangzai","量仔","01"],["nailong","奶龙","02"],["duo","同时展示","01 + 02"]] as const).map(([id,label,code])=>(
          <button key={id} aria-pressed={activated&&mode===id} onClick={()=>void selectModel(id)}><span>{label}</span><small>{code}</small></button>
        ))}
      </div>
      <div className="guardian-controls">
        <div className="guardian-instruction" role="status" aria-live="polite">
          {status==="ready"?"横向 / 纵向拖动 360° 翻转 · 四方向键调整 · 复位回正":status==="preview"?"点击上方模型选项，开启 3D 互动":status==="fallback"?"3D 暂不可用，可继续切换图片视角":"正在点亮星空展台"}
        </div>
        <div className="guardian-actions" role="group" aria-label="选择模型视角">
          {([["front","正面"],["side","侧面"],["back","背面"]] as const).map(([id,label])=>(
            <button key={id} aria-pressed={view===id} onClick={()=>selectView(id)}>{label}</button>
          ))}
          <button onClick={()=>selectView("reset")} aria-label="重置模型视角">复位</button>
          {status==="ready"&&<>
            <button disabled={!enabled} onClick={()=>performAction("greet")}>致意</button>
            <button disabled={!enabled} onClick={()=>performAction("spin")}>转一圈</button>
            <button disabled={!enabled} onClick={()=>performAction("jump")}>跃起</button>
          </>}
          {status==="ready"&&<button className="guardian-hello" disabled={!enabled} title={!enabled?"开启动效后可唤起星光":undefined} onClick={()=>runtime.current?.resonate()}>唤起星光<span aria-hidden="true">✳</span></button>}
        </div>
      </div>
    </div>
  );
}
