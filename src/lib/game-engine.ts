/**
 * Moteur de jeu CreatorDeck — pur et isomorphe.
 *
 * Aucune dépendance à Node, au DOM ou au stockage : toutes les fonctions
 * prennent un état + un instant `now` et retournent un nouvel état. C'est ce
 * qui permet de faire tourner le jeu hors ligne sur le téléphone (WebView
 * Capacitor / PWA) et, si un mode en ligne arrive un jour, d'exécuter
 * exactement le même code côté serveur.
 *
 * Les probabilités de tirage ne sont pas écrites ici : elles vivent dans
 * `src/data/pull-rates.json` (modèle `pullRates.json` de
 * pokemon-tcg-pocket-database) et l'écran « Taux de drop » les recalcule à
 * partir du même fichier. Équilibrer le jeu = éditer le JSON.
 *
 * La persistance est gérée à part (src/lib/save-store.ts).
 */
import {
  CREATORS,
  CREATOR_BY_SLUG,
  PACKS,
  RARITY_META,
  type CardVariant,
  type Creator,
  type PackType,
  type Rarity,
} from "@/lib/catalog";
import { PULL_RATES, type RarityWeights } from "@/lib/pull-rates";
import { SEASONS, SEASON_BY_ID, type SeasonReward, type SeasonTier } from "@/lib/seasons";
import {
  DEFAULT_THEME,
  DEFAULT_THEME_ID,
  THEMES,
  themeById,
  unlockHint,
  type CollectionTheme,
} from "@/lib/cosmetics";
import { randomInt, randomUUID } from "@/lib/random";

export const SAVE_VERSION = 5 as const;

/** Points d'expérience nécessaires par niveau. */
export const XP_PER_LEVEL = 100;
/** Sabliers offerts à chaque niveau gagné. */
export const HOURGLASSES_PER_LEVEL = 3;
/**
 * Temps de recharge retiré par un sablier.
 *
 * Un seul booster, donc une seule valeur : la moitié d'un cycle de recharge.
 */
export const HOURGLASS_REDUCTION_MS: Record<PackType, number> = {
  live: 15 * 60 * 1000,
};

/**
 * Le booster du jeu. Il n'y en a qu'un (un paquet de 5 cartes gratuit qui se
 * recharge) : garder une clé rend les tables de tirage indexables, et laisse la
 * porte ouverte à un second paquet sans casser la sauvegarde.
 */
export const ACTIVE_PACK: PackType = "live";
/** Variante créée par l'Atelier : les variantes Live/Holo/Gold se tirent. */
export const CRAFTED_VARIANT: CardVariant = "standard";

export type OwnedCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  /** Epoch ms. */
  obtainedAt: number;
  /** Carte issue d'un booster « Perfect » (Épique ou mieux de partout). */
  rareDrop: boolean;
  /**
   * Numéro de l'échange qui a apporté la carte (absent si elle vient d'un
   * booster ou de l'Atelier). Sert au classeur (« reçue en échange ») et de
   * garde-fou : voir `applyTradeResult`.
   */
  fromTrade?: number;
};

export type DrawnCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  isNew: boolean;
  /** Toutes les cartes d'un même booster partagent ce drapeau. */
  rareDrop: boolean;
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
  /** Boosters en réserve (un seul type de booster). */
  packs: number;
  /** Epoch ms : ancre de la recharge en cours (voir refreshBalances). */
  lastPackRegen: number;
  openings: number;
  cards: OwnedCard[];
  /**
   * Nombre de paliers déjà réclamés par saison (`seasonId` → compteur).
   *
   * Les paliers d'une saison se réclament dans l'ordre : stocker le compteur
   * suffit, et une sauvegarde v1/v2 (où la saison entière se réclamait d'un
   * bloc) se migre en créditant tous ses paliers.
   */
  claimedTiers: Record<string, number>;
  /** Identifiant du thème de collection équipé (voir `@/lib/cosmetics`). */
  themeId: string;
};

