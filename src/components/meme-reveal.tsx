"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { MemeCard } from "@/components/meme-card";
import { buzz } from "@/lib/haptics";
import { MEME_RARITY, type MemeCard as MemeCardData } from "@/lib/memes";
import { MEME_REVEAL_TIMING, revealHaptic, revealTiming } from "@/lib/reveal";
import { playBang, playReveal } from "@/lib/sfx";
import { cardEffectsAllowed } from "@/lib/tilt";

export type CardRenderer = (card: MemeCardData, compact: boolean, copies: number) => ReactNode;

export type RevealLabels = {
  ariaLabel: string;
  summaryKicker: string;
  summaryTitle: string;
  close: string;
};

const DEFAULT_LABELS: RevealLabels = {
  ariaLabel: "Résultat du booster MEMES",
  summaryKicker: "BOOSTER OUVERT",
  summaryTitle: "Tes 5 cartes",
  close: "VOIR MA COLLECTION",
};

function MemeRevealCard({ card, number, copies, onAdvance, renderCard }: {
  card: MemeCardData;
  number: number;
  copies: number;
  onAdvance: () => void;
  renderCard?: CardRenderer;
}) {
  const [ready, setReady] = useState(false);
  // Un seul élément qui tourne : le dos, puis le recto au milieu du tour.
  const effects = cardEffectsAllowed();
  const [showBack, setShowBack] = useState(effects && copies <= 1);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const special = card.rarity === "rare" || card.rarity === "epic" || card.rarity === "legendary" || card.rarity === "mythic";
  const rarityForHaptic = card.rarity === "mythic" ? "legendary" : card.rarity;
  const { flipMs: duration, leadMs: delay, impactMs } = revealTiming(rarityForHaptic, effects, number === 4, copies > 1);

  useEffect(() => {
    const impact = window.setTimeout(() => {
      buzz(revealHaptic(rarityForHaptic));
      if (special) playBang(rarityForHaptic, "standard");
      else playReveal(rarityForHaptic, "standard");
    }, impactMs);
    const complete = window.setTimeout(() => setReady(true), duration === 0 ? 0 : delay + duration + MEME_REVEAL_TIMING.readyPaddingMs);
    return () => { window.clearTimeout(impact); window.clearTimeout(complete); };
  }, [delay, duration, impactMs, rarityForHaptic, special]);

  useEffect(() => {
    if (!effects || duration === 0) return;
    const swap = window.setTimeout(() => setShowBack(false), delay + Math.round(duration * MEME_REVEAL_TIMING.swapRatio));
    return () => window.clearTimeout(swap);
  }, [delay, duration, effects]);

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const gesture = start.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    start.current = null;
    if (!ready) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dx) >= 36 || dy <= -36 || Math.hypot(dx, dy) < 8) onAdvance();
  }

  return <>
    <p className="meme-reveal-counter">CARTE {number + 1} / 5</p>
    <div className={`meme-reveal-aura rarity-${card.rarity}`} aria-hidden="true" />
    <div className="meme-reveal-card-wrap" onPointerDown={(event) => {
      if (start.current || event.button !== 0 || event.isPrimary === false) return;
      start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture */ }
    }} onPointerUp={endGesture} onPointerCancel={(event) => {
      if (start.current?.pointerId === event.pointerId) start.current = null;
    }} onLostPointerCapture={(event) => {
      if (start.current?.pointerId === event.pointerId) start.current = null;
    }}>
      <div className={`meme-reveal-flip rarity-${card.rarity}${special ? "" : " is-quick"}`} style={{ "--meme-flip-ms": `${duration}ms`, "--meme-flip-delay": `${delay}ms`, "--rarity": MEME_RARITY[card.rarity].color, animationTimingFunction: MEME_REVEAL_TIMING.easing } as CSSProperties}>
        {showBack && duration > 0
          // Le dos des cartes sorties du sachet, emblème compris : la carte qu'on retourne est la même.
          ? <div className="meme-reveal-back" aria-hidden="true"><span className="foil-back-emblem"><CardBackEmblem /></span></div>
          : <div className="meme-reveal-front">{renderCard?.(card, false, copies) ?? <MemeCard card={card} copies={copies} />}</div>}
      </div>
    </div>
    <p className="meme-reveal-rarity" style={{ "--rarity": MEME_RARITY[card.rarity].color } as CSSProperties}>{ready ? MEME_RARITY[card.rarity].label : ""}</p>
    <p className="meme-reveal-gesture" aria-hidden="true">{ready ? "GLISSE LA CARTE" : ""}</p>
    <button className="meme-reveal-next" type="button" disabled={!ready} onClick={onAdvance}>
      {ready ? number === 4 ? "VOIR LES 5 CARTES" : "CARTE SUIVANTE" : "RÉVÉLATION…"}
    </button>
  </>;
}

export function MemeReveal({ cards, copies, onClose, labels = DEFAULT_LABELS, renderCard }: {
  cards: MemeCardData[];
  copies: Map<string, number>;
  onClose: () => void;
  labels?: RevealLabels;
  renderCard?: CardRenderer;
}) {
  const [index, setIndex] = useState(0);
  const [summaryReady, setSummaryReady] = useState(false);
  const summary = index >= cards.length;

  useEffect(() => {
    if (!summary) return;
    const timer = window.setTimeout(() => setSummaryReady(true), MEME_REVEAL_TIMING.summaryHoldMs);
    return () => window.clearTimeout(timer);
  }, [summary]);

  return <section className={`meme-reveal-flow${summary ? " is-summary" : ""}`} aria-label={labels.ariaLabel}>
    {summary ? <>
      <div className="meme-reveal-summary-title"><span>{labels.summaryKicker}</span><h2>{labels.summaryTitle}</h2></div>
      <div className="meme-reveal-summary-grid">{cards.map((card, i) =>
        <div key={card.id} style={{ "--i": i } as CSSProperties}>{renderCard?.(card, true, copies.get(card.id) ?? 1) ?? <MemeCard card={card} compact copies={copies.get(card.id) ?? 1} />}<span>{card.name}</span></div>)}</div>
      <button className="meme-reveal-next" type="button" disabled={!summaryReady} onClick={onClose}>{labels.close}</button>
    </> : <MemeRevealCard key={cards[index].id} card={cards[index]} number={index}
      copies={copies.get(cards[index].id) ?? 1} onAdvance={() => setIndex((value) => value + 1)} renderCard={renderCard} />}
  </section>;
}
