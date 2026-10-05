"use client";

import { useSyncExternalStore } from "react";
import { gameStore } from "@/lib/game-store";
import type { PlayerState } from "@/lib/game-engine";

/**
 * État persistant de la partie. `null` tant que la sauvegarde locale n'a pas
 * été lue (pré-rendu statique et tout premier rendu côté client).
 */
export function useGame(): PlayerState | null {
  return useSyncExternalStore(
    gameStore.subscribe,
    gameStore.getSnapshot,
    gameStore.getServerSnapshot,
  );
}

/**
 * Horloge réactive sans `setState` dans un effet. Le snapshot est arrondi à
 * l'intervalle pour ne changer qu'une fois par tick.
 */
export function useNow(intervalMs = 1_000): number {
  const read = () => Math.floor(Date.now() / intervalMs) * intervalMs;
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, intervalMs);
      return () => window.clearInterval(id);
    },
    read,
    // Obligatoire pour le pré-rendu : sans 3e argument, React lève
    // « Missing getServerSnapshot » et bascule tout le rendu côté client.
    read,
  );
}
