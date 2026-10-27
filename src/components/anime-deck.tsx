"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { useAnimeBooster } from "@/hooks/use-anime-booster";
import { ANIME_CARDS, type AnimeCard as AnimeCardData } from "@/lib/anime";
import "./anime-deck.css";

const PAGE_SIZE = 12;

export function AnimeDeck() {
  const { copies } = useAnimeBooster();
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AnimeCardData | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = query.trim().toLocaleLowerCase("fr");
  const cards = ANIME_CARDS.filter((card) => (!ownedOnly || copies.has(card.id))
    && (!search || `${card.name} ${card.series}`.toLocaleLowerCase("fr").includes(search)));
  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = cards.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
      <button type="button" aria-pressed={!ownedOnly} onClick={() => { setOwnedOnly(false); setPage(0); }}>Toutes</button>
      <button type="button" aria-pressed={ownedOnly} onClick={() => { setOwnedOnly(true); setPage(0); }}>Obtenues</button>
    </div>
    <label className="anime-deck-search"><span className="sr-only">Rechercher une carte Anime</span>
      <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Nom ou série" />
    </label>
    {cards.length ? <section className="anime-deck-grid" aria-label="Cartes Anime">
      {visible.map((card) => <button key={card.id} type="button" onClick={() => setSelected(card)}
        aria-label={`${card.name}, ${card.series}, ${copies.get(card.id) ?? 0} exemplaire`}>
        <AnimeCard card={card} compact />
        {copies.has(card.id) ? <span className="anime-copy">×{copies.get(card.id)}</span> : <span className="anime-undiscovered">À découvrir</span>}
      </button>)}
    </section> : <p className="anime-deck-empty">{search ? "Aucune carte ne correspond à ta recherche." : "Ouvre un booster Anime depuis le Drop pour commencer cette collection."}</p>}
    {cards.length ? <nav className="anime-deck-pages" aria-label="Pages des cartes Anime">
      <button type="button" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}><ChevronLeft size={18} aria-hidden="true" /> Précédente</button>
      <span aria-live="polite">{currentPage + 1} / {pageCount}</span>
      <button type="button" onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))} disabled={currentPage === pageCount - 1}>Suivante <ChevronRight size={18} aria-hidden="true" /></button>
    </nav> : null}
    <p className="anime-deck-rights">Prototype intégré localement · provenance Kyara · droits d’exploitation publique et commerciale non établis.</p>
    <dialog className="anime-deck-dialog" ref={dialog} onClose={() => setSelected(null)} aria-label={selected ? `Carte ${selected.name}` : undefined}>
      {selected ? <>
        <button className="anime-deck-close" type="button" onClick={() => setSelected(null)} aria-label="Fermer"><X aria-hidden="true" /></button>
        <div className="anime-deck-inspect"><AnimeCard card={selected} /></div>
      </> : null}
    </dialog>
  </main>;
}
