// Convert the Naiwa source renders into the WebP files the site ships.
// Usage: node scripts/prepare-naiwa.mjs <dir with naiwa-<pose>.png>
// Sizes are fixed so the width/height attributes in the pages stay correct.
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const source = resolve(process.argv[2] || ".");
const out = resolve("public/assets/naiwa");
mkdirSync(out, { recursive: true });
const poses = { sit: [820, 1230], ask: [760, 1140], book: [760, 1140], wave: [760, 1140], stand: [760, 1140], sleep: [1140, 760] };

for (const [pose, [width, height]] of Object.entries(poses)) {
  const file = join(source, `naiwa-${pose}.png`);
  if (!existsSync(file)) { console.log(`skip ${pose}: ${file} not found`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Generated renders carry a faint semi-transparent halo; tighten it to a clean edge.
  for (let i = 3; i < data.length; i += 4) {
    const t = Math.min(1, Math.max(0, (data[i] / 255 - 0.5) / 0.45));
    data[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  const trimmed = await sharp(data, { raw: info }).trim({ threshold: 1 }).png().toBuffer();
  await sharp(trimmed)
    .resize(Math.round(width * 0.94), Math.round(height * 0.94), { fit: "inside" })
    .extend({ top: 0, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
    .then(buffer => sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: buffer, gravity: "south" }]).webp({ quality: 88, alphaQuality: 92 }).toFile(join(out, `${pose}.webp`)));
  console.log(`${pose}.webp ${width}x${height}`);
}
