/**
 * Moteur de jeu CreatorDeck — pur et isomorphe.
 *
 * Aucune dépendance à Node, au DOM ou au stockage : toutes les fonctions
 * prennent un état + un instant `now` et retournent un nouvel état. C'est ce
 * qui permet de faire tourner le jeu hors ligne sur le téléphone (WebView
 * Capacitor / PWA) et, si un mode en ligne arrive un jour, d'exécuter
 * exactement le même code côté serveur.
 *
 * La persistance est gérée à part (src/lib/save-store.ts).
 */
import {
  CREATORS,
  PACKS,
  RARITY_META,
  type CardVariant,
  type Creator,
  type PackType,
  type Rarity,
} from "@/lib/catalog";
import { randomInt, randomUUID } from "@/lib/random";

export const SAVE_VERSION = 1 as const;

/** Points d'expérience nécessaires par niveau. */
export const XP_PER_LEVEL = 100;
/** Sabliers offerts à chaque niveau gagné. */
export const HOURGLASSES_PER_LEVEL = 3;
/** Temps de recharge retiré par un sablier, selon le booster. */
export const HOURGLASS_REDUCTION_MS: Record<PackType, number> = {
  live: 15 * 60 * 1000,
  archive: 60 * 60 * 1000,
};

const LIVE_WEIGHTS: Record<Rarity, number> = {
  common: 42,
  uncommon: 30,
  rare: 18,
  epic: 8,
  legendary: 2,
};
const ARCHIVE_WEIGHTS: Record<Rarity, number> = {
  common: 27,
  uncommon: 31,
  rare: 25,
  epic: 13,
  legendary: 4,
};
const GUARANTEED_RARITIES: Rarity[] = ["rare", "epic", "legendary"];

export type OwnedCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  /** Epoch ms. */
  obtainedAt: number;
};

export type DrawnCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  isNew: boolean;
};

/** État complet d'une partie — c'est exactement ce qui est sauvegardé. */
export type PlayerState = {
  version: typeof SAVE_VERSION;
  playerId: string;
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms de la dernière mutation. */
  updatedAt: number;
  level: number;
  xp: number;
  points: number;
  hourglasses: number;
  livePacks: number;
  archivePacks: number;
  /** Epoch ms : ancre de la recharge en cours (voir refreshBalances). */
  lastLiveRegen: number;
  lastArchiveRegen: number;
  openings: number;
  cards: OwnedCard[];
};

/** Vue dérivée consommée par l'interface. */
export type GameView = {
  player: {
    level: number;
    xp: number;
    xpNext: number;
    points: number;
    hourglasses: number;
    livePacks: number;
    archivePacks: number;
    /** Epoch ms du prochain booster, ou null si la réserve est pleine. */
    nextLiveAt: number | null;
    nextArchiveAt: number | null;
  };
  cards: OwnedCard[];
  stats: {
    uniqueCreators: number;
    totalCards: number;
    openings: number;
  };
};

export class GameError extends Error {
  constructor(
    message: string,
    public code = "GAME_ERROR",
  ) {
    super(message);
    this.name = "GameError";
  }
}

export function createInitialState(now = Date.now()): PlayerState {
  return {
    version: SAVE_VERSION,
    playerId: randomUUID(),
    createdAt: now,
    updatedAt: now,
    level: 1,
    xp: 0,
    points: 120,
    hourglasses: 12,
    livePacks: 2,
    archivePacks: 1,
    lastLiveRegen: now,
    lastArchiveRegen: now,
    openings: 0,
    cards: [],
  };
}

/**
 * Applique la recharge passive des boosters écoulée depuis la dernière ancre.
 * Pure : ne modifie pas `state`.
 */
