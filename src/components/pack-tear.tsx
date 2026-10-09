"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PackArtwork } from "@/components/drop-view";

/** A tactile booster opening: swipe across the foil seal to tear the top strip. */
export function PackTear({ kind = "live", onComplete, autoCompleteAfterMs }: {
  kind?: "live" | "scene";
  onComplete: () => void;
  /** Broadcast overlay has no touch interaction; animate the tear automatically. */
  autoCompleteAfterMs?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [opened, setOpened] = useState(false);
  const start = useRef<number | null>(null);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setProgress(100);
    setOpened(true);
    window.setTimeout(onComplete, 900);
  }, [onComplete]);

  useEffect(() => {
    if (autoCompleteAfterMs === undefined) return;
    const timeout = window.setTimeout(finish, autoCompleteAfterMs);
    return () => window.clearTimeout(timeout);
  }, [autoCompleteAfterMs, finish]);

  return createPortal(
    <div className="pack-tear booster-interactive" role="dialog" aria-modal="true" aria-label="Ouvrir le booster">
      <div className="booster-opening-stage">
        <p className="booster-opening-instruction">
          {opened ? "Booster ouvert !" : "Glisse ton doigt sur la ligne pour déchirer"}
        </p>
        <div className={`booster-foil ${opened ? "booster-foil-open" : ""}`}>
          <div className={`booster-foil-body ${kind === "live" ? "booster-foil-live" : ""}`}>
            {kind === "live" ? (
              <PackArtwork />
            ) : (
              <>
                <span className="booster-foil-logo">CREATOR<br />DECK</span>
                <span className="booster-foil-emblem">✦</span>
                <span className="booster-foil-kind">PAQUET SCÈNE</span>
                <span className="booster-foil-bottom">ÉDITION CRÉATEURS</span>
              </>
            )}
            <span className="booster-foil-shine" />
          </div>
          <div className="booster-foil-strip" style={{ "--tear-progress": `${progress}%` } as React.CSSProperties}>
            <span className="booster-foil-strip-text">CREATOR DECK ✦ CREATOR DECK</span>
          </div>
          <div
            className="booster-tear-track"
            role="slider"
            tabIndex={opened ? -1 : 0}
            aria-label="Déchirer le haut du booster"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            onPointerDown={(event) => {
              if (opened) return;
              start.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (opened || start.current === null) return;
              const next = Math.max(0, Math.min(100, (event.clientX - start.current) / 180 * 100));
              setProgress(next);
              if (next >= 75) finish();
            }}
            onPointerUp={() => { if (!opened) { start.current = null; setProgress(0); } }}
            onPointerCancel={() => { if (!opened) { start.current = null; setProgress(0); } }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
                event.preventDefault();
                finish();
              }
            }}
          >
            <span className="booster-tear-dashes" />
            {!opened && <span className="booster-tear-handle" style={{ left: `${progress}%` }}>➜</span>}
          </div>
          <div className="booster-foil-glow" />
        </div>
        {!opened && <button className="booster-open-button" type="button" onClick={finish}>Ouvrir sans glisser</button>}
      </div>
    </div>,
    document.body,
  );
}
