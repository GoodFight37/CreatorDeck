"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useBackHandler } from "@/hooks/use-back-handler";
import "./booster-carousel.css";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { cardEffectsAllowed } from "@/lib/tilt";
import { isPeelOpenable, PEEL_MIN_APERTURE, PEEL_MIN_COVERAGE, PEEL_ZONE_Y, smoothPeelEdge } from "@/lib/peel-geometry";
import { buzz } from "@/lib/haptics";
import { PACK_TEAR_MS, TEAR_HAPTIC } from "@/lib/reveal";
import { CardBackEmblem } from "@/components/card-back-emblem";

type PeelFrame = {
  trace: { x: number; y: number }[];
  pull: { x: number; y: number; angle: number };
  cut: { start: number; end: number; progress: number; direction: number; origin: number };
  tilt: { x: number; y: number };
};

/**
 * Opening keeps the foil art as one printed image, cuts it where the finger
 * passes, peels the upper weld off, then exposes and lifts actual card backs.
 * The pouch stays CSS-only; card backs and faces remain real UI elements.
 */
export function PackTear({
  kind = "live",
  artwork: customArtwork,
  onComplete,
  onTear,
  onCancel,
  onLeavePending,
  autoCompleteAfterMs,
  returnFocusTo,
  children,
}: {
  kind?: "live" | "scene";
  /** Same peel and extraction with the artwork of another card universe. */
  artwork?: string;
  onComplete: () => void;
  onTear?: () => void;
  /** Retour possible uniquement avant le geste qui engage le tirage. */
  onCancel?: () => void;
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
  const pull = useRef({ x: 0, y: 0, angle: 0 });
  const topRef = useRef<HTMLDivElement>(null);
  const pullProgress = useRef(0);
  // Les mouvements du doigt arrivent plus vite que l'écran : un seul rendu par image.
  const peelFrame = useRef<{ id: number; next: PeelFrame | null }>({ id: 0, next: null });
  const scheduleCut = useCallback((next: PeelFrame) => {
    const frame = peelFrame.current;
    frame.next = next;
    if (frame.id) return;
    frame.id = requestAnimationFrame(() => {
      frame.id = 0;
      const latest = frame.next;
      frame.next = null;
      if (!latest) return;
      setTrace(latest.trace);
      pull.current = latest.pull;
      const top = topRef.current;
      if (top) {
        top.style.transform = `translate3d(${latest.pull.x}px, ${latest.pull.y}px, ${latest.cut.progress / 100 * 22}px) rotateX(${latest.cut.progress / 100 * 42}deg) rotateZ(${latest.pull.angle}deg)`;
      }
      if (sceneRef.current && cardEffectsAllowed()) {
        sceneRef.current.style.transform = `translate(-50%, -50%) perspective(900px) rotateX(${latest.tilt.x + 1.5}deg) rotateY(${latest.tilt.y - 4}deg)`;
      }
      setCut(latest.cut);
    });
  }, []);
  const cancelScheduledCut = () => {
    const frame = peelFrame.current;
    if (frame.id) cancelAnimationFrame(frame.id);
    frame.id = 0;
    frame.next = null;
  };
  const [opened, setOpened] = useState(false);
  const [releaseReady, setReleaseReady] = useState(false);
  const [showSlowFallback, setShowSlowFallback] = useState(false);
  const start = useRef<{
    x: number;
    y: number;
    pointerId: number;
    ready: boolean;
    bounds: { left: number; top: number; width: number; height: number };
    seamWidth: number;
    points: { x: number; y: number }[];
    percent: number;
  } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const extractionCompleted = useRef(false);
  const revealing = Boolean(children);
  const cancelPreparation = () => { if (!done.current) onCancel?.(); };
  useBackHandler(!opened && Boolean(onCancel), cancelPreparation);
  const timer = useRef<number | null>(null);
  const slowTimer = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  const tearRef = useRef(onTear);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { tearRef.current = onTear; }, [onTear]);

  // The no-tear link is removed after activation. Keep focus inside the SAME
  // dialog when its card controls appear; do not mount a second focus trap.
  useEffect(() => {
    if (revealing) dialogRef.current?.focus({ preventScroll: true });
  }, [dialogRef, revealing]);

  useEffect(() => {
    if (!revealing || slowTimer.current === null) return;
    window.clearTimeout(slowTimer.current);
    slowTimer.current = null;
  }, [revealing]);

  const completeExtraction = useCallback(() => {
    if (extractionCompleted.current) return;
    extractionCompleted.current = true;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    completeRef.current();
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    start.current = null;
    cancelScheduledCut();
    sceneRef.current?.classList.remove("is-pulling");
    sceneRef.current?.style.removeProperty("transform");
    const top = topRef.current;
    top?.style.removeProperty("transform");
    top?.style.setProperty("--peel-x", `${pull.current.x}px`);
    top?.style.setProperty("--peel-y", `${pull.current.y}px`);
    top?.style.setProperty("--peel-angle", `${pull.current.angle}deg`);
    sceneRef.current?.style.setProperty("--peel-release", String(pullProgress.current));
    setCut((current) => ({ ...current, start: 4, end: 96, progress: 100 }));
    setOpened(true);

    try {
      tearRef.current?.();
    } catch {
      console.warn("Son/vibration indisponible pendant l’ouverture.");
    }

    const effects = cardEffectsAllowed();
    if (effects) {
      // Laisser les cinq dos se poser avant la première face.
      timer.current = window.setTimeout(completeExtraction, PACK_TEAR_MS);
      // Secours en cas de latence réseau prolongée (> 2.2s)
      slowTimer.current = window.setTimeout(() => {
        setShowSlowFallback(true);
      }, 2200);
    } else {
      completeExtraction();
    }

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

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (slowTimer.current !== null) window.clearTimeout(slowTimer.current);
    cancelScheduledCut();
  }, []);

  const retract = () => {
    start.current = null;
    cancelScheduledCut();
    if (done.current) return;
    sceneRef.current?.classList.remove("is-pulling");
    sceneRef.current?.style.removeProperty("transform");
    topRef.current?.style.removeProperty("transform");
    pullProgress.current = 0;
    setReturning(true);
    setReleaseReady(false);
    setTrace([]);
    pull.current = { x: 0, y: 0, angle: 0 };
    setCut({ start: 7, end: 7, progress: 0, direction: 1, origin: 7 });
  };

  // La palette de la scène et des dos suit le sachet ouvert (booster-continuity.css).
  const universe = customArtwork?.includes("anime") ? "anime" : customArtwork?.includes("vault") ? "vault" : customArtwork?.includes("memes") ? "memes" : customArtwork?.includes("imgflip") ? "imgflip"
    : kind === "live" ? "live" : undefined;
  // La soudure du visuel Manga Drop est plus fine ; le geste reste partagé.
  const seamY = customArtwork === "/packs/anime-opening.webp" ? 6.24 : 15.45;
  // Keep the drawn path in touch order: X reversals and deliberate Y bends are
  // part of the cut, not noise to collapse into a horizontal rail.
  const edge = smoothPeelEdge(trace);
  const boundary = edge.length > 1
    ? edge.map((point) => `${point.x}% ${point.y}%`).join(", ")
    : `0% ${seamY}%, 100% ${seamY}%`;
  const artwork = customArtwork ?? (kind === "scene" ? "/packs/scene-opening.svg" : "/packs/live-opening.svg");

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`pack-tear opening-continuum booster-interactive booster-cinematic booster-presentation scene-${kind}${revealing ? " is-revealing" : ""}`}
      data-universe={universe}
      role="dialog"
      style={{ "--pack-extraction-ms": `${PACK_TEAR_MS}ms`, "--pack-seam-y": `${seamY}%` } as CSSProperties}
      data-opening-phase={revealing ? "revealing" : opened ? "extracting" : "sealed"}
      aria-label={revealing ? "Résultat du booster" : "Ouvrir le booster"}
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !opened && onCancel) {
          event.preventDefault(); event.stopPropagation(); cancelPreparation();
        }
      }}
    >
      {!opened && onCancel ? <button className="booster-preparation-back" type="button"
        onClick={cancelPreparation}>← Retour</button> : null}
      <div
        className={`booster-opening-stage booster-premium-stage booster-premium-${kind}${opened ? " is-ripped" : ""}`}
        aria-hidden={revealing || undefined}
        inert={revealing}
      >
        <div className="booster-stage-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <p className="booster-opening-instruction">
          {opened ? "" : releaseReady ? "RELÂCHE" : "TIRE"}
        </p>
        <div
          ref={sceneRef}
          className={`booster-physical-scene${releaseReady ? " is-release-ready" : ""}${returning ? " is-returning" : ""}${opened ? " booster-foil-open" : ""}`}
          style={{
            "--cut-start": `${cut.start}%`,
            "--cut-end": `${cut.end}%`,
            "--peel-progress": cut.progress / 100,
            "--peel-direction": cut.direction,
            "--peel-origin-x": `${cut.origin}%`,
            "--cut-top": `polygon(0% 0%, 100% 0%, 100% ${seamY}%, ${[...edge].reverse().map((point) => `${point.x}% ${point.y}%`).join(", ") || `0% ${seamY}%`}, 0% ${seamY}%)`,
            "--cut-body": `polygon(0% ${seamY}%, ${boundary}, 100% ${seamY}%, 100% 100%, 0% 100%)`,
          } as CSSProperties}
        >
          <span className="foil-depth-side foil-depth-left" aria-hidden="true" />
          <span className="foil-depth-side foil-depth-right" aria-hidden="true" />
          <span className="foil-depth-bottom" aria-hidden="true" />
          <div className="foil-inner-shadow" aria-hidden="true" />
          {/* L'intérieur : tant que le sachet est fermé on ne voit rien, mais dès
              que la soudure cède, la lumière et la tranche des cartes en sortent. */}
          <div className="foil-interior" aria-hidden="true">
            <span className="foil-interior-light" />
            <span className="foil-interior-edges" />
          </div>
          <div className="foil-chamber-mask" aria-hidden="true">
          <div
            ref={chamberRef}
            className="foil-card-chamber"
            aria-hidden="true"
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && done.current) completeExtraction();
            }}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`foil-back-card foil-back-card-${i + 1}`} style={{ "--card-i": i } as CSSProperties}>
                <span className="foil-back-emblem"><CardBackEmblem /></span>
              </span>
            ))}
          </div>
          </div>
          <div className="foil-body-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px" className="foil-printed-art" priority />
            <span className="pack-bulge" />
          </div>
          <div ref={topRef} className="foil-top-piece" aria-hidden="true">
            <Image src={artwork} alt="" fill sizes="(max-width:438px) 64vw, 280px" className="foil-printed-art" priority />
          </div>
          <svg className="foil-cut-trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline className="foil-cut-glow" points={edge.map((point) => `${point.x},${point.y}`).join(" ")} />
            <polyline className="foil-cut-slit" points={edge.map((point) => `${point.x},${point.y}`).join(" ")} />
            {edge.filter((_, index) => index % 5 === 2).map((point, index) => (
              <circle
                key={`${index}-${point.x.toFixed(1)}-${point.y.toFixed(1)}`}
                className="foil-cut-spark"
                cx={point.x}
                cy={point.y}
                r="0.42"
                style={{ animationDelay: `${(index % 4) * 45}ms` }}
              />
            ))}
          </svg>
          <div
            className="booster-tear-track booster-peel-zone"
            role="button"
            tabIndex={opened ? -1 : 0}
            aria-label="Déchirer le haut du sachet en passant le doigt sur la soudure"
            onPointerDown={(event) => {
              if (opened || start.current || event.button !== 0 || event.isPrimary === false) return;
              const bounds = sceneRef.current!.getBoundingClientRect();
              const seamBounds = event.currentTarget.getBoundingClientRect();
              const point = {
                x: Math.max(2, Math.min(98, ((event.clientX - bounds.left) / bounds.width) * 100)),
                y: Math.max(PEEL_ZONE_Y.min, Math.min(PEEL_ZONE_Y.max, ((event.clientY - bounds.top) / bounds.height) * 100)),
              };
              start.current = {
                x: event.clientX,
                y: event.clientY,
                pointerId: event.pointerId,
                ready: false,
                bounds,
                seamWidth: (seamBounds.width / bounds.width) * 100,
                points: [point],
                percent: point.x,
              };
              setReturning(false);
              setReleaseReady(false);
              setTrace([point]);
              pull.current = { x: 0, y: 0, angle: 0 };
              for (const key of ["--peel-x", "--peel-y", "--peel-angle"]) topRef.current?.style.removeProperty(key);
              sceneRef.current?.classList.add("is-pulling");
              pullProgress.current = 0;
              setCut({ start: point.x, end: point.x, progress: 0, direction: 1, origin: point.x });
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture */ }
            }}
            onPointerMove={(event) => {
              const gesture = start.current;
              if (opened || !gesture || gesture.pointerId !== event.pointerId) return;
              const bounds = gesture.bounds;
              const rawY = ((event.clientY - bounds.top) / bounds.height) * 100;
              // Lifting through the seam is a valid peel; dragging down into
              // the artwork is ignored so wandering strokes cannot cut it.
              if (rawY > PEEL_ZONE_Y.max) return;
              const point = {
                x: Math.max(2, Math.min(98, ((event.clientX - bounds.left) / bounds.width) * 100)),
                // The lifted samples still count toward peel effort. The edge
                // builder separately drops them from the visible weld trace.
                y: Math.max(2, rawY),
              };
              const previous = gesture.points[gesture.points.length - 1];
              if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.3) {
                gesture.points.push(point);
              }
              const dx = event.clientX - gesture.x;
              const dy = event.clientY - gesture.y;

              const minX = Math.min(...gesture.points.map((p) => p.x));
              const maxX = Math.max(...gesture.points.map((p) => p.x));
              const minY = Math.min(...gesture.points.map((p) => p.y));
              const maxY = Math.max(...gesture.points.map((p) => p.y));
              const span = maxX - minX;
              const verticalSpread = maxY - minY;

              const lift = Math.max(0, -dy / bounds.height);
              const tearEnergy = span + verticalSpread * 0.35;
              const aperture = (tearEnergy / 100) * (0.65 + Math.min(0.35, lift) * 2.5);
              const seamCoverage = (span / gesture.seamWidth) * 100;
              // Le rabat ne paraît prêt que lorsque les deux seuils le sont.
              const progress = Math.min(99, Math.round(Math.min(
                seamCoverage / PEEL_MIN_COVERAGE, aperture / PEEL_MIN_APERTURE,
              ) * 100));
              pullProgress.current = progress / 100;

              scheduleCut({
                trace: [...gesture.points],
                pull: {
                  x: 28 * Math.tanh(dx / 180),
                  y: dy < 0 ? 68 * Math.tanh(dy / 150) : 30 * Math.tanh(dy / 100),
                  angle: Math.max(-14, Math.min(14, (Math.atan2(dy, bounds.width * 0.5) * 180) / Math.PI)),
                },
                cut: {
                  start: minX,
                  end: maxX,
                  progress,
                  direction: dx >= 0 ? 1 : -1,
                  origin: gesture.percent,
                },
                tilt: {
                  x: -Math.max(-1, Math.min(1, dy / bounds.height)) * 5,
                  y: Math.max(-1, Math.min(1, dx / bounds.width)) * 7,
                },
              });

              // Require a broad stroke plus lift/aperture so a tap or tiny
              // local scratch cannot fold the entire flap.
              if (isPeelOpenable(seamCoverage, aperture) && !gesture.ready) {
                // Crossing the opening threshold enables release, but the
                // hand still guides the seam and foil until pointerUp.
                gesture.ready = true;
                setReleaseReady(true);
                buzz(TEAR_HAPTIC);
              }

            }}
            onPointerUp={(event) => {
              const gesture = start.current;
              if (gesture?.pointerId !== event.pointerId) return;
              if (gesture.ready) finish();
              else retract();
            }}
            onPointerCancel={(event) => {
              if (start.current?.pointerId === event.pointerId) retract();
            }}
            onLostPointerCapture={(event) => {
              if (start.current?.pointerId === event.pointerId && !done.current) retract();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                finish();
              }
            }}
          />
          <div className="booster-foil-glow" aria-hidden="true" />
          <span className="foil-burst" aria-hidden="true" />
        </div>
        <div className="booster-premium-actions">
          {!opened ? (
            <button className="booster-open-link" type="button" onClick={finish}>
              Ouvrir sans déchirer
            </button>
          ) : showSlowFallback && !revealing ? (
            <div className="booster-premium-loading" aria-live="polite">
              <p className="booster-premium-gesture">
                <span aria-hidden="true">✦</span> LOADING CARDS…
              </p>
              {onLeavePending ? (
                <button className="booster-open-link" type="button" onClick={onLeavePending}>
                  Retour au jeu pendant l’attente
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>,
    document.body,
  );
}
