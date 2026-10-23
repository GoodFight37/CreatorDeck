"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { MemeCard } from "@/components/meme-card";
import { buzz } from "@/lib/haptics";
import { MEME_RARITY, type MemeCard as MemeCardData } from "@/lib/memes";
import { revealHaptic } from "@/lib/reveal";
import { playBang, playReveal } from "@/lib/sfx";
import { cardEffectsAllowed } from "@/lib/tilt";

const SUMMARY_HOLD_MS = 1_500;

function MemeRevealCard({ card, number, copies, onAdvance }: {
  card: MemeCardData;
  number: number;
  copies: number;
  onAdvance: () => void;
}) {
  const [ready, setReady] = useState(false);
  // Un seul élément qui tourne : le dos, puis le recto au milieu du tour.
  const effects = cardEffectsAllowed();
  const [showBack, setShowBack] = useState(effects);
  const start = useRef<{ x: number; y: number } | null>(null);
  const special = card.rarity === "rare" || card.rarity === "epic" || card.rarity === "legendary" || card.rarity === "mythic";
  const duration = effects ? special ? 1_080 : 780 : 0;
  const delay = effects ? number === 4 ? 360 : special ? 210 : 80 : 0;
  const rarityForHaptic = card.rarity === "mythic" ? "legendary" : card.rarity;

  useEffect(() => {
    const impact = window.setTimeout(() => {
      buzz(revealHaptic(rarityForHaptic));
      if (special) playBang(rarityForHaptic, "standard");
      else playReveal(rarityForHaptic, "standard");
    }, delay + Math.round(duration * .55));
    const complete = window.setTimeout(() => setReady(true), delay + duration + 80);
    return () => { window.clearTimeout(impact); window.clearTimeout(complete); };
  }, [delay, duration, rarityForHaptic, special]);

  useEffect(() => {
    if (!effects) return;
    const swap = window.setTimeout(() => setShowBack(false), delay + Math.round(duration * .53));
    return () => window.clearTimeout(swap);
  }, [delay, duration, effects]);

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const gesture = start.current;
    start.current = null;
    if (!gesture || !ready) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dx) >= 36 || dy <= -36 || Math.hypot(dx, dy) < 8) onAdvance();
  }

  return <>
    <p className="meme-reveal-counter">CARTE {number + 1} / 5</p>
    <div className={`meme-reveal-aura rarity-${card.rarity}`} aria-hidden="true" />
    <div className="meme-reveal-card-wrap" onPointerDown={(event) => {
      if (event.button === 0 && event.isPrimary !== false) start.current = { x: event.clientX, y: event.clientY };
    }} onPointerUp={endGesture} onPointerCancel={() => { start.current = null; }}>
      <div className={`meme-reveal-flip rarity-${card.rarity}`} style={{ "--meme-flip-ms": `${duration}ms`, "--meme-flip-delay": `${delay}ms`, "--rarity": MEME_RARITY[card.rarity].color } as CSSProperties}>
        {showBack
          // Le dos des cartes sorties du sachet, emblème compris : la carte qu'on retourne est la même.
          ? <div className="meme-reveal-back" aria-hidden="true"><span className="foil-back-emblem"><CardBackEmblem /></span></div>
          : <div className="meme-reveal-front"><MemeCard card={card} copies={copies} /></div>}
      </div>
    </div>
    <p className="meme-reveal-rarity">{ready ? MEME_RARITY[card.rarity].label : ""}</p>
    <p className="meme-reveal-gesture" aria-hidden="true">{ready ? "GLISSE LA CARTE" : ""}</p>
    <button className="meme-reveal-next" type="button" disabled={!ready} onClick={onAdvance}>
      {ready ? number === 4 ? "SEE THE 5 CARDS" : "NEXT CARD" : "REVEALING…"}
    </button>
  </>;
}

export function MemeReveal({ cards, copies, onClose }: {
  cards: MemeCardData[];
  copies: Map<string, number>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [summaryReady, setSummaryReady] = useState(false);
  const summary = index >= cards.length;

  useEffect(() => {
    if (!summary) return;
    const timer = window.setTimeout(() => setSummaryReady(true), SUMMARY_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [summary]);

  return <section className={`meme-reveal-flow${summary ? " is-summary" : ""}`} aria-label="Résultat du booster Mèmes">
    {summary ? <>
      <div className="meme-reveal-summary-title"><span>BOOSTER OUVERT</span><h2>Tes 5 cartes</h2></div>
      <div className="meme-reveal-summary-grid">{cards.map((card) =>
        <div key={card.id}><MemeCard card={card} compact copies={copies.get(card.id) ?? 1} /><span>{card.name}</span></div>)}</div>
      <button className="meme-reveal-next" type="button" disabled={!summaryReady} onClick={onClose}>VOIR MA COLLECTION</button>
    </> : <MemeRevealCard key={cards[index].id} card={cards[index]} number={index}
      copies={copies.get(cards[index].id) ?? 1} onAdvance={() => setIndex((value) => value + 1)} />}
  </section>;
}
