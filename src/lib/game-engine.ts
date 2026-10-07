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
  CATALOG_SIZE,
  CREATORS,
  CREATOR_BY_SLUG,
  RETIRED_BY_SLUG,
  PACKS,
  RARITY_META,
  type CardVariant,
  type Creator,
  type PackType,
  type Rarity,
} from "@/lib/catalog";
import { DIRECT_BONUS, PITY, PULL_RATES, type RarityWeights } from "@/lib/pull-rates";
import {
  MISSIONS,
  PROGRESSION,
  TOKEN_TARGET_COST,
  follows,
  gameDay,
  isPrimeTime,
  streakRewardFor,
  tokensForPack,
  type MissionId,
} from "@/lib/progression";
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
import { canCraftRetired } from "@/lib/retired";

export const SAVE_VERSION = 8 as const;

/** Points d'expérience nécessaires par niveau. */
export const XP_PER_LEVEL = 100;
/** Sabliers offerts à chaque niveau gagné. */
export const HOURGLASSES_PER_LEVEL = 3;
/**
 * Temps de recharge retiré par un sablier, **par paquet à réserve**.
 *
 * Le Paquet Scène n'y figure pas : ce n'est pas une réserve qui se recharge,
 * c'est un rendez-vous quotidien — un sablier n'avance pas un jour.
 */
export const HOURGLASS_REDUCTION_MS: Partial<Record<PackType, number>> = {
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
  /**
   * Numéro de l'annonce de l'hôtel des ventes qui a apporté la carte. Même
   * rôle que `fromTrade` : c'est la marque qui empêche d'appliquer deux fois
   * le même achat (voir `applyMarketPurchase`).
   */
  fromMarket?: number;
  /**
   * Numéro du Last Pack dont la carte a été prise. Même rôle que `fromTrade`
   * et `fromMarket`, et c'est aussi ce qui permet au classeur de dire d'où
   * vient la carte. Deux cartes d'un même paquet peuvent être prises deux
   * jours différents : l'idempotence de `applyLastPackSteal` se fait donc sur
   * l'**identifiant de la carte**, pas sur ce numéro.
   */
  fromLastPack?: number;
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
  /**
   * Jalons du parcours déjà réclamés (voir `MILESTONES`).
   *
   * Un tableau d'identifiants plutôt qu'un booléen : ajouter un jalon plus tard
   * ne casse aucune sauvegarde, et un jalon n'est crédité qu'une fois.
   */
  claimedMilestones: string[];
  /** Identifiant du thème de collection équipé (voir `@/lib/cosmetics`). */
  themeId: string;
  /**
   * Jetons : la monnaie lente (5 par booster, 400 pour la carte visée).
   *
   * Elle double le recyclage — qui, lui, paie des points tout de suite. Un
   * jeton ne s'achète pas et ne se troque pas : il ne s'obtient qu'en jouant.
   */
  tokens: number;
  /**
   * Boosters ouverts depuis le dernier Légendaire. Sert au plancher de
   * malchance (`PITY`) : à 12, le 5ᵉ slot en garantit un.
   */
  pityCounter: number;
  /**
   * Missions du jour : pour quelle journée de jeu (`gameDay`) et ce qui a été
   * fait (`missionId` → progression). Deux champs séparés parce qu'un jour qui
   * change doit **remettre les compteurs à zéro** sans qu'on ait à réfléchir.
   */
  missionDay: string;
  missions: Partial<Record<MissionId, number>>;
  /**
   * Série de jours : la journée du dernier booster ouvert, et le nombre de
   * jours d'affilée jusqu'à cette journée-là.
   */
  streakDay: string;
  streak: number;
  /**
   * Vrai quand le 7ᵉ jour de la série a été atteint et que la récompense
   * attend : un booster Perfect garanti **ou** 3 sabliers.
   */
  streakJackpot: boolean;
  /**
   * La journée de jeu du dernier **Paquet Scène** ouvert (chaîne vide si aucun).
   *
   * Le Paquet Scène n'est pas une réserve qui se recharge : c'est un
   * rendez-vous quotidien, un par jour de jeu (6 h UTC, la même journée que les
   * missions). Une seule date suffit donc à savoir s'il est encore disponible —
   * et en ligne, c'est le journal des tirages du serveur qui fait foi.
   */
  sceneDay: string;
};

/**
 * La saison que le joueur remplit en ce moment : la famille (par langue) où il
 * lui reste le plus de créateurs à découvrir, en proportion.
 *
 * L'écran d'accueil affichait « S01 » en dur, quelle que soit la partie : un
 * joueur qui n'avait pas un seul streameur français voyait quand même
 * « France & francophonie ». Ce calcul remplace la constante.
 *
 * Toutes les familles complètes → la dernière (la plus récente) : le titre reste
 * juste, et il n'y a plus rien à viser.
 */
export type CurrentSeason = {
  familyId: string;
  /** Nom lisible de la famille (« France & francophonie »). */
  name: string;
  /** Nom du morceau en cours, quand la famille est découpée en vagues. */
  pieceName: string;
  owned: number;
  total: number;
};

/**
 * Une famille de collection, vagues comprises : `S04-1` + `S04-2` + `S04-3`
 * forment `S04`, et c'est ce total-là qui compte pour dire « il te reste 12
 * créateurs à découvrir dans l'anglophonie ».
 */
type FamilyTotals = {
  familyId: string;
  name: string;
  owned: number;
  total: number;
  views: SeasonView[];
};

/** Regroupe les saisons par famille (une famille peut être découpée en vagues). */
function familyTotals(state: PlayerState): FamilyTotals[] {
  const families = new Map<string, FamilyTotals>();
  for (const view of seasonViews(state)) {
    const entry = families.get(view.familyId) ?? {
      familyId: view.familyId,
      name: view.name.replace(/ · \d+\/\d+$/, ""),
      owned: 0,
      total: 0,
      views: [],
    };
    entry.owned += view.owned;
    entry.total += view.total;
    entry.views.push(view);
    families.set(view.familyId, entry);
  }
  return [...families.values()];
}

/** Une famille telle que la voit le Paquet Scène. */
export type SceneFamily = Pick<FamilyTotals, "familyId" | "name" | "owned" | "total">;

export function currentSeason(state: PlayerState): CurrentSeason | null {
  const views = seasonViews(state);
  if (!views.length) return null;

  // Le regroupement par famille est partagé avec le Paquet Scène : les deux
  // doivent parler des mêmes totaux, sinon l'écran annoncerait « 12/155 » et le
  // paquet viserait une autre famille.
  const families = familyTotals(state);

  let best: FamilyTotals | null = null;
  let last: FamilyTotals | null = null;
  let bestRatio = -1;
  for (const entry of families) {
    last = entry;
    if (entry.total <= 0 || entry.owned >= entry.total) continue;
    const ratio = entry.owned / entry.total;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = entry;
    }
  }
  const chosen = best ?? last;
  if (!chosen) return null;

  // Morceau à viser : le premier dont il manque encore des créateurs.
  const pending = chosen.views.find((view) => view.owned < view.total) ?? chosen.views[0];
  return {
    familyId: chosen.familyId,
    name: chosen.name,
    pieceName: pending.name,
    owned: pending.owned,
    total: pending.total,
  };
}

/**
 * Combien de créateurs une famille doit compter pour qu'un Paquet Scène puisse
 * la viser : cinq cartes, aucune en double dans la même ouverture. Une famille
 * plus petite (deux créateurs, aujourd'hui) se termine très bien au Live Drop —
 * lui coller un paquet dédié serait une promesse impossible à tenir.
 */
