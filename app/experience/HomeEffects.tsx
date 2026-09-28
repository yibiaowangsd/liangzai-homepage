"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { detectVisualProfile, effectEnabled, type VisualProfile } from "./visual-policy";

const EffectsContext = createContext({
  profile: "checking" as VisualProfile,
  models: false,
  particles: false,
  toggleModels: () => {},
  toggleParticles: () => {},
});
let detected: VisualProfile | undefined;
const subscribe = () => () => {};
const getProfile = () => detected ??= detectVisualProfile();
const getServerProfile = (): VisualProfile => "checking";

export function HomeEffectsProvider({ children }: { children: ReactNode }) {
  // SSR and the first hydration render stay light. The cached client snapshot
  // gates all expensive mounts before any dynamic scene import can run.
  const profile = useSyncExternalStore(subscribe, getProfile, getServerProfile);
  const [modelOverride, setModelOverride] = useState<boolean | null>(null);
  const [particleOverride, setParticleOverride] = useState<boolean | null>(null);
  const models = effectEnabled(profile, modelOverride);
  const particles = effectEnabled(profile, particleOverride);
  return <EffectsContext.Provider value={{
    profile, models, particles,
    // Overrides survive client-side navigation, but a fresh visit detects again.
    // In particular, an old opt-in never auto-loads 3D on a low-end computer.
    toggleModels: () => setModelOverride(previous => !effectEnabled(profile, previous)),
    toggleParticles: () => setParticleOverride(previous => !effectEnabled(profile, previous)),
  }}>{children}</EffectsContext.Provider>;
}

export const useHomeEffects = () => useContext(EffectsContext);
