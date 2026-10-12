"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { cardEffectsAllowed } from "@/lib/tilt";

/**
 * Opening keeps the foil art as one printed image, cuts it where the finger
 * passes, peels the upper weld off, then exposes and lifts actual card backs.
 * Neither the pack nor its materials use WebGL.
 */
export function PackTear({
  kind = "live",
  onComplete,
  onTear,
  autoCompleteAfterMs,
  returnFocusTo,
  children,
}: {
  kind?: "live" | "scene";
  onComplete: () => void;
  onTear?: () => void;
  autoCompleteAfterMs?: number;
  returnFocusTo?: HTMLElement | null;
  /** The revealed cards live inside the same mounted opening, never a second portal. */
  children?: ReactNode;
}) {
  const dialogRef = usePresentationFocus(true, returnFocusTo);
  const [cut, setCut] = useState({ start: 7, end: 7, progress: 0 });
  const [opened, setOpened] = useState(false);
  const start = useRef<{ x: number; percent: number; centerX: number; centerY: number; halfWidth: number; halfHeight: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const extractionCompleted = useRef(false);
  const revealing = Boolean(children);
  const timer = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  const tearRef = useRef(onTear);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { tearRef.current = onTear; }, [onTear]);

  // The no-tear link is removed after activation. Keep focus inside the SAME
  // dialog when its card controls appear; do not mount a second focus trap.
  useEffect(() => {
    if (revealing) dialogRef.current?.focus({ preventScroll: true });
  }, [dialogRef, revealing]);

  const completeExtraction = useCallback(() => {
    if (extractionCompleted.current) return;
    extractionCompleted.current = true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    completeRef.current();
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    start.current = null;
    sceneRef.current?.classList.remove("is-pulling");
    sceneRef.current?.style.removeProperty("--opening-tilt-x");
    sceneRef.current?.style.removeProperty("--opening-tilt-y");
    sceneRef.current?.style.removeProperty("--opening-light-x");
    setCut({ start: 4, end: 96, progress: 100 });
    setOpened(true);
    tearRef.current?.();
    // animationend opens the face IN this scene. This timer is only a lost-event
    // fallback; it never destroys the pouch or replaces the presentation root.
    timer.current = window.setTimeout(completeExtraction, cardEffectsAllowed() ? 1_200 : 0);
  }, [completeExtraction]);

  useEffect(() => {
    if (autoCompleteAfterMs === undefined) return;
    const timeout = window.setTimeout(finish, autoCompleteAfterMs);
    return () => window.clearTimeout(timeout);
  }, [autoCompleteAfterMs, finish]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const artwork = kind === "scene" ? "/packs/scene-foil.svg" : "/packs/live-foil.svg";
  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className={`pack-tear opening-continuum booster-interactive booster-cinematic booster-presentation scene-${kind}${revealing ? " is-revealing" : ""}`} role="dialog"
      data-opening-phase={revealing ? "revealing" : opened ? "extracting" : "sealed"}
      aria-label={revealing ? "Résultat du booster" : "Ouvrir le booster"} aria-modal="true">
      <div className={`booster-opening-stage booster-premium-stage booster-premium-${kind}${opened ? " is-ripped" : ""}`}
          aria-hidden={revealing || undefined} inert={revealing}>
        <div className="booster-stage-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <p className="booster-opening-instruction">
          {opened ? "LES CARTES APPARAISSENT" : "GLISSE SUR LA BANDE STRIÉE EN HAUT"}
        </p>
        <div ref={sceneRef} className={`booster-physical-scene${opened ? " booster-foil-open" : ""}`}
          style={{ "--cut-start": `${cut.start}%`, "--cut-end": `${cut.end}%` } as CSSProperties}>
          <span className="foil-depth-side foil-depth-left" aria-hidden="true" />
          <span className="foil-depth-side foil-depth-right" aria-hidden="true" />
          <span className="foil-depth-bottom" aria-hidden="true" />
          <div className="foil-inner-shadow" aria-hidden="true" />
          <div className="foil-card-chamber" aria-hidden="true" onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && done.current) completeExtraction();
          }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`foil-back-card foil-back-card-${i + 1}`}
                style={{ "--card-i": i } as CSSProperties}>
                <span className="foil-back-emblem">✦</span>
              </span>
            ))}
          </div>
          <div className="foil-body-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px"
              className="foil-printed-art" priority />
            <span className="foil-material-sheen" />
          </div>
          <div className="foil-top-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px"
              className="foil-printed-art" priority />
            <span className="foil-material-sheen" />
          </div>
          <span className="foil-cut-slit" aria-hidden="true"
            style={{ left: `${cut.start}%`, width: `${Math.max(0, cut.end - cut.start)}%` }} />
          <div className="booster-tear-track" role="button" tabIndex={opened ? -1 : 0}
            aria-label="Déchirer le sachet en passant le doigt sur sa soudure"
            onPointerDown={(event) => {
              if (opened || event.button !== 0 || event.isPrimary === false) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const p = Math.max(4, Math.min(96, (event.clientX - bounds.left) / bounds.width * 100));
              const sceneBounds = sceneRef.current?.getBoundingClientRect();
              start.current = { x: event.clientX, percent: p,
                centerX: sceneBounds ? sceneBounds.left + sceneBounds.width / 2 : bounds.left + bounds.width / 2,
                centerY: sceneBounds ? sceneBounds.top + sceneBounds.height / 2 : bounds.top + bounds.height / 2,
                halfWidth: Math.max(1, (sceneBounds?.width ?? bounds.width) / 2),
                halfHeight: Math.max(1, (sceneBounds?.height ?? bounds.height) / 2) };
              sceneRef.current?.classList.add("is-pulling");
              setCut({ start: p, end: p, progress: 0 });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (opened || !start.current) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const scene = sceneRef.current;
              if (scene && cardEffectsAllowed()) {
                const x = Math.max(-1, Math.min(1, (event.clientX - start.current.centerX) / start.current.halfWidth));
                const y = Math.max(-1, Math.min(1, (event.clientY - start.current.centerY) / start.current.halfHeight));
                scene.style.setProperty("--opening-tilt-x", `${-y * 5}deg`);
                scene.style.setProperty("--opening-tilt-y", `${x * 7}deg`);
                scene.style.setProperty("--opening-light-x", `${50 + x * 35}%`);
              }
              const end = Math.max(2, Math.min(98,
                (event.clientX - bounds.left) / bounds.width * 100));
              const progress = Math.max(0, Math.min(100,
                Math.abs(event.clientX - start.current.x) / (bounds.width * .55) * 100));
              setCut({ start: Math.min(start.current.percent, end), end: Math.max(start.current.percent, end), progress });
              if (progress >= 100) finish();
            }}
            onPointerUp={() => {
              start.current = null;
              sceneRef.current?.classList.remove("is-pulling");
              sceneRef.current?.style.removeProperty("--opening-tilt-x");
              sceneRef.current?.style.removeProperty("--opening-tilt-y");
              sceneRef.current?.style.removeProperty("--opening-light-x");
              if (!done.current) setCut({ start: 7, end: 7, progress: 0 });
            }}
            onPointerCancel={() => {
              start.current = null;
              sceneRef.current?.classList.remove("is-pulling");
              sceneRef.current?.style.removeProperty("--opening-tilt-x");
              sceneRef.current?.style.removeProperty("--opening-tilt-y");
              sceneRef.current?.style.removeProperty("--opening-light-x");
              if (!done.current) setCut({ start: 7, end: 7, progress: 0 });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                finish();
              }
            }}
          />
          <div className="booster-foil-glow" aria-hidden="true" />
        </div>
        <div className="booster-premium-actions">
          {!opened ? (
            <button className="booster-open-link" type="button" onClick={finish}>
              Ouvrir sans déchirer
            </button>
          ) : (
            <p className="booster-premium-gesture booster-premium-loading" aria-live="polite">
              <span aria-hidden="true">✦</span> DÉCOUVERTE EN COURS
            </p>
          )}
        </div>
      </div>
      {children}
    </div>,
    document.body,
  );
}
