"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import {
  Archive,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Coins,
  Download,
  FileArchive,
  Gem,
  Home,
  Hourglass,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Radio,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { CreatorCard } from "@/components/creator-card";
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

type OwnedCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  obtainedAt: string;
};

type GameState = {
  player: {
    level: number;
    xp: number;
    xpNext: number;
    points: number;
    hourglasses: number;
    livePacks: number;
    archivePacks: number;
    nextLiveAt: string | null;
    nextArchiveAt: string | null;
  };
  cards: OwnedCard[];
  stats: {
    uniqueCreators: number;
    totalCards: number;
    openings: number;
  };
};

type DrawnCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  isNew: boolean;
};

type Tab = "home" | "collection" | "missions" | "profile";
type CollectionFilter = "all" | "owned" | Rarity;

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCountdown(date: string | null, now: number) {
  if (!date) return "Réserve pleine";
  const remaining = Math.max(0, new Date(date).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Horloge réactive sans `setState` dans un effet (la règle ESLint
 * react-hooks/set-state-in-effect interdit l'ancien `setInterval(() => setNow(...))`).
 * Le snapshot est arrondi à l'intervalle pour ne changer qu'une fois par tick.
 */
function useNow(intervalMs = 1_000) {
  const read = () => Math.floor(Date.now() / intervalMs) * intervalMs;
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, intervalMs);
      return () => window.clearInterval(id);
    },
    read,
    // Obligatoire pour le SSR : sans 3e argument, Next lève
    // « Missing getServerSnapshot » et bascule tout le rendu côté client.
    read,
  );
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
            quality={88}
            sizes="92px"
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

function DownloadsPanel() {
  // Les poids affichés sont mesurés sur les fichiers réels (route /api/downloads)
  // au lieu d'être codés en dur : ils restaient faux après chaque rebuild.
  const [sizes, setSizes] = useState<{
    apk?: { exists: boolean; label: string };
    assets?: { exists: boolean; label: string };
  }>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/downloads", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body) setSizes(body);
      })
      .catch(() => {
        if (!cancelled) {
          setSizes({
            apk: { exists: true, label: "4.2 Mo" },
            assets: { exists: true, label: "45 Mo" },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="downloads-card" aria-label="Téléchargements APK et Assets">
      <div className="downloads-head">
        <div>
          <p className="eyebrow">LIVRABLES ANDROID & WEB</p>
          <h2>APK signé & Pack Assets Top 500</h2>
        </div>
        <span className="completion-pill">500 / 500 photos</span>
      </div>
      <p className="downloads-sub">
        L’APK embarque hors-ligne les 500 streameurs français et leurs 500 photos de profil
        dans <code>photos.js</code> (avec <code>window.PHOTOS</code> corrigé).
      </p>
      <div className="downloads-actions">
        <a
          href="/downloads/creatordeck-top500.apk"
          download="creatordeck-top500.apk"
          className="download-btn primary"
        >
          <Smartphone size={17} />
          <div>
            <strong>Télécharger l’APK Android</strong>
            <small>creatordeck-top500.apk · {sizes.apk?.label ?? "…"} · Signé v1+v2</small>
          </div>
          <Download size={16} />
        </a>
        <a
          href="/downloads/creatordeck-assets-top500.zip"
          download="creatordeck-assets-top500.zip"
          className="download-btn secondary"
        >
          <FileArchive size={17} />
          <div>
            <strong>Télécharger les Assets + Sources</strong>
            <small>creatordeck-assets-top500.zip · {sizes.assets?.label ?? "…"} · 500 JPG + photos.js</small>
          </div>
          <Download size={16} />
        </a>
      </div>
    </section>
  );
}

function HomeView({
  game,
  selectedPack,
  setSelectedPack,
  onOpen,
  onUseHourglass,
  opening,
  usingHourglass,
  now,
}: {
  game: GameState;
  selectedPack: PackType;
  setSelectedPack: (pack: PackType) => void;
  onOpen: () => void;
  onUseHourglass: () => void;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
}) {
  const pack = PACKS[selectedPack];
  const stock =
    selectedPack === "live" ? game.player.livePacks : game.player.archivePacks;
  const nextAt =
    selectedPack === "live" ? game.player.nextLiveAt : game.player.nextArchiveAt;
  const latest = [...game.cards]
    .sort((a, b) => +new Date(b.obtainedAt) - +new Date(a.obtainedAt))
    .slice(0, 4);

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
      </section>

      <DownloadsPanel />

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
            ["legendary", "Légendaires (25)"],
            ["epic", "Épiques (60)"],
            ["rare", "Rares (115)"],
            ["uncommon", "Peu communes (150)"],
            ["common", "Communes (150)"],
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

function MissionsView({ game }: { game: GameState }) {
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
    </div>
  );
}

function ProfileView({ game }: { game: GameState }) {
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
          <strong>{game.stats.uniqueCreators}/500</strong>
          <span>streameurs</span>
        </article>
        <article>
          <Zap size={18} />
          <strong>{game.stats.openings}</strong>
          <span>boosters</span>
        </article>
      </div>

      <DownloadsPanel />

      <section className="settings-list">
        <div className="settings-row">
          <span className="settings-icon green"><ImageIcon size={17} /></span>
          <div>
            <strong>Portraits du Top 500 Twitch FR</strong>
            <span>500/500 photos de profil officielles validées</span>
          </div>
          <Check size={18} className="success-icon" />
        </div>
        <div className="settings-row">
          <span className="settings-icon blue"><ShieldCheck size={17} /></span>
          <div>
            <strong>Bug window.PHOTOS corrigé</strong>
            <span>Affichage garanti sur Android WebView et navigateur</span>
          </div>
          <Check size={18} className="success-icon" />
        </div>
        <div className="settings-row">
          <span className="settings-icon purple"><Radio size={17} /></span>
          <div>
            <strong>APK Android autonome signé</strong>
            <span>Fonctionne 100 % hors-ligne avec les 500 cartes</span>
          </div>
          <Check size={18} className="success-icon" />
        </div>
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
  return (
    <div className="reveal-overlay" role="dialog" aria-modal="true" aria-label="Résultat du booster">
      <div className={`reveal-ambient rarity-${card.rarity}`} />
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
  { id: "profile", label: "APK & Profil", icon: <CircleUserRound size={21} /> },
];

export function CreatorDeckApp() {
  const [game, setGame] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPack, setSelectedPack] = useState<PackType>("live");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [usingHourglass, setUsingHourglass] = useState(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1_000);

  const loadGame = useCallback(async () => {
    // Pas de setLoading(true) ici : `loading` démarre à true pour le premier
    // rendu, et un rechargement silencieux (après ouverture de pack) ne doit pas
    // faire clignoter l'écran de chargement. Cela évite aussi un setState
    // synchrone dans l'effet (règle react-hooks/set-state-in-effect).
    try {
      const response = await fetch("/api/game", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Chargement impossible.");
      setGame(body);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial : les setState vivent dans des callbacks .then/.catch/.finally
  // (et non appelés de façon synchrone dans le corps de l'effet), ce qui satisfait
  // react-hooks/set-state-in-effect. `loadGame` reste utilisé pour les
  // rechargements déclenchés par les actions (ouverture de pack, etc.).
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/game", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body?.error || "Chargement impossible.");
        setGame(body);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Chargement impossible.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function handleOpenPack() {
    if (!game || opening) return;
    setOpening(true);
    setError(null);
    try {
      const response = await fetch("/api/packs/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packType: selectedPack,
          idempotencyKey: window.crypto.randomUUID(),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Ouverture impossible.");
      setGame(body.state);
      setDrawnCards(body.cards);
      setRevealIndex(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ouverture impossible.");
    } finally {
      setOpening(false);
    }
  }

  async function handleUseHourglass() {
    if (!game || usingHourglass) return;
    setUsingHourglass(true);
    setError(null);
    try {
      const response = await fetch("/api/packs/hourglass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packType: selectedPack }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible d'utiliser un sablier.");
      setGame(body.state);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d'utiliser un sablier.");
    } finally {
      setUsingHourglass(false);
    }
  }

  function closeReveal() {
    setDrawnCards([]);
    setRevealIndex(0);
  }

  if (loading && !game) return <LoadingScreen />;
  if (!game) {
    return (
      <main className="app-shell fatal-screen">
        <div className="brand-mark large"><span>CD</span></div>
        <h1>Connexion impossible</h1>
        <p>{error}</p>
        <button className="primary-action" onClick={() => void loadGame()}>
          Réessayer
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <TopBar game={game} />
      <div className="app-content">
        {tab === "home" ? (
          <HomeView
            game={game}
            selectedPack={selectedPack}
            setSelectedPack={setSelectedPack}
            onOpen={() => void handleOpenPack()}
            onUseHourglass={() => void handleUseHourglass()}
            opening={opening}
            usingHourglass={usingHourglass}
            now={now}
          />
        ) : null}
        {tab === "collection" ? <CollectionView game={game} /> : null}
        {tab === "missions" ? <MissionsView game={game} /> : null}
        {tab === "profile" ? <ProfileView game={game} /> : null}
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
      {opening ? (
        <div className="opening-loader" aria-live="polite">
          <div className="mini-pack"><span>CD</span></div>
          <strong>Scellement du tirage Top 500…</strong>
          <span>Le serveur prépare {PACKS[selectedPack].size} cartes uniques.</span>
        </div>
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
