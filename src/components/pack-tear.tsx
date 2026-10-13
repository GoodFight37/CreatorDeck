"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { cardEffectsAllowed } from "@/lib/tilt";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { PackFoil3D } from "@/components/pack-foil-3d";

/**
 * Opening keeps the foil art as one printed image, cuts it where the finger
 * passes, peels the upper weld off, then exposes and lifts actual card backs.
 * A lazy mesh enhances the pouch only; the 2D continuum stays as fallback.
 */
export function PackTear({
  kind = "live",
  onComplete,
  onTear,
  onLeavePending,
  autoCompleteAfterMs,
  returnFocusTo,
  children,
}: {
  kind?: "live" | "scene";
  onComplete: () => void;
  onTear?: () => void;
  /** Leaves the presentation only; the in-flight draw is not retried/cancelled. */
  onLeavePending?: () => void;
  autoCompleteAfterMs?: number;
  returnFocusTo?: HTMLElement | null;
  /** The revealed cards live inside the same mounted opening, never a second portal. */
  children?: ReactNode;
}) {
  const dialogRef = usePresentationFocus(true, returnFocusTo);
  const [cut, setCut] = useState({ start: 7, end: 7, progress: 0, direction: 1, origin: 7 });
  const [trace, setTrace] = useState<{ x: number; y: number }[]>([]);
  const [returning, setReturning] = useState(false);
  const [pull, setPull] = useState({ x: 0, y: 0, angle: 0 });
  const pullProgress = useRef(0);
  const [opened, setOpened] = useState(false);
  const [releaseReady, setReleaseReady] = useState(false);
  // Explicit preview only, until the GPU material is approved on a real phone.
  const [foil3D] = useState(() => typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("opening3d") === "1");
  const start = useRef<{ x: number; y: number; pointerId: number; ready: boolean; bounds: { left: number; top: number; width: number; height: number }; points: { x: number; y: number }[]; percent: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);
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
    sceneRef.current?.style.setProperty("--peel-release", String(pullProgress.current));
    setCut(current => ({ ...current, start: 4, end: 96, progress: 100 }));
    setOpened(true);
    // animationend opens the face IN this scene. This timer is only a lost-event
    // fallback; it never destroys the pouch or replaces the presentation root.
    const effects = cardEffectsAllowed();
    if (effects) timer.current = window.setTimeout(completeExtraction, 1_200);
    // Audio/haptics are optional: they cannot strand an already opened pouch.
    try { tearRef.current?.(); } catch { console.warn("Son/vibration indisponible pendant l’ouverture."); }
    if (!effects) completeExtraction();
  }, [completeExtraction]);

  useEffect(() => {
    const chamber = chamberRef.current;
    if (!opened || !chamber) return;
    const cancelled = (event: Event) => {
      if (event.target === chamber) completeExtraction();
    };
    chamber.addEventListener("animationcancel", cancelled);
    return () => chamber.removeEventListener("animationcancel", cancelled);
  }, [opened, completeExtraction]);

  useEffect(() => {
    if (autoCompleteAfterMs === undefined) return;
    const timeout = window.setTimeout(finish, autoCompleteAfterMs);
    return () => window.clearTimeout(timeout);
  }, [autoCompleteAfterMs, finish]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const retract = () => {
    start.current = null;
    if (done.current) return;
    sceneRef.current?.classList.remove("is-pulling");
    for (const key of ["--opening-tilt-x", "--opening-tilt-y", "--opening-light-x"]) sceneRef.current?.style.removeProperty(key);
    pullProgress.current = 0;
    setReturning(true);
    setReleaseReady(false);
    setPull({ x: 0, y: 0, angle: 0 });
    setCut(current => ({ ...current, progress: 0 }));
  };
  // The real sampled cut separates both printed pieces, rather than filling a rail.
  const edge = [...new Map(trace.map(point => [Math.round(point.x), point])).values()]
    .sort((a, b) => a.x - b.x);
  const boundary = edge.length > 1 ? edge.map(point => `${point.x}% ${point.y}%`).join(", ") : "0% 15.45%, 100% 15.45%";
  const artwork = kind === "scene" ? "/packs/scene-opening.svg" : "/packs/live-opening.svg";
  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className={`pack-tear opening-continuum booster-interactive booster-cinematic booster-presentation scene-${kind}${revealing ? " is-revealing" : ""}`} role="dialog"
      data-opening-phase={revealing ? "revealing" : opened ? "extracting" : "sealed"}
      aria-label={revealing ? "Résultat du booster" : "Ouvrir le booster"} aria-modal="true">
      <div className={`booster-opening-stage booster-premium-stage booster-premium-${kind}${opened ? " is-ripped" : ""}`}
          aria-hidden={revealing || undefined} inert={revealing}>
        <div className="booster-stage-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <p className="booster-opening-instruction">
          {opened ? "LES CARTES APPARAISSENT" : releaseReady ? "RELÂCHE POUR OUVRIR" : "GUIDE LA COUPE SUR LA BANDE STRIÉE"}
        </p>
        <div ref={sceneRef} className={`booster-physical-scene${returning ? " is-returning" : ""}${opened ? " booster-foil-open" : ""}`}
          style={{ "--cut-start": `${cut.start}%`, "--cut-end": `${cut.end}%`,
            "--peel-progress": cut.progress / 100, "--peel-direction": cut.direction,
            "--peel-origin-x": `${cut.origin}%`,
            "--peel-x": `${pull.x}px`, "--peel-y": `${pull.y}px`, "--peel-angle": `${pull.angle}deg`,
            "--cut-top": `polygon(0% 0%, 100% 0%, 100% 15.45%, ${[...edge].reverse().map(point => `${point.x}% ${point.y}%`).join(", ") || "0% 15.45%"}, 0% 15.45%)`,
            "--cut-body": `polygon(0% 15.45%, ${boundary}, 100% 15.45%, 100% 100%, 0% 100%)` } as CSSProperties}>
          <PackFoil3D enabled={foil3D} artwork={artwork} progress={cut.progress} from={cut.start} to={cut.end} opened={opened} />
          <span className="foil-depth-side foil-depth-left" aria-hidden="true" />
          <span className="foil-depth-side foil-depth-right" aria-hidden="true" />
          <span className="foil-depth-bottom" aria-hidden="true" />
          <div className="foil-inner-shadow" aria-hidden="true" />
          <div ref={chamberRef} className="foil-card-chamber" aria-hidden="true" onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && done.current) completeExtraction();
          }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`foil-back-card foil-back-card-${i + 1}`}
                style={{ "--card-i": i } as CSSProperties}>
                <span className="foil-back-emblem"><CardBackEmblem /></span>
              </span>
            ))}
          </div>
          <div className="foil-body-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px"
              className="foil-printed-art" priority />
          </div>
          <div className="foil-top-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px"
              className="foil-printed-art" priority />
          </div>
          <svg className="foil-cut-trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline className="foil-cut-slit" points={trace.map(point => `${point.x},${point.y}`).join(" ")} />
          </svg>
          <div className="booster-tear-track booster-peel-zone" role="button" tabIndex={opened ? -1 : 0}
            aria-label="Déchirer le sachet en passant le doigt sur sa soudure"
            onPointerDown={(event) => {
              if (opened || start.current || event.button !== 0 || event.isPrimary === false) return;
              const bounds = sceneRef.current!.getBoundingClientRect();
              const point = { x: Math.max(2, Math.min(98, (event.clientX - bounds.left) / bounds.width * 100)),
                y: Math.max(6, Math.min(23, (event.clientY - bounds.top) / bounds.height * 100)) };
              start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, ready: false, bounds, points: [point], percent: point.x };
              setReturning(false);
              setReleaseReady(false);
              setTrace([point]);
              setPull({ x: 0, y: 0, angle: 0 });
              sceneRef.current?.classList.add("is-pulling");
              pullProgress.current = 0;
              setCut({ start: point.x, end: point.x, progress: 0, direction: 1, origin: point.x });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const gesture = start.current;
              if (opened || !gesture || gesture.pointerId !== event.pointerId) return;
              const bounds = gesture.bounds;
              const point = { x: Math.max(2, Math.min(98, (event.clientX - bounds.left) / bounds.width * 100)),
                y: Math.max(6, Math.min(23, (event.clientY - bounds.top) / bounds.height * 100)) };
              const previous = gesture.points[gesture.points.length - 1];
              if (Math.hypot(point.x - previous.x, point.y - previous.y) >= .4) gesture.points.push(point);
              const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
              // Opening area combines the cut's width and the lifted lip. Vertical
              // pulls can open a shorter cut; scribbling in place cannot accumulate a gauge.
              const span = Math.max(...gesture.points.map(p => p.x)) - Math.min(...gesture.points.map(p => p.x));
              const lift = Math.max(0, -dy / bounds.height);
              const aperture = span / 100 * (.5 + Math.min(.3, lift) * 3);
              const progress = Math.min(99, aperture / .25 * 100);
              pullProgress.current = progress / 100;
              setTrace([...gesture.points]);
              setPull({ x: Math.max(-24, Math.min(24, dx * .16)), y: Math.max(-65, Math.min(28, dy * .55)),
                angle: Math.max(-12, Math.min(12, Math.atan2(dy, bounds.width * .5) * 180 / Math.PI)) });
              setCut({ start: Math.min(...gesture.points.map(p => p.x)), end: Math.max(...gesture.points.map(p => p.x)), progress,
                direction: dx >= 0 ? 1 : -1, origin: gesture.percent });
              const scene = sceneRef.current;
              if (scene && cardEffectsAllowed()) {
                scene.style.setProperty("--opening-tilt-x", `${-Math.max(-1, Math.min(1, dy / bounds.height)) * 5}deg`);
                scene.style.setProperty("--opening-tilt-y", `${Math.max(-1, Math.min(1, dx / bounds.width)) * 7}deg`);
                scene.style.setProperty("--opening-light-x", `${point.x}%`);
              }
              gesture.ready = span >= 20 && aperture >= .25;
              setReleaseReady(gesture.ready);
            }}
            onPointerUp={(event) => {
              const gesture = start.current;
              if (gesture?.pointerId !== event.pointerId) return;
              if (gesture.ready) finish();
              else retract();
            }}
            onPointerCancel={(event) => { if (start.current?.pointerId === event.pointerId) retract(); }}
            onLostPointerCapture={(event) => { if (start.current?.pointerId === event.pointerId) retract(); }}
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
            <div className="booster-premium-loading" aria-live="polite">
            <p className="booster-premium-gesture">
              <span aria-hidden="true">✦</span> DÉCOUVERTE EN COURS
            </p>
            <button className="booster-open-link" type="button" onClick={completeExtraction}>Afficher les cartes</button>
            {onLeavePending ? <button className="booster-open-link" type="button" onClick={onLeavePending}>Retour au jeu pendant l’attente</button> : null}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>,
    document.body,
  );
}
