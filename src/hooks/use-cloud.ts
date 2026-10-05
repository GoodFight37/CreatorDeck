"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { cloudStore, type CloudState } from "@/lib/cloud/cloud-store";

/**
 * État du compte cloud (configuré, connecté, en train de synchroniser…).
 * Aucun effet de bord à l'import : le store ne lit `localStorage` et
 * l'environnement qu'au premier abonné.
 */
export function useCloud(): CloudState {
  return useSyncExternalStore(
    cloudStore.subscribe,
    cloudStore.getSnapshot,
    cloudStore.getServerSnapshot,
  );
}

/**
 * Branche l'envoi automatique de la partie (débounce) le temps que l'écran
 * principal soit monté. Séparé de `useCloud()` pour que les écrans qui ne font
 * que lire l'état (une feuille ouverte puis fermée) n'arment pas de minuteur.
 */
export function useCloudAutoSync(): void {
  useEffect(() => cloudStore.attach(), []);
}
