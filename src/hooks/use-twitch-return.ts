"use client";

/**
 * Termine une connexion Twitch au retour du navigateur.
 *
 * Deux chemins, un seul geste pour le joueur :
 *
 *   * **sur le site** : Supabase renvoie les jetons dans le fragment de
 *     l'adresse courante. On les lit une fois au montage, puis on **nettoie**
 *     l'adresse — un jeton laissé dans la barre d'adresse finirait dans
 *     l'historique du navigateur ;
 *   * **dans l'application Android** : le navigateur revient sur
 *     `com.creatordeck.app://auth`, Android rouvre l'app, et Capacitor prévient
 *     ici (`appUrlOpen`).
 *
 * Ce hook est monté une fois par l'écran principal ; il ne rend rien.
 */
import { useEffect } from "react";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { stripFragment } from "@/lib/cloud/twitch";
import { isNativeApp } from "@/lib/cloud/transport";

export function useTwitchReturn(): void {
  useEffect(() => {
    // 1) Retour sur le site.
    if (typeof window !== "undefined" && window.location.hash.length > 1) {
      const href = window.location.href;
      void cloudStore.completeTwitchSignIn(href).then((outcome) => {
        // Une adresse qui n'était pas un retour de connexion (un fragment de
        // navigation interne, par exemple) ne doit pas être modifiée.
        if (outcome.status === "none") return;
        window.history.replaceState(null, "", stripFragment(href));
      });
    }

    // 2) Retour dans l'application Android.
    let detach: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      if (!(await isNativeApp())) return;
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", (event) => {
          void cloudStore.completeTwitchSignIn(event.url);
        });
        if (cancelled) void handle.remove();
        else detach = () => void handle.remove();
      } catch {
        // Pont absent (navigateur, pré-rendu) : il n'y a rien à écouter.
      }
    })();
    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);
}