/** Palier prêt à afficher : débloqué et/ou déjà réclamé. */
export type SeasonTierView = SeasonTier & { unlocked: boolean; claimed: boolean };

/** Vue dérivée d'une saison, prête à afficher. */
/** Thème prêt à afficher : débloqué ou non, avec ce qu'il reste à faire. */
export type ThemeView = {
  id: string;
  name: string;
  description: string;
  unlockHint: string;
  unlocked: boolean;
  /** Thème actuellement équipé. */
  equipped: boolean;
  tokens: CollectionTheme["tokens"];
};

export type SeasonView = {
  id: string;
  name: string;
  tagline: string;
  /** Familles (langues) couvertes par ce morceau de saison. */
  regions: string[];
  owned: number;
  total: number;
  complete: boolean;
  /** Tous les paliers **de ce morceau** sont réclamés. */
  claimed: boolean;
  /** Nombre de paliers débloqués mais pas encore réclamés. */
  claimable: number;
  /** Points encore à récupérer sur les paliers débloqués. */
  claimablePoints: number;
  /** Sabliers encore à récupérer (0 sauf si le dernier palier est débloqué). */
  claimableHourglasses: number;
  tiers: SeasonTierView[];
  /** Famille d'appartenance (`S01-2` → `S01`) : identité visuelle et thème. */
  familyId: string;
  /** Numéro du morceau dans sa famille. */
  piece: number;
  /** Nombre de morceaux de la famille. */
  pieces: number;
  /**
   * Emblème de la famille gagné : **tous** ses morceaux sont réclamés.
   *
   * Une famille découpée pour rester jouable reste une seule identité : elle ne
   * donne qu'un emblème, à la fin, et non un par morceau.
   */
  familyComplete: boolean;
};

/** Vue dérivée consommée par l'interface. */
export type GameView = {
  player: {
    level: number;
    xp: number;
    xpNext: number;
    points: number;
    hourglasses: number;
    /** Boosters en réserve. */
    packs: number;
    /** Epoch ms du prochain booster, ou null si la réserve est pleine. */
    nextPackAt: number | null;
  };
  cards: OwnedCard[];
  stats: {
    uniqueCreators: number;
    totalCards: number;
    openings: number;
    /** Doublons recyclables (copies au-delà de la première, par variante). */
    duplicates: number;
    /** Points récupérables en recyclant tous ces doublons. */
    recycleValue: number;
    rareDrops: number;
  };
  seasons: SeasonView[];
  /** Cosmétiques : thèmes de classeur, débloqués par les emblèmes. */
  themes: ThemeView[];
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
    // Trois boosters d'accueil (15 cartes) : de quoi comprendre la boucle,
    // puis la recharge prend le relais.
    packs: 3,
    lastPackRegen: now,
    openings: 0,
    cards: [],
    claimedTiers: {},
    themeId: DEFAULT_THEME_ID,
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

  const pack = refreshOne(state.packs, PACKS.live.max, state.lastPackRegen, PACKS.live.regenMs);

  if (pack.stock === state.packs && pack.last === state.lastPackRegen) {
    return state;
  }

  return {
    ...state,
    packs: pack.stock,
    lastPackRegen: pack.last,
  };
}

/**
 * Tire une rareté selon `weights` (parmi celles encore disponibles), puis un
 * créateur uniformément dans la rareté choisie. Les poids déclarés décrivent
 * donc exactement la probabilité affichée : c'est le contrat de l'écran
 * « Taux de drop ».
 */
