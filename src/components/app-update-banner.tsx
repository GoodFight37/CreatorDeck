"use client";

/**
 * Le bandeau « Nouvelle version » de l'APK (D-144). Invisible sur le site et
 * tant qu'aucune version plus récente n'est publiée. « Plus tard » le cache
 * pour la version proposée, le temps de la session.
 */
import { useState } from "react";
import { Download, X } from "lucide-react";

import { formatDownloadSize } from "@/lib/app-update";
import { useAppUpdate, type AppUpdateDeps } from "@/hooks/use-app-update";

export function AppUpdateBanner({ deps }: { deps?: AppUpdateDeps }) {
  const { state, install } = useAppUpdate(deps);
  const [dismissed, setDismissed] = useState<number | null>(null);
  if (state.status === "none") return null;
  if (state.status === "available" && dismissed === state.manifest.versionCode) return null;

  const { manifest } = state;
  const size = formatDownloadSize(manifest.size);
  let text: string;
  let action: string | null = "Mettre à jour";
  if (state.status === "permission") {
    text = "Autorise CreatorDeck à installer des applis (une seule fois), puis reviens ici.";
    action = "Mettre à jour";
  } else if (state.status === "downloading") {
    text = state.percent === null ? "Téléchargement…" : `Téléchargement… ${state.percent} %`;
    action = null;
  } else if (state.status === "installer") {
    text = "Appuie sur « Installer » dans la fenêtre d’Android.";
    action = "Relancer";
  } else if (state.status === "error") {
    text = state.message;
    action = "Réessayer";
  } else {
    text = `Nouvelle version disponible${size ? ` · ${size}` : ""}`;
  }

  return (
    <section className="app-update-banner" role="status" aria-label="Mise à jour de l’application" data-state={state.status}>
      <Download size={16} aria-hidden="true" />
      <p>{text}</p>
      {state.status === "downloading" ? (
        <progress max={100} value={state.percent ?? undefined} aria-label="Progression du téléchargement" />
      ) : null}
      {action ? <button type="button" onClick={() => void install()}>{action}</button> : null}
      {state.status === "available" ? (
        <button type="button" className="app-update-later" aria-label="Plus tard" onClick={() => setDismissed(manifest.versionCode)}>
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
