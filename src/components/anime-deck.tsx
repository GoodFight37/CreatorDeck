"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { useAnimeBooster } from "@/hooks/use-anime-booster";
import { ANIME_CARDS, type AnimeCard as AnimeCardData } from "@/lib/anime";
import "./anime-deck.css";

export function AnimeDeck() {
  const { copies } = useAnimeBooster();
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selected, setSelected] = useState<AnimeCardData | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cards = ownedOnly ? ANIME_CARDS.filter((card) => copies.has(card.id)) : ANIME_CARDS;

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  return <main className="anime-deck">
    <header className="anime-deck-head">
      <Link href="/"><ArrowLeft size={18} aria-hidden="true" /> Drop</Link>
      <span>UNIVERS 04</span>
    </header>
    <section className="anime-deck-intro">
      <p>ANIME CINEMATIC COLLECTOR</p>
      <h1>Collection Anime</h1>
      <strong>{copies.size} / {ANIME_CARDS.length}</strong>
    </section>
    <div className="anime-deck-filters" role="group" aria-label="Cartes affichées">
      <button type="button" aria-pressed={!ownedOnly} onClick={() => setOwnedOnly(false)}>Toutes</button>
      <button type="button" aria-pressed={ownedOnly} onClick={() => setOwnedOnly(true)}>Obtenues</button>
    </div>
    {cards.length ? <section className="anime-deck-grid" aria-label="Cartes Anime">
      {cards.map((card) => <button key={card.id} type="button" onClick={() => setSelected(card)}
        aria-label={`${card.name}, ${card.series}, ${copies.get(card.id) ?? 0} exemplaire`}>
        <AnimeCard card={card} compact />
        {copies.has(card.id) ? <span className="anime-copy">×{copies.get(card.id)}</span> : <span className="anime-undiscovered">À découvrir</span>}
      </button>)}
    </section> : <p className="anime-deck-empty">Ouvre un booster Anime depuis le Drop pour commencer cette collection.</p>}
    <p className="anime-deck-rights">Prototype intégré localement · provenance Kyara · droits d’exploitation publique et commerciale non établis.</p>
    <dialog className="anime-deck-dialog" ref={dialog} onClose={() => setSelected(null)} aria-label={selected ? `Carte ${selected.name}` : undefined}>
      {selected ? <>
        <button className="anime-deck-close" type="button" onClick={() => setSelected(null)} aria-label="Fermer"><X aria-hidden="true" /></button>
        <div className="anime-deck-inspect"><AnimeCard card={selected} /></div>
      </> : null}
    </dialog>
  </main>;
}
