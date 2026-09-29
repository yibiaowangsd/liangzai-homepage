"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const EffectsContext = createContext({
  models: false,
  particles: true,
  activateModels: () => {},
});

export function HomeEffectsProvider({ children }: { children: ReactNode }) {
  // The image is the initial state on every visit. The scene only loads after
  // the visitor deliberately wakes Liangzai; the 2D background stays visible.
  const [models, setModels] = useState(false);
  return <EffectsContext.Provider value={{
    models, particles: true,
    activateModels: () => setModels(true),
  }}>{children}</EffectsContext.Provider>;
}

export const useHomeEffects = () => useContext(EffectsContext);
