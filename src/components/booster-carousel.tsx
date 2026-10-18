"use client";

import { useRef, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import "./booster-carousel.css";

export type BoosterUniverse = "live" | "memes";
const BOOSTERS = [
  { id: "live", label: "Live Drop", artwork: "/packs/live-opening.svg" },
  { id: "memes", label: "MEMES", artwork: "/packs/memes-opening.svg" },
] as const;

/** Les dos des paquets qu'on a encore, empilés derrière celui de devant. */
function PackPile({ count }: { count: number }) {
  const backs = Math.max(0, Math.min(3, count - 1));
  if (!backs) return null;
  return <span className="pack-pile" aria-hidden="true">
    {Array.from({ length: backs }, (_, i) => <span key={i} className="pack-pile-back"
      style={{ "--pile-i": backs - i } as CSSProperties} />)}
  </span>;
}

export function PackArtwork({ onClick, disabled, artwork = "/packs/live-opening.svg",
  label = "Ouvrir le sachet Live Drop", active = true, pile = 0,
}: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean;
  artwork?: string; label?: string; active?: boolean;
  /** Boosters en réserve : au-delà du premier, leurs dos se voient derrière. */
  pile?: number;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  if (!active) return <div className="booster-neighbor" aria-hidden="true">
    <PackPile count={pile} />
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
    disabled={disabled}>
    {/* Le paquet EST le bouton : son nom est l'action, lue mais pas affichée. */}
    <span className="sr-only">{label}</span>
    <PackPile count={pile} />
    <span className="pack-idle" aria-hidden="true"><span className="pack-3d-object">
      <span className="pack-3d-side pack-3d-side-left" /><span className="pack-3d-side pack-3d-side-right" />
      <span className="pack-3d-side pack-3d-side-bottom" />
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-specular" /></span>
    </span></span>
  </button>;
}

export function BoosterCarousel({ value, onChange, onPrepare, disabled, canPrepare, universes, labels, piles }: {
  value: BoosterUniverse; onChange: (value: BoosterUniverse) => void;
  onPrepare: (value: BoosterUniverse) => void; disabled: boolean; canPrepare: boolean;
  /** Univers proposés ; par défaut les deux. Un seul : pas de sélecteur. */
  universes?: readonly BoosterUniverse[];
  /** Ce que fait un appui sur le paquet de devant (« Ouvrir le booster »…). */
  labels?: Partial<Record<BoosterUniverse, string>>;
  /** Boosters en réserve par univers, pour la pile visible derrière. */
  piles?: Partial<Record<BoosterUniverse, number>>;
}) {
  const boosters = universes ? BOOSTERS.filter((booster) => universes.includes(booster.id)) : BOOSTERS;
  const index = Math.max(0, boosters.findIndex((booster) => booster.id === value));
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function choose(next: BoosterUniverse) {
    if (disabled) return;
    onChange(next);
  }
  // Un geste horizontal franc passe d'un paquet à l'autre ; un tap reste un tap.
  function endSwipe(x: number, y: number) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || boosters.length < 2) return;
    const dx = x - start.x;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(y - start.y) * 1.4) return;
    const next = boosters[Math.max(0, Math.min(boosters.length - 1, index + (dx < 0 ? 1 : -1)))];
    if (next.id !== value) choose(next.id);
  }
  return <div className="booster-selector" aria-label="Choix du booster">
    <section className="pack-stage stage-live booster-carousel" data-universe={value} aria-label="Booster sélectionné"
      onPointerDown={(event) => { swipe.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => endSwipe(event.clientX, event.clientY)}
      onPointerCancel={() => { swipe.current = null; }}>
      <div className="pack-shadow" />
      {boosters.map((booster, i) => <div key={booster.id} className="booster-pack-slot" data-booster={booster.id}
        data-active={value === booster.id} style={{ "--booster-offset": i - index } as CSSProperties}>
        <PackArtwork artwork={booster.artwork} active={value === booster.id} disabled={disabled || (value === booster.id && !canPrepare)}
          label={labels?.[booster.id] ?? `Ouvrir le booster ${booster.label}`} pile={piles?.[booster.id] ?? 0}
          onClick={(event) => {
            event.currentTarget.focus();
            if (value === booster.id) onPrepare(booster.id);
            else choose(booster.id);
          }} />
      </div>)}
      <div className="pack-copy" aria-live="polite" aria-atomic="true">
        <h2 tabIndex={-1} data-presentation-focus-fallback>{boosters[index].label}</h2><span>· 5 cartes</span>
      </div>
    </section>
    {boosters.length > 1 ? <div className="booster-switcher" role="group" aria-label="Choisir un univers">
      {boosters.map((booster) => <button key={booster.id} type="button" aria-pressed={value === booster.id}
        disabled={disabled} onClick={() => choose(booster.id)}>{booster.label}</button>)}
    </div> : null}
  </div>;
}
