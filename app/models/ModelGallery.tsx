"use client";
import { useEffect, useRef, useState } from "react";
import { useExperience } from "../experience/Motion";
import type { ModelMode, ModelView } from "../experience/three/character-assets";
import type { GalleryScene } from "./gallery-scene";
const labels = { liangzai: "量仔", nailong: "奶龙", duo: "双人合照" };
export default function ModelGallery() {
    const canvas = useRef<HTMLCanvasElement>(null), scene = useRef<GalleryScene | null>(null);
    const { enabled } = useExperience();
    const [mode, setMode] = useState<ModelMode>("duo");
    const [view, setView] = useState<ModelView>("front");
    const [rotate, setRotate] = useState(false);
    const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
    useEffect(() => {
        const controller = new AbortController();
        let instance: GalleryScene | undefined;
        void import("./gallery-scene").then(async ({ createGalleryScene }) => {
            if (controller.signal.aborted || !canvas.current)
                return;
            instance = createGalleryScene(canvas.current, () => { instance?.dispose(); setStatus("fallback"); });
            scene.current = instance;
            await instance.load(mode, controller.signal);
            if (!controller.signal.aborted)
                setStatus("ready");
        }).catch(() => { if (!controller.signal.aborted) {
            instance?.dispose();
            setStatus("fallback");
        } });
        return () => { controller.abort(); instance?.dispose(); scene.current = null; };
    }, [mode]);
    useEffect(() => { scene.current?.setView(view); }, [view, status]);
    useEffect(() => { scene.current?.setRotate(rotate && enabled); }, [rotate, enabled, status]);
    function choose(next: ModelMode) { if (next === mode)
        return; setStatus("loading"); setMode(next); setView("front"); }
    return <section className="model-gallery" aria-label="交互模型鉴赏"><div className="model-gallery-toolbar"><div role="group" aria-label="选择展示模型">{(Object.keys(labels) as ModelMode[]).map(id => <button key={id} type="button" aria-pressed={mode === id} onClick={() => choose(id)}>{labels[id]}</button>)}</div><span className="model-gallery-status" role="status">{status === "loading" ? "正在载入模型…" : status === "fallback" ? "当前浏览器无法显示 3D，正在展示模型照片" : "3D 模型已就绪"}</span></div><div className="model-gallery-stage"><canvas ref={canvas} role="img" tabIndex={status === "ready" ? 0 : -1} aria-label={`${labels[mode]}三维模型，拖动旋转，滚轮缩放。使用下方视角按钮也可操作。`} style={{ visibility: status === "ready" ? "visible" : "hidden" }}/>{status !== "ready" && <img className="model-gallery-photo" src={`/assets/models/observatory/${mode}-${view}.webp`} width="768" height="864" alt={`${labels[mode]}${view === "side" ? "侧面" : view === "back" ? "背面" : "正面"}模型照片`}/>}<span className="model-gallery-number">{mode === "duo" ? "01 + 02" : mode === "liangzai" ? "01" : "02"}</span></div><div className="model-gallery-controls"><div role="group" aria-label="选择模型视角">{([["front", "正面"], ["side", "侧面"], ["back", "背面"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setRotate(false); scene.current?.setView(id); }}>{label}</button>)}</div><button type="button" disabled={status !== "ready" || !enabled} aria-pressed={rotate} onClick={() => setRotate(!rotate)}>自动旋转</button><button type="button" onClick={() => { setView("front"); setRotate(false); scene.current?.setView("front"); }}>重置视角</button></div></section>;
}
