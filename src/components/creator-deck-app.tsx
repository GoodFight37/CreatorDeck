"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
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
  Volume2,
  VolumeX,
  FlaskConical,
  Paintbrush,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { AccountSheet, CloudBadge } from "@/components/account-sheet";
import { AtelierView } from "@/components/atelier-view";
import { CreatorCard } from "@/components/creator-card";
import { PackOddsSheet } from "@/components/pack-odds-sheet";
import { PublicProfileSheet } from "@/components/public-profile-sheet";
import { StudioSheet } from "@/components/studio-sheet";
import { ThemeSheet } from "@/components/theme-sheet";
import { SeasonsSection } from "@/components/seasons-section";
import { useCloud, useCloudAutoSync } from "@/hooks/use-cloud";
import { useGame, useNow } from "@/hooks/use-game";
import {
  CATALOG_AUDIENCE,
  CATALOG_EDITION,
  CATALOG_EYEBROW,
  CATALOG_LABEL,
  CATALOG_SIZE,
  CREATORS,
  CREATOR_BY_SLUG,
  PACKS,
  RARITY_META,
  creatorImage,
  type CardVariant,
  type Rarity,
} from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { isMuted, playPackOpening, playReveal, playReward, setMuted } from "@/lib/sfx";
import { getGameView, type DrawnCard, type GameView } from "@/lib/game-engine";
import { THEME_VARS, THEME_VAR_NAMES, type ThemeTokens } from "@/lib/cosmetics";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";

type GameState = GameView;
type Tab = "home" | "collection" | "missions" | "atelier" | "profile";
type CollectionFilter = "all" | "owned" | Rarity;

/** Délai avant la révélation : donne un temps « d'ouverture » au booster. */
const OPENING_DELAY_MS = 650;

/** Jalons de collection, exprimés en part du catalogue (25 puis 100 sur 500). */
const MILESTONES = {
  first: Math.round(CATALOG_SIZE * 0.05),
  half: Math.round(CATALOG_SIZE * 0.2),
};

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
      <p>Préparation du {CATALOG_LABEL}…</p>
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
          <small>{CATALOG_LABEL} · S01</small>
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

function PackArtwork() {
  const people = [CREATORS[0], CREATORS[1], CREATORS[2]];
  return (
    <div className="pack-artwork pack-live">
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
        <Radio size={13} />
        {`TOP ${CATALOG_SIZE} LIVE`}
      </div>
      <small>{PACKS.live.size} CARTES</small>
    </div>
  );
}

