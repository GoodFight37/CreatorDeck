/**
 * Les vibrations du téléphone — la seule partie du jeu qui se sent au lieu de
 * se lire.
 *
 * Le module est minuscule parce que tout ce qui est intéressant est ailleurs :
 * **les motifs** vivent dans `src/lib/reveal.ts` (purs, testés), ici il n'y a
 * que l'appel au navigateur.
 *
 * Trois silences volontaires :
 *
 *   * pas d'API (`navigator.vibrate` n'existe pas sur iOS, et pas dans un
 *     aperçu de bureau) → la fonction ne fait rien, sans erreur ;
 *   * le son coupé coupe aussi les vibrations : c'est le même interrupteur
 *     « Son » dans les réglages, et un joueur qui coupe le son dans le métro ne
 *     veut pas que son téléphone bourdonne ;
 *   * un navigateur peut refuser l'appel (permission, onglet en arrière-plan) :
 *     l'exception est avalée, la partie continue.
 */
import { isMuted } from "@/lib/sfx";

type Vibrator = { vibrate?: (pattern: number | number[]) => boolean };

/** Fait vibrer l'appareil selon un motif, si c'est possible et autorisé. */
export function buzz(pattern: readonly number[]): void {
  if (!pattern.length || isMuted()) return;
  if (typeof window === "undefined") return;
  const navigatorLike = window.navigator as Navigator & Vibrator;
  if (typeof navigatorLike.vibrate !== "function") return;
  try {
    navigatorLike.vibrate([...pattern]);
  } catch {
    // Vibrations refusées : rien de cassé, la carte reste visible.
  }
}
