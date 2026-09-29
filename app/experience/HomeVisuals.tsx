"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useHomeEffects } from "./HomeEffects";
import { startImageBurst } from "./image-burst";
import "./guardian-3d.css";
import "./home-effects.css";

const Guardian = lazy(() => import("./InteractiveGuardian"));
const Atmosphere = lazy(() => import("./QuantumAtmosphere"));
const Sculpture = lazy(() => import("./QuantumSculpture"));

export function HomeGuardian() {
  const { models, activateModels } = useHomeEffects();
  const [clicks, setClicks] = useState(0);
  const [bursting, setBursting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!bursting || !image.current || !canvas.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setComplete(true));
      return () => cancelAnimationFrame(frame);
    }
    return startImageBurst(image.current, canvas.current, () => setComplete(true));
  }, [bursting]);

  function clickLiangzai() {
    if (failed) { setFailed(false); setBursting(false); return; }
    if (models) return;
    const next = clicks + 1;
    setClicks(next);
    if (next >= 3) activateModels();
  }

  return <>
    {models && !failed && <Suspense fallback={null}>
      <Guardian onReady={() => setBursting(true)} onFailure={() => { setFailed(true); setBursting(false); setComplete(false); }} />
    </Suspense>}
    {!complete && <div className="guardian-stage guardian-static" data-bursting={bursting} aria-label="量仔贴图">
      <button type="button" className="guardian-static-cover" onClick={clickLiangzai} disabled={models && !failed}
        aria-label={failed ? "星云暂不可用，点击量仔重试" : models ? "星云正在苏醒" : `点击量仔，${3 - clicks} 次后化为星云`}>
        <img ref={image} src="/assets/characters-v2/arsenal-liangzai-cutout.webp" alt="量仔" width="1024" height="1536" decoding="async" fetchPriority="high" />
        <canvas ref={canvas} className="guardian-image-burst" aria-hidden="true" />
      </button>
      <p className="guardian-static-hint" role="status">
        {failed ? "星云暂不可用，轻点量仔重试" : models ? "星云正在苏醒" : clicks ? `再点 ${3 - clicks} 次，化为星云` : "轻点量仔三次，化为星云"}
      </p>
    </div>}
  </>;
}

export function HomeAtmosphere() {
  return <Suspense fallback={null}><Atmosphere /></Suspense>;
}

export function HomeSculpture() {
  return <Suspense fallback={null}><Sculpture /></Suspense>;
}
