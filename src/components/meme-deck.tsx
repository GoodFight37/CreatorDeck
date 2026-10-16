"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { CloudApi, CloudError } from "@/lib/cloud/api";
import type { MemeOpening, MemeStatus } from "@/lib/cloud/api/memes";
import { cloudConfig } from "@/lib/cloud/config";
import { deviceStorage } from "@/lib/storage";
import { MEME_BY_ID, MEME_CARDS, MEME_RARITY, type MemeCard as MemeCardData, type MemeRarity } from "@/lib/memes";
import { MemeCard } from "@/components/meme-card";
import { MemeReveal } from "@/components/meme-reveal";
import { PackTear } from "@/components/pack-tear";
import { buzz } from "@/lib/haptics";
import { PACK_TEAR_HAPTIC } from "@/lib/reveal";
import { playPackOpening } from "@/lib/sfx";
import "./meme-deck.css";
import "./meme-reveal.css";

const PAGE_SIZE = 12;
const PENDING_PREFIX = "creatordeck.meme.pending:";
type Filter = "all" | "owned";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Les Mèmes ne répondent pas. Réessaie.";
}

function countdown(nextAt: string | null, now: number) {
  if (!nextAt) return "Réserve pleine";
  if (!now) return "…";
  const left = Math.max(0, Date.parse(nextAt) - now);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1_000);
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function MemeDeck() {
  const [api, setApi] = useState<CloudApi | null>(null);
  const [account, setAccount] = useState(false);
  const [status, setStatus] = useState<MemeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [opening, setOpening] = useState<MemeOpening | null>(null);
  const [tearing, setTearing] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [presentationReturnFocus, setPresentationReturnFocus] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<MemeCardData | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [rarity, setRarity] = useState<MemeRarity | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(0);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const inspectRef = useRef<HTMLDialogElement>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    const config = cloudConfig();
    if (!config) return;
    const client = new CloudApi(config, deviceStorage());
    queueMicrotask(() => {
      setApi(client);
      setAccount(Boolean(client.session()));
    });
    if (client.session()) void client.memeStatus().then(setStatus).catch((error) => setProblem(errorText(error)));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!api || !status?.nextAt || status.stock >= 4 || now < Date.parse(status.nextAt)) return;
    let active = true;
    void api.memeStatus().then((fresh) => { if (active) setStatus(fresh); }).catch(() => {});
    return () => { active = false; };
  }, [api, status, now]);
  useEffect(() => {
    const dialog = inspectRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);

  const copies = useMemo(() => new Map(status?.owned.map((entry) => [entry.id, entry.copies]) ?? []), [status]);
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
  const pulled = opening?.cards.map((id) => MEME_BY_ID.get(id)).filter((card): card is MemeCardData => Boolean(card)) ?? [];

  async function openPack() {
    if (!api || busy || tearing || pendingRef.current) return;
    const session = api.session();
    if (!session) { setProblem("Connecte-toi depuis Toi pour conserver tes cartes Mèmes."); return; }
    pendingRef.current = true;
    setBusy(true);
    setProblem("");
    setOpening(null);
    setExtracted(false);
    setPresentationReturnFocus(openButtonRef.current);
    setTearing(true);
    const key = PENDING_PREFIX + session.userId;
    try {
      const requestId = deviceStorage()?.getItem(key) ?? crypto.randomUUID();
      deviceStorage()?.setItem(key, requestId);
      const result = await api.openMemePack(requestId);
      if (result.cards.some((id) => !MEME_BY_ID.has(id))) throw new Error("Une carte du booster manque au catalogue. Recharge la page.");
      const next = await api.memeStatus();
      setStatus(next);
      setOpening(result);
      deviceStorage()?.removeItem(key);
    } catch (error) {
      // Une réponse réseau perdue peut cacher un tirage validé : conserver la
      // même clé et récupérer ce tirage au prochain appui.
      if (error instanceof CloudError && error.status >= 400 && error.status < 500) deviceStorage()?.removeItem(key);
      setProblem(errorText(error));
      setTearing(false);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return <main className="meme-world">
    <header className="meme-world-head"><Link href="/"><ArrowLeft size={18} aria-hidden="true" /> Drop</Link><span>UNIVERS 02</span></header>
    <section className="meme-hero" aria-labelledby="meme-heading">
      <p className="meme-eyebrow">COLLECTION MÈMES FR</p><h1 id="meme-heading">MÈMES</h1>
      <div className="meme-pack-scene"><div className="meme-pack-floor" aria-hidden="true" />
        <div className="meme-pack-object" aria-hidden="true" /></div>
      <p className="meme-hero-line">5 cartes · 1 Rare ou mieux</p>
      <button ref={openButtonRef} className="meme-open" type="button" disabled={!api || !account || !status || status.stock < 1 || busy || tearing}
        onClick={() => void openPack()}>{busy ? "OUVERTURE…" : "OUVRIR UN BOOSTER"}</button>
      <p className="meme-status" aria-live="polite">{status
        ? String(status.stock) + " booster(s) prêts · " + countdown(status.nextAt, now)
        : account ? "Lecture de ta réserve…" : "Connecte-toi dans Toi pour ouvrir et conserver tes cartes."}</p>
      {problem ? <p className="meme-problem" role="alert">{problem}</p> : null}
      {!account ? <Link className="meme-account-link" href="/">Retourner au jeu pour se connecter</Link> : null}
      <details className="meme-rates"><summary>Composition du booster</summary><p>Trois communes, une carte variable et une Rare ou mieux. Sur la dernière carte : Rare 82 %, Épique 15 %, Légendaire 2,5 %, Mythique 0,5 %. Réserve séparée : quatre boosters au maximum, un toutes les 30 minutes.</p></details>
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
      <nav className="meme-pager" aria-label="Pages du classeur Mèmes">
        <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={currentPage === 0}><ChevronLeft size={18} aria-hidden="true" /> Précédente</button>
        <span>{currentPage + 1} / {pageCount}</span>
        <button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1}>Suivante <ChevronRight size={18} aria-hidden="true" /></button>
      </nav>
      <p className="meme-credit">Cartes issues de MyMemeCards. Illustrations créditées sur chaque fiche lorsqu’un auteur est indiqué.</p>
    </section>
    {tearing ? <PackTear artwork="/packs/memes-opening.svg" returnFocusTo={presentationReturnFocus}
      onTear={() => { playPackOpening(); buzz(PACK_TEAR_HAPTIC); }} onComplete={() => setExtracted(true)}>
      {opening && extracted && pulled.length === 5 ? <MemeReveal cards={pulled} copies={copies}
        onClose={() => { setTearing(false); setOpening(null); setExtracted(false); }} /> : null}
    </PackTear> : null}
    {selected ? <dialog className="meme-dialog meme-inspect" ref={inspectRef} onClose={() => setSelected(null)}
      aria-label={"Carte " + selected.name}>
      <button className="meme-close" type="button" onClick={() => setSelected(null)} aria-label="Fermer"><X aria-hidden="true" /></button>
      <MemeCard card={selected} copies={copies.get(selected.id) ?? 0} interactiveFoil />
      <div className="meme-inspect-copy"><p className="meme-eyebrow">#{String(selected.number).padStart(3, "0")} · {MEME_RARITY[selected.rarity].label}{selected.fullArt ? " · Full Art" : ""}</p>
        <h2>{selected.name}</h2>{selected.flavor ? <p>{selected.flavor}</p> : null}
        <small>{selected.credit ? "Source : " + selected.credit + " · " : ""}MyMemeCards{selected.year ? " · " + selected.year : ""}</small>
        <p>{copies.has(selected.id) ? String(copies.get(selected.id)) + " exemplaire(s) obtenus" : selected.image ? "À découvrir en booster" : "Visuel indisponible · carte non distribuée"}</p></div>
    </dialog> : null}
  </main>;
}
