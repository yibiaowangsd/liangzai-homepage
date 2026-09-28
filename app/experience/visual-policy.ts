export type VisualProfile = "checking" | "lite" | "full";

export type DeviceHints = {
  cores?: number;
  memory?: number;
  renderer?: string;
  webgl: boolean;
  saveData?: boolean;
  reducedMotion?: boolean;
  paused?: boolean;
};

// Conservative hints, not a hardware benchmark. Missing/private hints never
// become zero; unidentified hardware starts light and can opt in explicitly.
export function classifyDevice(hints: DeviceHints): Exclude<VisualProfile, "checking"> {
  if (!hints.webgl || hints.saveData || hints.reducedMotion || hints.paused) return "lite";
  const cores = Number.isFinite(hints.cores) && hints.cores! > 0 ? hints.cores : undefined;
  const memory = Number.isFinite(hints.memory) && hints.memory! > 0 ? hints.memory : undefined;
  if ((cores !== undefined && cores <= 4) || (memory !== undefined && memory <= 4)) return "lite";
  // Include older office iGPUs and software renderers; don't penalize all Intel
  // graphics (Iris/Arc and newer integrated GPUs can handle the normal scene).
  if (/swiftshader|llvmpipe|softpipe|software|microsoft basic|intel.*(?:hd graphics|uhd(?: graphics)?\s*6\d\d)|radeon.*(?:r[235]\b|vega\s*[368]\b)/i.test(hints.renderer ?? "")) return "lite";
  return cores !== undefined && cores > 4 ? "full" : "lite";
}

export function detectVisualProfile(): Exclude<VisualProfile, "checking"> {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let paused = false;
  try { paused = localStorage.getItem("liangzai-motion") === "paused"; } catch {}
  const hints: DeviceHints = {
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    paused,
    webgl: true,
  };
  // Known low-capacity devices don't even create the temporary probe context.
  if (classifyDevice(hints) === "lite") return "lite";
  let gl: WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false });
    if (!gl) return "lite";
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    hints.renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    return classifyDevice(hints);
  } catch {
    return "lite";
  } finally {
    // No renderer, model, texture or particle work during detection.
    try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch {}
  }
}

export function effectEnabled(profile: VisualProfile, override: boolean | null) {
  return override ?? profile === "full";
}