export function refreshBalances(state: PlayerState, now = Date.now()): PlayerState {
  const refreshOne = (stock: number, max: number, last: number, interval: number) => {
    if (stock >= max) return { stock: max, last: now };
    // Si l'horloge de l'appareil a reculé, on ré-ancre sur `now` : pas de
    // recharge gratuite, pas de compte à rebours dans le futur.
    const anchor = Math.min(last, now);
    const gained = Math.floor((now - anchor) / interval);
    if (gained <= 0) return { stock, last: anchor };
    const nextStock = Math.min(max, stock + gained);
    const nextLast = nextStock >= max ? now : anchor + gained * interval;
    return { stock: nextStock, last: nextLast };
  };

  const live = refreshOne(state.livePacks, PACKS.live.max, state.lastLiveRegen, PACKS.live.regenMs);
  const archive = refreshOne(
    state.archivePacks,
    PACKS.archive.max,
    state.lastArchiveRegen,
    PACKS.archive.regenMs,
  );

  if (
    live.stock === state.livePacks &&
    live.last === state.lastLiveRegen &&
    archive.stock === state.archivePacks &&
    archive.last === state.lastArchiveRegen
  ) {
    return state;
  }

  return {
    ...state,
    livePacks: live.stock,
    archivePacks: archive.stock,
    lastLiveRegen: live.last,
    lastArchiveRegen: archive.last,
  };
}

function chooseCreator(packType: PackType, used: Set<string>, allowedRarities?: Rarity[]) {
  const weights = packType === "live" ? LIVE_WEIGHTS : ARCHIVE_WEIGHTS;
  const available = CREATORS.filter(
    (creator) =>
      !used.has(creator.slug) &&
      (!allowedRarities || allowedRarities.includes(creator.rarity)),
  );
  if (!available.length) {
    throw new GameError("Le catalogue disponible est vide.", "EMPTY_CATALOG");
  }

  const rarities = Object.keys(weights) as Rarity[];
  const weightedRarities = rarities
    .map((rarity) => ({
      rarity,
      weight: available.some((creator) => creator.rarity === rarity) ? weights[rarity] : 0,
    }))
    .filter((entry) => entry.weight > 0);
  const totalWeight = weightedRarities.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomInt(totalWeight);
  let chosenRarity = weightedRarities[0].rarity;
  for (const entry of weightedRarities) {
    if (roll < entry.weight) {
      chosenRarity = entry.rarity;
      break;
    }
    roll -= entry.weight;
  }

  const bucket = available.filter((creator) => creator.rarity === chosenRarity);
  return bucket[randomInt(bucket.length)];
}

function chooseVariant(packType: PackType, creator: Creator): CardVariant {
  const roll = randomInt(10_000);
  if (packType === "archive") {
    if (creator.rarity === "legendary" && roll < 350) return "gold";
    if (RARITY_META[creator.rarity].order >= RARITY_META.rare.order && roll < 1_650) {
      return "holo";
    }
  }
  if (packType === "live" && creator.rarity !== "common" && roll < 750) {
    return "holo";
  }
  return "standard";
}

/**
 * Tire le contenu d'un booster : `size - 1` cartes pondérées par rareté puis
 * une carte « Rare ou mieux » garantie (variante Live pour le booster Live),
 * sans doublon interne, le tout mélangé.
 */
export function drawPack(packType: PackType, alreadyOwned: ReadonlySet<string>): DrawnCard[] {
  const size = PACKS[packType].size;
  const used = new Set<string>();
  const drawn: DrawnCard[] = [];

  for (let index = 0; index < size - 1; index += 1) {
    const creator = chooseCreator(packType, used);
    used.add(creator.slug);
    drawn.push({
      id: randomUUID(),
      creatorSlug: creator.slug,
      rarity: creator.rarity,
      variant: chooseVariant(packType, creator),
      isNew: !alreadyOwned.has(creator.slug),
    });
  }

  const guaranteed = chooseCreator(packType, used, GUARANTEED_RARITIES);
  drawn.push({
    id: randomUUID(),
    creatorSlug: guaranteed.slug,
    rarity: guaranteed.rarity,
    variant: packType === "live" ? "live" : chooseVariant(packType, guaranteed),
    isNew: !alreadyOwned.has(guaranteed.slug),
  });

  for (let index = drawn.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [drawn[index], drawn[swapIndex]] = [drawn[swapIndex], drawn[index]];
  }
  return drawn;
}

export function ownedSlugs(state: PlayerState): Set<string> {
  return new Set(state.cards.map((card) => card.creatorSlug));
}

