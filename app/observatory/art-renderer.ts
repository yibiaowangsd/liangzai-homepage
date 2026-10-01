import { palettes, type ArtPoint, type ArtSettings } from "./art-state";

export type ArtView = { yaw: number; pitch: number };
export const defaultArtView: ArtView = { yaw: -0.4, pitch: -0.25 };
const tau = Math.PI * 2;

/** Canvas2D generative art, fixed point budget and no WebGL/model dependency. */
export function drawArt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ArtSettings,
  points: ArtPoint[],
  time = 0,
  view: ArtView = defaultArtView,
) {
  const rgb = palettes.find((p) => p.id === settings.palette)!.rgb;
  const cx = width * 0.5,
    cy = height * 0.5,
    scale = Math.min(width * 0.41, height * 0.54);
  const energy = settings.energy / 100;
  const phase = points[0].phase;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#080d16";
  ctx.fillRect(0, 0, width, height);
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.25);
  halo.addColorStop(0, `rgba(${rgb},.085)`);
  halo.addColorStop(0.5, `rgba(${rgb},.025)`);
  halo.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 72; i++) {
    const p = points[i];
    ctx.fillStyle = `rgba(${rgb},${0.12 + p.z * 0.28})`;
    ctx.fillRect(p.x * width, p.y * height, p.size * 0.7, p.size * 0.7);
  }
  const yaw = view.yaw + time * 0.035,
    pitch = view.pitch;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  function project(x: number, y: number, z: number) {
    const rx = x * cos - z * sin,
      rz = x * sin + z * cos;
    const ry = y * cp - rz * sp,
      depth = y * sp + rz * cp;
    const perspective = 1 / (1.7 - depth * 0.3);
    return {
      x: cx + rx * scale * perspective * 1.5,
      y: cy + ry * scale * perspective * 1.5,
      depth,
    };
  }
  ctx.globalCompositeOperation = "screen";
  const count = Math.round((points.length * settings.density) / 100);
  if (settings.mode === "wave") {
    const rows = 28 + Math.round(settings.density * 0.15);
    for (let row = 0; row < rows; row++) {
      const v = row / (rows - 1);
      ctx.beginPath();
      for (let step = 0; step <= 88; step++) {
        const u = step / 88,
          x = (u - 0.5) * 2.25;
        const ripple =
          Math.sin(u * 9 + v * 5 + time * 0.7 + phase) *
          Math.cos(u * 4 - v * 5 + time * 0.25 + phase * 0.2);
        const y = (v - 0.5) * 0.5 + ripple * (0.13 + energy * 0.35);
        const p = project(x, y, (v - 0.5) * 1.6);
        if (step === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${rgb},${0.15 + Math.sin(v * Math.PI) * 0.44})`;
      ctx.lineWidth = 0.6 + Math.sin(v * Math.PI) * 0.6;
      ctx.stroke();
    }
  }
  if (settings.mode === "lattice") {
    // Nearest-neighbour edges only; no all-pairs distance search per frame.
    const side = 9,
      gap = 1.6 / (side - 1),
      wobble = energy * 0.04;
    for (let z = 0; z < side; z++)
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) {
          if ((x + y + z) % 5 > 1 + Math.floor(settings.density / 34)) continue;
          const position = (a: number, b: number, c: number) =>
            project(
              a * gap - 0.8,
              b * gap - 0.8 + Math.sin(a + c + time) * wobble,
              c * gap - 0.8,
            );
          const p = position(x, y, z);
          ctx.fillStyle = `rgba(${rgb},${0.4 + (p.depth + 1.5) * 0.12})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.15 + (p.depth + 1) * 0.4, 0, tau);
          ctx.fill();
          for (const [a, b, c] of [
            [x + 1, y, z],
            [x, y + 1, z],
            [x, y, z + 1],
          ]) {
            if (a >= side || b >= side || c >= side) continue;
            const q = position(a, b, c);
            ctx.strokeStyle = `rgba(${rgb},${0.045 + (p.depth + 1.5) * 0.025})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
  }
  for (let i = 0; i < count; i++) {
    const p = points[i];
    let x: number, y: number, z: number;
    if (settings.mode === "orbit") {
      const radius = 0.16 + Math.pow(p.x, 0.62) * 1.1;
      const angle =
        p.x * 5.2 +
        ((i % 3) * tau) / 3 +
        time * (0.12 + energy * 0.1) +
        (p.y - 0.5) * (0.3 + energy * 0.55);
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 0.45 + (p.z - 0.5) * 0.13;
      z = Math.sin(angle) * radius * 0.65;
    } else if (settings.mode === "wave") {
      x = (p.x - 0.5) * 2.25;
      y =
        (p.y - 0.5) * 0.5 +
        Math.sin(p.x * 9 + p.y * 5 + time * 0.7 + phase) *
          Math.cos(p.x * 4 - p.y * 5 + time * 0.25 + phase * 0.2) *
          (0.13 + energy * 0.35);
      z = (p.y - 0.5) * 1.6;
    } else {
      // A soft dust layer brings depth to the lattice without extra meshes.
      x = (p.x - 0.5) * 2;
      y = (p.y - 0.5) * 2;
      z = (p.z - 0.5) * 2;
    }
    const q = project(x, y, z);
    const alpha = settings.mode === "lattice" ? 0.13 : 0.28 + p.z * 0.52;
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.beginPath();
    ctx.arc(q.x, q.y, p.size * (0.75 + (q.depth + 1.3) * 0.25), 0, tau);
    ctx.fill();
    if (i % 47 === 0 && settings.mode !== "lattice") {
      const glow = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 8);
      glow.addColorStop(0, `rgba(${rgb},.45)`);
      glow.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(q.x - 8, q.y - 8, 16, 16);
    }
  }
  if (settings.mode === "orbit") {
    const core = ctx.createRadialGradient(cx, cy, 3, cx, cy, scale * 0.17);
    core.addColorStop(0, `rgba(${rgb},.82)`);
    core.addColorStop(0.16, `rgba(${rgb},.26)`);
    core.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = core;
    ctx.fillRect(
      cx - scale * 0.17,
      cy - scale * 0.17,
      scale * 0.34,
      scale * 0.34,
    );
  }
  ctx.globalCompositeOperation = "source-over";
}