export const SCENE_MIN_FAMILY = PACKS.scene.size;

/**
 * La famille que vise le **Paquet Scène** : celle que le joueur complète le
 * plus (le même choix que `currentSeason`), à condition qu'elle puisse remplir
 * un paquet — et si toutes sont terminées, la plus grande, pour que le paquet
 * serve encore à quelque chose (des doublons, du recyclage).
 *
 * La règle est la même des deux côtés : le client l'affiche, et le serveur
 * vérifie que la famille qu'on lui demande existe et tient bien cinq cartes.
 */
export function sceneFamily(state: PlayerState): SceneFamily | null {
  const families = familyTotals(state).filter((entry) => entry.total >= SCENE_MIN_FAMILY);
  if (!families.length) return null;

  let best: SceneFamily | null = null;
  let bestRatio = -1;
  for (const entry of families) {
    if (entry.owned >= entry.total) continue;
    const ratio = entry.owned / entry.total;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = entry;
    }
  }
  if (best) return best;

  // Toutes les familles sont complètes : la plus grande sert de terrain de jeu.
  return families.reduce((largest, entry) => (entry.total > largest.total ? entry : largest));
}

/**
 * Jalons du parcours de collectionneur (écran Objectifs).
 *
 * Ils étaient affichés sans aucune récompense — des jauges mortes — et deux
 * cibles restaient écrites en dur (25 puis 100) alors que le texte annonçait
 * 5 % et 20 % du catalogue (50 et 200). Seuils et gains vivent maintenant ici,
 * à un seul endroit, et chaque jalon se réclame **une fois**.
 *
 * Les paliers de collection sont **fixes** (10, 25, 50, 100) et non plus une
 * fraction du catalogue : un pourcentage change de valeur le jour où le
 * catalogue grandit, et le joueur voit alors un objectif se déplacer sans avoir
 * rien fait. Le seul jalon qui suit le catalogue est le dernier — le compléter
 * entièrement, c'est la définition même du but.
 */
export type MilestoneMetric = "openings" | "uniqueCreators" | "legendary";

export type Milestone = {
  id: string;
  /** Ce que le jalon compte dans la partie. */
  metric: MilestoneMetric;
  /** Seuil à atteindre pour que la récompense soit disponible. */
  target: number;
  reward: SeasonReward;
};

export const MILESTONES: readonly Milestone[] = [
  { id: "first", metric: "openings", target: 1, reward: { points: 40, hourglasses: 1 } },
  { id: "ten", metric: "uniqueCreators", target: 10, reward: { points: 120, hourglasses: 1 } },
  { id: "twentyfive", metric: "uniqueCreators", target: 25, reward: { points: 260, hourglasses: 2 } },
  { id: "fifty", metric: "uniqueCreators", target: 50, reward: { points: 500, hourglasses: 3 } },
  { id: "hundred", metric: "uniqueCreators", target: 100, reward: { points: 1200, hourglasses: 5 } },
  // Le premier Légendaire : le jalon que le joueur attend le plus, et qui ne
  // dépend ni de son volume de jeu ni des jetons — seulement du tirage.
  { id: "legendary", metric: "legendary", target: 1, reward: { points: 400, hourglasses: 2 } },
  {
    id: "master",
    metric: "uniqueCreators",
    target: CATALOG_SIZE,
    reward: { points: 3000, hourglasses: 10 },
  },
];

export const MILESTONE_BY_ID = new Map(MILESTONES.map((milestone) => [milestone.id, milestone]));

/** Jalon prêt à afficher : avancement, seuil atteint, déjà réclamé. */
export type MilestoneView = Milestone & {
  progress: number;
  /** Seuil atteint : la récompense attend d'être réclamée. */
  reached: boolean;
  claimed: boolean;
};

/** Avancement d'un jalon dans une partie donnée (pur). */
export function milestoneProgress(state: PlayerState, milestone: Milestone): number {
  if (milestone.metric === "openings") return state.openings;
  if (milestone.metric === "legendary") return legendaryCount(state);
  return ownedSlugs(state).size;
}

/** Créateurs Légendaires **distincts** possédés (deux exemplaires = un). */
export function legendaryCount(state: Pick<PlayerState, "cards">): number {
  const slugs = new Set<string>();
  for (const card of state.cards) {
    if (card.rarity === "legendary") slugs.add(card.creatorSlug);
  }
  return slugs.size;
}

export function milestoneViews(state: PlayerState): MilestoneView[] {
  // Une fois suffit pour tous les jalons : deux ensembles, pas un par ligne.
  const owned = ownedSlugs(state).size;
  const legendary = legendaryCount(state);
  return MILESTONES.map((milestone) => {
    const progress =
      milestone.metric === "openings"
        ? state.openings
        : milestone.metric === "legendary"
          ? legendary
          : owned;
    return {
      ...milestone,
      progress,
      reached: progress >= milestone.target,
      claimed: state.claimedMilestones.includes(milestone.id),
    };
  });
}

/**
 * Réclame un jalon atteint : points et sabliers tombent une seule fois.
 * Un jalon non atteint, inconnu ou déjà réclamé lève une `GameError`.
 */
export function claimMilestone(
  state: PlayerState,
  milestoneId: string,
  now = Date.now(),
): PlayerState {
  const milestone = MILESTONE_BY_ID.get(milestoneId);
  if (!milestone) throw new GameError("Jalon inconnu.", "UNKNOWN_MILESTONE");
  if (state.claimedMilestones.includes(milestoneId)) {
    throw new GameError("Récompense déjà réclamée.", "MILESTONE_CLAIMED");
  }
  const progress = milestoneProgress(state, milestone);
  if (progress < milestone.target) {
    const missing = milestone.target - progress;
    throw new GameError(
      `Objectif incomplet : encore ${missing} avant « ${milestone.target} ».`,
      "MILESTONE_INCOMPLETE",
    );
  }
  return {
    ...state,
    updatedAt: now,
    points: state.points + milestone.reward.points,
    hourglasses: state.hourglasses + milestone.reward.hourglasses,
    claimedMilestones: [...state.claimedMilestones, milestoneId],
  };
}

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
  /** Saison que le joueur remplit en ce moment (titre de l'accueil). */
  currentSeason: CurrentSeason | null;
  /** Jalons du parcours de collectionneur (écran Objectifs). */
  milestones: MilestoneView[];
  /** Cosmétiques : thèmes de classeur, débloqués par les emblèmes. */
  themes: ThemeView[];
  /** Jetons, et ce qu'il reste à en gagner pour la carte visée. */
  tokens: {
    /** Solde actuel. */
    count: number;
    /** Ce qu'un booster en donne à cet instant (Prime Time compris). */
    perPack: number;
    /** Coût d'une carte au choix (400). */
    targetCost: number;
    /** Jetons manquants pour l'atteindre (0 = tu peux la prendre). */
    missing: number;
    /** Sommes-nous dans la fenêtre 20 h – 23 h ? */
    primeTime: boolean;
  };
  /**
   * Le plancher de malchance, prêt à afficher : combien de boosters avant la
   * garantie. Publié comme les taux — le joueur n'a pas à deviner.
   */
  pity: {
    /** Numéro du booster qui garantit un Légendaire (80). */
    threshold: number;
    /** Boosters ouverts depuis le dernier Légendaire. */
    counter: number;
    /** Combien il en reste avant la garantie. */
    remaining: number;
  };
  /**
   * Le Paquet Scène : la famille visée, si le paquet du jour est encore là, et
   * ce qu'il ne contient pas (une Légendaire). Publié comme le reste — la
   * promesse « jamais de Légendaire » est vérifiable dans les taux.
   */
  scene: {
    /** Libellé du paquet (« Paquet Scène »). */
    label: string;
    /** La famille que le paquet vise, ou `null` si aucune n'est assez grande. */
    family: SceneFamily | null;
    /** Le joueur a-t-il déjà ouvert son paquet de la journée ? */
    opened: boolean;
    /** La journée de jeu (6 h UTC) qui décide — affichée en clair si besoin. */
    day: string;
  };
  /** Les trois missions du jour. */
  missions: MissionView[];
  /** Série de jours, et la récompense qui attend si le 7ᵉ jour est atteint. */
  streak: {
    /** Jours d'affilée (0 après un jackpot : le cycle repart). */
    days: number;
    /** Jours visés (7). */
    target: number;
    /** Un jackpot attend d'être dépensé (Perfect garanti ou 3 sabliers). */
    jackpot: boolean;
    jackpotHourglasses: number;
    /**
     * Le booster du jour est déjà ouvert : la case du planning est cochée, et
     * « aujourd'hui » n'est plus à faire. Le jour repart à 6 h UTC.
     */
    todayDone: boolean;
  };
};

