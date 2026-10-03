"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useExperience } from "../experience/Motion";
import ArtCanvas from "./ArtCanvas";
import {
  artQuery,
  defaultArt,
  modes,
  palettes,
  readArtSettings,
  type ArtSettings,
} from "./art-state";
import "./observatory.css";

const presets: { name: string; caption: string; settings: ArtSettings }[] = [
  {
    name: "蓝色引力",
    caption: "让光，沿着好奇心旋转",
    settings: { ...defaultArt },
  },
  {
    name: "日落频率",
    caption: "一场不会重复的落日",
    settings: {
      mode: "wave",
      palette: "amber",
      seed: 681137,
      density: 72,
      energy: 65,
    },
  },
  {
    name: "秩序之外",
    caption: "换个角度，世界就变了",
    settings: {
      mode: "lattice",
      palette: "iris",
      seed: 237451,
      density: 80,
      energy: 30,
    },
  },
];

export default function Observatory() {
  const [settings, setSettings] = useState<ArtSettings>(defaultArt);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [share, setShare] = useState("");
  const [revision, setRevision] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { enabled } = useExperience();
  const palette = palettes.find((p) => p.id === settings.palette)!;
  const mode = modes.find((m) => m.id === settings.mode)!;

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    let restored = defaultArt;
    if (
      ["form", "color", "seed", "density", "energy"].some((key) =>
        query.has(key),
      )
    )
      restored = readArtSettings(query);
    else {
      try {
        const saved = localStorage.getItem("liangzai-observatory:v1");
        if (saved) restored = readArtSettings(new URLSearchParams(saved));
      } catch {
        /* Privacy mode still has a fully usable session. */
      }
    }
    const frame = requestAnimationFrame(() => {
      setSettings(restored);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("liangzai-observatory:v1", artQuery(settings));
    } catch {}
  }, [settings, ready]);

  function update(next: Partial<ArtSettings>) {
    setSettings((previous) => ({ ...previous, ...next }));
    setShare("");
    setMessage("");
  }
  function regenerate() {
    // Unique compositions only; this randomness has no cryptographic meaning.
    const seed = Math.floor(Math.random() * 999999) + 1;
    update({ seed });
    setMessage("新的星空已经就绪。");
  }
  async function copyLink() {
    const url = new URL("/observatory", location.origin);
    url.search = artQuery(settings);
    const value = url.toString();
    setShare(value);
    try {
      await navigator.clipboard.writeText(value);
      setMessage("链接已复制，对方打开后可重现同一组创作参数。");
    } catch {
      setMessage("长按或选中下面的链接，即可手动复制。");
    }
  }
  async function saveImage() {
    const el = canvas.current;
    if (!el) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        el.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Canvas export failed")),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `liangzai-${settings.mode}-${settings.seed}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage("画面已保存，把这一刻的星光带走。");
    } catch {
      setMessage("暂时无法保存画面，请稍后重试。");
    }
  }

  return (
    <main
      id="main-content"
      className="observatory"
      style={
        {
          "--art-accent": palette.accent,
          "--art-rgb": palette.rgb,
        } as CSSProperties
      }
    >
      <header className="observatory-heading">
        <div>
          <p className="eyebrow">
            <span className="status-light" /> 灵感观测站
          </p>
          <h1>
            以数学为笔，
            <br />
            <em>写一片星空</em>
          </h1>
        </div>
        <p>
          这里没有标准答案。
          <br />
          转动、调节、停留，找到属于你的那一瞬间。
        </p>
      </header>
      <section className="art-workbench" aria-label="星空创作工作台">
        <div className="art-viewport">
          <div className="art-viewport-label">
            <span>
              观测记录 <b>{String(settings.seed).padStart(6, "0")}</b>
            </span>
            <span className="art-play-state">
              <i data-playing={playing && enabled} />
              {playing && enabled ? "正在流动" : "静止观测"}
            </span>
          </div>
          <ArtCanvas
            key={revision}
            settings={settings}
            playing={playing}
            interactive
            canvasRef={canvas}
          />
          <div className="art-viewport-bottom">
            <span>拖动旋转 · 轻点复位</span>
            <span>方向键也可以探索</span>
          </div>
        </div>
        <aside className="art-console" aria-label="创作参数">
          <div className="art-console-heading">
            <span>你的宇宙</span>
            <button
              type="button"
              onClick={() => {
                setSettings(defaultArt);
                setRevision((value) => value + 1);
                setPlaying(false);
                setShare("");
                setMessage("已回到最初的星空。");
              }}
            >
              复位
            </button>
          </div>
          <div className="art-mode-controls" role="group" aria-label="选择形态">
            {modes.map((item, i) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={item.id === settings.mode}
                onClick={() => update({ mode: item.id })}
              >
                <small>0{i + 1}</small>
                {item.name}
              </button>
            ))}
          </div>
          <div className="art-mode-copy">
            <h2>{mode.title}</h2>
            <p>{mode.description}</p>
          </div>
          <fieldset className="art-palette-controls">
            <legend>光的颜色</legend>
            {palettes.map((item) => (
              <button
                type="button"
                key={item.id}
                style={{ "--swatch": item.accent } as CSSProperties}
                aria-pressed={item.id === settings.palette}
                onClick={() => update({ palette: item.id })}
              >
                <i aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </fieldset>
          <label className="art-range" htmlFor="art-density">
            <span>
              星光密度<output htmlFor="art-density">{settings.density}%</output>
            </span>
            <input
              id="art-density"
              type="range"
              min="20"
              max="100"
              value={settings.density}
              onChange={(event) =>
                update({ density: Number(event.target.value) })
              }
            />
          </label>
          <label className="art-range" htmlFor="art-energy">
            <span>
              流动强度<output htmlFor="art-energy">{settings.energy}%</output>
            </span>
            <input
              id="art-energy"
              type="range"
              min="0"
              max="100"
              value={settings.energy}
              onChange={(event) =>
                update({ energy: Number(event.target.value) })
              }
            />
          </label>
          <div className="art-run-controls">
            <button
              type="button"
              aria-pressed={playing && enabled}
              disabled={!enabled}
              onClick={() => setPlaying(!playing)}
            >
              {playing && enabled ? "定格这一刻" : "让宇宙流动"}
            </button>
            <button type="button" onClick={regenerate}>
              换一片星空
            </button>
          </div>
          {!enabled && (
            <p className="art-motion-note">
              已按顶部或系统动效设置暂停，仍可调整参数。
            </p>
          )}
          <div className="art-output-controls">
            <button type="button" onClick={saveImage}>
              保存画面
            </button>
            <button type="button" onClick={copyLink}>
              分享创作
            </button>
          </div>
          <p className="art-message" role="status">
            {message || mode.note}
          </p>
          {share && (
            <label className="art-share-field">
              创作链接
              <input
                readOnly
                value={share}
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
        </aside>
      </section>
      <div className="art-footnote">
        <span>生成式交互艺术，不表示真实量子态。</span>
        <span>参数自动保存在当前浏览器 · 默认静止，播放由你决定</span>
      </div>
      <section className="art-presets" aria-labelledby="presets-title">
        <div className="art-section-heading">
          <div>
            <p className="eyebrow">从一个灵感开始</p>
            <h2 id="presets-title">三种方式，看见未知</h2>
          </div>
          <span>选一个起点，再把它变成你的。</span>
        </div>
        <div className="art-preset-grid">
          {presets.map((preset, i) => (
            <button
              className="art-preset"
              type="button"
              key={preset.name}
              onClick={() => {
                setSettings({ ...preset.settings });
                setShare("");
                setMessage(`已载入「${preset.name}」。`);
                document
                  .querySelector(".art-workbench")
                  ?.scrollIntoView({
                    behavior: enabled ? "smooth" : "instant",
                    block: "start",
                  });
              }}
            >
              <div className="art-preset-preview">
                <ArtCanvas settings={preset.settings} />
              </div>
              <div className="art-preset-name">
                <span>0{i + 1}</span>
                <h3>{preset.name}</h3>
                <span aria-hidden="true"></span>
              </div>
              <p>{preset.caption}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="observatory-next">
        <span>从灵感，走向真正的密码工程。</span>
        <Link href="/pqc-arsenal">
          探索密码图鉴 <span aria-hidden="true"></span>
        </Link>
        <a href="/pqc-practice">
          进入密码实验室 <span aria-hidden="true"></span>
        </a>
      </section>
    </main>
  );
}
