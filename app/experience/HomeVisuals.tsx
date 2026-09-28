"use client";

import { lazy, Suspense } from "react";
import { useHomeEffects } from "./HomeEffects";
import "./guardian-3d.css";
import "./home-effects.css";

const Guardian = lazy(() => import("./InteractiveGuardian"));
const Atmosphere = lazy(() => import("./QuantumAtmosphere"));
const Sculpture = lazy(() => import("./QuantumSculpture"));

export function HomeEffectsControls() {
  const { profile, models, particles, toggleModels, toggleParticles } = useHomeEffects();
  return <div className="home-effects-controls" aria-label="首页视觉效果">
    <p role="status">{profile === "checking" ? "正在适配显示效果" : !models && !particles ? "轻量浏览 · 特效按需开启" : "自由切换，找到舒适的显示效果"}</p>
    <div className="home-effects-switches">
      <button type="button" aria-pressed={models} onClick={toggleModels}>
        <span className="home-effects-indicator" aria-hidden="true" />3D 星云<span>{models ? "已开启" : "已关闭"}</span>
      </button>
      <button type="button" aria-pressed={particles} onClick={toggleParticles}>
        <span className="home-effects-indicator" aria-hidden="true" />背景粒子<span>{particles ? "已开启" : "已关闭"}</span>
      </button>
    </div>
  </div>;
}

function GuardianCover({ loading = false }: { loading?: boolean }) {
  const { toggleModels } = useHomeEffects();
  return <div className="guardian-stage guardian-static" aria-label="量仔静态展台">
    <img src="/assets/models/observatory/liangzai-front.webp" alt="量仔" width="768" height="864" decoding="async" />
    <div className="guardian-static-caption">
      <span>量仔，随时待命</span>
      {loading ? <p role="status">正在开启 3D 星云</p> : <>
        <p>静态封面 · 点击开启星云与模型互动</p>
        <button type="button" onClick={toggleModels}>开启 3D 星云<span aria-hidden="true">＋</span></button>
      </>}
    </div>
  </div>;
}

export function HomeGuardian() {
  const { models } = useHomeEffects();
  return models ? <Suspense fallback={<GuardianCover loading />}><Guardian /></Suspense> : <GuardianCover />;
}

export function HomeAtmosphere() {
  const { particles } = useHomeEffects();
  return particles ? <Suspense fallback={null}><Atmosphere /></Suspense> : null;
}

function SculptureCover({ loading = false }: { loading?: boolean }) {
  const { toggleParticles } = useHomeEffects();
  return <div className="sculpture sculpture-static">
    <div className="sculpture-static-orbit" aria-hidden="true"><i /><i /><i /></div>
    <h3>让星光随指尖流动</h3>
    <p>{loading ? "正在开启粒子互动" : "粒子互动暂未开启，需要时再唤醒。"}</p>
    {!loading && <button type="button" onClick={toggleParticles}>开启背景粒子<span aria-hidden="true">＋</span></button>}
  </div>;
}

export function HomeSculpture() {
  const { particles } = useHomeEffects();
  return particles ? <Suspense fallback={<SculptureCover loading />}><Sculpture /></Suspense> : <SculptureCover />;
}