/** Ce qu'une journée de série rapporte : le jour, les points, et le reste. */
export type StreakRewardGrant = NonNullable<ReturnType<typeof streakRewardFor>>;

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
    claimedMilestones: [],
    themeId: DEFAULT_THEME_ID,
    tokens: 0,
    pityCounter: 0,
    missionDay: gameDay(now),
    missions: {},
    streakDay: "",
    streak: 0,
    streakJackpot: false,
    sceneDay: "",
  };
}

/**
 * Tire un **Paquet Scène** : cinq cartes de la famille visée, jamais deux fois
 * le même créateur, et **aucune Légendaire** — la table du paquet n'en contient
 * aucun poids, et le validateur du catalogue le vérifie (`catalog:ci`).
 *
 * Le paquet ne touche ni au compteur de malchance ni à la série : ces deux-là
 * parlent du Live Drop, et c'est écrit dans `pull-rates.json`. Il ne consomme
 * pas non plus la récompense de série — sinon un joueur pressé perdrait son
 * Perfect en ouvrant le paquet du jour.
 */
export function openScenePack(
  state: PlayerState,
  now = Date.now(),
  options: { rareDrop?: boolean; familyId?: string } = {},
): { state: PlayerState; cards: DrawnCard[]; family: SceneFamily } {
  const family = sceneFamily(state);
  if (!family) {
    throw new GameError(
      "Aucune famille assez grande pour un Paquet Scène.",
      "NO_SCENE_FAMILY",
    );
  }
  if (options.familyId && options.familyId !== family.familyId) {
    throw new GameError(
      "Ce n'est pas la famille que tu complètes en ce moment.",
      "SCENE_WRONG_FAMILY",
    );
  }
  // En ligne, le journal du serveur fait foi : une date locale reculée ne
  // redonne pas un paquet. Ici (moteur local), c'est `sceneDay` qui décide.
  const day = gameDay(now);
  if (state.sceneDay === day) {
    throw new GameError("Ton Paquet Scène du jour est déjà ouvert.", "SCENE_ALREADY_OPENED");
  }

  // Aucun `liveLogins` : le Paquet Scène ignore le bonus Direct (pas de poids
  // ×1,5, pas de variante Live). Le Direct parle du Live Drop ; un paquet de
  // complétion n'a pas à dépendre de qui streame à cet instant. Le serveur
  // applique la même règle (`0014_scene_pack.sql`).
  const cards = drawPack("scene", ownedSlugs(state), {
    rareDrop: options.rareDrop,
    family: family.familyId,
  });

  const next: PlayerState = {
    ...state,
    updatedAt: now,
    sceneDay: day,
    // Points, XP, niveau : mêmes règles que le Live Drop, avec les valeurs du
    // paquet (un peu plus basses : il ne coûte rien et ne se rate pas).
    points: state.points + PACKS.scene.points,
    xp: state.xp + PACKS.scene.xp,
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

  // La mission « ouvre un booster » ne compte **pas** le Paquet Scène : elle
  // parle du Live Drop, et un paquet gratuit offert chaque jour ne doit pas
  // être le moyen le moins cher de valider ses missions.
  return { state: next, cards, family };
}

/**
 * Range les cartes d'un Paquet Scène **décidé en ligne**.
 *
 * En ligne, les cartes ne viennent pas de `openScenePack()` : le serveur donne
 * les choix, le client tire dans chaque liste, le serveur vérifie puis renvoie
 * les cartes normalisées (rareté et variante comprises). C'est cette réponse
 * qu'on range ici — avec les mêmes règles que le tirage local : points, XP,
 * niveau, sabliers de niveau, et la journée du paquet.
 *
 * Ce qui ne bouge pas, et c'est le contrat : les boosters, le compteur de
 * malchance, la série, et les missions du jour.
 */
export function applyScenePackResult(
  state: PlayerState,
  cards: ReadonlyArray<{ creatorSlug: string; rarity: Rarity; variant: CardVariant; rareDrop: boolean }>,
  serverDay: string | null,
  now = Date.now(),
): { state: PlayerState; cards: DrawnCard[] } {
  const pack = PACKS.scene;
  const nextXp = state.xp + pack.xp;
  const nextLevel = Math.floor(nextXp / XP_PER_LEVEL) + 1;
  const gainedLevels = Math.max(0, nextLevel - state.level);

  const drawn = cards.map<OwnedCard>((card) => ({
    id: randomUUID(),
    creatorSlug: card.creatorSlug,
    rarity: card.rarity,
    variant: card.variant,
    obtainedAt: now,
    rareDrop: card.rareDrop,
  }));

  return {
    cards: drawn.map<DrawnCard>((card) => ({
      id: card.id,
      creatorSlug: card.creatorSlug,
      rarity: card.rarity,
      variant: card.variant,
      isNew: !state.cards.some((owned) => owned.creatorSlug === card.creatorSlug),
      rareDrop: card.rareDrop,
    })),
    state: {
      ...state,
      updatedAt: now,
      points: state.points + pack.points,
      xp: nextXp,
      level: nextLevel,
      hourglasses: state.hourglasses + gainedLevels * HOURGLASSES_PER_LEVEL,
      cards: [...state.cards, ...drawn],
      // La journée du serveur fait foi quand elle est lisible : c'est elle qui
      // a décidé, et l'horloge du téléphone ne la contredit pas.
      sceneDay: serverDay && /^\d{4}-\d{2}-\d{2}$/.test(serverDay) ? serverDay : gameDay(now),
    },
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
 * Le contexte « direct » d'un tirage : les `login` Twitch des créateurs qui
 * streament **au moment du tirage**, tels que le serveur les a publiés (moins
 * de dix minutes). Un ensemble vide (ou absent) veut dire « on ne sait pas » —
 * et dans ce cas le tirage reste neutre : pas de bonus, pas de variante Live.
 */
export type LiveLogins = ReadonlySet<string>;

/** Ce créateur streame-t-il, d'après les données du moment ? */
export function isCreatorLive(creator: Creator, liveLogins?: LiveLogins): boolean {
  return Boolean(liveLogins?.size && liveLogins.has(creator.login));
}

/**
 * Le poids d'un créateur dans sa rareté : `creatorBias` s'il streame, 1 sinon.
 * Exposé pour que les tests vérifient la règle sans dépendre du hasard.
 */
export function creatorWeight(creator: Creator, liveLogins?: LiveLogins): number {
  if (!isCreatorLive(creator, liveLogins)) return 1;
  return DIRECT_BONUS.creatorBias > 0 ? DIRECT_BONUS.creatorBias : 1;
}

/**
 * Tire une rareté selon `weights` (parmi celles encore disponibles), puis un
 * créateur dans la rareté choisie — uniformément, sauf bonus Direct : les
 * créateurs en direct pèsent × 1,5 (`pull-rates.json`). Les poids déclarés
 * décrivent donc exactement la probabilité affichée : c'est le contrat de
 * l'écran « Taux de drop ».
 */
function chooseCreator(
  weights: RarityWeights,
  used: ReadonlySet<string>,
  liveLogins?: LiveLogins,
  /**
   * Famille d'où tirer le créateur (Paquet Scène). `null` = catalogue entier.
   *
   * Le filtre est posé **avant** le tirage de rareté : une rareté absente de la
   * famille est simplement retirée de la roue, au lieu de tirer une rareté puis
   * de chercher un créateur qui n'existe pas. Les probabilités affichées pour
   * le Paquet Scène sont donc bien celles du tirage.
   */
  familyId?: string | null,
): Creator {
  // Ceinture-bretelles : `CREATORS` est déjà le catalogue courant (les Sortants
  // vivent dans `retired.json`), mais si une rotation se trompait et laissait un
  // Sortant au classement, il ne doit pas pour autant retomber dans un booster.
  // `RETIRED_BY_SLUG` ne contient jamais un slug revenu au classement (voir
  // `RETIRED_CREATORS`) : cette garde ne peut donc pas écarter un créateur en
  // activité. Calculée une fois par tirage — quand il n'y a aucun Sortant, le
  // vivier est le catalogue tel quel, sans coût.
  const pool = RETIRED_BY_SLUG.size
    ? CREATORS.filter((creator) => !RETIRED_BY_SLUG.has(creator.slug))
    : CREATORS;
  const available = pool.filter(
    (creator) =>
      !used.has(creator.slug) &&
      (weights[creator.rarity] ?? 0) > 0 &&
      (!familyId || creator.region === familyId),
  );
  if (!available.length) {
    throw new GameError(
      familyId
        ? "Il ne reste personne à découvrir dans cette famille."
        : "Le catalogue disponible est vide.",
      "EMPTY_CATALOG",
    );
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
  // Le bonus Direct : un créateur qui streame pèse plus lourd dans sa rareté.
  // Sans information fraîche, tous les poids valent 1 et le tirage est
  // exactement celui d'avant.
  const bucketWeight = bucket.reduce(
    (sum, creator) => sum + creatorWeight(creator, liveLogins),
    0,
  );
  let pick = randomInt(Math.max(1, Math.round(bucketWeight * 1000)));
  for (const creator of bucket) {
    const weight = Math.round(creatorWeight(creator, liveLogins) * 1000);
    if (pick < weight) return creator;
    pick -= weight;
  }
  return bucket[bucket.length - 1];
}

/**
 * Variante cosmétique d'une carte, selon la table du booster. Un « Perfect »
 * améliore presque toujours la variante (Holo, ou Gold sur une Légendaire).
 *
 * Depuis le bonus Direct, la variante Live n'existe **que** pour un créateur
 * qui streame au moment du tirage : `livePermille` (20 %), prioritaire sur la
 * table des variantes. Sans information fraîche sur le direct, aucune carte
 * Live ne peut sortir.
 */
function chooseVariant(
  packType: PackType,
  creator: Creator,
  rareDrop: boolean,
  liveLogins?: LiveLogins,
): CardVariant {
  const chances = PULL_RATES[packType].variants;
  const roll = randomInt(10_000);

  if (rareDrop && roll < PULL_RATES[packType].rareDrop.variantUpgradePermille) {
    return creator.rarity === "legendary" ? "gold" : "holo";
  }

  if (isCreatorLive(creator, liveLogins) && randomInt(10_000) < DIRECT_BONUS.livePermille) {
    return DIRECT_BONUS.variant;
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
 * (les taux montent au fil du booster), puis le slot garanti — Rare ou mieux.
 *
 * **L'ordre des cartes est celui du tirage** : le slot garanti reste en
 * dernière position. Un booster se révèle donc comme un vrai paquet, la
 * dernière carte étant le moment fort ; un mélange après coup pouvait sortir
 * le Live en premier et gâcher la seule chose que le joueur attend.
 *
 * `options.rareDrop` force (ou désactive) le tirage « Perfect » : réservé aux
 * tests et aux futurs événements à taux boosté.
 *
 * `options.liveLogins` apporte le bonus Direct (créateurs qui streament, × 1,5
 * et variante Live). Omis ou vide : tirage neutre, aucune variante Live.
 *
 * `options.family` restreint le tirage à une famille (Paquet Scène) : aucun
 * créateur hors de cette famille ne peut sortir. La rareté Légendaire n'est pas
 * filtrée ici — c'est la table du paquet qui ne la contient pas.
 */
export function drawPack(
  packType: PackType,
  alreadyOwned: ReadonlySet<string>,
  options: {
    rareDrop?: boolean;
    liveLogins?: LiveLogins;
    /**
     * Le plancher de malchance : `true` quand le joueur a enchaîné `PITY.threshold`
     * boosters sans Légendaire. Le 5ᵉ slot en garantit alors un.
     *
     * Un paramètre explicite plutôt qu'une lecture de l'état : le tirage reste
     * une fonction pure de ses arguments, et le serveur peut appliquer la même
     * règle sans rien connaître de la partie locale.
     */
    pity?: boolean;
    /** Famille d'où tirer exclusivement les cartes (Paquet Scène). */
    family?: string | null;
  } = {},
): DrawnCard[] {
  const table = PULL_RATES[packType];
  const size = PACKS[packType].size;
  const liveLogins = options.liveLogins;
  const pity = options.pity === true;
  const family = options.family ?? null;
  const rareDrop =
    options.rareDrop ?? randomInt(1000) < table.rareDrop.chancePermille;
  const weightsFor = (index: number): RarityWeights =>
    rareDrop ? table.rareDrop.weights : table.slots[index].weights;

  const used = new Set<string>();
  const drawn: DrawnCard[] = [];

  for (let index = 0; index < size - 1; index += 1) {
    const creator = chooseCreator(weightsFor(index), used, liveLogins, family);
    used.add(creator.slug);
    drawn.push({
      id: randomUUID(),
      creatorSlug: creator.slug,
      rarity: creator.rarity,
      variant: chooseVariant(packType, creator, rareDrop, liveLogins),
      isNew: !alreadyOwned.has(creator.slug),
      rareDrop,
    });
  }

  // La carte garantie est en variante Live quand son créateur streame — c'est
  // le moment fort du paquet, et il porte la preuve de présence. Sous le
  // plancher de malchance, elle est **Légendaire**, quoi qu'en dise le tirage.
  const guaranteed = pity
    ? chooseCreator({ legendary: 1 }, used, liveLogins, family)
    : chooseCreator(
        rareDrop ? table.rareDrop.weights : table.guaranteed.weights,
        used,
        liveLogins,
        family,
      );
  drawn.push({
    id: randomUUID(),
    creatorSlug: guaranteed.slug,
    rarity: guaranteed.rarity,
    variant: isCreatorLive(guaranteed, liveLogins)
      ? DIRECT_BONUS.variant
      : chooseVariant(packType, guaranteed, rareDrop, liveLogins),
    isNew: !alreadyOwned.has(guaranteed.slug),
    rareDrop,
  });

  return drawn;
}

/** Les slugs possédés : un par créateur, quel que soit le nombre de doublons. */
export function ownedSlugs(state: PlayerState): Set<string> {
  return new Set(state.cards.map((card) => card.creatorSlug));
}

// --------------------------------------------------------------------------
// Progression du jour : missions, série de jours, plancher de malchance
// --------------------------------------------------------------------------
//
// Ces règles sont regroupées ici parce qu'elles partagent le même piège : elles
// dépendent du **temps**. Un compteur qui se remet à zéro au milieu de la
// soirée d'un streameur, une série qui casse alors qu'on a joué hier soir,
// c'est un jeu qui accuse le joueur à tort. `gameDay()` ramène tout le monde à
// la même journée (6 h UTC), et ces fonctions ne font que comparer des journées.

/**
 * Ce qu'un booster fait avancer dans les missions du jour.
 *
 * `family` compte les cartes de la famille que le joueur est en train de
 * compléter (`currentSeason()`), **ou** d'une carte en variante Live : la
 * mission s'appelle « ta famille ou un Direct », et elle doit valoir pour les
 * deux.
 */
const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));

export function missionsAfterPack(
  state: Pick<PlayerState, "missionDay" | "missions">,
  now: number,
): PlayerState["missions"] {
  const day = gameDay(now);
  // Journée neuve : les compteurs repartent de zéro. Un joueur qui a dormi
  // n'a pas à voir « 1/1 » d'hier.
  const current = state.missionDay === day ? { ...state.missions } : {};
  current.pack = Math.min(MISSION_BY_ID.get("pack")?.target ?? 1, (current.pack ?? 0) + 1);
  return current;
}

/** Une carte « touche la famille » si elle appartient à la famille visée. */
export function cardTouchesFamily(card: { creatorSlug: string; variant?: string }, familyId: string | null): boolean {
  if (card.variant === DIRECT_BONUS.variant) return true;
  if (!familyId) return false;
  const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
  return Boolean(creator && creator.region === familyId);
}

/**
 * État des trois missions du jour, prêt à afficher.
 *
 * Une mission réclamée garde sa progression : l'écran montre « 1/1 · 1 sablier
 * reçu » plutôt qu'une ligne qui disparaît.
 */
export type MissionView = {
  id: MissionId;
  label: string;
  detail: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
};

export function missionViews(state: PlayerState, now = Date.now()): MissionView[] {
  const fresh = state.missionDay === gameDay(now) ? state.missions : {};
  return MISSIONS.map((mission) => {
    const raw = fresh[mission.id] ?? 0;
    // Convention d'écriture : `target + 1` veut dire « réclamée » (voir
    // `claimMissions`). La progression affichée reste bornée au seuil, donc
    // jamais « 2/1 ».
    const progress = Math.min(mission.target, raw);
    return {
      ...mission,
      progress,
      done: raw >= mission.target,
      claimed: raw > mission.target,
    };
  });
}

/**
 * Réclame les sabliers des missions terminées. Idempotent par construction :
 * un jour neuf remet la progression à zéro, donc une même journée ne peut pas
 * payer deux fois.
 */
export function claimMissions(state: PlayerState, now = Date.now()): PlayerState {
  const day = gameDay(now);
  const current = state.missionDay === day ? { ...state.missions } : {};
  // Exactement au seuil : une mission déjà réclamée est à `target + 1`, donc
  // elle ne repaie pas si le joueur appuie deux fois.
  const done = MISSIONS.filter((mission) => (current[mission.id] ?? 0) === mission.target);
  if (!done.length) {
    throw new GameError("Aucune mission terminée pour l'instant.", "NO_MISSION_READY");
  }
  // On note la réclamation en poussant la progression au-delà du seuil : la
  // mission reste « faite », mais `claimMissions` ne repaiera pas.
  for (const mission of done) current[mission.id] = mission.target + 1;
  return {
    ...state,
    updatedAt: now,
    missionDay: day,
    missions: current,
    hourglasses: state.hourglasses + done.length * MISSION_REWARD_HOURGLASSES,
  };
}

/** Ce que paie une mission : un sablier (voir `progression.json`). */
export const MISSION_REWARD_HOURGLASSES = PROGRESSION.missions.reward.hourglasses;

/**
 * Compteur du plancher de malchance, mis à jour par un tirage.
 *
 * Il **repart de zéro dès qu'un Légendaire tombe, quel que soit le slot** — y
 * compris un Légendaire de chance, pas seulement celui de la garantie : le
 * joueur a eu sa carte, il ne doit rien de plus.
 */
export function pityAfter(counterBefore: number, drawn: ReadonlyArray<{ rarity: Rarity }>): number {
  // Un Légendaire, n'importe où dans le paquet, remet le compteur à zéro : la
  // garantie n'a plus rien à rattraper.
  if (drawn.some((card) => card.rarity === "legendary")) return 0;
  return counterBefore + 1;
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
 * Un doublon **Live** ne part jamais sur un seul clic : l'écran doit demander
 * avant de le recycler.
 *
 * Une variante Live ne se rachète pas (elle tient au direct du créateur au
 * moment du tirage) : la perdre par erreur est une perte définitive. Les autres
 * variantes se recyclent au clic, comme avant.
 */
export function recycleNeedsConfirm(variant: CardVariant): boolean {
  return variant === "live";
}

/**
 * Les doublons que « Tout recycler » peut emporter : tous **sauf les variantes
 * Live**. Un doublon Live reste un geste à part — le joueur choisit, carte par
 * carte ; on ne le recycle jamais dans un clic global qui emporte tout.
 */
export function bulkRecyclableIds(state: Pick<PlayerState, "cards">): string[] {
  return duplicateGroups(state)
    .filter((group) => group.variant !== "live")
    .flatMap((group) => group.recyclableIds);
}

/**
 * Recycle tous les doublons en une seule fois : on garde la dernière copie de
 * chaque couple créateur + variante, puis on retire les doublons et on crédite
 * les points correspondants. Les variantes **Live** restent en place
 * (`bulkRecyclableIds` dit lesquelles partent).
 *
 * L'écran qui joue avec un compte connecté ne s'en sert pas : là, c'est le
 * serveur qui paie, carte par carte. Cette fonction, elle, est le chemin du jeu
 * sans cloud et le miroir local de ce que le serveur vient d'accorder.
 */
export function bulkRecycleCards(state: PlayerState, now = Date.now()): PlayerState {
  const groups = duplicateGroups(state).filter((group) => group.variant !== "live");
  const idsToRemove = new Set<string>();
  let gained = 0;

  for (const group of groups) {
    for (const cardId of group.recyclableIds) {
      idsToRemove.add(cardId);
      gained += group.unitValue;
    }
  }

  if (idsToRemove.size === 0) return state;

  const day = gameDay(now);
  return {
    ...state,
    updatedAt: now,
    points: state.points + gained,
    cards: state.cards.filter((card) => !idsToRemove.has(card.id)),
    missionDay: day,
    missions: {
      ...(state.missionDay === day ? state.missions : {}),
      recycle: Math.min(
        MISSION_BY_ID.get("recycle")?.target ?? 1,
        ((state.missionDay === day ? state.missions.recycle : 0) ?? 0) + idsToRemove.size,
      ),
    },
  };
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

  const day = gameDay(now);
  return {
    ...state,
    updatedAt: now,
    points: state.points + RARITY_META[card.rarity].recycleValue,
    cards: state.cards.filter((entry) => entry.id !== cardId),
    // La mission « recycle un doublon » du jour. Elle est comptée ici et pas
    // dans l'écran : c'est le moteur qui sait qu'un recyclage a eu lieu.
    missionDay: day,
    missions: {
      ...(state.missionDay === day ? state.missions : {}),
      recycle: Math.min(
        MISSION_BY_ID.get("recycle")?.target ?? 1,
        ((state.missionDay === day ? state.missions.recycle : 0) ?? 0) + 1,
      ),
    },
  };
}

/**
 * Peut-on rejoindre ce créateur depuis l'Atelier, et à quel prix ?
 *
 * Deux cas, deux règles :
 *
 *   * un créateur du catalogue courant : artisanable selon sa rareté ;
 *   * un **Sortant** : artisanable seulement pendant l'édition qui l'a vu
 *     partir (`canCraftRetired`), et jamais s'il est Légendaire — c'est la règle
 *     du jeu, et elle vaut d'autant plus pour une carte qui disparaît.
 */
export function craftQuote(
  state: Pick<PlayerState, "cards">,
  creatorSlug: string,
): { creator: Creator | undefined; cost: number | null; craftable: boolean; owned: boolean } {
  const creator = CREATOR_BY_SLUG.get(creatorSlug);
  const meta = creator ? RARITY_META[creator.rarity] : undefined;
  const retired = RETIRED_BY_SLUG.get(creatorSlug);
  const craftable = retired ? canCraftRetired(retired) : (meta?.craftable ?? false);
  return {
    creator,
    cost: meta?.craftCost ?? null,
    craftable,
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
    const retired = RETIRED_BY_SLUG.get(creatorSlug);
    throw new GameError(
      retired
        ? `${creator.displayName} a quitté le classement : il n'est plus artisanable. Sa carte reste dans ton classeur.`
        : `Les cartes ${RARITY_META[creator.rarity].label} ne sont pas artisanales : elles se tirent en booster.`,
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

/**
 * Dépense le jackpot de série : un booster Perfect garanti, ou 3 sabliers.
 *
 * Le choix est définitif — c'est pour ça qu'il est explicite dans l'appel et
 * pas deviné. Le booster Perfect se consomme au **prochain** tirage (le moteur
 * local le force, et le serveur l'applique pour les parties en ligne), donc la
 * récompense n'est jamais perdue si le joueur ferme l'app entre-temps : elle
 * reste marquée dans la sauvegarde.
 */
export function claimStreakJackpot(
  state: PlayerState,
  choice: "perfect" | "hourglasses",
  now = Date.now(),
): PlayerState {
  if (!state.streakJackpot) {
    throw new GameError("Aucune récompense de série en attente.", "NO_JACKPOT");
  }
  if (choice === "hourglasses") {
    return {
      ...state,
      updatedAt: now,
      streakJackpot: false,
      hourglasses: state.hourglasses + PROGRESSION.streak.jackpotHourglasses,
    };
  }
  // « perfect » : la récompense reste allumée, elle sera consommée par le
  // prochain booster. On ne touche à rien — le geste sert à dire « je garde »,
  // et l'écran peut l'annoncer sans mentir.
  return { ...state, updatedAt: now, streakJackpot: true };
}

/**
 * Achète la carte visée avec des jetons.
 *
 * Ce que ça ne fait **pas** : une Légendaire. Les jetons paient le manque de
 * chance dans une rareté qu'on peut déjà tirer ; la Légendaire, elle, a deux
 * chemins — le booster et le plancher de malchance — et n'est pas à vendre.
 */
export function buyWithTokens(state: PlayerState, creatorSlug: string, now = Date.now()): PlayerState {
  const creator = CREATOR_BY_SLUG.get(creatorSlug);
  if (!creator) {
    throw new GameError("Créateur inconnu du catalogue.", "UNKNOWN_CREATOR");
  }
  if (creator.rarity === "legendary") {
    throw new GameError(
      "Une Légendaire ne s'achète pas : elle se tire en booster (ou tombe au plancher de malchance).",
      "TOKENS_NO_LEGENDARY",
    );
  }
  if (state.cards.some((card) => card.creatorSlug === creatorSlug)) {
    throw new GameError("Tu possèdes déjà ce créateur.", "ALREADY_OWNED");
  }
  if (state.tokens < TOKEN_TARGET_COST) {
    throw new GameError(
      `Il te manque ${TOKEN_TARGET_COST - state.tokens} jetons pour cette carte.`,
      "NOT_ENOUGH_TOKENS",
    );
  }
  const card: OwnedCard = {
    id: randomUUID(),
    creatorSlug,
    rarity: creator.rarity,
    // La carte achetée est toujours Standard : les variantes restent la
    // récompense des boosters (même règle que l'Atelier).
    variant: CRAFTED_VARIANT,
    obtainedAt: now,
    rareDrop: false,
  };
  return {
    ...state,
    updatedAt: now,
    tokens: state.tokens - TOKEN_TARGET_COST,
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
  options: { liveLogins?: LiveLogins; rareDrop?: boolean } = {},
): { state: PlayerState; cards: DrawnCard[]; streakReward: StreakRewardGrant | null } {
  const refreshed = refreshBalances(state, now);
  if (refreshed.packs <= 0) {
    throw new GameError("Aucun booster disponible pour le moment.", "PACK_NOT_READY");
  }

  // Plancher de malchance : le compteur de la partie décide, le tirage
  // l'applique. Le compteur dit combien de boosters sont déjà sortis sans
  // Légendaire ; le **prochain** est le (compteur + 1)ᵉ, et c'est celui qui
  // paie quand il atteint le seuil publié (80). À 79, la garantie tombe donc
  // sur ce tirage-ci.
  const pity = refreshed.pityCounter + 1 >= PITY.threshold;
  // Le booster Perfect de la série (`streakJackpot`) force aussi le tirage
  // rare — c'est la promesse du 7ᵉ jour.
  
  const cards = drawPack(ACTIVE_PACK, ownedSlugs(refreshed), {
    ...options,
    rareDrop: options.rareDrop ?? (refreshed.streakJackpot ? true : undefined),
    pity,
  });

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
    // Le jackpot de série est consommé par ce tirage : le Perfect est garanti
    // une fois, pas à chaque booster de la journée.
    { pity, consumeJackpot: true, jackpotUsed: refreshed.streakJackpot },
  );
}

/**
 * Borne une réserve venue du serveur.
 *
 * Toujours celle du Live Drop : le Paquet Scène n'a pas de réserve à borner,
 * il a une journée (`sceneDay`).
 */
function clampPacks(value: number): number {
  // `4` en dur serait faux le jour où la réserve change ; on élargit le type
  // parce que `PACKS` est un `as const` dont un membre n'a pas de `max`.
  const max = (PACKS[ACTIVE_PACK] as { max?: number }).max ?? 0;
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
  /**
   * Ce que le tirage fait en plus des cartes : le plancher de malchance (qui
   * repart de zéro dès qu'un Légendaire tombe) et la récompense de série, si
   * elle est consommée par ce booster.
   *
   * Les jetons ne sont pas ici : ils ne dépendent que de l'heure du tirage
   * (Prime Time ou non), donc `tokensForPack(now)` suffit.
   */
  options: {
    pity?: boolean;
    consumeJackpot?: boolean;
    jackpotUsed?: boolean;
    /**
     * Les points de la récompense de série sont versés par le **serveur**
     * (`0032_serie_quotidienne.sql`) : on les annonce, on ne les crédite pas.
     * C'est le cas quand le tirage vient du cloud — deux caisses pour le même
     * gain feraient un doublon invisible.
     */
    pointsFromServer?: boolean;
    /**
     * Le jour de série que **le serveur** a payé, quand il l'a dit (`0032`).
     * Il fait foi : l'horloge de l'appareil peut avoir dérivé, et la journée
     * de jeu change à 6 h UTC — une minute d'écart suffit à annoncer le
     * mauvais jour. Absent (hors ligne, ou `0032` pas encore collée), le
     * moteur calcule le jour lui-même.
     */
    rewardDay?: number | null;
    /**
     * Les points que le serveur dit avoir versés pour ce jour, quand il l'a dit
     * (`0032`). Un jour **déjà payé** est annoncé à `0` : dans ce cas, on ne
     * crédite rien localement non plus (ni sabliers, ni jetons), sinon l'écran
     * aurait annoncé des points que le serveur n'a pas donnés.
     */
    rewardPoints?: number | null;
  } = {},
): { state: PlayerState; cards: DrawnCard[]; streakReward: StreakRewardGrant | null } {
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

  // Série de jours : une journée de jeu « suit » la précédente (+1), sinon
  // elle repart de 1. Le jackpot tombe au 7ᵉ jour et attend d'être réclamé.
  const day = gameDay(now);
  // Deux boosters le même jour, c'est **la même journée** de série : le
  // compteur ne bouge pas, et le jour ne paie qu'une fois. Sans cette garde, le
  // second booster du jour repartait à « Série 1/7 » — et aurait reversé la
  // récompense du jour 1 autant de fois qu'on ouvre de boosters.
  const sameDay = state.streakDay === day;
  const continued = Boolean(state.streakDay) && follows(state.streakDay, day);
  // Le cycle fait 1 → 7 puis recommence : le 8ᵉ jour d'affilée est un nouveau
  // jour 1, pas un deuxième jackpot. Le compteur affiché reste donc dans 1..7,
  // comme celui du serveur (`((v_streak - 1) % 7) + 1`, `0032`).
  let streak = sameDay
    ? state.streak
    : continued
      ? (state.streak % PROGRESSION.streak.days) + 1
      : 1;
  const reached = !sameDay && streak === PROGRESSION.streak.days;

  // Ce que le jour coché paie. Le 7ᵉ jour paie le jackpot, jamais une
  // micro-récompense en plus : `streakRewardFor` renvoie `null` pour lui.
  const jourSerie =
    typeof options.rewardDay === "number" && options.rewardDay > 0 ? options.rewardDay : streak;
  const jourPaye = streakRewardFor(jourSerie);
  // Le serveur a annoncé 0 point pour un jour qui en vaut : la journée de jeu
  // était déjà payée (un autre booster l'a fait avancer). Le jour qui paie 0
  // point **par nature** (J2, un sablier) n'est pas concerné : lui aussi annonce
  // 0, et il doit bien créditer son sablier.
  const dejaPaye = options.rewardPoints === 0 && (jourPaye?.points ?? 0) > 0;
  const granted = sameDay || dejaPaye ? null : jourPaye;
  // Une récompense en attente reste allumée jusqu'à ce qu'un tirage la
  // consomme (`consumeJackpot`, posé par `openPack`) ou que le joueur la
  // troque contre des sabliers. Le 7ᵉ jour, lui, n'allume qu'une fois : le
  // cycle repart de zéro, donc `reached` ne peut pas repasser avant sept jours.
  const streakJackpot = reached || (state.streakJackpot && options.consumeJackpot !== true);

  const next: PlayerState = {
    ...state,
    updatedAt: now,
    packs: clampPacks(serverPacks),
    lastPackRegen: lastRegenMs,
    // Le paquet paie ses points (`pack.points`) ; la récompense de série s'y
    // ajoute, **sauf en ligne** : là, c'est le serveur qui les a versés
    // (`0032`), et les compter ici aussi gonflerait le solde à chaque booster.
    points:
      state.points +
      pack.points +
      (options.pointsFromServer === true ? 0 : (granted?.points ?? 0)),
    xp: nextXp,
    level: nextLevel,
    hourglasses:
      state.hourglasses + gainedLevels * HOURGLASSES_PER_LEVEL + (granted?.hourglasses ?? 0),
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
    // Jetons : 5 par booster ouvert (7 pendant le Prime Time). Le tirage est
    // le seul moyen d'en gagner — c'est ce qui en fait une monnaie, et pas un
    // lot de consolation.
    tokens: state.tokens + tokensForPack(now) + (granted?.tokens ?? 0),
    // Plancher de malchance : zéro dès qu'un Légendaire est sorti (la
    // garantie le fait forcément tombler), sinon +1. Le compteur ne dépasse
    // donc jamais le seuil.
    pityCounter: pityAfter(state.pityCounter, cards),
    // Missions du jour : « ouvrir un booster », et plus bas ce que les cartes
    // tirées touchent.
    missionDay: day,
    missions: missionsAfterPack(state, now),
    streakDay: day,
    streak,
    streakJackpot,
  } as PlayerState;

  // Mission « toucher ta famille ou un Direct » : comptée sur la famille
  // d'**avant** et d'**après** le paquet. Sans les deux, la carte qui termine
  // justement la famille ne compterait pas — le pire moment pour l'oublier.
  const families = new Set(
    [currentSeason(state)?.familyId, currentSeason(next)?.familyId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  if (cards.some((card) => [...families].some((family) => cardTouchesFamily(card, family)))) {
    next.missions = {
      ...next.missions,
      family: Math.min(MISSION_BY_ID.get("family")?.target ?? 1, (next.missions.family ?? 0) + 1),
    };
  }

  return { state: next, cards, streakReward: granted };
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

/**
 * Adopte le solde **du serveur** (`0027_wallet.sql`).
 *
 * Depuis que la caisse est au serveur, `state.points` n'est plus une décision :
 * c'est un miroir. Le jeu continue de l'afficher, mais c'est cette fonction qui
 * l'écrit quand le serveur a parlé — un solde bricolé à la main disparaît donc
 * à la première lecture, et les gains annoncés sont ceux que le serveur a
 * réellement versés.
 */
export function applyWallet(state: PlayerState, serverPoints: number, now = Date.now()): PlayerState {
  // Un solde négatif n'existe pas ; un non-nombre non plus (réponse illisible).
  const points = Number.isFinite(serverPoints) ? Math.max(0, Math.floor(serverPoints)) : state.points;
  if (points === state.points) return state;
  return { ...state, updatedAt: now, points };
}

/**
 * Aligne les compteurs de progression sur ceux du serveur.
 *
 * Quand le joueur a un compte, c'est le serveur qui décide du plancher de
 * malchance et de la série — pour la bonne raison qu'il les calcule depuis le
 * journal des tirages, que personne ne peut modifier. L'écran doit donc
 * afficher **ce chiffre-là**, sinon la promesse « encore 3 boosters » ne
 * correspondrait pas au booster que le serveur va tirer.
 *
 * Les jetons, eux, ne bougent pas : ils ne vivent que sur l'appareil.
 */
export function applyServerProgression(
  state: PlayerState,
  server: { pity: number; streak: number; jackpotReady?: boolean },
  now = Date.now(),
): PlayerState {
  const pityCounter = Math.max(0, Math.floor(server.pity));
  // Le serveur compte les jours d'affilée sans fin de cycle (le 8ᵉ jour
  // d'affilée vaut `8`) ; l'écran, lui, montre toujours un jour du cycle 1 → 7.
  // Même conversion que le SQL (`0032`) : deux affichages d'un même compteur
  // ne doivent pas se contredire.
  const jours = Math.max(0, Math.floor(server.streak));
  const streak = jours > 0 ? ((jours - 1) % PROGRESSION.streak.days) + 1 : 0;
  // `jackpotReady` n'arrive que du statut ; après un tirage, c'est le serveur
  // qui a dit si le Perfect du jour est tombé (`jackpot`).
  const streakJackpot = server.jackpotReady ?? state.streakJackpot;
  if (
    pityCounter === state.pityCounter &&
    streak === state.streak &&
    streakJackpot === state.streakJackpot
  ) {
    return state;
  }
  return { ...state, updatedAt: now, pityCounter, streak, streakJackpot };
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

/**
 * L'hôtel des ventes : dépôt (payé comptant) et achat.
 *
 * Les deux opérations sont **décidées par le serveur** (voir
 * `supabase/migrations/0009_marche.sql`) et rejouées ici, comme un échange
 * accepté : l'appareil applique exactement ce que le serveur a écrit, puis
 * pousse sa sauvegarde. Si les deux divergent un jour, c'est la sauvegarde du
 * serveur qui a raison — l'appareil la reprend.
 *
 * Ce module est testé à part (`game-engine.test.ts`) parce qu'une erreur ici
 * coûte une carte ou des points.
 */

/** Dépôt d'une carte à l'hôtel : la carte part, les points arrivent. */
export type MarketSale = {
  cardId: string;
  /** Ce que l'hôtel a payé, tel que le serveur l'a calculé. */
  payout: number;
};

/** Achat d'une carte au comptoir : la carte arrive, les points partent. */
export type MarketPurchase = {
  card: OwnedCard;
  price: number;
};

/**
 * Applique un dépôt : la carte quitte la collection, les points sont crédités.
 *
 * Refusé si la carte n'est plus là (autre appareil, partie plus vieille) : le
 * serveur, lui, l'a déjà retirée — c'est le signal qu'il faut reprendre la
 * sauvegarde du cloud plutôt que de pousser une collection fausse.
 */
export function applyMarketSale(state: PlayerState, sale: MarketSale, now = Date.now()): PlayerState {
  if (!state.cards.some((card) => card.id === sale.cardId)) {
    throw new GameError(
      "Cette carte n'est plus dans ta collection : recharge la sauvegarde du cloud.",
      "MARKET_CARD_MISSING",
    );
  }
  return {
    ...state,
    updatedAt: now,
    points: state.points + sale.payout,
    cards: state.cards.filter((card) => card.id !== sale.cardId),
  };
}

/**
 * Applique un achat : la carte entre dans la collection, les points partent.
 *
 * Idempotent : la carte reçue porte `fromMarket`, la marque de l'annonce. Une
 * réponse rejouée (ou un chargement qui repasse sur le même achat) ne peut donc
 * pas créer un deuxième exemplaire.
 */
export function applyMarketPurchase(
  state: PlayerState,
  purchase: MarketPurchase,
  now = Date.now(),
): PlayerState {
  const marker = purchase.card.fromMarket;
  if (marker !== undefined && state.cards.some((card) => card.fromMarket === marker)) {
    return state;
  }
  if (state.points < purchase.price) {
    throw new GameError(
      "Tu n'as plus assez de points pour cet achat : recharge la sauvegarde du cloud.",
      "MARKET_POINTS_MISSING",
    );
  }
  return {
    ...state,
    updatedAt: now,
    points: state.points - purchase.price,
    cards: [...state.cards, purchase.card],
  };
}

/**
 * Last Pack : la carte volée entre dans ta collection.
 *
 * Le vol est décidé par le serveur (voir `0012_last_pack.sql`) : le serveur a
 * déjà retiré la carte au propriétaire et écrit la tienne. L'appareil ne fait
 * que rejouer ce qu'il a reçu, puis pousse sa sauvegarde.
 *
 * Idempotent sur l'identifiant de la carte : une réponse rejouée (ou un
 * chargement qui repasse sur le même vol) ne crée pas de deuxième exemplaire.
 */
export type LastPackSteal = {
  card: OwnedCard;
};

export function applyLastPackSteal(
  state: PlayerState,
  steal: LastPackSteal,
  now = Date.now(),
): PlayerState {
  if (state.cards.some((card) => card.id === steal.card.id)) return state;
  return { ...state, updatedAt: now, cards: [...state.cards, steal.card] };
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
    lastPackRegen: refreshed.lastPackRegen - (HOURGLASS_REDUCTION_MS[ACTIVE_PACK] ?? 0),
  };
  return { ...refreshBalances(shifted, now), updatedAt: now };
}

/** Projette l'état en vue prête à afficher (compteurs, prochaines recharges). */
export function getGameView(state: PlayerState, now = Date.now()): GameView {
  const refreshed = refreshBalances(state, now);
  // La complétion se mesure sur le catalogue courant : un Sortant garde sa
  // carte (elle s'affiche, s'échange, se vend), mais il ne compte plus dans
  // « X / 1000 » — sinon 100 % redeviendrait inatteignable à la première
  // rotation du catalogue.
  const uniqueCreators = [...ownedSlugs(refreshed)].filter(
    (slug) => !RETIRED_BY_SLUG.has(slug),
  ).length;
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
    currentSeason: currentSeason(refreshed),
    milestones: milestoneViews(refreshed),
    themes: themeViews(refreshed),
    tokens: {
      count: refreshed.tokens,
      perPack: tokensForPack(now),
      targetCost: TOKEN_TARGET_COST,
      missing: Math.max(0, TOKEN_TARGET_COST - refreshed.tokens),
      primeTime: isPrimeTime(now),
    },
    pity: {
      threshold: PITY.threshold,
      counter: refreshed.pityCounter,
      remaining: Math.max(0, PITY.threshold - refreshed.pityCounter),
    },
    scene: {
      label: PACKS.scene.label,
      family: sceneFamily(refreshed),
      opened: refreshed.sceneDay === gameDay(now),
      day: gameDay(now),
    },
    missions: missionViews(refreshed, now),
    streak: {
      days: refreshed.streak,
      target: PROGRESSION.streak.days,
      jackpot: refreshed.streakJackpot,
      jackpotHourglasses: PROGRESSION.streak.jackpotHourglasses,
      /* Le booster du jour est-il déjà ouvert ? C'est ce qui coche la case du
         planning, et ce qui distingue « aujourd'hui, à faire » de « c'est fait ».
         Le jour repart à 6 h UTC, comme les missions. */
      todayDone: refreshed.streakDay === gameDay(now),
    },
  };
}