function HomeView({
  game,
  onOpen,
  onUseHourglass,
  onShowOdds,
  opening,
  usingHourglass,
  now,
  serverReserve,
  needsAccount,
}: {
  game: GameState;
  onOpen: () => void;
  onUseHourglass: () => void;
  onShowOdds: () => void;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
  /** La réserve vient du serveur : le sablier local ne peut pas l'avancer. */
  serverReserve: boolean;
  /** Build avec cloud sans compte connecté : l'ouverture demande une connexion. */
  needsAccount: boolean;
}) {
  const pack = PACKS.live;
  const stock = game.player.packs;
  const nextAt = game.player.nextPackAt;
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, 4);

  return (
    <div className="view home-view">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{CATALOG_EDITION}</p>
          <h1>Prêt pour un nouveau drop&nbsp;?</h1>
        </div>
        <div className="season-badge">
          <Trophy size={15} />
          <span>{CATALOG_SIZE} Cartes</span>
        </div>
      </section>

      <section className="pack-stage stage-live">
        <div className="stage-glow" />
        <div className="pack-shadow" />
        <PackArtwork />
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
          disabled={opening || (!needsAccount && stock <= 0)}
        >
          {opening ? (
            <LoaderCircle className="spin" size={19} />
          ) : needsAccount ? (
            <CircleUserRound size={19} />
          ) : (
            <Zap size={19} />
          )}
          <span>
            {needsAccount ? "Se connecter pour ouvrir" : stock > 0 ? "Ouvrir le booster" : "Recharge en cours"}
          </span>
          {needsAccount || stock > 0 ? <ChevronRight size={19} /> : null}
        </button>
        <button
          className="secondary-action"
          onClick={onUseHourglass}
          disabled={serverReserve || stock >= pack.max || game.player.hourglasses <= 0 || usingHourglass}
        >
          <Hourglass size={15} />
          <span>
            {serverReserve
              ? "Sablier indisponible : la réserve vient du serveur"
              : `Utiliser 1 sablier (${game.player.hourglasses} disp.) · retire 15 min`}
          </span>
        </button>
        <div className="guarantee-row">
          <ShieldCheck size={14} />
          <span>1 variante Live garantie · 1 Rare ou mieux · aucun doublon interne</span>
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
              <strong>Ton classeur de {CATALOG_SIZE} streameurs t’attend</strong>
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
          <p className="eyebrow">{CATALOG_EYEBROW}</p>
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
          placeholder={`Rechercher un streameur, rang (#1 à #${CATALOG_SIZE}) ou jeu…`}
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
          <p className="eyebrow">OBJECTIFS TOP {CATALOG_SIZE}</p>
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
          <span>Collection {CATALOG_LABEL}</span>
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
          detail={`Découvrir ${MILESTONES.first} streameurs du ${CATALOG_LABEL}`}
          progress={game.stats.uniqueCreators}
          target={25}
        />
        <MissionRow
          icon={<Gem size={19} />}
          label="Chasseur de cartes"
          detail={`Découvrir ${MILESTONES.half} streameurs du ${CATALOG_LABEL}`}
          progress={game.stats.uniqueCreators}
          target={100}
        />
        <MissionRow
          icon={<Sparkles size={19} />}
          label="Maître du Twitch Game"
          detail={`Compléter les ${CATALOG_SIZE} ${CATALOG_AUDIENCE}`}
          progress={game.stats.uniqueCreators}
          target={CATALOG_SIZE}
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
  onShowThemes,
  onShowStudio,
  onShowAccount,
  onShowLeaderboard,
}: {
  game: GameState;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onShowOdds: () => void;
  onShowThemes: () => void;
  onShowStudio: () => void;
  onShowAccount: () => void;
  onShowLeaderboard: () => void;
}) {
  const cloud = useCloud();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState<string | null>(null);
  // Le son vit hors de React (module Web Audio) : l'état local ne sert qu'à
  // afficher le bon libellé et à redessiner le bouton.
  const [soundOn, setSoundOn] = useState(() => !isMuted());

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    // On joue le carillon à l'activation : l'utilisateur entend tout de suite
    // ce qu'il vient de rallumer (et rien s'il coupe).
    if (next) playReward();
  }

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
          <span>{CATALOG_EDITION}</span>
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
          <span className={`settings-icon ${cloud.configured ? "green" : "blue"}`}>
            {cloud.configured ? <CloudBadge /> : <WifiOff size={17} />}
          </span>
          <div>
            {/* Ce libellé s'adapte au build : « 100 % hors ligne » affiché
                quand le cloud est actif faisait croire qu'aucune option en
                ligne n'existait. */}
            <strong>{cloud.configured ? "Cloud disponible" : "Jeu 100 % hors ligne"}</strong>
            <span>
              {cloud.configured
                ? "Compte facultatif : la collection, l'Atelier et les saisons restent jouables sans connexion."
                : "Aucun compte, aucune connexion : tout est stocké localement."}
            </span>
          </div>
          {cloud.configured ? null : <Check size={18} className="success-icon" />}
        </div>
        <button type="button" className="settings-row settings-action" onClick={onShowAccount}>
          <span className={`settings-icon ${cloud.userId ? "green" : "blue"}`}>
            <CloudBadge />
          </span>
          <div>
            <strong>Sauvegarde cloud{cloud.email ? ` · ${cloud.email}` : ""}</strong>
            <span>
              {!cloud.configured
                ? "Non configuré dans cette version : la partie reste sur cet appareil."
                : cloud.userId
                  ? "Compte connecté — envoi automatique et classement mondial."
                  : "Connecte-toi pour retrouver ta collection sur un autre appareil."}
            </span>
          </div>
          <ChevronRight size={16} />
        </button>
        {/* Le classement vit dans l'écran Compte : cette ligne y amène
            directement, plutôt que de laisser le joueur le chercher. */}
        {cloud.configured ? (
          <button type="button" className="settings-row settings-action" onClick={onShowLeaderboard}>
            <span className="settings-icon gold"><Trophy size={17} /></span>
            <div>
              <strong>Classement mondial</strong>
              <span>
                {cloud.userId
                  ? "Cartes uniques, cartes, légendaires et Gold : les quatre tris, avec la fiche de chaque joueur."
                  : "Crée un compte invité pour voir le classement et les fiches des joueurs."}
              </span>
            </div>
            <ChevronRight size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className="settings-row settings-action"
          onClick={toggleSound}
          aria-pressed={soundOn}
        >
          <span className={`settings-icon ${soundOn ? "purple" : "blue"}`}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </span>
          <div>
            <strong>Son {soundOn ? "activé" : "coupé"}</strong>
            <span>
              Ouverture de booster, swipe de carte, palier réclamé — sons synthétisés, rien à
              télécharger.
            </span>
          </div>
          <Check size={18} className={soundOn ? "success-icon" : "muted-icon"} />
        </button>
        <button type="button" className="settings-row settings-action" onClick={onShowOdds}>
          <span className="settings-icon purple"><BadgeInfo size={17} /></span>
          <div>
            <strong>Taux de drop publiés</strong>
            <span>Les probabilités de chaque booster, calculées depuis les tables de tirage.</span>
          </div>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="settings-row settings-action" onClick={onShowStudio}>
          <span className="settings-icon green"><FlaskConical size={17} /></span>
          <div>
            <strong>Studio de tirages</strong>
            <span>Ouvre 25, 100 ou 500 boosters en mémoire et compare aux taux publiés.</span>
          </div>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="settings-row settings-action" onClick={onShowThemes}>
          <span className="settings-icon purple"><Paintbrush size={17} /></span>
          <div>
            <strong>Thème du classeur</strong>
            <span>
              {game.themes.filter((theme) => theme.unlocked).length}/{game.themes.length} thèmes
              débloqués par les emblèmes de saison.
            </span>
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
          <span>{regionLabel(creator.region)}</span>
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
  { id: "collection", label: `Classeur (${CATALOG_SIZE})`, icon: <BookOpen size={21} /> },
  { id: "missions", label: "Objectifs", icon: <Target size={21} /> },
  { id: "atelier", label: "Atelier", icon: <Hammer size={21} /> },
  { id: "profile", label: "Profil", icon: <CircleUserRound size={21} /> },
];

export function CreatorDeckApp() {
  const state = useGame();
  const cloud = useCloud();
  const now = useNow(1_000);
  const [tab, setTab] = useState<Tab>("home");
  const [opening, setOpening] = useState(false);
  const [usingHourglass, setUsingHourglass] = useState(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Raccourci affiché dans le bandeau d'erreur (« Mon compte »).
  const [errorHint, setErrorHint] = useState<"account" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountFocus, setAccountFocus] = useState<"leaderboard" | null>(null);

  // Envoi automatique (débounce) quand un compte est connecté : aucun appel
  // réseau sinon, la partie reste strictement locale.
  useCloudAutoSync();

  // Lien de partage : `?profil=<identifiant>` ouvre la fiche publique au
  // démarrage. C'est la seule forme de « route publique » possible sans
  // serveur — l'export statique ne peut pas fabriquer une page par joueur.
  // Le serveur reste juge : sans cloud configuré, l'écran le dit simplement.
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("profil");
    if (target) void cloudStore.openProfile(target);
  }, []);

  // Vue dérivée : la recharge passive est recalculée à chaque tick d'horloge,
  // donc les boosters « arrivent » à l'écran sans action de l'utilisateur.
  const game = useMemo(() => (state ? getGameView(state, now) : null), [state, now]);

  const showError = useCallback((message: string, hint: "account" | null = null) => {
    setNotice(null);
    setError(message);
    setErrorHint(hint);
  }, []);
  const showNotice = useCallback((message: string) => {
    setError(null);
    setErrorHint(null);
    setNotice(message);
  }, []);

  // Un compte est connecté : la réserve de boosters affichée est celle du
  // serveur (`pack_status()` ne consomme rien, elle recale aussi l'ancre de
  // recharge). Silencieux si le réseau ne répond pas.
  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    void cloudStore.packStatus();
  }, [cloud.configured, cloud.userId]);

  async function handleOpenPack() {
    if (!game || opening) return;
    setOpening(true);
    setError(null);
    setErrorHint(null);
    try {
      // Build sans cloud (dev, tests) : le tirage local reste le comportement,
      // exactement comme avant.
      if (!cloud.configured) {
        // Petit délai volontaire : le tirage est instantané en local, mais la
        // révélation mérite son moment de suspense.
        await new Promise((resolve) => window.setTimeout(resolve, OPENING_DELAY_MS));
        const cards = gameStore.openPack();
        // Le son accompagne le geste, jamais l'attente : c'est l'instant du
        // « wouip » qui compte.
        playPackOpening();
        setDrawnCards(cards);
        setRevealIndex(0);
        return;
      }

      // Cloud configuré : les cartes viennent du serveur, jamais du moteur
      // local — c'est ce qui les rend infalsifiables (prérequis des échanges).
      // Pas de repli silencieux : sans compte ou sans réseau, on n'ouvre pas.
      if (!cloud.userId) {
        showError("Connecte-toi pour ouvrir un booster.", "account");
        return;
      }

      const outcome = await cloudStore.openPack();
      if (outcome.status === "drawn") {
        // Le son accompagne le geste : il faut un geste utilisateur pour que
        // le navigateur autorise l'audio.
        playPackOpening();
        setDrawnCards(outcome.cards);
        setRevealIndex(0);
        return;
      }
      if (outcome.reason === "offline" || outcome.reason === "no-session") {
        showError(outcome.message, "account");
        return;
      }
      showError(outcome.message);
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Ouverture impossible.");
    } finally {
      setOpening(false);
    }
  }

  function handleUseHourglass() {
    if (!game || usingHourglass) return;
    setUsingHourglass(true);
    setError(null);
    try {
      gameStore.useHourglass();
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Impossible d'utiliser un sablier.");
    } finally {
      setUsingHourglass(false);
    }
  }

  // Une carte se révèle → son propre son. La première carte est accompagnée du
  // son du paquet (index 0) : pas de doublon, pas d'accord qui se superpose.
  useEffect(() => {
    if (!drawnCards.length || revealIndex === 0) return;
    const card = drawnCards[revealIndex];
    if (card) playReveal(card.rarity, card.variant);
  }, [drawnCards, revealIndex]);

  function handleClaimSeason(seasonId: string) {
    // La vue d'avant le clic décrit exactement ce qui vient d'être crédité.
    const before = game?.seasons.find((entry) => entry.id === seasonId);
    try {
      gameStore.claimSeason(seasonId);
      const parts = [
        before && before.claimablePoints > 0 ? `+${before.claimablePoints} points` : "",
        before && before.claimableHourglasses > 0 ? `+${before.claimableHourglasses} sabliers` : "",
        before && before.claimable > 1 ? `${before.claimable} paliers` : "",
      ].filter(Boolean);
      const emblem = before?.tiers.some((tier) => tier.emblem && !tier.claimed && tier.unlocked);
      playReward();
      showNotice(
        before
          ? `Saison ${before.id} : ${parts.join(", ") || "récompense réclamée"}${emblem ? " — emblème obtenu !" : ""}`
          : "Récompense de saison réclamée.",
      );
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Récompense indisponible.");
    }
  }

  // Le thème est un jeu de variables CSS : aucun asset, changement instantané.
  const activeThemeId = game?.themes.find((theme) => theme.equipped)?.id ?? null;
  useEffect(() => {
    const root = document.documentElement;
    const theme = game?.themes.find((entry) => entry.id === activeThemeId);
    // Toute la palette est écrite (fond, panneaux, textes, accents) : retirer un
    // jeton suffit à revenir au thème d'origine défini dans `globals.css`.
    for (const name of THEME_VARS) root.style.removeProperty(name);
    if (!theme) return;
    for (const [token, name] of Object.entries(THEME_VAR_NAMES)) {
      root.style.setProperty(name, theme.tokens[token as keyof typeof THEME_VAR_NAMES]);
    }
  }, [game?.themes, activeThemeId]);

  function handleEquipTheme(themeId: string) {
    try {
      gameStore.equipTheme(themeId);
      showNotice("Thème appliqué au classeur.");
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Thème indisponible.");
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
            onOpen={() => void handleOpenPack()}
            onUseHourglass={handleUseHourglass}
            onShowOdds={() => setOddsOpen(true)}
            opening={opening}
            usingHourglass={usingHourglass}
            now={now}
            serverReserve={cloud.configured}
            needsAccount={cloud.configured && !cloud.userId}
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
            onShowThemes={() => setThemeOpen(true)}
            onShowStudio={() => setStudioOpen(true)}
            onShowAccount={() => {
              setAccountFocus(null);
              setAccountOpen(true);
            }}
            onShowLeaderboard={() => {
              setAccountFocus("leaderboard");
              setAccountOpen(true);
            }}
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
          <div className="toast-actions">
            {errorHint === "account" ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  setError(null);
                  setErrorHint(null);
                  setAccountOpen(true);
                }}
              >
                Mon compte
              </button>
            ) : null}
            <button
              onClick={() => {
                setError(null);
                setErrorHint(null);
              }}
              aria-label="Fermer"
            >
              <X size={15} />
            </button>
          </div>
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
          <strong>Scellement du tirage {CATALOG_LABEL}…</strong>
          <span>{PACKS.live.size} cartes uniques en préparation.</span>
        </div>
      ) : null}
      {oddsOpen ? <PackOddsSheet onClose={() => setOddsOpen(false)} /> : null}
      {studioOpen ? <StudioSheet onClose={() => setStudioOpen(false)} /> : null}
      {accountOpen ? (
        <AccountSheet
          focus={accountFocus}
          onClose={() => {
            setAccountOpen(false);
            setAccountFocus(null);
          }}
        />
      ) : null}
      {cloud.profile || cloud.profileBusy ? <PublicProfileSheet /> : null}
      {themeOpen && game ? (
        <ThemeSheet
          themes={game.themes}
          onEquip={handleEquipTheme}
          onClose={() => setThemeOpen(false)}
        />
      ) : null}
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
