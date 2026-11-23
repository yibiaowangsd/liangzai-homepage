export type SoundKey = "rain" | "wind" | "waves" | "ember";
export type Mix = Record<SoundKey, number>;

const keys = ["rain", "wind", "waves", "ember"] as const;
const level = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0;
const tone = (phase: number) => (1 + Math.sin(phase * 2 * Math.PI)) / 2;
const ceiling: Record<SoundKey, number> = { rain: 0.46, wind: 0.51, waves: 0.64, ember: 0.61 };

function renderSound(context: AudioContext, kind: SoundKey, seed: number) {
  // Bake textured noise into a compact loop, without assets, timers or an AudioWorklet.
  // Crossfading the tail into its preroll removes both the noise and filter-state seam.
  const rate = 24000;
  const frames = rate * 32;
  const overlap = rate / 4;
  const buffer = context.createBuffer(1, frames, rate);
  const samples = buffer.getChannelData(0);
  const prefix = new Float32Array(overlap);
  let slow = 0, fast = 0, pop = 0, hiss = 0;
  function noise() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  }
  for (let i = 0; i < frames + overlap; i++) {
    const white = noise();
    const phase = i / frames;
    slow += 0.019 * (white - slow);
    fast += 0.19 * (white - fast);
    let sample: number;
    if (kind === "rain") {
      const fine = (fast - slow) * 0.66 + (white - fast) * 0.19;
      hiss = hiss * 0.80 + (noise() > 0.996 ? noise() * 0.23 : 0);
      sample = (fine + hiss) * (0.78 + 0.22 * tone(3 * phase));
    } else if (kind === "wind") {
      const gust = 0.18 + 0.58 * tone(5 * phase + 0.15 * Math.sin(phase * 6 * Math.PI));
      sample = (slow * 1.6 + (fast - slow) * 0.16) * gust;
    } else if (kind === "waves") {
      const surf = Math.pow(tone(4 * phase + 0.15 * Math.sin(phase * 2 * Math.PI)), 2.5);
      sample = (slow * 1.12 + (fast - slow) * 0.27 + (white - fast) * 0.038) * (0.13 + 0.87 * surf);
    } else {
      if (noise() > 0.9993) pop += 0.37 * noise();
      pop *= 0.94;
      sample = (slow * 0.26 + (fast - slow) * 0.16 + pop) * (0.74 + 0.26 * tone(7 * phase));
    }
    if (i < overlap) {
      prefix[i] = sample;
    } else {
      const index = i - overlap;
      const cross = index >= frames - overlap ? tone((index - (frames - overlap)) / (overlap - 1) / 2 - 0.25) : 0;
      samples[index] = sample * (1 - cross) + (prefix[index - (frames - overlap)] ?? 0) * cross;
    }
  }
  return buffer;
}

export function createSoundEngine() {
  const Context = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error("Web Audio is not supported");
  const context = new Context();
  const master = context.createGain();
  const voices = new Map<SoundKey, GainNode>();
  const sources: AudioBufferSourceNode[] = [];
  let disposed = false;
  let shouldPlay = false;
  let target = 0;
  let operation = 0;
  let activePause: ReturnType<typeof setTimeout> | undefined;
  let finishPause: (() => void) | undefined;

  function cancelPendingPause() {
    if (activePause !== undefined) clearTimeout(activePause);
    activePause = undefined;
    finishPause?.();
    finishPause = undefined;
  }

  function smooth(param: AudioParam, value: number) {
    const now = context.currentTime;
    // A new value replaces the prior target without resetting the audible gain.
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
    else {
      const previous = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(previous, now);
    }
    param.setTargetAtTime(value, now, 0.012);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    operation++;
    cancelPendingPause();
    sources.forEach(source => {
      try { source.stop(); } catch { /* A partially initialized source may not have started. */ }
      source.disconnect();
    });
    voices.forEach(gain => gain.disconnect());
    master.disconnect();
    void context.close().catch(() => undefined);
  }

  try {
    master.gain.value = 0;
    master.connect(context.destination);
    keys.forEach((kind, index) => {
      const source = context.createBufferSource();
      sources.push(source);
      source.buffer = renderSound(context, kind, (index + 1) * 1009);
      source.loop = true;
      const gain = context.createGain();
      gain.gain.value = 0;
      voices.set(kind, gain);
      source.connect(gain).connect(master);
      source.start();
    });
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    async play() {
      if (disposed) return;
      const current = ++operation;
      cancelPendingPause();
      shouldPlay = true;
      try {
        // Invoke synchronously in the click/keypress path for restrictive browsers.
        await context.resume();
      } catch (error) {
        if (disposed || current !== operation) return;
        shouldPlay = false;
        throw error;
      }
      if (!disposed && current === operation) {
        if (context.state !== "running") {
          shouldPlay = false;
          throw new Error("The browser did not start audio");
        }
        smooth(master.gain, target);
      }
    },
    async pause() {
      if (disposed) return;
      const current = ++operation;
      cancelPendingPause();
      shouldPlay = false;
      smooth(master.gain, 0);
      if (context.state === "running") {
        await new Promise<void>(resolve => {
          finishPause = resolve;
          activePause = setTimeout(() => {
            activePause = undefined;
            finishPause = undefined;
            resolve();
          }, 72);
        });
      }
      if (!disposed && current === operation) {
        try { await context.suspend(); }
        catch (error) { if (!disposed && current === operation) throw error; }
      }
    },
    setMix(mix: Mix, masterVolume: number) {
      if (disposed) return;
      target = level(masterVolume) ** 1.5;
      for (const kind of keys) {
        const gain = voices.get(kind);
        if (gain) smooth(gain.gain, ceiling[kind] * level(mix[kind]) ** 1.5);
      }
      smooth(master.gain, shouldPlay ? target : 0);
    },
    dispose,
  };
}
