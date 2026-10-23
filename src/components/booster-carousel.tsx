"use client";

import { useLayoutEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import "./booster-carousel.css";

export type BoosterUniverse = "live" | "memes" | "imgflip";
const BOOSTERS = [
  { id: "live", label: "Live Drop", artwork: "/packs/live-opening.svg" },
  { id: "memes", label: "MEMES", artwork: "/packs/memes-opening.svg" },
  { id: "imgflip", label: "IMGFLIP", artwork: "/packs/imgflip-opening.svg" },
] as const;

export function PackArtwork({ onClick, disabled, artwork = "/packs/live-opening.svg",
  label = "Ouvrir le sachet Live Drop", active = true,
}: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean;
  artwork?: string; label?: string; active?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  // Un seul élément pour le paquet de devant et le voisin : changer d'univers ne
  // recrée ni l'image ni l'objet 3D (le remplacement d'un div par un bouton
  // faisait sauter l'image et relançait l'arrivée à chaque bascule).
  return <button type="button" className={active ? "pack-artwork pack-live" : "booster-neighbor"}
    inert={!active} aria-hidden={active ? undefined : "true"} tabIndex={active ? undefined : -1}
    onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
    onPointerMove={(event) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) dragged.current = true;
    }}
    onPointerUp={() => { start.current = null; }}
    onPointerCancel={() => { start.current = null; dragged.current = true; }}
    onClick={(event) => { if (event.detail > 0 && dragged.current) return; onClick(event); }}
    disabled={active ? disabled : true}>
    {/* Le paquet EST le bouton : son nom est l'action, lue mais pas affichée. */}
    {active ? <span className="sr-only">{label}</span> : null}
    {/* Sachet plat, façon TCG de poche : l'épaisseur n'est plus modélisée (les tranches
        3D donnaient le liseré), le volume vient de l'impression et du reflet. */}
    <span className="pack-idle" aria-hidden="true"><span className="pack-3d-object">
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-bulge" />
        <span className="pack-glint" style={{ "--pack-art": `url(${artwork})` } as CSSProperties} /></span>
    </span></span>
  </button>;
}

export function BoosterCarousel({ value, onChange, onPrepare, disabled, canPrepare, universes, labels }: {
  value: BoosterUniverse; onChange: (value: BoosterUniverse) => void;
  onPrepare: (value: BoosterUniverse) => void; disabled: boolean; canPrepare: boolean;
  /** Univers proposés ; par défaut les trois. Un seul : pas de sélecteur. */
  universes?: readonly BoosterUniverse[];
  /** Ce que fait un appui sur le paquet de devant (« Ouvrir le booster »…). */
  labels?: Partial<Record<BoosterUniverse, string>>;
}) {
  const boosters = universes ? BOOSTERS.filter((booster) => universes.includes(booster.id)) : BOOSTERS;
  const index = Math.max(0, boosters.findIndex((booster) => booster.id === value));
  const swipe = useRef<{ x: number; y: number; id: number; dragging: boolean;
    samples: { x: number; t: number }[] } | null>(null);
  const stage = useRef<HTMLElement>(null);
  // Le changement d'univers et la remise à zéro du glissé arrivent dans la même
  // image : le paquet part de là où le doigt l'a laissé, sans revenir en arrière.
  function releaseDrag() {
    const node = stage.current;
    if (!node) return;
    node.classList.remove("is-dragging");
    node.style.setProperty("--drag", "0");
  }
  useLayoutEffect(() => { releaseDrag(); }, [index]);
  function choose(next: BoosterUniverse) {
    if (disabled) return;
    // Après une première bascule, le paquet qui passe devant ne rejoue pas son arrivée.
    if (stage.current) stage.current.dataset.switched = "true";
    onChange(next);
  }
  // Le carrousel suit le doigt : les paquets glissent et tournent sur eux-mêmes,
  // puis se calent sur le plus proche au relâché. Un tap reste un tap.
  function spacing() {
    const slot = stage.current?.querySelector<HTMLElement>(".booster-pack-slot");
    return Math.max(80, (slot?.offsetWidth ?? 250) * 0.78);
  }
  function moveSwipe(event: PointerEvent<HTMLElement>) {
    const gesture = swipe.current;
    const node = stage.current;
    if (!gesture || !node || gesture.id !== event.pointerId || boosters.length < 2 || disabled) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      gesture.dragging = true;
      node.classList.add("is-dragging");
      try { node.setPointerCapture(event.pointerId); } catch { /* capture */ }
    }
    gesture.samples.push({ x: event.clientX, t: event.timeStamp });
    if (gesture.samples.length > 6) gesture.samples.shift();
    let drag = dx / spacing();
    // Au bout de la file, le paquet résiste au lieu de partir dans le vide.
    if ((index === 0 && drag > 0) || (index === boosters.length - 1 && drag < 0)) drag *= 0.3;
    node.style.setProperty("--drag", String(Math.max(-1.15, Math.min(1.15, drag))));
  }
  function endSwipe(event: PointerEvent<HTMLElement>) {
    const gesture = swipe.current;
    swipe.current = null;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!gesture.dragging) return;
    const drag = (event.clientX - gesture.x) / spacing();
    // Un coup de pouce rapide suffit : au-delà de ~0,11 px/ms, on change de
    // paquet même sous 22 % d'un cran (vitesse mesurée sur les ~100 dernières ms).
    const recent = gesture.samples.filter((sample) => event.timeStamp - sample.t <= 100);
    const first = recent[0];
    const elapsed = first ? event.timeStamp - first.t : 0;
    const velocity = first && elapsed > 0 ? (event.clientX - first.x) / elapsed : 0;
    const flick = Math.abs(velocity) > 0.11 && Math.sign(velocity) === Math.sign(drag);
    const step = Math.abs(drag) > 0.22 || flick ? (drag < 0 ? 1 : -1) : 0;
    const next = boosters[Math.max(0, Math.min(boosters.length - 1, index + step))];
    if (next.id !== value && !disabled) choose(next.id);
    else releaseDrag();
  }
  return <div className="booster-selector" aria-label="Choix du booster">
    <section ref={stage} className="pack-stage stage-live booster-carousel" data-universe={value} aria-label="Booster sélectionné"
      onPointerDown={(event) => { swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId, dragging: false, samples: [{ x: event.clientX, t: event.timeStamp }] }; }}
      onPointerMove={moveSwipe}
      onPointerUp={endSwipe}
      onPointerCancel={() => { swipe.current = null; releaseDrag(); }}
      onLostPointerCapture={(event) => {
        // Au doigt, la capture implicite du bouton se perd quand le carrousel prend la sienne :
        // cet événement remonte ici et annulait le glissement dès son premier pixel.
        if (event.target !== event.currentTarget) return;
        if (swipe.current?.dragging) { swipe.current = null; releaseDrag(); }
      }}>
      <div className="pack-shadow" />
      {boosters.map((booster, i) => <div key={booster.id} className="booster-pack-slot" data-booster={booster.id}
        data-active={value === booster.id} style={{ "--booster-offset": i - index } as CSSProperties}>
        <PackArtwork artwork={booster.artwork} active={value === booster.id} disabled={disabled || (value === booster.id && !canPrepare)}
          label={labels?.[booster.id] ?? `Ouvrir le booster ${booster.label}`}
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
