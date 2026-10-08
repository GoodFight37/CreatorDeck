"use client";

import { useEffect, useRef } from "react";
import { runBackHandler } from "@/lib/back-stack";

/**
 * Branche le **bouton retour d'Android** sur la pile des écrans.
 *
 * Le geste, dans l'ordre : un écran inscrit répond (une feuille se ferme, une
 * fiche se ferme…) ; si personne n'a rien fermé, `onEmpty` décide — chez nous :
 * revenir à l'accueil, sinon **mettre l'app de côté** plutôt que la quitter
 * d'un coup. Quitter est un geste volontaire (le bouton « revenir » du système
 * le refait très bien).
 *
 * Hors application native (navigateur, `npm run dev`), on ne s'inscrit pas : le
 * retour du navigateur a déjà son comportement, et le remplacer serait pire que
 * de ne rien faire. L'import de Capacitor est **paresseux**, comme celui du
 * retour Twitch : sur le web, ces lignes ne se chargent pas.
 */
export function useAndroidBack(onEmpty: () => void): void {
  const empty = useRef(onEmpty);
  useEffect(() => {
    empty.current = onEmpty;
  });

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | null = null;

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", () => {
        // Un écran ouvert répond ; sinon, l'appelant décide.
        if (runBackHandler()) return;
        empty.current();
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}

/**
 * Met l'app de côté, sans la quitter : c'est ce qu'on veut quand le joueur
 * appuie sur retour alors que rien n'est ouvert. Quitter l'APK reste un geste
 * volontaire (le bouton du système, depuis l'accueil).
 */
export async function minimizeApp(): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import("@capacitor/app");
  await App.minimizeApp();
}
