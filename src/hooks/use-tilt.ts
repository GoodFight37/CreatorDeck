"use client";

/**
 * Inclinaison 3D d'une carte au doigt.
 *
 * Le geste est lu par `usePointerGesture` et traduit en variables CSS écrites
 * directement sur le nœud (`--tilt-rx`, `--tilt-ry`, `--shine-x`, `--shine-y`) :
 *  - `rotateX` / `rotateY` donnent l'inclinaison ;
 *  - `--shine-*` déplace le reflet holo, qui suit donc l'angle de la carte ;
 *  - aucun re-render React par frame.
 *
 * Deux modes :
 *  - `free` : les deux axes suivent le doigt (`touch-action: none` en CSS).
 *    Utilisé sur la scène de révélation, où il n'y a rien à faire défiler.
 *  - `scroll-safe` : le défilement vertical du classeur est préservé
 *    (`touch-action: pan-y`). Quand le navigateur réclame le geste, il envoie
 *    `pointercancel` et la carte revient à plat. L'inclinaison est plus discrète.
 */
import { useCallback, useEffect, useRef } from "react";
import { usePointerGesture } from "@/hooks/use-pointer-gesture";
import { TILT_MAX_DEG, TILT_MAX_DEG_SCROLL_SAFE, clamp } from "@/lib/pack-animation";

export type TiltMode = "free" | "scroll-safe";

export type TiltOptions = {
  mode?: TiltMode;
  /** Amplitude maximale en degrés. Défault selon le mode. */
  maxDeg?: number;
  enabled?: boolean;
  /** Appui court sans déplacement : exploité pour le retournement dos/face. */
  onTap?: () => void;
};

export function useTilt({ mode = "free", maxDeg, enabled = true, onTap }: TiltOptions = {}) {
  const limit = maxDeg ?? (mode === "scroll-safe" ? TILT_MAX_DEG_SCROLL_SAFE : TILT_MAX_DEG);
  const nodeRef = useRef<HTMLElement | null>(null);
  const tapRef = useRef(onTap);
  // Synchronisé dans un effet : React 19 interdit d'écrire un ref pendant le
  // rendu, et le callback n'est de toute façon lu qu'au relâcher du doigt.
  useEffect(() => {
    tapRef.current = onTap;
  });

  const apply = useCallback(
    (nx: number, ny: number, active: boolean) => {
      const node = nodeRef.current;
      if (!node) return;
      const x = clamp(nx, -1, 1);
      const y = clamp(ny, -1, 1);
      node.style.setProperty("--tilt-ry", `${(x * limit).toFixed(2)}deg`);
      node.style.setProperty("--tilt-rx", `${(-y * limit).toFixed(2)}deg`);
      node.style.setProperty("--shine-x", `${(50 + x * 50).toFixed(1)}%`);
      node.style.setProperty("--shine-y", `${(50 + y * 50).toFixed(1)}%`);
      node.style.setProperty("--tilt-scale", active ? "1.035" : "1");
      node.dataset.tiltDragging = active ? "true" : "false";
    },
    [limit],
  );

  const reset = useCallback(() => apply(0, 0, false), [apply]);

  const { handlers, active } = usePointerGesture({
    disabled: !enabled,
    onStart: (snapshot) => apply(snapshot.nx, snapshot.ny, true),
    onMove: (snapshot) => apply(snapshot.nx, snapshot.ny, true),
    onEnd: (end) => {
      if (end.isTap) tapRef.current?.();
      reset();
    },
  });

  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
    if (!node) return;
    // État initial : carte à plat, reflet centré.
    node.style.setProperty("--tilt-rx", "0deg");
    node.style.setProperty("--tilt-ry", "0deg");
    node.style.setProperty("--shine-x", "50%");
    node.style.setProperty("--shine-y", "50%");
    node.style.setProperty("--tilt-scale", "1");
    node.dataset.tiltDragging = "false";
  }, []);

  return { ref, handlers, dragging: active, reset };
}
