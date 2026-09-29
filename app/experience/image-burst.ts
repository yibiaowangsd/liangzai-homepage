/** Turn the visible image pixels into a short particle burst over the live nebula. */
export function startImageBurst(image: HTMLImageElement, canvas: HTMLCanvasElement, done: () => void) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !image.complete || !image.naturalWidth) { done(); return () => {}; }
  const rect = image.getBoundingClientRect();
  const width = rect.width, height = rect.height;
  if (!width || !height) { done(); return () => {}; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 144;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) { done(); return () => {}; }
  sampleCtx.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
  const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[] = [];
  for (let y = 0; y < sample.height; y += 2) {
    for (let x = 0; x < sample.width; x += 2) {
      const at = (y * sample.width + x) * 4;
      if (pixels[at + 3] < 96) continue;
      const dx = x / sample.width - .5, dy = y / sample.height - .5;
      const angle = Math.atan2(dy, dx) + (Math.random() - .5) * .65;
      const speed = 90 + Math.random() * 260;
      particles.push({
        x: x / sample.width * width, y: y / sample.height * height,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: `rgba(${pixels[at]},${pixels[at + 1]},${pixels[at + 2]},${(pixels[at + 3] / 255).toFixed(2)})`,
        size: 1 + Math.random() * 1.8,
      });
    }
  }
  let frame = 0;
  const start = performance.now();
  const draw = (now: number) => {
    const t = Math.min((now - start) / 1050, 1);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + p.vx * t * 1.05, p.y + p.vy * t * 1.05, p.size * (1 - t * .6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (t < 1) frame = requestAnimationFrame(draw);
    else done();
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}
