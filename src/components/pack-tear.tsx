"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PackArtwork } from "@/components/drop-view";
import { FoilLight3D } from "@/components/foil-light-3d";

/** A tactile booster opening: swipe across the foil seal to tear the top strip. */
export function PackTear({ kind = "live", onComplete, onTear, autoCompleteAfterMs }: {
  kind?: "live" | "scene";
  onComplete: () => void;
  /** Plays the rip sound and haptic feedback at the actual tear, not on mount. */
  onTear?: () => void;
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
    onTear?.();
    setProgress(100);
    setOpened(true);
    window.setTimeout(onComplete, 900);
  }, [onComplete, onTear]);

  useEffect(() => {
    if (autoCompleteAfterMs === undefined) return;
    const timeout = window.setTimeout(finish, autoCompleteAfterMs);
    return () => window.clearTimeout(timeout);
  }, [autoCompleteAfterMs, finish]);

  return createPortal(
    <div className="pack-tear booster-interactive" role="dialog" aria-modal="true" aria-label="Ouvrir le booster">
      <div className="booster-opening-stage">
        <p className="booster-opening-instruction">
          {opened ? "Booster ouvert !" : "Glisse sur la couture pour déchirer"}
        </p>
        <div className={`booster-foil booster-foil-${kind} ${opened ? "booster-foil-open" : ""}`} style={{ "--tear-progress": `${progress}%` } as React.CSSProperties}>
          <div className="booster-card-extract" aria-hidden="true"><span>CD</span></div>
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
            <FoilLight3D opened={opened} />
            <span className="booster-foil-shine" />
            <span className="booster-foil-lustre" aria-hidden="true" />
            <span className="booster-foil-bottom-seal" aria-hidden="true" />
          </div>
          <div className="booster-foil-strip" aria-hidden="true">
            <span className="booster-foil-top-crimp" />
            <span className="booster-foil-strip-text">✦ CREATOR DECK ✦</span>
          </div>
          <div
            className="booster-tear-track"
            role="slider"
            tabIndex={opened ? -1 : 0}
            aria-label="Déchirer le haut du booster"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
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
            {progress > 0 && !opened ? <span className="booster-tear-trace" aria-hidden="true" /> : null}
            {!opened && <span className="booster-tear-handle" style={{ left: `${6 + progress * .88}%` }}>→</span>}
          </div>
          <div className="booster-foil-cut" aria-hidden="true" />
          <div className="booster-foil-glow" aria-hidden="true" />
        </div>
        {!opened && <button className="booster-open-button" type="button" onClick={finish}>Ouvrir sans glisser</button>}
      </div>
    </div>,
    document.body,
  );
}