/**
 * Ouvre un booster : consomme un exemplaire, crédite points/XP/niveaux et
 * ajoute les cartes tirées à la collection.
 */
export function openPack(
  state: PlayerState,
  packType: PackType,
  now = Date.now(),
): { state: PlayerState; cards: DrawnCard[] } {
  const refreshed = refreshBalances(state, now);
  const available = packType === "live" ? refreshed.livePacks : refreshed.archivePacks;
  if (available <= 0) {
    throw new GameError("Aucun booster disponible pour le moment.", "PACK_NOT_READY");
  }

  const cards = drawPack(packType, ownedSlugs(refreshed));
  const pack = PACKS[packType];
  const nextXp = refreshed.xp + pack.xp;
  const nextLevel = Math.floor(nextXp / XP_PER_LEVEL) + 1;
  const gainedLevels = Math.max(0, nextLevel - refreshed.level);

  // Un booster consommé depuis une réserve pleine démarre une nouvelle
  // recharge maintenant (refreshBalances garde l'ancre à `now` quand c'est plein).
  const next: PlayerState = {
    ...refreshed,
    updatedAt: now,
    livePacks: packType === "live" ? refreshed.livePacks - 1 : refreshed.livePacks,
    archivePacks: packType === "archive" ? refreshed.archivePacks - 1 : refreshed.archivePacks,
    points: refreshed.points + pack.points,
    xp: nextXp,
    level: nextLevel,
    hourglasses: refreshed.hourglasses + gainedLevels * HOURGLASSES_PER_LEVEL,
    openings: refreshed.openings + 1,
    cards: [
      ...refreshed.cards,
      ...cards.map<OwnedCard>((card) => ({
        id: card.id,
        creatorSlug: card.creatorSlug,
        rarity: card.rarity,
        variant: card.variant,
        obtainedAt: now,
      })),
    ],
  };

  return { state: next, cards };
}

/** Dépense un sablier pour avancer la recharge du booster choisi. */
export function spendHourglass(
  state: PlayerState,
  packType: PackType,
  now = Date.now(),
): PlayerState {
  const refreshed = refreshBalances(state, now);
  if (refreshed.hourglasses <= 0) {
    throw new GameError("Aucun sablier disponible.", "NO_HOURGLASS");
  }

  const isLive = packType === "live";
  const max = isLive ? PACKS.live.max : PACKS.archive.max;
  const currentStock = isLive ? refreshed.livePacks : refreshed.archivePacks;
  if (currentStock >= max) {
    throw new GameError("La réserve de ce booster est déjà pleine.", "PACK_FULL");
  }

  const reduction = HOURGLASS_REDUCTION_MS[packType];
  const shifted: PlayerState = {
    ...refreshed,
    hourglasses: refreshed.hourglasses - 1,
    lastLiveRegen: isLive ? refreshed.lastLiveRegen - reduction : refreshed.lastLiveRegen,
    lastArchiveRegen: isLive
      ? refreshed.lastArchiveRegen
      : refreshed.lastArchiveRegen - reduction,
  };
  return { ...refreshBalances(shifted, now), updatedAt: now };
}

/** Projette l'état en vue prête à afficher (compteurs, prochaines recharges). */
export function getGameView(state: PlayerState, now = Date.now()): GameView {
  const refreshed = refreshBalances(state, now);
  const uniqueCreators = ownedSlugs(refreshed).size;
  return {
    player: {
      level: refreshed.level,
      xp: refreshed.xp,
      xpNext: refreshed.level * XP_PER_LEVEL,
      points: refreshed.points,
      hourglasses: refreshed.hourglasses,
      livePacks: refreshed.livePacks,
      archivePacks: refreshed.archivePacks,
      nextLiveAt:
        refreshed.livePacks >= PACKS.live.max
          ? null
          : refreshed.lastLiveRegen + PACKS.live.regenMs,
      nextArchiveAt:
        refreshed.archivePacks >= PACKS.archive.max
          ? null
          : refreshed.lastArchiveRegen + PACKS.archive.regenMs,
    },
    cards: refreshed.cards,
    stats: {
      uniqueCreators,
      totalCards: refreshed.cards.length,
      openings: refreshed.openings,
    },
  };
}
