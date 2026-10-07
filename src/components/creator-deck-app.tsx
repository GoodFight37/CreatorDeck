"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  BadgeInfo,
  BookOpen,
  Share2,
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
  Swords,
  Target,
  Trophy,
  Unlock,
  Volume2,
  VolumeX,
  FlaskConical,
  Paintbrush,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { AccountSheet, CloudBadge } from "@/components/account-sheet";
import { FriendsSheet } from "@/components/friends-sheet";
import { MarketSheet } from "@/components/market-sheet";
import { LastPackSheet } from "@/components/last-pack-sheet";
import { ArenaSheet } from "@/components/arena-sheet";
import { NotificationsSheet } from "@/components/notifications-sheet";
import { AtelierView } from "@/components/atelier-view";
import { CreatorCard } from "@/components/creator-card";
import { PackOddsSheet } from "@/components/pack-odds-sheet";
import { RevealOverlay } from "@/components/reveal-overlay";
import { WishlistSheet } from "@/components/wishlist-sheet";
import { PublicProfileSheet } from "@/components/public-profile-sheet";
import { StudioSheet } from "@/components/studio-sheet";
import { ThemeSheet } from "@/components/theme-sheet";
import { SeasonsSection } from "@/components/seasons-section";
import { useCloud, useCloudAutoSync } from "@/hooks/use-cloud";
import { usePackOpening } from "@/hooks/use-pack-opening";
import { usePush } from "@/hooks/use-push";
import { useInbox } from "@/hooks/use-inbox";
import { useGame, useNow } from "@/hooks/use-game";
import { useTwitchReturn } from "@/hooks/use-twitch-return";
import { useLive, useLivePolling } from "@/hooks/use-live";
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
  RETIRED_BY_SLUG,
  RETIRED_CREATORS,
  creatorImage,
  type CardVariant,
  type Creator,
  type Rarity,
} from "@/lib/catalog";
import { readySteals } from "@/lib/last-pack";
import { formatViewers, liveFor, liveLogins, viewersLabel } from "@/lib/live";
import { liveStore } from "@/lib/live-store";
import { regionLabel } from "@/lib/regions";
import { arenaDraftWindow } from "@/lib/arena";
import { craftableRetired } from "@/lib/retired";
import { bestCardOf } from "@/lib/social/inbox";
import { buzz } from "@/lib/haptics";
import { setTiltEnabled, tiltAvailable, tiltEnabled } from "@/lib/tilt";
import {
  isPerfect,
  PERFECT_HAPTIC,
  PERFECT_LOCK_MS,
  resistCount,
  RESIST_SHAKE_MS,
  resistHaptic,
  revealHaptic,
  silenceBefore,
  deservesSpotlight,
} from "@/lib/reveal";
import {
  isMuted,
  playBang,
  playPackOpening,
  playRefuse,
  playReveal,
  playReward,
  setMuted,
} from "@/lib/sfx";
import { getGameView, type DrawnCard, type GameView } from "@/lib/game-engine";
import { THEME_VAR_NAMES, type ThemeTokens } from "@/lib/cosmetics";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";

type GameState = GameView;
type Tab = "home" | "collection" | "missions" | "atelier" | "profile";
type CollectionFilter = "all" | "owned" | "live" | "retired" | Rarity;

/** Délai avant la révélation : donne un temps « d'ouverture » au booster. */

/** Jalons de collection, exprimés en part du catalogue (25 puis 100 sur 500). */
/**
 * Habillage des jalons du moteur (`MILESTONES` dans `game-engine.ts`) : icône,
 * titre et phrase. Les seuils, eux, ne sont plus écrits ici — c'est ce qui
 * faisait dire « Découvrir 50 » au-dessus d'un compteur qui visait 25.
 */
