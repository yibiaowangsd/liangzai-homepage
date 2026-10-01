export type ArtMode = "orbit" | "wave" | "lattice";
export type ArtPalette = "ice" | "amber" | "iris";
export type ArtSettings = {
  mode: ArtMode;
  palette: ArtPalette;
  seed: number;
  density: number;
  energy: number;
};

export const defaultArt: ArtSettings = {
  mode: "orbit",
  palette: "ice",
  seed: 104729,
  density: 65,
  energy: 45,
};
export const modes = [
  {
    id: "orbit" as const,
    name: "引力",
    title: "把星光，留在轨道上。",
    description: "散落的光点绕着同一个中心，长成一片微型星系。",
    note: "拖动视角，发现星系的另一面。",
  },
  {
    id: "wave" as const,
    name: "共振",
    title: "让看不见的频率，有形状。",
    description: "一层层波纹相遇，微小的变化也会留下回响。",
    note: "调整流动强度，看波纹如何交错。",
  },
  {
    id: "lattice" as const,
    name: "晶格",
    title: "在秩序里，找到另一种自由。",
    description: "点与线构成空间。换一个角度，规则也会有新的面貌。",
    note: "拖动旋转，从结构里找到你的风景。",
  },
];
export const palettes = [
  { id: "ice" as const, name: "冰蓝", rgb: "139, 213, 255", accent: "#8bd5ff" },
  {
    id: "amber" as const,
    name: "日落",
    rgb: "255, 189, 119",
    accent: "#ffbd77",
  },
  {
    id: "iris" as const,
    name: "鸢尾",
    rgb: "190, 163, 255",
    accent: "#bea3ff",
  },
];

const bounded = (raw: unknown, fallback: number, min: number, max: number) => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;
};

/** Sharing is a deterministic composition at time zero; arbitrary input stays bounded. */
export function readArtSettings(query: URLSearchParams): ArtSettings {
  const mode = query.get("form"),
    palette = query.get("color");
  return {
    mode: modes.some((item) => item.id === mode)
      ? (mode as ArtMode)
      : defaultArt.mode,
    palette: palettes.some((item) => item.id === palette)
      ? (palette as ArtPalette)
      : defaultArt.palette,
    seed: bounded(query.get("seed"), defaultArt.seed, 1, 999999),
    density: bounded(query.get("density"), defaultArt.density, 20, 100),
    energy: bounded(query.get("energy"), defaultArt.energy, 0, 100),
  };
}

export function artQuery(settings: ArtSettings) {
  return new URLSearchParams({
    form: settings.mode,
    color: settings.palette,
    seed: String(settings.seed),
    density: String(settings.density),
    energy: String(settings.energy),
  }).toString();
}

/** Mulberry32 is only an art PRNG. It is never used by the cryptographic laboratory. */
export function artRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = Math.imul(state ^ (state >>> 15), state | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type ArtPoint = {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
};
export function createArtPoints(seed: number, count = 1600): ArtPoint[] {
  const random = artRandom(seed);
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    z: random(),
    size: 0.45 + random() * 1.2,
    phase: random() * Math.PI * 2,
  }));
}
