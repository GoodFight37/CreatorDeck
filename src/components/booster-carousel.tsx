"use client";

import { useRef, type CSSProperties, type MouseEvent, type Ref } from "react";
import Image from "next/image";
import "./booster-carousel.css";

export type BoosterUniverse = "live" | "memes";
const BOOSTERS = [
  { id: "live", label: "Live Drop", artwork: "/packs/live-opening.svg" },
  { id: "memes", label: "Mèmes", artwork: "/packs/memes-opening.svg" },
] as const;

export function PackArtwork({ onClick, disabled, artwork = "/packs/live-opening.svg",
  label = "Ouvrir le sachet Live Drop", active = true, buttonRef,
}: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean;
  artwork?: string; label?: string; active?: boolean; buttonRef?: Ref<HTMLButtonElement>;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  return <button ref={buttonRef} type="button" className={active ? "pack-artwork pack-live" : "booster-neighbor"}
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
  const gesture = useRef<{ x: number; y: number; horizontal: boolean; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const stage = useRef<HTMLElement>(null);
  const index = value === "live" ? 0 : 1;
  function choose(next: BoosterUniverse, keyboard = false) {
    if (disabled) return;
    onChange(next);
    if (keyboard) requestAnimationFrame(() => stage.current?.querySelector<HTMLButtonElement>(`[data-booster="${next}"] button`)?.focus());
  }
  function endGesture() {
    stage.current?.style.removeProperty("--booster-drag");
    stage.current?.removeAttribute("data-dragging");
    gesture.current = null;
  }
  return <div className="booster-selector" aria-label="Choix du booster">
    <section ref={stage} className="pack-stage stage-live booster-carousel" data-universe={value}
      aria-roledescription="carrousel" aria-label="Boosters disponibles"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          choose(event.key === "ArrowRight" ? "memes" : "live", true);
        }
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || disabled) return;
        suppressClick.current = false;
        gesture.current = { x: event.clientX, y: event.clientY, horizontal: false, moved: false };
      }}
      onPointerMove={(event) => {
        const g = gesture.current;
        if (!g) return;
        const dx = event.clientX - g.x, dy = event.clientY - g.y;
        if (Math.hypot(dx, dy) > 10) g.moved = true;
        if (!g.horizontal && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          g.horizontal = true; event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (g.horizontal) {
          event.currentTarget.dataset.dragging = "true";
          event.currentTarget.style.setProperty("--booster-drag", Math.max(-100, Math.min(100, dx)) * .45 + "px");
        }
      }}
      onPointerUp={(event) => {
        const g = gesture.current;
        if (!g) return;
        suppressClick.current = g.moved;
        const dx = event.clientX - g.x;
        if (g.horizontal && Math.abs(dx) >= 45) choose(dx < 0 ? "memes" : "live");
        endGesture();
      }}
      onPointerCancel={() => { suppressClick.current = true; endGesture(); }}
      onLostPointerCapture={endGesture}
      onClickCapture={(event) => {
        if (event.detail > 0 && suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
      }}>
      <div className="pack-shadow" />
      {BOOSTERS.map((booster, i) => <div key={booster.id} className="booster-pack-slot" data-booster={booster.id}
        data-active={value === booster.id} style={{ "--booster-offset": i - index } as CSSProperties}>
        <PackArtwork artwork={booster.artwork} active={value === booster.id} disabled={disabled || (value === booster.id && !canPrepare)}
          label={value === booster.id ? `Préparer le booster ${booster.label}` : `Choisir le booster ${booster.label}`}
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
    <p className="booster-selection-hint">Glisse pour choisir · touche pour préparer</p>
  </div>;
}
