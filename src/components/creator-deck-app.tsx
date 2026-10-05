"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  Archive,
  BadgeInfo,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ClipboardCopy,
  ClipboardPaste,
  Clock3,
  Coins,
  Gem,
  Hammer,
  Home,
  Hourglass,
  Layers3,
  LoaderCircle,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { AtelierView } from "@/components/atelier-view";
import { CreatorCard } from "@/components/creator-card";
import { PackOddsSheet } from "@/components/pack-odds-sheet";
import { SeasonsSection } from "@/components/seasons-section";
import { useGame, useNow } from "@/hooks/use-game";
import {
  CREATORS,
  CREATOR_BY_SLUG,
  PACKS,
  RARITY_META,
  creatorImage,
  type CardVariant,
  type PackType,
  type Rarity,
} from "@/lib/catalog";
import { getGameView, type DrawnCard, type GameView } from "@/lib/game-engine";
import { gameStore } from "@/lib/game-store";

type GameState = GameView;
type Tab = "home" | "collection" | "missions" | "atelier" | "profile";
type CollectionFilter = "all" | "owned" | Rarity;

/** Délai avant la révélation : donne un temps « d'ouverture » au booster. */
const OPENING_DELAY_MS = 650;

const RARITY_COUNTS = CREATORS.reduce<Record<Rarity, number>>(
  (acc, creator) => {
    acc[creator.rarity] += 1;
    return acc;
  },
  { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
);

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCountdown(date: number | null, now: number) {
  if (!date) return "Réserve pleine";
  const remaining = Math.max(0, date - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function LoadingScreen() {
  return (
    <main className="app-shell loading-screen">
      <div className="brand-mark large" aria-hidden="true">
        <span>CD</span>
      </div>
      <LoaderCircle className="spin" size={26} />
      <p>Préparation du Top 500 Twitch FR…</p>
    </main>
  );
}

function TopBar({ game }: { game: GameState }) {
  const levelBase = Math.max(0, (game.player.level - 1) * 100);
  const levelProgress = Math.min(
    100,
    ((game.player.xp - levelBase) / Math.max(100, game.player.xpNext - levelBase)) * 100,
  );
  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <span>CD</span>
        </div>
        <div>
          <strong>CreatorDeck</strong>
          <small>Top 500 Twitch FR · S01</small>
        </div>
      </div>
      <div className="top-actions">
        <div className="currency-chip" title="Sabliers">
          <Hourglass size={14} />
          <b>{game.player.hourglasses}</b>
        </div>
        <div className="currency-chip warm" title="Points de collection">
          <Coins size={14} />
          <b>{formatNumber(game.player.points)}</b>
        </div>
        <div className="level-chip" title={`Niveau ${game.player.level}`}>
          <span>{game.player.level}</span>
          <i style={{ width: `${levelProgress}%` }} />
        </div>
      </div>
    </header>
  );
}

function PackArtwork({ packType }: { packType: PackType }) {
  const people =
    packType === "live"
      ? [CREATORS[0], CREATORS[1], CREATORS[2]]
      : [CREATORS[5], CREATORS[6], CREATORS[7]];
  return (
    <div className={`pack-artwork pack-${packType}`}>
      <div className="pack-noise" />
      <div className="pack-orbit one" />
      <div className="pack-orbit two" />
      <div className="pack-people">
        {people.map((creator, index) => (
          <Image
            key={creator.slug}
            src={creatorImage(creator)}
            alt=""
            width={92}
            height={122}
            style={{ "--person-index": index } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="pack-brand">
        <span>CREATOR</span>
        <strong>DECK</strong>
      </div>
      <div className="pack-edition">
        {packType === "live" ? <Radio size={13} /> : <Archive size={13} />}
        {packType === "live" ? "TOP 500 LIVE" : "ARCHIVES 500"}
      </div>
      <small>{PACKS[packType].size} CARTES</small>
    </div>
  );
}

function HomeView({
  game,
  selectedPack,
  setSelectedPack,
  onOpen,
  onUseHourglass,
  onShowOdds,
  opening,
  usingHourglass,
  now,
}: {
  game: GameState;
  selectedPack: PackType;
  setSelectedPack: (pack: PackType) => void;
  onOpen: () => void;
  onUseHourglass: () => void;
  onShowOdds: () => void;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
}) {
  const pack = PACKS[selectedPack];
  const stock =
    selectedPack === "live" ? game.player.livePacks : game.player.archivePacks;
  const nextAt =
    selectedPack === "live" ? game.player.nextLiveAt : game.player.nextArchiveAt;
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, 4);

  return (
    <div className="view home-view">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">ÉDITION TOP 500 FR</p>
          <h1>Prêt pour un nouveau drop&nbsp;?</h1>
        </div>
        <div className="season-badge">
          <Trophy size={15} />
          <span>500 Cartes</span>
        </div>
      </section>

      <div className="pack-tabs" role="tablist" aria-label="Choix du booster">
        {(["live", "archive"] as PackType[]).map((type) => {
          const amount = type === "live" ? game.player.livePacks : game.player.archivePacks;
          return (
            <button
              key={type}
              className={selectedPack === type ? "active" : ""}
              onClick={() => setSelectedPack(type)}
              role="tab"
              aria-selected={selectedPack === type}
            >
              {type === "live" ? <Radio size={15} /> : <Archive size={15} />}
              <span>{PACKS[type].label}</span>
              <b>{amount}</b>
            </button>
          );
        })}
      </div>

      <section className={`pack-stage stage-${selectedPack}`}>
        <div className="stage-glow" />
        <div className="pack-shadow" />
        <PackArtwork packType={selectedPack} />
        <div className="pack-copy">
          <p>{pack.eyebrow}</p>
          <h2>{pack.label}</h2>
          <span>{pack.description}</span>
        </div>
      </section>

      <section className="open-panel">
        <div className="stock-row">
          <div>
            <span>Disponibles</span>
            <strong>
              {stock}<small>/{pack.max}</small>
            </strong>
          </div>
          <div className="timer-copy">
            <Clock3 size={14} />
            <span>{formatCountdown(nextAt, now)}</span>
          </div>
        </div>
        <button
          className="primary-action"
          onClick={onOpen}
          disabled={stock <= 0 || opening}
        >
          {opening ? <LoaderCircle className="spin" size={19} /> : <Zap size={19} />}
          <span>{stock > 0 ? "Ouvrir le booster" : "Recharge en cours"}</span>
          {stock > 0 ? <ChevronRight size={19} /> : null}
        </button>
        <button
          className="secondary-action"
          onClick={onUseHourglass}
          disabled={stock >= pack.max || game.player.hourglasses <= 0 || usingHourglass}
        >
          <Hourglass size={15} />
          <span>
            Utiliser 1 sablier ({game.player.hourglasses} disp.) · retire{" "}
            {selectedPack === "live" ? "15 min" : "1 h"}
          </span>
        </button>
        <div className="guarantee-row">
          <ShieldCheck size={14} />
          <span>
            {selectedPack === "live"
              ? "1 variante Live garantie · aucun doublon interne"
              : "1 Rare ou mieux garantie · chance de Gold"}
          </span>
        </div>
        <button type="button" className="odds-link" onClick={onShowOdds}>
          <BadgeInfo size={15} />
          <span>Taux de drop publiés</span>
          <ChevronRight size={15} />
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TON CLASSEUR</p>
            <h2>Dernières trouvailles</h2>
          </div>
          <span className="completion-pill">
            {game.stats.uniqueCreators}/{CREATORS.length}
          </span>
        </div>
        {latest.length ? (
          <div className="mini-card-row">
            {latest.map((card) => {
              const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
              return creator ? (
                <CreatorCard
                  key={card.id}
                  creator={creator}
                  variant={card.variant}
                  compact
                />
              ) : null;
            })}
          </div>
        ) : (
          <div className="empty-collection">
            <Layers3 size={25} />
            <div>
              <strong>Ton classeur de 500 streameurs t’attend</strong>
              <span>Ouvre ton premier booster pour lancer la collection.</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CollectionView({ game }: { game: GameState }) {
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 30;

  const owned = useMemo(() => {
    const map = new Map<
      string,
      { count: number; bestVariant: CardVariant; variants: Set<CardVariant> }
    >();
    const variantScore: Record<CardVariant, number> = {
      standard: 1,
      live: 2,
      holo: 3,
      gold: 4,
    };
    for (const card of game.cards) {
      const value = map.get(card.creatorSlug) ?? {
        count: 0,
        bestVariant: "standard" as CardVariant,
        variants: new Set<CardVariant>(),
      };
      value.count += 1;
      value.variants.add(card.variant);
      if (variantScore[card.variant] > variantScore[value.bestVariant]) {
        value.bestVariant = card.variant;
      }
      map.set(card.creatorSlug, value);
    }
    return map;
  }, [game.cards]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase("fr").trim();
    return CREATORS.filter((creator) => {
      if (q) {
        const hay = `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr");
        if (!hay.includes(q)) return false;
      }
      if (filter === "owned") return owned.has(creator.slug);
      if (filter !== "all") return creator.rarity === filter;
      return true;
    });
  }, [filter, owned, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visibleCreators = filtered.slice(
    safePage * perPage,
    (safePage + 1) * perPage,
  );
  const progress = Math.round((game.stats.uniqueCreators / CREATORS.length) * 100);

  return (
    <div className="view collection-view">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">TOP 500 TWITCH FR</p>
          <h1>Mon classeur</h1>
        </div>
        <div className="collection-score">
          <strong>{progress}%</strong>
          <span>complété</span>
        </div>
      </section>

      <div className="progress-track large">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="collection-meta">
        <span>{game.stats.uniqueCreators} / {CREATORS.length} streameurs découverts</span>
        <span>{game.stats.totalCards} cartes obtenues</span>
      </div>

      <label className="search-field">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Rechercher un streameur, rang (#1 à #500) ou jeu…"
          aria-label="Rechercher un créateur"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              setPage(0);
            }}
            aria-label="Effacer la recherche"
          >
            <X size={15} />
          </button>
        ) : null}
      </label>

      <div className="filter-chips" aria-label="Filtres de collection">
        {(
          [
            ["all", `Toutes (${CREATORS.length})`],
            ["owned", `Obtenues (${game.stats.uniqueCreators})`],
            ["legendary", `Légendaires (${RARITY_COUNTS.legendary})`],
            ["epic", `Épiques (${RARITY_COUNTS.epic})`],
            ["rare", `Rares (${RARITY_COUNTS.rare})`],
            ["uncommon", `Peu communes (${RARITY_COUNTS.uncommon})`],
            ["common", `Communes (${RARITY_COUNTS.common})`],
          ] as [CollectionFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="binder-pager">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage <= 0}
        >
          <ChevronLeft size={15} />
          <span>Précédent</span>
        </button>
        <span>
          Page <strong>{safePage + 1}</strong> / {totalPages} · {filtered.length} cartes
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          <span>Suivant</span>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="collection-grid">
        {visibleCreators.map((creator) => {
          const item = owned.get(creator.slug);
          return (
            <CreatorCard
              key={creator.slug}
              creator={creator}
              variant={item?.bestVariant}
              count={item?.count}
              locked={!item}
              compact
            />
          );
        })}
      </div>
      {!filtered.length ? (
        <div className="no-results">Aucune carte ne correspond à ce filtre.</div>
      ) : null}
    </div>
  );
}

function MissionRow({
  icon,
  label,
  detail,
  progress,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  progress: number;
  target: number;
}) {
  const done = progress >= target;
  const percent = Math.min(100, Math.round((progress / target) * 100));
  return (
    <article className={`mission-row ${done ? "done" : ""}`}>
      <div className="mission-icon">{done ? <Check size={19} /> : icon}</div>
      <div className="mission-content">
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
        </div>
        <div className="mission-progress-copy">
          <b>{Math.min(progress, target)}</b>/{target}
        </div>
        <div className="progress-track">
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  );
}

function MissionsView({
  game,
  onClaimSeason,
}: {
  game: GameState;
  onClaimSeason: (seasonId: string) => void;
}) {
  return (
    <div className="view missions-view">
      <section className="page-title-row">
        <div>
          <p className="eyebrow">OBJECTIFS TOP 500</p>
          <h1>Progression</h1>
        </div>
        <div className="streak-pill">
          <Zap size={14} />
          <span>Niveau {game.player.level}</span>
        </div>
      </section>

      <section className="mission-hero">
        <div className="mission-hero-icon">
          <Trophy size={27} />
        </div>
        <div>
          <span>Collection Top 500 Twitch FR</span>
          <strong>{game.stats.uniqueCreators} / {CREATORS.length}</strong>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.round((game.stats.uniqueCreators / CREATORS.length) * 100)}%`,
              }}
            />
          </div>
          {game.stats.rareDrops > 0 ? (
            <span className="perfect-count">
              <Sparkles size={11} />
              {game.stats.rareDrops} carte{game.stats.rareDrops > 1 ? "s" : ""} obtenue
              {game.stats.rareDrops > 1 ? "s" : ""} en booster Perfect
            </span>
          ) : null}
        </div>
      </section>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">PARCOURS</p>
          <h2>Objectifs du collectionneur</h2>
        </div>
      </div>
      <div className="mission-list">
        <MissionRow
          icon={<Layers3 size={19} />}
          label="Premier drop"
          detail="Ouvrir un booster"
          progress={game.stats.openings}
          target={1}
        />
        <MissionRow
          icon={<BookOpen size={19} />}
          label="Début du classeur"
          detail="Découvrir 25 streameurs du Top 500"
          progress={game.stats.uniqueCreators}
          target={25}
        />
        <MissionRow
          icon={<Gem size={19} />}
          label="Chasseur de cartes"
          detail="Découvrir 100 streameurs du Top 500"
          progress={game.stats.uniqueCreators}
          target={100}
        />
        <MissionRow
          icon={<Sparkles size={19} />}
          label="Maître du Twitch Game"
          detail="Compléter les 500 streameurs francophones"
          progress={game.stats.uniqueCreators}
          target={500}
        />
      </div>

      <SeasonsSection seasons={game.seasons} onClaim={onClaimSeason} />
    </div>
  );
}

function ProfileView({
  game,
  onNotice,
  onError,
  onShowOdds,
}: {
  game: GameState;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onShowOdds: () => void;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState<string | null>(null);

  async function handleExport() {
    const json = gameStore.exportSave();
    try {
      await navigator.clipboard.writeText(json);
      setExportText(null);
      onNotice("Sauvegarde copiée dans le presse-papiers.");
    } catch {
      // Presse-papiers indisponible (permission, WebView ancienne) : on affiche
      // le texte pour une copie manuelle.
      setExportText(json);
    }
  }

  function handleImport() {
    try {
      gameStore.importSave(importText);
      setImportText("");
      setImportOpen(false);
      onNotice("Sauvegarde importée. Bon retour dans ton classeur !");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Import impossible.");
    }
  }

  function handleReset() {
    if (!window.confirm("Réinitialiser la progression ? Toutes tes cartes seront perdues.")) {
      return;
    }
    gameStore.reset();
    setExportText(null);
    setImportOpen(false);
    onNotice("Nouvelle partie lancée.");
  }

  return (
    <div className="view profile-view">
      <section className="profile-card">
        <div className="profile-avatar">
          <span>{game.player.level}</span>
        </div>
        <div>
          <p className="eyebrow">COLLECTIONNEUR</p>
          <h1>Mon profil</h1>
          <span>Édition Top 500 Twitch FR</span>
        </div>
      </section>

      <div className="stats-grid">
        <article>
          <Layers3 size={18} />
          <strong>{game.stats.totalCards}</strong>
          <span>cartes</span>
        </article>
        <article>
          <BookOpen size={18} />
          <strong>{game.stats.uniqueCreators}/{CREATORS.length}</strong>
          <span>streameurs</span>
        </article>
        <article>
          <Zap size={18} />
          <strong>{game.stats.openings}</strong>
          <span>boosters</span>
        </article>
      </div>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">SAUVEGARDE</p>
          <h2>Ta progression reste sur cet appareil</h2>
        </div>
      </div>
      <section className="settings-list" aria-label="Gestion de la sauvegarde">
        <div className="settings-row">
          <span className="settings-icon green"><WifiOff size={17} /></span>
          <div>
            <strong>Jeu 100 % hors ligne</strong>
            <span>Aucun compte, aucune connexion : tout est stocké localement.</span>
          </div>
          <Check size={18} className="success-icon" />
        </div>
        <button type="button" className="settings-row settings-action" onClick={onShowOdds}>
          <span className="settings-icon purple"><BadgeInfo size={17} /></span>
          <div>
            <strong>Taux de drop publiés</strong>
            <span>Les probabilités de chaque booster, calculées depuis les tables de tirage.</span>
          </div>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="settings-row settings-action" onClick={() => void handleExport()}>
          <span className="settings-icon blue"><ClipboardCopy size={17} /></span>
          <div>
            <strong>Copier ma sauvegarde</strong>
            <span>Pour la transférer sur un autre téléphone ou la garder au chaud.</span>
          </div>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="settings-row settings-action"
          onClick={() => setImportOpen((open) => !open)}
          aria-expanded={importOpen}
        >
          <span className="settings-icon purple"><ClipboardPaste size={17} /></span>
          <div>
            <strong>Importer une sauvegarde</strong>
            <span>Colle le texte copié depuis l’autre appareil.</span>
          </div>
          <ChevronRight size={16} style={{ transform: importOpen ? "rotate(90deg)" : undefined }} />
        </button>
        {importOpen ? (
          <div className="save-editor">
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder='{ "version": 1, "playerId": "…" }'
              aria-label="Sauvegarde à importer"
              rows={5}
              spellCheck={false}
            />
            <button
              type="button"
              className="secondary-action"
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              <ClipboardPaste size={15} />
              <span>Remplacer ma progression par cette sauvegarde</span>
            </button>
          </div>
        ) : null}
        {exportText ? (
          <div className="save-editor">
            <p>Copie manuelle : sélectionne tout le texte ci-dessous.</p>
            <textarea value={exportText} readOnly rows={5} aria-label="Sauvegarde exportée" onFocus={(event) => event.currentTarget.select()} />
          </div>
        ) : null}
        <button type="button" className="settings-row settings-action danger" onClick={handleReset}>
          <span className="settings-icon red"><RotateCcw size={17} /></span>
          <div>
            <strong>Réinitialiser la progression</strong>
            <span>Repart de zéro avec les boosters de départ.</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}

function RevealOverlay({
  cards,
  index,
  onNext,
  onClose,
}: {
  cards: DrawnCard[];
  index: number;
  onNext: () => void;
  onClose: () => void;
}) {
  const card = cards[index];
  const creator = card ? CREATOR_BY_SLUG.get(card.creatorSlug) : undefined;
  if (!card || !creator) return null;
  const isLast = index === cards.length - 1;
  const perfect = cards[0]?.rareDrop;
  return (
    <div className="reveal-overlay" role="dialog" aria-modal="true" aria-label="Résultat du booster">
      <div className={`reveal-ambient rarity-${card.rarity}`} />
      {perfect ? (
        <div className="perfect-banner" role="status">
          <Sparkles size={13} />
          <span>Booster Perfect : toutes les cartes sont Épique ou mieux !</span>
        </div>
      ) : null}
      <div className="reveal-header">
        <span>{index + 1} / {cards.length}</span>
        <div className="reveal-dots">
          {cards.map((item, dotIndex) => (
            <i key={item.id} className={dotIndex <= index ? "active" : ""} />
          ))}
        </div>
        <button onClick={onClose} aria-label="Fermer"><X size={20} /></button>
      </div>
      <div className="reveal-stage">
        {card.isNew ? <span className="new-badge"><Sparkles size={12} /> NOUVELLE</span> : null}
        <CreatorCard
          key={card.id}
          creator={creator}
          variant={card.variant}
          className="reveal-card"
        />
        <div className="reveal-name">
          <p>#{creator.rank} · {RARITY_META[card.rarity].label}</p>
          <h2>{creator.displayName}</h2>
          <span>{creator.category}</span>
        </div>
      </div>
      <button className="reveal-next" onClick={isLast ? onClose : onNext}>
        <span>{isLast ? "Ranger dans le classeur" : "Révéler la suivante"}</span>
        {isLast ? <BookOpen size={18} /> : <ChevronRight size={18} />}
      </button>
    </div>
  );
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Accueil", icon: <Home size={21} /> },
  { id: "collection", label: "Classeur (500)", icon: <BookOpen size={21} /> },
  { id: "missions", label: "Objectifs", icon: <Target size={21} /> },
  { id: "atelier", label: "Atelier", icon: <Hammer size={21} /> },
  { id: "profile", label: "Profil", icon: <CircleUserRound size={21} /> },
];

export function CreatorDeckApp() {
  const state = useGame();
  const now = useNow(1_000);
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPack, setSelectedPack] = useState<PackType>("live");
  const [opening, setOpening] = useState(false);
  const [usingHourglass, setUsingHourglass] = useState(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);

  // Vue dérivée : la recharge passive est recalculée à chaque tick d'horloge,
  // donc les boosters « arrivent » à l'écran sans action de l'utilisateur.
  const game = useMemo(() => (state ? getGameView(state, now) : null), [state, now]);

  const showError = useCallback((message: string) => {
    setNotice(null);
    setError(message);
  }, []);
  const showNotice = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);

  function handleOpenPack() {
    if (!game || opening) return;
    setOpening(true);
    setError(null);
    // Petit délai volontaire : le tirage est instantané en local, mais la
    // révélation mérite son moment de suspense.
    window.setTimeout(() => {
      try {
        const cards = gameStore.openPack(selectedPack);
        setDrawnCards(cards);
        setRevealIndex(0);
      } catch (caught) {
        showError(caught instanceof Error ? caught.message : "Ouverture impossible.");
      } finally {
        setOpening(false);
      }
    }, OPENING_DELAY_MS);
  }

  function handleUseHourglass() {
    if (!game || usingHourglass) return;
    setUsingHourglass(true);
    setError(null);
    try {
      gameStore.useHourglass(selectedPack);
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Impossible d'utiliser un sablier.");
    } finally {
      setUsingHourglass(false);
    }
  }

  function handleClaimSeason(seasonId: string) {
    try {
      gameStore.claimSeason(seasonId);
      const season = game?.seasons.find((entry) => entry.id === seasonId);
      showNotice(
        season
          ? `Saison ${season.id} complétée : +${season.reward.points} points et +${season.reward.hourglasses} sabliers.`
          : "Récompense de saison réclamée.",
      );
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Récompense indisponible.");
    }
  }

  function closeReveal() {
    setDrawnCards([]);
    setRevealIndex(0);
  }

  if (!game) return <LoadingScreen />;

  return (
    <main className="app-shell">
      <TopBar game={game} />
      <div className="app-content">
        {tab === "home" ? (
          <HomeView
            game={game}
            selectedPack={selectedPack}
            setSelectedPack={setSelectedPack}
            onOpen={handleOpenPack}
            onUseHourglass={handleUseHourglass}
            onShowOdds={() => setOddsOpen(true)}
            opening={opening}
            usingHourglass={usingHourglass}
            now={now}
          />
        ) : null}
        {tab === "collection" ? <CollectionView game={game} /> : null}
        {tab === "missions" ? (
          <MissionsView game={game} onClaimSeason={handleClaimSeason} />
        ) : null}
        {tab === "atelier" ? (
          <AtelierView game={game} onNotice={showNotice} onError={showError} />
        ) : null}
        {tab === "profile" ? (
          <ProfileView
            game={game}
            onNotice={showNotice}
            onError={showError}
            onShowOdds={() => setOddsOpen(true)}
          />
        ) : null}
      </div>

      <nav className="bottom-nav" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {error ? (
        <div className="toast-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      ) : null}
      {notice ? (
        <div className="toast-error toast-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      ) : null}
      {opening ? (
        <div className="opening-loader" aria-live="polite">
          <div className="mini-pack"><span>CD</span></div>
          <strong>Scellement du tirage Top 500…</strong>
          <span>{PACKS[selectedPack].size} cartes uniques en préparation.</span>
        </div>
      ) : null}
      {oddsOpen ? <PackOddsSheet onClose={() => setOddsOpen(false)} /> : null}
      {drawnCards.length ? (
        <RevealOverlay
          cards={drawnCards}
          index={revealIndex}
          onNext={() => setRevealIndex((value) => Math.min(value + 1, drawnCards.length - 1))}
          onClose={closeReveal}
        />
      ) : null}
    </main>
  );
}