function chooseCreator(weights: RarityWeights, used: ReadonlySet<string>): Creator {
  const available = CREATORS.filter(
    (creator) => !used.has(creator.slug) && (weights[creator.rarity] ?? 0) > 0,
  );
  if (!available.length) {
    throw new GameError("Le catalogue disponible est vide.", "EMPTY_CATALOG");
  }

  const weightedRarities = (Object.keys(weights) as Rarity[])
    .map((rarity) => ({
      rarity,
      weight: available.some((creator) => creator.rarity === rarity) ? (weights[rarity] ?? 0) : 0,
    }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => RARITY_META[a.rarity].order - RARITY_META[b.rarity].order);

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

/**
 * Variante cosmétique d'une carte, selon la table du booster. Un « Perfect »
 * améliore presque toujours la variante (Holo, ou Gold sur une Légendaire).
 */
function chooseVariant(packType: PackType, creator: Creator, rareDrop: boolean): CardVariant {
  const chances = PULL_RATES[packType].variants;
  const roll = randomInt(10_000);

  if (rareDrop && roll < PULL_RATES[packType].rareDrop.variantUpgradePermille) {
    return creator.rarity === "legendary" ? "gold" : "holo";
  }

  const goldRarity = chances.goldRarity ?? "legendary";
  if (chances.goldPermille && creator.rarity === goldRarity && roll < chances.goldPermille) {
    return "gold";
  }

  const holoFrom = chances.holoFromRarity ?? "rare";
  if (
    chances.holoPermille &&
    RARITY_META[creator.rarity].order >= RARITY_META[holoFrom].order &&
    roll < chances.holoPermille
  ) {
    return "holo";
  }

  return "standard";
}

/**
 * Tire le contenu d'un booster depuis `pull-rates.json` : un slot par carte
 * (les taux montent au fil du booster), puis le slot garanti — Rare ou mieux,
 * variante Live imposée.
 *
 * `options.rareDrop` force (ou désactive) le tirage « Perfect » : réservé aux
 * tests et aux futurs événements à taux boosté.
 */
export function drawPack(
  packType: PackType,
  alreadyOwned: ReadonlySet<string>,
  options: { rareDrop?: boolean } = {},
): DrawnCard[] {
  const table = PULL_RATES[packType];
  const size = PACKS[packType].size;
  const rareDrop =
    options.rareDrop ?? randomInt(1000) < table.rareDrop.chancePermille;
  const weightsFor = (index: number): RarityWeights =>
    rareDrop ? table.rareDrop.weights : table.slots[index].weights;

  const used = new Set<string>();
  const drawn: DrawnCard[] = [];

  for (let index = 0; index < size - 1; index += 1) {
    const creator = chooseCreator(weightsFor(index), used);
    used.add(creator.slug);
    drawn.push({
      id: randomUUID(),
      creatorSlug: creator.slug,
      rarity: creator.rarity,
      variant: chooseVariant(packType, creator, rareDrop),
      isNew: !alreadyOwned.has(creator.slug),
      rareDrop,
    });
  }

  const guaranteed = chooseCreator(
    rareDrop ? table.rareDrop.weights : table.guaranteed.weights,
    used,
  );
  drawn.push({
    id: randomUUID(),
    creatorSlug: guaranteed.slug,
    rarity: guaranteed.rarity,
    variant: table.guaranteed.variant ?? chooseVariant(packType, guaranteed, rareDrop),
    isNew: !alreadyOwned.has(guaranteed.slug),
    rareDrop,
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

function cardKey(card: Pick<OwnedCard, "creatorSlug" | "variant">): string {
  return `${card.creatorSlug}|${card.variant}`;
}

export type DuplicateGroup = {
  creatorSlug: string;
  variant: CardVariant;
  rarity: Rarity;
  /** Nombre de copies possédées pour ce créateur + cette variante. */
  count: number;
  /** Copies recyclables (toutes sauf la plus ancienne), de la plus ancienne à la plus récente. */
  recyclableIds: string[];
  /** Points gagnés par recyclage d'une copie. */
  unitValue: number;
};

/** Regroupe les doublons recyclables : au moins 2 copies d'un même couple créateur + variante. */
export function duplicateGroups(state: Pick<PlayerState, "cards">): DuplicateGroup[] {
  const groups = new Map<string, OwnedCard[]>();
  for (const card of state.cards) {
    const key = cardKey(card);
    const bucket = groups.get(key);
    if (bucket) bucket.push(card);
    else groups.set(key, [card]);
  }

  const result: DuplicateGroup[] = [];
  for (const cards of groups.values()) {
    if (cards.length < 2) continue;
    const sorted = [...cards].sort((a, b) => a.obtainedAt - b.obtainedAt || a.id.localeCompare(b.id));
    const [keep, ...extras] = sorted;
    const creator = CREATOR_BY_SLUG.get(keep.creatorSlug);
    if (!creator) continue;
    result.push({
      creatorSlug: keep.creatorSlug,
      variant: keep.variant,
      rarity: creator.rarity,
      count: sorted.length,
      recyclableIds: extras.map((card) => card.id),
      unitValue: RARITY_META[creator.rarity].recycleValue,
    });
  }
  return result.sort(
    (a, b) =>
      RARITY_META[b.rarity].order - RARITY_META[a.rarity].order ||
      b.count - a.count ||
      a.creatorSlug.localeCompare(b.creatorSlug),
  );
}

/**
 * Recycle un doublon : la carte est retirée et sa valeur en points est
 * créditée. Refusé si la carte est la dernière copie de ce créateur + variante
 * (on ne recycle jamais sa seule carte).
 */
export function recycleCard(
  state: PlayerState,
  cardId: string,
  now = Date.now(),
): PlayerState {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    throw new GameError("Cette carte n'est pas dans la collection.", "CARD_NOT_FOUND");
  }
  const sameKey = state.cards.filter((entry) => cardKey(entry) === cardKey(card));
  if (sameKey.length < 2) {
    throw new GameError(
      "Impossible de recycler ta seule copie de cette carte.",
      "NOT_A_DUPLICATE",
    );
  }

  return {
    ...state,
    updatedAt: now,
    points: state.points + RARITY_META[card.rarity].recycleValue,
    cards: state.cards.filter((entry) => entry.id !== cardId),
  };
}

/** Peut-on rejoindre ce créateur depuis l'Atelier, et à quel prix ? */
export function craftQuote(
  state: PlayerState,
  creatorSlug: string,
): { creator: Creator | undefined; cost: number | null; craftable: boolean; owned: boolean } {
  const creator = CREATOR_BY_SLUG.get(creatorSlug);
  const meta = creator ? RARITY_META[creator.rarity] : undefined;
  return {
    creator,
    cost: meta?.craftCost ?? null,
    craftable: meta?.craftable ?? false,
    owned: state.cards.some((card) => card.creatorSlug === creatorSlug),
  };
}

/**
 * Rejoint un créateur manquant contre des points. La carte créée est toujours
 * Standard : les variantes Live/Holo/Gold restent la récompense des boosters.
 */
export function craftCreator(
  state: PlayerState,
  creatorSlug: string,
  now = Date.now(),
): PlayerState {
  const { creator, cost, craftable, owned } = craftQuote(state, creatorSlug);
  if (!creator) {
    throw new GameError("Créateur inconnu du catalogue.", "UNKNOWN_CREATOR");
  }
  if (owned) {
    throw new GameError("Tu possèdes déjà ce créateur.", "ALREADY_OWNED");
  }
  if (!craftable || cost === null) {
    throw new GameError(
      `Les cartes ${RARITY_META[creator.rarity].label} ne sont pas artisanales : elles se tirent en booster.`,
      "NOT_CRAFTABLE",
    );
  }
  if (state.points < cost) {
    throw new GameError(
      `Il te manque ${cost - state.points} points pour rejoindre ce créateur.`,
      "NOT_ENOUGH_POINTS",
    );
  }

  const card: OwnedCard = {
    id: randomUUID(),
    creatorSlug,
    rarity: creator.rarity,
    variant: CRAFTED_VARIANT,
    obtainedAt: now,
    rareDrop: false,
  };

  return {
    ...state,
    updatedAt: now,
    points: state.points - cost,
    cards: [...state.cards, card],
  };
}

/** Progression des saisons : complétion, paliers débloqués et à réclamer. */
export function seasonViews(state: PlayerState): SeasonView[] {
  const owned = ownedSlugs(state);
  // Nombre de morceaux par famille, pour l'affichage (« morceau 2/2 »).
  const piecesByFamily = new Map<string, number>();
  for (const season of SEASONS) {
    piecesByFamily.set(season.familyId, (piecesByFamily.get(season.familyId) ?? 0) + 1);
  }
  // Familles refermées : tous les morceaux entièrement réclamés.
  const familyClosure = new Map<string, { total: number; closed: number }>();
  for (const season of SEASONS) {
    const entry = familyClosure.get(season.familyId) ?? { total: 0, closed: 0 };
    entry.total += 1;
    if ((state.claimedTiers[season.id] ?? 0) >= season.tiers.length) entry.closed += 1;
    familyClosure.set(season.familyId, entry);
  }

  return SEASONS.map((season) => {
    const count = season.slugs.filter((slug) => owned.has(slug)).length;
    const claimedCount = Math.min(
      state.claimedTiers[season.id] ?? 0,
      season.tiers.length,
    );
    const closure = familyClosure.get(season.familyId);
    const familyComplete = Boolean(closure && closure.total > 0 && closure.closed === closure.total);
    const tiers: SeasonTierView[] = season.tiers.map((tier, index) => ({
      ...tier,
      unlocked: count >= tier.required,
      claimed: index < claimedCount,
    }));
    const pending = tiers.filter((tier) => tier.unlocked && !tier.claimed);
    return {
      id: season.id,
      name: season.name,
      tagline: season.tagline,
      regions: season.regions,
      owned: count,
      total: season.slugs.length,
      complete: count >= season.slugs.length,
      claimed: claimedCount >= season.tiers.length && season.tiers.length > 0,
      claimable: pending.length,
      claimablePoints: pending.reduce((sum, tier) => sum + tier.reward.points, 0),
      claimableHourglasses: pending.reduce((sum, tier) => sum + tier.reward.hourglasses, 0),
      tiers,
      familyId: season.familyId,
      piece: season.piece,
      pieces: piecesByFamily.get(season.familyId) ?? 1,
      familyComplete,
    };
  });
}

/**
 * Thèmes de collection : un par famille (débloqué par son emblème) et le
 * « Grand chelem » une fois toutes les familles complétées.
 */
export function themeViews(state: PlayerState): ThemeView[] {
  const seasons = seasonViews(state);
  // Complétion par famille : tous les morceaux refermés.
  const completeFamilies = new Set<string>();
  const byFamily = new Map<string, boolean>();
  for (const season of seasons) {
    byFamily.set(season.familyId, (byFamily.get(season.familyId) ?? true) && season.familyComplete);
  }
  for (const [familyId, complete] of byFamily) {
    if (complete) completeFamilies.add(familyId);
  }
  const allFamilies = byFamily.size > 0 && completeFamilies.size === byFamily.size;
  const equippedId = themeById(state.themeId)?.id ?? DEFAULT_THEME_ID;

  const unlockedIds = new Set(
    THEMES.filter((theme) => {
      if (theme.unlock.kind === "starter") return true;
      if (theme.unlock.kind === "family") return completeFamilies.has(theme.unlock.familyId);
      return allFamilies;
    }).map((theme) => theme.id),
  );

  return THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    unlockHint: unlockHint(theme),
    unlocked: unlockedIds.has(theme.id),
    // Un thème verrouillé ne peut pas être équipé, même dans une sauvegarde
    // trafiquée : l'affichage retombe sur le thème d'origine.
    equipped: theme.id === equippedId && unlockedIds.has(theme.id),
    tokens: theme.tokens,
  }));
}

/** Thème réellement appliqué (le thème d'origine si l'équipé est verrouillé). */
export function activeTheme(state: PlayerState): CollectionTheme {
  const equipped = themeById(state.themeId);
  if (!equipped) return DEFAULT_THEME;
  return themeViews(state).find((theme) => theme.id === equipped.id)?.unlocked
    ? equipped
    : DEFAULT_THEME;
}

/** Équipe un thème débloqué. */
export function equipTheme(state: PlayerState, themeId: string, now = Date.now()): PlayerState {
  const theme = themeById(themeId);
  if (!theme) {
    throw new GameError("Thème inconnu.", "UNKNOWN_THEME");
  }
  if (!themeViews(state).find((view) => view.id === theme.id)?.unlocked) {
    throw new GameError("Thème verrouillé : complète d'abord sa famille.", "THEME_LOCKED");
  }
  return { ...state, updatedAt: now, themeId: theme.id };
}

/**
 * Réclame les paliers débloqués d'une saison (points de chaque palier, plus les
 * sabliers et l'emblème sur le dernier).
 *
 * Tous les paliers franchis et non réclamés sont crédités d'un coup : inutile
 * de cliquer quatre fois pour la même saison.
 */
export function claimSeason(
  state: PlayerState,
  seasonId: string,
  now = Date.now(),
): PlayerState {
  const season = SEASON_BY_ID.get(seasonId);
  if (!season) {
    throw new GameError("Saison inconnue.", "UNKNOWN_SEASON");
  }
  const claimedCount = Math.min(state.claimedTiers[seasonId] ?? 0, season.tiers.length);
  if (claimedCount >= season.tiers.length) {
    throw new GameError("Récompense déjà réclamée.", "SEASON_CLAIMED");
  }

  const owned = ownedSlugs(state);
  const ownedCount = season.slugs.filter((slug) => owned.has(slug)).length;
  const unlocked = season.tiers.filter(
    (tier, index) => index >= claimedCount && ownedCount >= tier.required,
  );
  if (!unlocked.length) {
    const next = season.tiers[claimedCount];
    const missing = Math.max(1, next.required - ownedCount);
    throw new GameError(
      `Saison incomplète : ${missing} créateur${missing > 1 ? "s" : ""} manquant${missing > 1 ? "s" : ""} pour « ${next.label} ».`,
      "SEASON_INCOMPLETE",
    );
  }

  return {
    ...state,
    updatedAt: now,
    points: state.points + unlocked.reduce((sum, tier) => sum + tier.reward.points, 0),
    hourglasses:
      state.hourglasses + unlocked.reduce((sum, tier) => sum + tier.reward.hourglasses, 0),
    claimedTiers: { ...state.claimedTiers, [seasonId]: claimedCount + unlocked.length },
  };
}

/**
 * Ouvre un booster : consomme un exemplaire, crédite points/XP/niveaux et
 * ajoute les cartes tirées à la collection.
 */
export function openPack(
  state: PlayerState,
  now = Date.now(),
): { state: PlayerState; cards: DrawnCard[] } {
  const refreshed = refreshBalances(state, now);
  if (refreshed.packs <= 0) {
    throw new GameError("Aucun booster disponible pour le moment.", "PACK_NOT_READY");
  }

  const cards = drawPack(ACTIVE_PACK, ownedSlugs(refreshed));

  // Même application qu'un tirage serveur : un seul endroit calcule les
  // points, l'XP, les niveaux et le rangement des cartes. `refreshBalances`
  // laisse l'ancre à `now` quand la réserve était pleine, donc la nouvelle
  // recharge repart bien de maintenant.
  return applyPackResult(
    refreshed,
    cards,
    refreshed.packs - 1,
    refreshed.lastPackRegen,
    refreshed.openings + 1,
    now,
  );
}

/** Borne une réserve venue du serveur (la table la contraint déjà à 0..4). */
function clampPacks(value: number): number {
  const max = PACKS[ACTIVE_PACK].max;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

/** Horodatage serveur (`timestamptz` ISO ou epoch ms) → millisecondes. */
function serverTimeMs(value: string | number, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Applique le résultat d'un tirage décidé par le serveur.
 *
 * Le serveur fournit les cartes (infalsifiables) et les compteurs de boosters
 * (`packs`, `lastPackRegen`, `openings`). Le client calcule localement les
 * points, l'XP et les niveaux : ces valeurs ne concernent que l'appareil.
 *
 * Réutilisée par le chemin serveur (cloud configuré + connecté) et par le
 * chemin local (cloud non configuré), ce qui garantit que les deux appliquent
 * la même économie.
 */
export function applyPackResult(
  state: PlayerState,
  serverCards: Array<{
    creatorSlug: string;
    rarity: Rarity;
    variant: CardVariant;
    rareDrop: boolean;
  }>,
  serverPacks: number,
  serverLastRegenAt: string | number,
  serverOpenings: number,
  now = Date.now(),
): { state: PlayerState; cards: DrawnCard[] } {
  const owned = ownedSlugs(state);
  const pack = PACKS[ACTIVE_PACK];
  const nextXp = state.xp + pack.xp;
  const nextLevel = Math.floor(nextXp / XP_PER_LEVEL) + 1;
  const gainedLevels = Math.max(0, nextLevel - state.level);

  // lastPackRegen : le serveur renvoie un timestamptz ISO (ou un epoch ms).
  const lastRegenMs = serverTimeMs(serverLastRegenAt, now);

  const cards: DrawnCard[] = serverCards.map((card) => ({
    id: randomUUID(),
    creatorSlug: card.creatorSlug,
    rarity: card.rarity,
    variant: card.variant,
    isNew: !owned.has(card.creatorSlug),
    rareDrop: card.rareDrop,
  }));

  const next: PlayerState = {
    ...state,
    updatedAt: now,
    packs: clampPacks(serverPacks),
    lastPackRegen: lastRegenMs,
    points: state.points + pack.points,
    xp: nextXp,
    level: nextLevel,
    hourglasses: state.hourglasses + gainedLevels * HOURGLASSES_PER_LEVEL,
    openings: serverOpenings,
    cards: [
      ...state.cards,
      ...cards.map<OwnedCard>((card) => ({
        id: card.id,
        creatorSlug: card.creatorSlug,
        rarity: card.rarity,
        variant: card.variant,
        obtainedAt: now,
        rareDrop: card.rareDrop,
      })),
    ],
  };

  return { state: next, cards };
}

/**
 * Adopte la réserve de boosters décidée par le serveur (`pack_status()`).
 *
 * Sert à afficher le bon compteur et le bon compte à rebours dès la connexion,
 * avant toute ouverture. La recharge passive se recale ensuite sur la même
 * ancre que le serveur : l'affichage et le tirage restent d'accord. Les points,
 * l'XP, le niveau, les sabliers et la collection ne bougent pas.
 */
export function applyPackStatus(
  state: PlayerState,
  serverPacks: number,
  serverLastRegenAt: string | number,
  now = Date.now(),
): PlayerState {
  const packs = clampPacks(serverPacks);
  const lastPackRegen = serverTimeMs(serverLastRegenAt, now);
  if (packs === state.packs && lastPackRegen === state.lastPackRegen) return state;
  return { ...state, updatedAt: now, packs, lastPackRegen };
}

/** Une carte échangée : le minimum que le serveur transmet pour la déplacer. */
export type TradeCard = {
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
};

/** Ce qu'un échange déplace, du point de vue du joueur qui l'applique. */
export type TradeMove = {
  /** Numéro de l'échange côté serveur (marque les cartes reçues). */
  tradeId: number;
  /** Cartes que le joueur donne (retirées de sa collection). */
  given: readonly TradeCard[];
  /** Cartes que le joueur reçoit (ajoutées à sa collection). */
  received: readonly TradeCard[];
};

/**
 * Applique un échange accepté à la partie locale.
 *
 * Mêmes règles que la fonction SQL `respond_trade()` : une copie retirée par
 * carte donnée, en commençant par la **plus ancienne** ; une carte reçue par
 * carte obtenue, avec un identifiant neuf et `fromTrade`.
 *
 * Idempotent : si une carte de la collection porte déjà `fromTrade = tradeId`,
 * l'échange a déjà été appliqué (le serveur l'a écrit, puis la partie a été
 * rechargée) et l'état est renvoyé tel quel. Sans ce garde-fou, appliquer deux
 * fois le même échange dupliquerait les cartes reçues.
 *
 * Les points, l'XP, le niveau et les boosters ne bougent pas : un troc ne fait
 * que déplacer des cartes.
 */
export function applyTradeResult(state: PlayerState, move: TradeMove, now = Date.now()): PlayerState {
  if (state.cards.some((card) => card.fromTrade === move.tradeId)) return state;

  let cards = [...state.cards];
  for (const given of move.given) {
    // La plus ancienne d'abord, puis l'identifiant : deux copies reçues au
    // même instant partent dans un ordre stable, identique côté serveur.
    let index = -1;
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (card.creatorSlug !== given.creatorSlug || card.variant !== given.variant) continue;
      if (index === -1) {
        index = i;
        continue;
      }
      const current = cards[index];
      const earlier =
        card.obtainedAt < current.obtainedAt ||
        (card.obtainedAt === current.obtainedAt && card.id < current.id);
      if (earlier) index = i;
    }
    if (index === -1) {
      throw new GameError(
        `Échange impossible : ${given.creatorSlug} (${given.variant}) n'est plus dans ta collection.`,
        "TRADE_CARD_MISSING",
      );
    }
    cards = [...cards.slice(0, index), ...cards.slice(index + 1)];
  }

  const received: OwnedCard[] = move.received.map((card) => ({
    id: randomUUID(),
    creatorSlug: card.creatorSlug,
    rarity: card.rarity,
    variant: card.variant,
    obtainedAt: now,
    // Une carte d'échange n'est pas un « Perfect » : elle ne doit pas gonfler
    // les statistiques de chance du joueur.
    rareDrop: false,
    fromTrade: move.tradeId,
  }));

  return { ...state, updatedAt: now, cards: [...cards, ...received] };
}

/** Dépense un sablier pour avancer la recharge du booster choisi. */
export function spendHourglass(state: PlayerState, now = Date.now()): PlayerState {
  const refreshed = refreshBalances(state, now);
  if (refreshed.hourglasses <= 0) {
    throw new GameError("Aucun sablier disponible.", "NO_HOURGLASS");
  }
  if (refreshed.packs >= PACKS.live.max) {
    throw new GameError("La réserve de boosters est déjà pleine.", "PACK_FULL");
  }

  const shifted: PlayerState = {
    ...refreshed,
    hourglasses: refreshed.hourglasses - 1,
    lastPackRegen: refreshed.lastPackRegen - HOURGLASS_REDUCTION_MS[ACTIVE_PACK],
  };
  return { ...refreshBalances(shifted, now), updatedAt: now };
}

/** Projette l'état en vue prête à afficher (compteurs, prochaines recharges). */
export function getGameView(state: PlayerState, now = Date.now()): GameView {
  const refreshed = refreshBalances(state, now);
  const uniqueCreators = ownedSlugs(refreshed).size;
  const duplicates = duplicateGroups(refreshed);
  return {
    player: {
      level: refreshed.level,
      xp: refreshed.xp,
      xpNext: refreshed.level * XP_PER_LEVEL,
      points: refreshed.points,
      hourglasses: refreshed.hourglasses,
      packs: refreshed.packs,
      nextPackAt:
        refreshed.packs >= PACKS.live.max ? null : refreshed.lastPackRegen + PACKS.live.regenMs,
    },
    cards: refreshed.cards,
    stats: {
      uniqueCreators,
      totalCards: refreshed.cards.length,
      openings: refreshed.openings,
      duplicates: duplicates.reduce((sum, group) => sum + group.recyclableIds.length, 0),
      recycleValue: duplicates.reduce(
        (sum, group) => sum + group.recyclableIds.length * group.unitValue,
        0,
      ),
      rareDrops: refreshed.cards.filter((card) => card.rareDrop).length,
    },
    seasons: seasonViews(refreshed),
    themes: themeViews(refreshed),
  };
}
