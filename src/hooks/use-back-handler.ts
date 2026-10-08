"use client";

import { useEffect, useRef } from "react";
import { registerBackHandler } from "@/lib/back-stack";

/**
 * Inscrit un écran dans la pile du bouton retour, tant qu'il est ouvert.
 *
 * À poser dans le composant qui **sait** fermer l'écran :
 *
 * ```tsx
 * useBackHandler(inspect !== null, () => setInspect(null));
 * ```
 *
 * `active` sert de condition : le hook s'appelle à chaque rendu (React l'exige),
 * mais ne s'inscrit que quand l'écran est vraiment là. Le rappel passe par une
 * référence : il peut changer à chaque rendu sans réinscrire l'écran (donc sans
 * changer sa place dans la pile).
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const callback = useRef(onBack);
  useEffect(() => {
    callback.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => {
      callback.current();
      return true;
    });
  }, [active]);
}
