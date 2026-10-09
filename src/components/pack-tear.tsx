"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FoilPack3D } from "@/components/foil-pack-3d";

/**
 * One tactile interaction, one continuous cinematic sequence.
 * The 3D foil geometry tears apart and a lit reveal portal bridges the scene
 * to the actual first card. Nothing fake marked "CD" appears in between.
 */
export function PackTear({
  kind = "live",
  onComplete,
  onTear,
  autoCompleteAfterMs,
}: {
  kind?: "live" | "scene";
  onComplete: () => void;
  onTear?: () => void;
  autoCompleteAfterMs?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [opened, setOpened] = useState(false);
  const startX = useRef<number | null>(null);
  const completed = useRef(false);
  const timer = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTearRef = useRef(onTear);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onTearRef.current = onTear; }, [onTear]);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    startX.current = null;
    setProgress(100);
    setOpened(true);
    onTearRef.current?.();
    // Mesh deformation and opening curtain share exactly this duration.
    timer.current = window.setTimeout(() => onCompleteRef.current(), 1180);
  }, []);

  useEffect(() => {
    if (autoCompleteAfterMs === undefined) return;
    const timeout = window.setTimeout(finish, autoCompleteAfterMs);
    return () => window.clearTimeout(timeout);
  }, [autoCompleteAfterMs, finish]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return createPortal(
    <div className="pack-tear booster-interactive booster-cinematic" role="dialog"
      aria-modal="true" aria-label="Ouvrir le booster">
      <div className={"booster-opening-stage booster-premium-stage booster-premium-" + kind +
        (opened ? " is-ripped" : "")}>
        <div className="booster-stage-atmosphere" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="booster-premium-caption">
          <span className="booster-caption-rule" />
          <span>{kind === "scene" ? "PAQUET SCÈNE" : "LIVE DROP"}</span>
          <span className="booster-caption-rule" />
        </div>
        <p className="booster-opening-instruction">
          {opened ? "LA RÉVÉLATION COMMENCE" : "DÉCHIRE LA SOUDURE"}
        </p>
        <div className={"booster-physical-scene" + (opened ? " booster-foil-open" : "")}
          style={{ "--tear-progress": progress + "%" } as CSSProperties}>
          <FoilPack3D kind={kind} progress={progress} opened={opened} />
          <div className="booster-foil-glow" aria-hidden="true" />
          <div className="booster-premium-lightburst" aria-hidden="true">
            <span /><span /><span /><span />
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
              startX.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (opened || startX.current === null) return;
              const next = Math.max(0, Math.min(100,
                ((event.clientX - startX.current) / 180) * 100));
              setProgress(next);
              if (next >= 78) finish();
            }}
            onPointerUp={() => {
              startX.current = null;
              if (!completed.current) setProgress(0);
            }}
            onPointerCancel={() => {
              startX.current = null;
              if (!completed.current) setProgress(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " ||
                  event.key === "ArrowRight") {
                event.preventDefault();
                finish();
              }
            }}
          >
            <span className="booster-premium-perforation" aria-hidden="true" />
            {progress > 0 && !opened ?
              <span className="booster-tear-trace" aria-hidden="true" /> : null}
            {!opened ? (
              <span className="booster-tear-handle"
                style={{ left: (8 + progress * .84) + "%" }}>
                <span aria-hidden="true">→</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="booster-premium-actions">
          {!opened ? (
            <>
              <p className="booster-premium-gesture">FAIS GLISSER LE CURSEUR VERS LA DROITE</p>
              <button className="booster-open-button" type="button" onClick={finish}>
                Ouvrir sans glisser
              </button>
            </>
          ) : (
            <p className="booster-premium-gesture booster-premium-loading" aria-live="polite">
              <span aria-hidden="true">✦</span> DÉCOUVERTE EN COURS <span aria-hidden="true">✦</span>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
