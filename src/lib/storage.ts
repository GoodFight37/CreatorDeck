/**
 * Accès unique au stockage de l'appareil.
 *
 * La partie (`src/lib/game-store.ts`) et la session cloud
 * (`src/lib/cloud/cloud-store.ts`) doivent écrire au même endroit, sinon on se
 * retrouve avec deux sauvegardes selon l'écran ouvert. Ce module existe pour
 * ça : une seule fonction, un seul comportement en cas de stockage refusé
 * (navigation privée stricte, quota, WebView verrouillée).
 */
import type { KeyValueStorage } from "@/lib/save-store";

/** `localStorage` si disponible, sinon `null` — jamais d'exception. */
export function deviceStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
