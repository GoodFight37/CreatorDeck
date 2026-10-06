"use client";

import { useEffect, useSyncExternalStore } from "react";
import { EMPTY_LIVE, type LiveSnapshot } from "@/lib/live";
import { liveStore } from "@/lib/live-store";

/**
 * L'état du direct (qui streame maintenant), tel que le serveur l'a publié.
 *
 * Aucun effet de bord ici : le store ne lit le cache et ne parle au réseau
 * qu'au premier abonné (`liveStore.attach()`), pour qu'un écran qui ne fait que
 * se fermer n'arme pas de minuteur.
 */
export function useLive(): LiveSnapshot {
  return useSyncExternalStore(liveStore.subscribe, liveStore.getSnapshot, () => EMPTY_LIVE);
}

/**
 * Branche le rafraîchissement (lecture au montage, toutes les trois minutes, et
 * au retour dans l'app) tant que l'écran principal est monté.
 */
export function useLivePolling(): void {
  useEffect(() => liveStore.attach(), []);
}