const MILESTONE_LOOK: Record<string, { icon: React.ReactNode; label: string; detail: (target: number) => string }> = {
  first: {
    icon: <Layers3 size={19} />,
    label: "Premier drop",
    detail: () => "Ouvrir un booster",
  },
  ten: {
    icon: <BookOpen size={19} />,
    label: "Début du classeur",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  twentyfive: {
    icon: <Layers3 size={19} />,
    label: "Le classeur prend forme",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  fifty: {
    icon: <Gem size={19} />,
    label: "Chasseur de cartes",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  hundred: {
    icon: <Target size={19} />,
    label: "Cent visages",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  legendary: {
    icon: <Sparkles size={19} />,
    label: "Premier Légendaire",
    detail: () => "Sortir une carte Légendaire d'un booster",
  },
  master: {
    icon: <Trophy size={19} />,
    label: "Maître du Twitch Game",
    detail: () => `Compléter les ${CATALOG_SIZE} ${CATALOG_AUDIENCE}`,
  },
};

/**
 * Habillage des trois missions du jour (règles dans `src/data/progression.json`).
 *
 * Les seuils ne sont pas écrits ici : `MISSIONS` les porte, et un chiffre
 * recopié finit toujours par mentir à l'écran.
 */
const MISSION_LOOK: Record<string, { icon: React.ReactNode; label: string; detail: string }> = {
  pack: { icon: <Layers3 size={19} />, label: "Ouvre un booster", detail: "Le geste du jour" },
  recycle: {
    icon: <RotateCcw size={19} />,
    label: "Recycle un doublon",
    detail: "Un doublon en points, et un sablier",
  },
  family: {
    icon: <Radio size={19} />,
    label: "Touche ta famille ou un Direct",
    detail: "Une carte de la famille visée, ou une variante Live",
  },
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
      <strong className="wordmark">CreatorDeck</strong>
      <LoaderCircle className="spin" size={26} />
      <p>Préparation du {CATALOG_LABEL}…</p>
    </main>
  );
}

function TopBar({ game }: { game: GameState }) {
  // La saison affichée est celle que le joueur remplit, calculée depuis sa
  // collection : « S01 » était écrit en dur, même pour une partie sans une
  // seule carte française.
  const season = game.currentSeason;
  const levelBase = Math.max(0, (game.player.level - 1) * 100);
  const levelProgress = Math.min(
    100,
    ((game.player.xp - levelBase) / Math.max(100, game.player.xpNext - levelBase)) * 100,
  );
  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <div>
          <strong>CreatorDeck</strong>
          <small title={season ? season.name : CATALOG_LABEL}>
            {season ? `${season.familyId} · ${season.name}` : CATALOG_LABEL}
          </small>
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
  onShowMissions,
  onShowAtelier,
  onShowArena,
  onOpenScene,
  opening,
  usingHourglass,
  sceneBusy,
  now,
  serverReserve,
  needsAccount,
}: {
  game: GameState;
  onOpen: () => void;
  onOpenScene: () => void;
  sceneBusy: boolean;
  onUseHourglass: () => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  /** Les Sortants : la ligne d'accueil mène à l'Atelier. */
  onShowAtelier: () => void;
  /** La ligne d'arène mène à l'écran Arène (dépôt, draft, classement). */
  onShowArena: () => void;
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
  // Le seul compteur au format mm:ss du jeu : il bat à la seconde, et il ne
  // re-rend que ce panneau (le minuteur est local à l'écran Drop).
  const tick = useNow(1_000);
  // Le compteur de malchance en une phrase. À 1 restant, c'est **ce** booster
  // qui est garanti : le dire autrement ferait croire à un booster de plus.
  const pityCopy =
    game.pity.remaining <= 1
      ? "Ce booster contient un Légendaire garanti"
      : `Légendaire garanti dans ${game.pity.remaining} booster${game.pity.remaining > 1 ? "s" : ""}`;
  // La série se dit sur la même ligne : les deux récompenses attendent au même
  // endroit, le prochain booster.
  const packCopy = game.streak.jackpot ? `${pityCopy} · Perfect du 7ᵉ jour garanti` : pityCopy;
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, 4);
  // Les Sortants encore artisanables : ils ont quitté le classement (plus
  // tirables, hors complétion) mais leur fenêtre d'artisanat reste ouverte
  // pendant l'édition de leur départ. Ce sont les dernières cartes à rejoindre
  // — et elles se fabriquent, elles ne se tirent plus. On compte celles qu'il
  // reste à obtenir : à zéro, la ligne disparaît.
  const retiredLeft = useMemo(
    () =>
      craftableRetired().filter(
        (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
      ).length,
    [game.cards],
  );
  const live = useLive();
  const cloud = useCloud();
  // La ligne d'arène de l'accueil : ce qui compte pour le joueur, dans l'ordre
  // — une récompense qui attend, un draft ouvert (une décision à prendre), ce
  // qu'il a déjà déposé, ou rien du tout. Aucune ligne n'apparaît sans compte :
  // l'arène n'existe qu'en ligne, et un bouton qui refuse est un piège.
  const arenaNow = useNow(30_000);
  const arenaLine = useMemo(() => {
    if (!cloud.configured || !cloud.userId) return null;
    const pending = cloud.arenaMine?.pending.length ?? 0;
    if (pending > 0) {
      return {
        tone: "reward" as const,
        label:
          pending === 1
            ? "Une récompense d'arène t'attend"
            : `${pending} récompenses d'arène t'attendent`,
      };
    }
    const window = arenaDraftWindow(arenaNow);
    if (cloud.arenaMine?.draftOpen ?? window.open) {
      const left = Math.max(0, window.closesAt - arenaNow);
      const hours = Math.floor(left / 3_600_000);
      const minutes = Math.floor((left % 3_600_000) / 60_000);
      return {
        tone: "hot" as const,
        label: `Draft du week-end ouvert · ${hours} h ${String(minutes).padStart(2, "0")} min pour le boucler`,
      };
    }
    const entry = cloud.arenaMine?.entry;
    if (entry) {
      const rank = cloud.arenaMine?.rank;
      return {
        tone: "done" as const,
        label: `Ton arène : ${entry.score.toLocaleString("fr-FR")} viewers${rank ? ` · ${rank === 1 ? "1er" : `${rank}e`}` : ""}`,
      };
    }
    return {
      tone: "idle" as const,
      label: "Arène : aucune équipe cette semaine",
    };
  }, [cloud.configured, cloud.userId, cloud.arenaMine, arenaNow]);
  // Le direct le plus regardé parmi les créateurs du Top 1000, pour le bandeau :
  // c'est le « lower third » d'une régie — une ligne, un chiffre, un nom.
  const featured = useMemo(() => {
    if (live.stale || !live.count) return null;
    let top: { login: string; viewers: number } | null = null;
    for (const stream of live.byLogin.values()) {
      if (!top || stream.viewers > top.viewers) top = { login: stream.login, viewers: stream.viewers };
    }
    return top;
  }, [live]);

  return (
    <div className="view home-view">
      <section className="welcome-row">
        <div>
          <h1>Prêt pour un nouveau drop&nbsp;?</h1>
        </div>
        <div className="season-badge">
          <Trophy size={15} />
          <span>{CATALOG_SIZE} Cartes</span>
        </div>
      </section>

      {/* Le bandeau du direct. Il n'apparaît que si l'app sait vraiment qui
          streame (données fraîches) : sinon il n'y a rien à dire. Il est
          cliquable parce qu'il annonce quelque chose sur le tirage — les
          créateurs en direct pèsent plus lourd et eux seuls peuvent sortir en
          variante Live. Un appui ouvre les taux publiés, qui le disent. */}
      {featured ? (
        <button
          type="button"
          className="live-bar"
          onClick={onShowOdds}
          aria-label={`${live.count} créateurs en direct. Bonus Direct actif : voir les taux publiés.`}
        >
          <i aria-hidden="true" />
          <span className="live-bar-tag">En direct</span>
          <span className="live-bar-who">
            {live.count} sur {CATALOG_SIZE}
            {` · @${featured.login}`}
            {featured.viewers > 0 ? ` ${formatViewers(featured.viewers)}` : ""}
          </span>
          <span className="live-bar-boost">Bonus Direct</span>
        </button>
      ) : null}

      <section className="pack-stage stage-live">
        <div className="pack-shadow" />
        <PackArtwork />
        <div className="pack-copy">
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
            <span>{formatCountdown(nextAt, tick)}</span>
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
              ? "Sablier indisponible en ligne"
              : `Utiliser 1 sablier (${game.player.hourglasses} disp.) · avance de 15 min`}
          </span>
        </button>
        <div className="guarantee-row">
          <ShieldCheck size={14} />
          <span>1 Rare ou mieux garantie · Live si son créateur streame · aucun doublon</span>
        </div>

        {/* Le plancher de malchance, écrit sur l'écran d'accueil : c'est un
            chiffre, pas une promesse en l'air — et il vient du même compteur
            que celui qui décidera du tirage. Un appui ouvre les taux publiés,
            qui portent la même règle. */}
        <button
          type="button"
          className={`pity-row${game.pity.remaining <= 1 ? " now" : ""}`}
          onClick={onShowOdds}
          aria-label={`Plancher de malchance : ${packCopy}`}
        >
          <Gem size={14} />
          <span>{packCopy}</span>
          <ChevronRight size={14} />
        </button>

        {/* Les jetons : la monnaie lente des boosters, dépensée à l'Atelier. */}
        <div className="token-row">
          <Coins size={14} />
          <span>
            <strong>{game.tokens.count}</strong> jetons · +{game.tokens.perPack} par booster
            {game.tokens.primeTime ? " (Prime Time)" : ""}
          </span>
          <span className="token-goal">
            {game.tokens.missing > 0 ? `encore ${game.tokens.missing}` : "une carte au choix"}
          </span>
        </div>
        {retiredLeft > 0 ? (
          <button
            type="button"
            className="pity-row retired-row"
            onClick={onShowAtelier}
            aria-label={`Ouvrir l'Atelier : ${retiredLeft} Sortant${
              retiredLeft > 1 ? "s" : ""
            } encore artisanable${retiredLeft > 1 ? "s" : ""} cette édition`}
          >
            <Clock3 size={14} />
            <span>
              {retiredLeft} Sortant{retiredLeft > 1 ? "s" : ""} encore artisanable
              {retiredLeft > 1 ? "s" : ""} · dernière édition
            </span>
            <ChevronRight size={14} />
          </button>
        ) : null}

        {arenaLine ? (
          <button
            type="button"
            className={`pity-row arena-row ${arenaLine.tone}`}
            onClick={onShowArena}
            aria-label={`Ouvrir l'arène : ${arenaLine.label}`}
          >
            <Swords size={14} />
            <span>{arenaLine.label}</span>
            <ChevronRight size={14} />
          </button>
        ) : null}

        <div className="home-links">
          <button type="button" className="text-link" onClick={onShowMissions}>
            <span>Objectifs et saisons</span>
            <ChevronRight size={15} />
          </button>
          <button type="button" className="text-link" onClick={onShowOdds}>
            <span>Taux de drop publiés</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </section>

      {/* Le second paquet, et le seul autre : celui de **ta** famille, une fois
          par jour de jeu. Il ne se recharge pas (le sablier n'y peut rien), il
          ne contient aucune Légendaire, et il ne touche ni au compteur de
          malchance ni à la série — c'est un paquet de complétion. */}
      <section className={`scene-block${game.scene.opened ? " done" : ""}`}>
        <div className="scene-head">
          <div>
            <h2>{game.scene.label}</h2>
            <span>{PACKS.scene.description}</span>
          </div>
          <span className="scene-state">
            {game.scene.opened ? "Ouvert aujourd'hui" : "Disponible"}
          </span>
        </div>

        {game.scene.family ? (
          <div className="scene-family">
            <div className="scene-family-copy">
              <strong>{game.scene.family.name}</strong>
              <span>
                {game.scene.family.owned}/{game.scene.family.total} découverts · il t&apos;en
                manque {game.scene.family.total - game.scene.family.owned}
              </span>
            </div>
            <div className="progress-track">
              <i
                style={{
                  width: `${Math.round(
                    (game.scene.family.owned / game.scene.family.total) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <span className="scene-empty">
            Aucune famille n&apos;est assez grande pour un paquet — le Live Drop reste là.
          </span>
        )}

        <button
          type="button"
          className="scene-action"
          onClick={onOpenScene}
          disabled={sceneBusy || game.scene.opened || !game.scene.family}
        >
          {sceneBusy ? (
            <LoaderCircle className="spin" size={17} />
          ) : game.scene.opened ? (
            <Clock3 size={17} />
          ) : (
            <Layers3 size={17} />
          )}
          <span>
            {sceneBusy
              ? "Ouverture…"
              : game.scene.opened
                ? "Reviens demain (nouvelle journée à 6 h UTC)"
                : `Ouvrir le ${game.scene.label}`}
          </span>
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
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
                  liveStream={liveFor(live, creator.login, now)}
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

function CollectionView({ game, themeStyle }: { game: GameState; themeStyle?: CSSProperties }) {
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const live = useLive();
  // L'heure ne sert qu'à juger la fraîcheur du direct : une minute de précision
  // suffit (au-delà de dix minutes, tout disparaît de toute façon).
  const now = useNow(60_000);
  // Une page de classeur, ce sont 9 pochettes (3 × 3) : ce qu'un écran de
  // téléphone montre d'un coup, exactement comme on ouvre un classeur.
  const perPage = 9;

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
    // Les Sortants que le joueur possède : ils s'affichent à la fin du classeur
    // (leur rang n'est plus comparable aux autres, et ils ne sont plus
    // tirables). Sans filtre « Sortants », ils restent visibles — une carte
    // possédée qui disparaîtrait de son propre classeur serait un bug.
    const retiredCards = RETIRED_CREATORS.filter((creator) => owned.has(creator.slug));
    const matches = (creator: Creator) => {
      if (q) {
        const hay = `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr");
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    if (filter === "retired") return retiredCards.filter(matches);
    const current = CREATORS.filter((creator) => {
      if (!matches(creator)) return false;
      if (filter === "owned") return owned.has(creator.slug);
      if (filter === "live") return liveFor(live, creator.login, now) !== null;
      if (filter !== "all") return creator.rarity === filter;
      return true;
    });
    return filter === "all" ? [...current, ...retiredCards] : current;
  }, [filter, live, now, owned, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visibleCreators = filtered.slice(
    safePage * perPage,
    (safePage + 1) * perPage,
  );
  const progress = Math.round((game.stats.uniqueCreators / CREATORS.length) * 100);
  // Combien de cartes du classeur ne sont plus tirables : ce sont les Sortants
  // du joueur, et c'est ce que le filtre compte.
  const retiredOwned = useMemo(
    () => [...owned.keys()].filter((slug) => RETIRED_BY_SLUG.has(slug)).length,
    [owned],
  );

  return (
    <div className="view collection-view" style={themeStyle}>
      <section className="page-title-row">
        <div>
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
            // Les Sortants n'apparaissent que s'il y en a : un filtre vide n'a
            // rien à faire dans la barre.
            ...(retiredOwned
              ? ([["retired", `Sortants (${retiredOwned})`]] as [CollectionFilter, string][])
              : []),
            // Le direct n'apparaît que si l'app sait vraiment qui streame : un
            // filtre qui ne peut rien donner n'a rien à faire là.
            ...(live.configured && live.count && !live.stale
              ? ([["live", `En direct (${live.count})`]] as [CollectionFilter, string][])
              : []),
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
          Page <strong>{safePage + 1}</strong> sur {totalPages} · {filtered.length} cartes
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          <span>Suivant</span>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="binder-page">
        <div className="collection-grid">
          {visibleCreators.map((creator) => {
            const item = owned.get(creator.slug);
            return (
              <div className="binder-pocket" key={creator.slug}>
                <CreatorCard
                  creator={creator}
                  variant={item?.bestVariant}
                  locked={!item}
                  compact
                  liveStream={liveFor(live, creator.login, now)}
                />
                {item && item.count > 1 ? (
                  <span className="pocket-count">×{item.count}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        {!filtered.length ? (
          <div className="no-results">Aucune carte ne correspond à ce filtre.</div>
        ) : null}
      </div>
    </div>
  );
}

function MissionRow({
  icon,
  label,
  detail,
  progress,
  target,
  reward,
  claimed,
  onClaim,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  progress: number;
  target: number;
  reward: { points: number; hourglasses: number };
  claimed: boolean;
  onClaim: () => void;
}) {
  const done = progress >= target;
  const percent = Math.min(100, Math.round((progress / target) * 100));
  const gains = [
    reward.points > 0 ? `+${reward.points} pts` : "",
    reward.hourglasses > 0
      ? `+${reward.hourglasses} sablier${reward.hourglasses > 1 ? "s" : ""}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={`mission-row ${done ? "done" : ""}`}>
      <div className="mission-icon">{done ? <Check size={19} /> : icon}</div>
      <div className="mission-content">
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
          {/* La récompense est écrite noir sur blanc : sans elle, ces quatre
              lignes étaient des jauges qui ne payaient rien. */}
          <span className="mission-reward">{claimed ? "Récompense reçue" : gains}</span>
        </div>
        <div className="mission-progress-copy">
          <b>{Math.min(progress, target)}</b>/{target}
        </div>
        <div className="progress-track">
          <i style={{ width: `${percent}%` }} />
        </div>
        {done && !claimed ? (
          <button type="button" className="mission-claim" onClick={onClaim}>
            <Unlock size={13} /> Réclamer
          </button>
        ) : (
          <span className={`mission-state ${claimed ? "done" : ""}`}>
            {claimed ? "Réclamé" : "En cours"}
          </span>
        )}
      </div>
    </article>
  );
}

function MissionsView({
  game,
  onClaimSeason,
  onClaimMilestone,
  onNotice,
  onError,
}: {
  game: GameState;
  onClaimSeason: (seasonId: string) => void;
  onClaimMilestone: (milestoneId: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const dayCopy =
    game.missions.filter((mission) => mission.done).length === game.missions.length
      ? "Les trois missions du jour sont faites"
      : `${game.missions.filter((mission) => mission.done).length}/${game.missions.length} mission${
          game.missions.length > 1 ? "s" : ""
        } du jour faite${game.missions.filter((mission) => mission.done).length > 1 ? "s" : ""}`;

  return (
    <div className="view missions-view">
      <section className="page-title-row">
        <div>
          <h1>Progression</h1>
        </div>
        <div className="streak-pill">
          <Zap size={14} />
          <span>Niveau {game.player.level}</span>
        </div>
      </section>

      {/* Le jour : trois gestes à faire, un sablier chacun, et la série qui
          avance tant qu'on ouvre un booster chaque jour. C'est la partie de
          l'écran qui se remet à zéro à 6 h UTC — pas à minuit, pour ne pas
          couper une soirée de streaming en deux. */}
      <section className="day-block">
        <div className="day-head">
          <div>
            <h2>Le jour</h2>
            <span>{dayCopy}</span>
          </div>
          <div className={`streak-chip${game.streak.jackpot ? " hot" : ""}`}>
            <Zap size={14} />
            <span>
              Série {game.streak.days}/{game.streak.target}
            </span>
          </div>
        </div>

        <div className="streak-track" aria-hidden="true">
          {Array.from({ length: game.streak.target }, (_, index) => (
            <i key={index} className={index < game.streak.days ? "on" : ""} />
          ))}
        </div>

        {game.streak.jackpot ? (
          <div className="streak-jackpot">
            <Sparkles size={15} />
            <div>
              <strong>Sept jours d&apos;affilée : le Perfect du jour t&apos;attend</strong>
              <span>
                Ton prochain booster part avec le tirage Perfect garanti — ou prends les{" "}
                {game.streak.jackpotHourglasses} sabliers.
              </span>
            </div>
            <div className="jackpot-actions">
              <button
                type="button"
                onClick={() => {
                  gameStore.claimStreakJackpot("perfect");
                  onNotice("Perfect garanti gardé pour ton prochain booster.");
                }}
              >
                Perfect
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  try {
                    const gained = gameStore.claimStreakJackpot("hourglasses");
                    onNotice(`+${gained} sablier${gained > 1 ? "s" : ""} : la série repart.`);
                  } catch (caught) {
                    onError(caught instanceof Error ? caught.message : "Récompense indisponible.");
                  }
                }}
              >
                {game.streak.jackpotHourglasses} sabliers
              </button>
            </div>
          </div>
        ) : null}

        <div className="mission-list day-missions">
          {game.missions.map((mission) => {
            const look = MISSION_LOOK[mission.id];
            return (
              <MissionRow
                key={mission.id}
                icon={look?.icon ?? <Target size={19} />}
                label={look?.label ?? mission.id}
                detail={look?.detail ?? ""}
                progress={mission.progress}
                target={mission.target}
                reward={{ points: 0, hourglasses: 1 }}
                claimed={mission.claimed}
                onClaim={() => {
                  try {
                    const gained = gameStore.claimMissions();
                    onNotice(
                      gained > 0
                        ? `+${gained} sablier${gained > 1 ? "s" : ""} pour tes missions du jour.`
                        : "Mission déjà réglée pour aujourd'hui.",
                    );
                  } catch (caught) {
                    onError(caught instanceof Error ? caught.message : "Récompense indisponible.");
                  }
                }}
              />
            );
          })}
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
          <h2>Objectifs du collectionneur</h2>
        </div>
      </div>
      <div className="mission-list">
        {game.milestones.map((milestone) => {
          const look = MILESTONE_LOOK[milestone.id];
          return (
            <MissionRow
              key={milestone.id}
              icon={look?.icon ?? <Sparkles size={19} />}
              label={look?.label ?? milestone.id}
              detail={look ? look.detail(milestone.target) : ""}
              progress={milestone.progress}
              target={milestone.target}
              reward={milestone.reward}
              claimed={milestone.claimed}
              onClaim={() => onClaimMilestone(milestone.id)}
            />
          );
        })}
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
  onShowMissions,
  onShowThemes,
  onShowStudio,
  onShowAccount,
  onShowLeaderboard,
  onShowFriends,
  onShowMarket,
  onShowLastPack,
  onShowArena,
  onShowNotifications,
  onShowOwnProfile,
  onShowWishlist,
}: {
  game: GameState;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  onShowThemes: () => void;
  onShowStudio: () => void;
  onShowAccount: () => void;
  onShowLeaderboard: () => void;
  onShowFriends: () => void;
  onShowMarket: () => void;
  onShowLastPack: () => void;
  onShowArena: () => void;
  onShowNotifications: () => void;
  onShowOwnProfile: () => void;
  onShowWishlist: () => void;
}) {
  const cloud = useCloud();
  // Le compte du carnet passe par le hook, et non par le store : lui seul
  // ajoute la ligne du direct du créateur épinglé, que le serveur ne fabrique
  // pas. La pastille et la feuille comptent ainsi exactement la même liste.
  const { unread: inboxUnread } = useInbox();
  // Ce qui est prenable maintenant : la pastille du menu, calculée à partir de
  // l'étagère du serveur et de son horloge (voir `readySteals`).
  const lastPackNow = useNow(15_000);
  const lastPackReady = readySteals(cloud.lastPacks, cloud.lastPacksAt ?? lastPackNow, lastPackNow);
  // Les récompenses d'arène non encaissées : même principe que le Last Pack —
  // une pastille qui compte ce qui attend le joueur, pas ce qui l'attend lui.
  const arenaRewards = cloud.arenaMine?.pending.length ?? 0;
  // L'épinglé se relit au montage de l'onglet, et à chaque changement de
  // compte : ce n'est pas l'épinglé d'un autre joueur qui doit s'afficher.
  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    void cloudStore.loadWishlist();
  }, [cloud.configured, cloud.userId]);
  const wishlistCreator = cloud.wishlistSlug ? CREATOR_BY_SLUG.get(cloud.wishlistSlug) ?? null : null;
  // Le son vit hors de React (module Web Audio) : l'état local ne sert qu'à
  // dessiner le bon côté de l'interrupteur.
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  // L'inclinaison des cartes (Holo, Gold). Le réglage n'apparaît que sur un
  // appareil qui a vraiment un capteur : proposer un interrupteur inerte serait
  // une promesse en l'air.
  const [tiltOn, setTiltOn] = useState(() => tiltEnabled());
  const [canTilt] = useState(() => tiltAvailable());
  // Le studio de tirages est un outil de mise au point, pas une option de jeu :
  // il s'ouvre en appuyant cinq fois sur la pastille de niveau.
  const [tools, setTools] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  function tapLevel() {
    const now = Date.now();
    const count = now - lastTap > 3_000 ? 1 : tools + 1;
    setLastTap(now);
    if (count >= 5) {
      setTools(0);
      onShowStudio();
    } else {
      setTools(count);
    }
  }

  function toggleTilt() {
    const next = !tiltOn;
    setTiltOn(next);
    setTiltEnabled(next);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    // On joue le carillon à l'activation : l'utilisateur entend tout de suite
    // ce qu'il vient de rallumer (et rien s'il coupe).
    if (next) playReward();
  }

  async function handleReset() {
    if (!window.confirm("Réinitialiser la progression ? Toutes tes cartes seront perdues.\n\nSi tu joues connecté, ce qui est enregistré en ligne est effacé aussi.")) {
      return;
    }
    // L'appareil d'abord, le serveur ensuite : la partie neuve qu'il faut
    // remonter est celle que `gameStore.reset()` vient d'écrire.
    gameStore.reset();
    if (!cloud.configured || !cloud.userId) {
      onNotice("Nouvelle partie lancée.");
      return;
    }
    onNotice("Nouvelle partie lancée.");
    const outcome = await cloudStore.resetProgress();
    if (outcome.status === "done") onNotice(outcome.message);
    else if (outcome.status === "unavailable") {
      // L'appareil a bien redémarré : le serveur, lui, garde sa réserve. On le
      // dit, plutôt que de laisser croire à une remise à zéro complète.
      onError(`Partie locale remise à zéro. En ligne : ${outcome.message}`);
    }
  }

  return (
    <div className="view profile-view">
      <section className="profile-card">
        <button
          type="button"
          className="profile-avatar"
          onClick={tapLevel}
          aria-label={`Niveau ${game.player.level}`}
        >
          <span>{game.player.level}</span>
        </button>
        <div>
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

      {/*
       * La wishlist. Elle ne s'affiche que sur un build avec cloud : un épinglé
       * que personne ne peut voir n'a pas de sens, et un bloc grisé de plus
       * encombrerait l'onglet pour rien.
       */}
      {cloud.configured ? (
        <section className="wishlist-block" aria-label="Wishlist">
          <div className="wishlist-title">
            <Target size={16} />
            <h2>Wishlist</h2>
          </div>
          {!cloud.userId ? (
            <div className="wishlist-body">
              <p>
                Connecte-toi pour épingler le créateur que tu cherches : les autres le verront sur
                ta fiche.
              </p>
            </div>
          ) : wishlistCreator ? (
            <div className="wishlist-body">
              <div className="wishlist-name">
                <b>{wishlistCreator.displayName}</b>
                <span>
                  {RARITY_META[wishlistCreator.rarity].label} · {regionLabel(wishlistCreator.region)}
                </span>
              </div>
              <div className="wishlist-actions">
                <button type="button" className="account-button ghost" onClick={onShowWishlist}>
                  Changer
                </button>
                <button
                  type="button"
                  className="account-button ghost"
                  disabled={cloud.wishlistBusy}
                  onClick={() => void cloudStore.clearWishlist()}
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <div className="wishlist-body">
              <p>Le créateur qui te manque le plus. Un seul, et il s&apos;affiche chez toi.</p>
              <button type="button" className="account-button ghost" onClick={onShowWishlist}>
                Épingler un créateur
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/*
       * Le menu : deux groupes, des libellés seuls. Pas de sous-texte pour
       * expliquer chaque ligne — un menu de jeu se lit d'un coup d'œil. Ce qui
       * a besoin d'explications les donne là où on s'en sert : l'écran Compte,
       * la feuille des taux, le thème.
       */}
      <section className="menu-group" aria-label="Compte">
        <h2>Compte</h2>
        <button type="button" className="menu-row" onClick={onShowAccount}>
          <span>{cloud.userId ? "Mon compte" : "Compte et cloud"}</span>
          <ChevronRight size={16} />
        </button>
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowLeaderboard}>
            <span>Classement mondial</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured && cloud.userId ? (
          <button type="button" className="menu-row" onClick={onShowOwnProfile}>
            <span>Ma fiche publique</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowFriends}>
            <span>Amis</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowMarket}>
            <span>Hôtel des ventes</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowArena}>
            <span>Arène</span>
            {arenaRewards > 0 ? <b className="menu-count">{arenaRewards}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowLastPack}>
            <span>Last Pack</span>
            {lastPackReady > 0 ? <b className="menu-count">{lastPackReady}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowNotifications}>
            <span>Notifications</span>
            {inboxUnread > 0 ? <b className="menu-count">{inboxUnread}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
      </section>

      <section className="menu-group" aria-label="Partie">
        <h2>Partie</h2>
        <button type="button" className="menu-row" onClick={onShowMissions}>
          <span>Objectifs et saisons</span>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="menu-row" onClick={onShowThemes}>
          <span>Thème du classeur</span>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="menu-row" onClick={onShowOdds}>
          <span>Taux de drop</span>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="menu-row"
          role="switch"
          aria-checked={soundOn}
          onClick={toggleSound}
        >
          <span>Son</span>
          <span className="switch" data-on={soundOn ? "on" : "off"} aria-hidden="true">
            <i />
          </span>
        </button>
        {canTilt ? (
          <button
            type="button"
            className="menu-row"
            role="switch"
            aria-checked={tiltOn}
            onClick={toggleTilt}
          >
            <span>Cartes qui s&apos;inclinent</span>
            <span className="switch" data-on={tiltOn ? "on" : "off"} aria-hidden="true">
              <i />
            </span>
          </button>
        ) : null}
      </section>

      {/* Le rouge, tout en bas et séparé du reste : on ne le touche pas par
          accident. */}
      <button type="button" className="menu-reset" onClick={() => void handleReset()}>
        Réinitialiser la progression
      </button>
    </div>
  );
}

/*
 * Quatre lieux, un mot chacun. Les objectifs quittent la barre : c'est un
 * rendez-vous quotidien, pas un endroit où l'on vit — ils s'ouvrent depuis le
 * drop et depuis le menu.
 */
const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Drop", icon: <Zap size={22} /> },
  { id: "collection", label: "Binder", icon: <BookOpen size={22} /> },
  { id: "atelier", label: "Craft", icon: <Hammer size={22} /> },
  { id: "profile", label: "Toi", icon: <CircleUserRound size={22} /> },
];

export function CreatorDeckApp() {
  // Termine une connexion Twitch si l'on revient d'un aller-retour navigateur.
  useTwitchReturn();
  const state = useGame();
  const cloud = useCloud();
  // Le carnet de notifications se remplit à l'ouverture, puis toutes les cinq
  // minutes : c'est lui qui porte la pastille du menu « Toi ». Les dépendances
  // sont les deux valeurs qui comptent (et non l'objet cloud, qui change à
  // chaque publication) : sinon le minuteur repartirait sans arrêt.
  const inboxReady = cloud.configured && Boolean(cloud.userId);
  useEffect(() => {
    if (!inboxReady) return;
    void cloudStore.loadInbox();
    const timer = setInterval(() => void cloudStore.loadInbox(), 5 * 60_000);
    return () => clearInterval(timer);
  }, [inboxReady]);
  // L'étagère des Last Packs suit la même règle que le carnet — à l'ouverture,
  // puis régulièrement — mais plus souvent : un paquet n'est exposé que dix
  // minutes, et c'est la pastille qui doit faire sortir le joueur de son siège.
  useEffect(() => {
    if (!inboxReady) return;
    // L'étagère des Last Packs se recharge à deux vitesses : toutes les 30 s
    // tant qu'un paquet est exposé (sa fenêtre de vol dure dix minutes — la
    // manquer pour un poll de trois minutes, c'est rater *le* moment du jeu),
    // et toutes les trois minutes le reste du temps. Le minuteur se reprogramme
    // à chaque tour : il lit l'état frais du magasin, jamais une capture.
    let timer: number | undefined;
    const schedule = () => {
      void cloudStore.loadLastPacks();
      const snapshot = cloudStore.getSnapshot();
      const at = Date.now();
      const exposed = readySteals(snapshot.lastPacks, snapshot.lastPacksAt ?? at, at) > 0;
      timer = window.setTimeout(schedule, exposed ? 30_000 : 3 * 60_000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [inboxReady]);
  // L'arène se lit au démarrage et toutes les dix minutes : c'est ce qui allume
  // la pastille « récompense à encaisser » du menu, et ce qui rafraîchit le
  // classement sans que le joueur ait à ouvrir l'écran.
  useEffect(() => {
    if (!inboxReady) return;
    void cloudStore.loadArena();
    const timer = setInterval(() => void cloudStore.loadArena(), 10 * 60_000);
    return () => clearInterval(timer);
  }, [inboxReady]);
  // Trente secondes suffisent à l'écran entier : le seul endroit qui vit à la
  // seconde est le compte à rebours de la réserve, et il a son propre
  // minuteur **local** (`HomeView`). Un `useNow(1_000)` ici re-rendait les
  // mille cartes de la collection une fois par seconde, pour rien.
  const now = useNow(30_000);
  // Le direct se rafraîchit tant que l'écran principal est monté (lecture au
  // démarrage, toutes les trois minutes, et au retour dans l'app).
  useLivePolling();
  const [tab, setTab] = useState<Tab>("home");
  const [opening, setOpening] = useState(false);
  const [usingHourglass, setUsingHourglass] = useState(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  // Quel paquet la révélation montre (le tirage rare ne se raconte pas pareil).
  const [revealKind, setRevealKind] = useState<"live" | "scene">("live");
  const [sceneOpening, setSceneOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Raccourci affiché dans le bandeau d'erreur (« Mon compte »).
  const [errorHint, setErrorHint] = useState<"account" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastPackOpen, setLastPackOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  // La pastille de la barre : combien de paquets d'amis sont prenables là,
  // maintenant. Même calcul que la ligne du menu, même horloge (celle du
  // serveur) — une pastille qui resterait allumée après la fenêtre serait un
  // mensonge.
  const navLastPack = readySteals(cloud.lastPacks, cloud.lastPacksAt ?? now, now);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountFocus, setAccountFocus] = useState<"leaderboard" | null>(null);

  // Envoi automatique (débounce) quand un compte est connecté : aucun appel
  // réseau sinon, la partie reste strictement locale.
  useCloudAutoSync();
  usePush();

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

  // Un seul endroit décide qui tire (le serveur ou l'appareil) : l'écran ne
  // fait qu'afficher ce qui revient — l'overlay 16:9 passe par le même module.
  const { openLivePack, openScenePack } = usePackOpening(game);

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
      // Qui tire — le serveur ou l'appareil — se décide dans `usePackOpening`,
      // le même module que l'overlay 16:9.
      const result = await openLivePack();
      if (result.status === "drawn") {
        // Le son accompagne le geste, jamais l'attente : c'est l'instant du
        // « wouip » qui compte.
        playPackOpening();
        setRevealKind("live");
        setDrawnCards(result.cards);
        setRevealIndex(0);
        return;
      }
      showError(result.message, result.needAccount ? "account" : null);
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Ouverture impossible.");
    } finally {
      setOpening(false);
    }
  }

  /**
   * Ouvre le **Paquet Scène** du jour.
   *
   * Le même principe que le Live Drop : avec un compte, c'est le serveur qui
   * décide — il donne les choix, le client tire dedans, le serveur vérifie (voir
   * `0014_scene_pack.sql`). Sans compte configuré, le moteur local applique
   * exactement les mêmes règles.
   */
  async function handleOpenScenePack() {
    if (!game || sceneOpening || game.scene.opened) return;
    const family = game.scene.family;
    if (!family) {
      showError("Aucune famille n'est assez grande pour un Paquet Scène.");
      return;
    }
    setSceneOpening(true);
    setError(null);
    setErrorHint(null);
    try {
      const result = await openScenePack();
      if (result.status === "drawn") {
        playPackOpening();
        setRevealKind("scene");
        setDrawnCards(result.cards);
        setRevealIndex(0);
        return;
      }
      showError(result.message, result.needAccount ? "account" : null);
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Ouverture impossible.");
    } finally {
      setSceneOpening(false);
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

  function handleClaimMilestone(milestoneId: string) {
    // La vue d'avant le clic décrit exactement ce qui va tomber.
    const before = game?.milestones.find((entry) => entry.id === milestoneId);
    try {
      gameStore.claimMilestone(milestoneId);
      playReward();
      const gains = before
        ? [
            before.reward.points > 0 ? `+${before.reward.points} points` : "",
            before.reward.hourglasses > 0
              ? `+${before.reward.hourglasses} sablier${before.reward.hourglasses > 1 ? "s" : ""}`
              : "",
          ]
            .filter(Boolean)
            .join(", ")
        : "";
      showNotice(gains ? `Objectif atteint : ${gains} !` : "Récompense d'objectif réclamée.");
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Récompense indisponible.");
    }
  }

  // Le thème est un jeu de variables CSS posé **sur le classeur**, pas sur
  // `<html>` : le chrome de l'application (noir studio, blanc chaud, rouge live)
  // ne change jamais, et un thème reste un objet qu'on équipe pour son binder.
  const themeStyle = useMemo(() => {
    const equipped = game?.themes.find((theme) => theme.equipped);
    if (!equipped) return undefined;
    const style: Record<string, string> = {};
    for (const [token, name] of Object.entries(THEME_VAR_NAMES)) {
      style[name] = equipped.tokens[token as keyof typeof THEME_VAR_NAMES];
    }
    return style as CSSProperties;
  }, [game?.themes]);

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
            onShowMissions={() => setTab("missions")}
            onShowAtelier={() => setTab("atelier")}
            onShowArena={() => setArenaOpen(true)}
            onOpenScene={() => void handleOpenScenePack()}
            opening={opening}
            usingHourglass={usingHourglass}
            sceneBusy={sceneOpening}
            now={now}
            serverReserve={cloud.configured}
            needsAccount={cloud.configured && !cloud.userId}
          />
        ) : null}
        {tab === "collection" ? <CollectionView game={game} themeStyle={themeStyle} /> : null}
        {tab === "missions" ? (
          <MissionsView
            game={game}
            onClaimSeason={handleClaimSeason}
            onClaimMilestone={handleClaimMilestone}
            onNotice={showNotice}
            onError={showError}
          />
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
            onShowMissions={() => setTab("missions")}
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
            onShowFriends={() => setFriendsOpen(true)}
            onShowMarket={() => setMarketOpen(true)}
            onShowLastPack={() => setLastPackOpen(true)}
            onShowArena={() => setArenaOpen(true)}
            onShowWishlist={() => setWishlistOpen(true)}
            onShowNotifications={() => setNotificationsOpen(true)}
            onShowOwnProfile={() => {
              if (cloud.userId) void cloudStore.openProfile(cloud.userId);
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
            {/* La pastille du Last Pack : « il y a un paquet à prendre, là,
                maintenant ». Elle vit sur l'onglet qui mène au menu, comme
                celle du carnet — pas de cinquième onglet. */}
            {item.id === "profile" && navLastPack > 0 ? (
              <b className="nav-badge" aria-label={`${navLastPack} paquet(s) à prendre`}>
                {navLastPack}
              </b>
            ) : null}
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
          <strong>Ouverture du booster…</strong>
          <span>{PACKS.live.size} cartes, aucune en double.</span>
        </div>
      ) : null}
      {oddsOpen ? (
        <PackOddsSheet onClose={() => setOddsOpen(false)} current={game} />
      ) : null}
      {studioOpen ? <StudioSheet onClose={() => setStudioOpen(false)} /> : null}
      {friendsOpen ? <FriendsSheet onClose={() => setFriendsOpen(false)} /> : null}
      {marketOpen ? <MarketSheet onClose={() => setMarketOpen(false)} /> : null}
      {lastPackOpen ? <LastPackSheet onClose={() => setLastPackOpen(false)} /> : null}
      {arenaOpen ? <ArenaSheet onClose={() => setArenaOpen(false)} /> : null}
      {wishlistOpen ? <WishlistSheet onClose={() => setWishlistOpen(false)} /> : null}
      {notificationsOpen ? <NotificationsSheet onClose={() => setNotificationsOpen(false)} /> : null}
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
          // Une clé par paquet : les compteurs de refus et le verrou du Perfect
          // repartent de zéro à chaque ouverture, sans effet de réinitialisation.
          key={drawnCards[0]?.id ?? "reveal"}
          cards={drawnCards}
          index={revealIndex}
          kind={revealKind}
          onSkipAll={() => setRevealIndex(drawnCards.length - 1)}
          onNext={() => setRevealIndex((value) => Math.min(value + 1, drawnCards.length - 1))}
          onClose={closeReveal}
        />
      ) : null}
    </main>
  );
}
