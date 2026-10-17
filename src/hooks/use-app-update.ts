"use client";

/**
 * « Mise à jour disponible » dans l'APK (D-144).
 *
 * Vérifie au montage et au retour dans l'appli. Ne fait rien sur le site, ni
 * quand aucun fichier `latest.json` n'est publié. Dans l'APK, `fetch` passe
 * par le HTTP natif (CapacitorHttp activé) : pas de blocage CORS sur GitHub.
 * Une erreur réseau ne s'affiche pas : l'appli reste simplement comme avant.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { downloadPercent, isUpdateAvailable, parseUpdateManifest, updateManifestUrl, type UpdateManifest } from "@/lib/app-update";
import { nativeUpdater, type NativeUpdater } from "@/lib/native-updater";

export type AppUpdateState =
  | { status: "none" }
  | { status: "available"; manifest: UpdateManifest }
  | { status: "permission"; manifest: UpdateManifest }
  | { status: "downloading"; manifest: UpdateManifest; percent: number | null }
  | { status: "installer"; manifest: UpdateManifest }
  | { status: "error"; manifest: UpdateManifest; message: string };

export type AppUpdateDeps = {
  updater: () => NativeUpdater | null;
  fetchJson: (url: string) => Promise<unknown>;
};

const defaultDeps: AppUpdateDeps = {
  updater: nativeUpdater,
  fetchJson: async (url) => {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Dernière version illisible (${response.status}).`);
    return response.json();
  },
};

export function useAppUpdate(deps: AppUpdateDeps = defaultDeps) {
  const [state, setState] = useState<AppUpdateState>({ status: "none" });
  const busy = useRef(false);
  const depsRef = useRef(deps);

  const check = useCallback(async () => {
    const { updater: getUpdater, fetchJson } = depsRef.current;
    const updater = getUpdater();
    if (!updater || busy.current) return;
    try {
      const [info, payload] = await Promise.all([updater.info(), fetchJson(updateManifestUrl())]);
      const manifest = parseUpdateManifest(payload);
      if (isUpdateAvailable(info.versionCode, manifest)) {
        setState((current) => (current.status === "none" || current.status === "available"
          ? { status: "available", manifest } : current));
      } else {
        setState({ status: "none" });
      }
    } catch {
      // Hors ligne, rien de publié, fichier illisible : on ne propose rien.
    }
  }, []);

  useEffect(() => {
    // Différé d'un tour : la vérification ne doit pas ralentir l'affichage du jeu.
    const first = setTimeout(() => void check(), 0);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(first); document.removeEventListener("visibilitychange", onVisible); };
  }, [check]);

  const install = useCallback(async () => {
    const updater = depsRef.current.updater();
    const manifest = state.status === "none" ? null : state.manifest;
    if (!updater || !manifest || busy.current) return;
    busy.current = true;
    try {
      const info = await updater.info();
      if (!info.canInstall) {
        // Une seule fois par téléphone : Android doit autoriser CreatorDeck à installer.
        setState({ status: "permission", manifest });
        await updater.openInstallSettings();
        return;
      }
      setState({ status: "downloading", manifest, percent: 0 });
      const handle = await updater.addListener("progress", ({ done, total }) => {
        setState({ status: "downloading", manifest, percent: downloadPercent(done, total) });
      });
      try {
        await updater.downloadAndInstall({ url: manifest.url, sha256: manifest.sha256, versionCode: manifest.versionCode });
        setState({ status: "installer", manifest });
      } finally {
        await handle.remove();
      }
    } catch (error) {
      setState({ status: "error", manifest, message: error instanceof Error && error.message ? error.message : "Téléchargement impossible." });
    } finally {
      busy.current = false;
    }
  }, [state]);

  return { state, install, check };
}
