"use client";

import { useRef, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import "./booster-carousel.css";

export type BoosterUniverse = "live" | "memes";
const BOOSTERS = [
  { id: "live", label: "Live Drop", artwork: "/packs/live-opening.svg" },
  { id: "memes", label: "MEMES", artwork: "/packs/memes-opening.svg" },
] as const;

export function PackArtwork({ onClick, disabled, artwork = "/packs/live-opening.svg",
  label = "Ouvrir le sachet Live Drop", active = true,
}: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean;
  artwork?: string; label?: string; active?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  if (!active) return <div className="booster-neighbor" aria-hidden="true">
    <span className="pack-idle"><span className="pack-3d-object">
      <span className="pack-3d-side pack-3d-side-left" /><span className="pack-3d-side pack-3d-side-right" />
      <span className="pack-3d-side pack-3d-side-bottom" />
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-specular" /></span>
    </span></span>
  </div>;
  return <button type="button" className="pack-artwork pack-live"
    onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
    onPointerMove={(event) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) dragged.current = true;
    }}
    onPointerUp={() => { start.current = null; }}
    onPointerCancel={() => { start.current = null; dragged.current = true; }}
    onClick={(event) => { if (event.detail > 0 && dragged.current) return; onClick(event); }}
    disabled={disabled} aria-label={label}>
    <span className="pack-idle" aria-hidden="true"><span className="pack-3d-object">
      <span className="pack-3d-side pack-3d-side-left" /><span className="pack-3d-side pack-3d-side-right" />
      <span className="pack-3d-side pack-3d-side-bottom" />
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-specular" /></span>
    </span></span>
  </button>;
}

export function BoosterCarousel({ value, onChange, onPrepare, disabled, canPrepare }: {
  value: BoosterUniverse; onChange: (value: BoosterUniverse) => void;
  onPrepare: (value: BoosterUniverse) => void; disabled: boolean; canPrepare: boolean;
}) {
  const index = value === "live" ? 0 : 1;
  function choose(next: BoosterUniverse) {
    if (disabled) return;
    onChange(next);
  }
  return <div className="booster-selector" aria-label="Choix du booster">
    <section className="pack-stage stage-live booster-carousel" data-universe={value} aria-label="Booster sélectionné">
      <div className="pack-shadow" />
      {BOOSTERS.map((booster, i) => <div key={booster.id} className="booster-pack-slot" data-booster={booster.id}
        data-active={value === booster.id} style={{ "--booster-offset": i - index } as CSSProperties}>
        <PackArtwork artwork={booster.artwork} active={value === booster.id} disabled={disabled || (value === booster.id && !canPrepare)}
          label={`Préparer le booster ${booster.label}`}
          onClick={(event) => {
            event.currentTarget.focus();
            if (value === booster.id) onPrepare(booster.id);
            else choose(booster.id);
          }} />
      </div>)}
      <div className="pack-copy" aria-live="polite" aria-atomic="true">
        <h2 tabIndex={-1} data-presentation-focus-fallback>{BOOSTERS[index].label}</h2><span>· 5 cartes</span>
      </div>
    </section>
    <div className="booster-switcher" role="group" aria-label="Choisir un univers">
      {BOOSTERS.map((booster) => <button key={booster.id} type="button" aria-pressed={value === booster.id}
        disabled={disabled} onClick={() => choose(booster.id)}>{booster.label}</button>)}
    </div>
  </div>;
}
