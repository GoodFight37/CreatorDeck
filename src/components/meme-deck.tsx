"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMemeBooster } from "@/hooks/use-meme-booster";
import { useImgflipBooster } from "@/hooks/use-imgflip-booster";
import { useNow } from "@/hooks/use-game";
import { MemeBoosterOpening } from "@/components/meme-booster-opening";
import { MemePackComposition } from "@/components/meme-pack-parts";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MEME_CARDS, MEME_RARITY, type MemeCard as MemeCardData, type MemeRarity } from "@/lib/memes";
import { MemeCard } from "@/components/meme-card";
import "./meme-deck.css";
import "./meme-reveal.css";

const PAGE_SIZE = 12;
type Filter = "all" | "owned";

function countdown(nextAt: string | null, now: number) {
  if (!nextAt) return "Réserve pleine";
  if (!now) return "…";
  const left = Math.max(0, Date.parse(nextAt) - now);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1_000);
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function BoosterCountdown({ stock, nextAt }: { stock: number; nextAt: string | null }) {
  const now = useNow(1000);
  return <>{String(stock)} booster(s) prêts · {countdown(nextAt, now)}</>;
}

export function MemeDeck() {
  const booster = useMemeBooster();
  const imgflipBooster = useImgflipBooster();
  const { account, status, busy, problem } = booster;
  // Les possessions Imgflip (0062) rejoignent le même classeur : les identifiants
  // sont disjoints (`imgflip-…`), la fusion ne peut pas écraser une carte MEMES.
  const copies = useMemo(() => {
    const merged = new Map(booster.copies);
    for (const [id, count] of imgflipBooster.copies) merged.set(id, (merged.get(id) ?? 0) + count);
    return merged;
  }, [booster.copies, imgflipBooster.copies]);
  const [selected, setSelected] = useState<MemeCardData | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [rarity, setRarity] = useState<MemeRarity | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const inspectRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = inspectRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("fr");
    return MEME_CARDS.filter((card) =>
      (filter === "all" || copies.has(card.id))
      && (rarity === "all" || card.rarity === rarity)
      && (!search || card.name.toLocaleLowerCase("fr").includes(search)
        || String(card.number) === search.replace(/^#/, "")));
  }, [copies, filter, rarity, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  return <main className="meme-world">
    <header className="meme-world-head"><Link href="/"><ArrowLeft size={18} aria-hidden="true" /> Drop</Link><span>UNIVERS 02</span></header>
    <section className="meme-hero" aria-labelledby="meme-heading">
      <p className="meme-eyebrow">COLLECTION MEMES FR</p><h1 id="meme-heading">MEMES</h1>
      <div className="meme-pack-scene"><div className="meme-pack-floor" aria-hidden="true" />
        <div className="meme-pack-object" aria-hidden="true"><span className="meme-pack-film" /></div></div>
      <p className="meme-hero-line">5 cartes · 1 Rare ou mieux</p>
      <button ref={openButtonRef} className="meme-open" type="button" disabled={!account || !status || status.stock < 1 || busy}
        onClick={booster.prepare}>{busy ? "OUVERTURE…" : "OUVRIR UN BOOSTER"}</button>
      <p className="meme-status" aria-live="polite">{status
        ? <BoosterCountdown stock={status.stock} nextAt={status.nextAt} />
        : account ? "Lecture de ta réserve…" : "Connecte-toi dans Toi pour ouvrir et conserver tes cartes."}</p>
      {booster.notice ? <p role="status">{booster.notice}</p> : null}
      {problem ? <div className="meme-problem" role="alert"><p>{problem}</p>
        <button type="button" disabled={booster.loading} onClick={() => void booster.refresh()}>Réessayer la lecture</button></div> : null}
      {!account ? <Link className="meme-account-link" href="/">Retourner au jeu pour se connecter</Link> : null}
      <MemePackComposition />
    </section>
    <section className="meme-collection" aria-labelledby="meme-collection-heading">
      <div className="meme-collection-head"><div><p className="meme-eyebrow">TON AUTRE CLASSEUR</p>
        <h2 id="meme-collection-heading">Collection</h2></div><strong>{copies.size} / {MEME_CARDS.length}</strong></div>
      <div className="meme-tabs" role="group" aria-label="Cartes affichées">
        <button type="button" aria-pressed={filter === "all"} onClick={() => { setFilter("all"); setPage(0); }}>Toutes</button>
        <button type="button" aria-pressed={filter === "owned"} onClick={() => { setFilter("owned"); setPage(0); }}>Obtenues</button>
      </div>
      <div className="meme-filters">
        <label><span className="sr-only">Rechercher une carte mème</span><input value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Nom ou numéro" /></label>
        <label><span className="sr-only">Filtrer par rareté</span><select value={rarity}
          onChange={(event) => { setRarity(event.target.value as MemeRarity | "all"); setPage(0); }}>
          <option value="all">Toutes raretés</option>
          {Object.entries(MEME_RARITY).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select></label>
      </div>
      {visible.length ? <div className="meme-grid">{visible.map((card) =>
        <button className="meme-slot" type="button" key={card.id} onClick={() => setSelected(card)}
          aria-label={"Voir " + card.name + ", " + MEME_RARITY[card.rarity].label}>
          <MemeCard card={card} compact copies={copies.get(card.id) ?? 0} />
          <span className="meme-slot-name">{card.name}</span>
          <span className="meme-slot-meta">{MEME_RARITY[card.rarity].label}{copies.has(card.id) ? " · ×" + copies.get(card.id) : " · À découvrir"}</span>
        </button>)}</div> : <p className="meme-empty">{filter === "owned" ? "Aucune carte obtenue pour ce filtre." : "Aucune carte trouvée."}</p>}
      <nav className="meme-pager" aria-label="Pages du classeur MEMES">
        <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={currentPage === 0}><ChevronLeft size={18} aria-hidden="true" /> Précédente</button>
        <span>{currentPage + 1} / {pageCount}</span>
        <button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1}>Suivante <ChevronRight size={18} aria-hidden="true" /></button>
      </nav>
      <p className="meme-credit">Cartes MyMemeCards et modèles Imgflip. Sources indiquées sur les fiches.</p>
    </section>
    <MemeBoosterOpening booster={booster} />
    {selected ? <dialog className="meme-dialog meme-inspect" ref={inspectRef} onClose={() => setSelected(null)}
      aria-label={"Carte " + selected.name}>
      <button className="meme-close" type="button" onClick={() => setSelected(null)} aria-label="Fermer"><X aria-hidden="true" /></button>
      <MemeCard card={selected} copies={copies.get(selected.id) ?? 0} interactiveFoil />
      <div className="meme-inspect-copy"><p className="meme-eyebrow">#{String(selected.number).padStart(3, "0")} · {MEME_RARITY[selected.rarity].label}{selected.fullArt ? " · Full Art" : ""}</p>
        <h2>{selected.name}</h2>{selected.flavor ? <p>{selected.flavor}</p> : null}
        <small>Source : {selected.sourceName ?? (selected.credit ? selected.credit + " · MyMemeCards" : "MyMemeCards")}{selected.year ? " · " + selected.year : ""}</small>
        <p>{copies.has(selected.id) ? String(copies.get(selected.id)) + " exemplaire(s) obtenus" : selected.image ? "À découvrir en booster" : "Visuel indisponible · carte non distribuée"}</p></div>
    </dialog> : null}
  </main>;
}
