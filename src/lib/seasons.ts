/**
 * Saisons de collection : les créateurs du catalogue sont regroupés en grandes familles
 * de jeux (façon séries/sets d'un TCG), ce qui donne des objectifs de
 * complétion intermédiaires entre « 1 carte » et le catalogue entier.
 *
 * Le découpage vit dans `src/data/seasons.config.json` ; tout est calculé ici à
 * partir du catalogue, donc aucune donnée ne peut se désynchroniser. Chaque
 * saison est jalonnée de paliers (25/50/75/100 %) que le joueur réclame depuis
 * l'écran Objectifs : les points tombent en cours de route, le dernier palier
 * donne les sabliers et l'emblème de la famille.
 */
import seasonConfig from "@/data/seasons.config.json";
import { CREATORS } from "@/lib/catalog";

export type SeasonReward = { points: number; hourglasses: number };

/**
 * Palier de progression d'une saison, façon trophées (bronze → arc-en-ciel).
 *
 * Une saison ne paie plus uniquement à 100 % : chaque palier débloqué crédite
 * sa part de points, et le dernier donne les sabliers et l'emblème de la
 * famille. Les seuils sont relatifs (25/50/75/100 %), donc une saison reste
 * jouable quelle que soit sa taille après découpage.
 */
export type SeasonTier = {
  label: string;
  /** Nombre de créateurs de la saison à posséder pour débloquer le palier. */
  required: number;
  reward: SeasonReward;
  /** Le dernier palier est celui de la saison complète : il donne l'emblème. */
  emblem: boolean;
};

export type Season = {
  id: string;
  name: string;
  tagline: string;
  /** Catégories Twitch couvertes (vide pour la saison fourre-tout). */
  categories: string[];
  slugs: string[];
  tiers: SeasonTier[];
};

type SeasonDefinition = { id: string; name: string; tagline: string; categories: string[] };
type SeasonConfig = {
  pointsPerCreator: number;
  hourglassesPerSeason: number;
  /** Taille maximale d'une saison thématique avant découpage (défaut : 150). */
  seasonMaxSize?: number;
  seasons: SeasonDefinition[];
  catchAll: { id: string; name: string; tagline: string; maxSize?: number };
};

/** Taille maximale d'une saison fourre-tout avant découpage (défaut : 60). */
const DEFAULT_CATCH_ALL_MAX = 60;
/**
 * Taille maximale d'une saison thématique avant découpage (défaut : 150).
 *
 * En périmètre mondial, une famille comme « Just Chatting » réunit plusieurs
 * centaines de créateurs : une saison infinissable n'est pas un objectif. On la
 * découpe en morceaux qui gardent l'étiquette de la famille (« S01-1/3 »).
 */
const DEFAULT_SEASON_MAX = 150;

const CONFIG = seasonConfig as SeasonConfig;

/** Libellés des paliers, du plus accessible au plus rare. */
const TIER_LABELS = ["Bronze", "Argent", "Or", "Arc-en-ciel"] as const;
/** Parts du total de points attribuées aux paliers (cumulées à l'usage). */
const TIER_SHARES = [0.15, 0.4, 0.7, 1];

/**
 * Seuils d'une saison de `size` créateurs : 25 %, 50 %, 75 % et 100 %, toujours
 * strictement croissants et jamais supérieurs à la taille. Une petite saison a
 * donc moins de paliers (jamais deux paliers identiques ni un palier
 * inatteignable).
 */
function tierThresholds(size: number): number[] {
  const thresholds: number[] = [];
  for (const share of [0.25, 0.5, 0.75, 1]) {
    const wanted = Math.max(Math.ceil(share * size), (thresholds.at(-1) ?? 0) + 1);
    const bounded = Math.min(size, wanted);
    if (bounded !== thresholds.at(-1)) thresholds.push(bounded);
  }
  return thresholds;
}

/**
 * Paliers d'une saison. Les points sont répartis par cumul arrondi : la somme
 * des paliers retombe **exactement** sur le total historique
 * (`pointsPerCreator × taille`), donc l'économie du jeu ne bouge pas — elle est
 * simplement versée en cours de route au lieu d'attendre la complétion.
 */
function tiersFor(size: number): SeasonTier[] {
  const thresholds = tierThresholds(size);
  const totalPoints = CONFIG.pointsPerCreator * size;
  const shares = TIER_SHARES.slice(0, thresholds.length);
  shares[shares.length - 1] = 1;

  let previous = 0;
  return thresholds.map((required, index) => {
    const cumulative = Math.round(totalPoints * shares[index]);
    const points = Math.max(1, cumulative - previous);
    previous = cumulative;
    const last = index === thresholds.length - 1;
    return {
      label: TIER_LABELS[index] ?? TIER_LABELS[TIER_LABELS.length - 1],
      required,
      reward: { points, hourglasses: last ? CONFIG.hourglassesPerSeason : 0 },
      emblem: last,
    };
  });
}

/** Entrée d'une saison : le slug et la catégorie Twitch, pour décrire chaque morceau. */
export type SeasonEntry = { slug: string; category: string };

function toSeason(
  entries: SeasonEntry[],
  meta: { id: string; name: string; tagline: string },
): Season {
  return {
    id: meta.id,
    name: meta.name,
    tagline: meta.tagline,
    // Chaque morceau déclare les catégories qu'il contient réellement : la vue
    // d'une saison reste exacte, même découpée.
    categories: [...new Set(entries.map((entry) => entry.category))].sort(),
    slugs: entries.map((entry) => entry.slug),
    tiers: tiersFor(entries.length),
  };
}

/**
 * Découpe une saison en morceaux de taille raisonnable.
 *
 * Deux usages : le fourre-tout « Découverte » (des dizaines de petites
 * catégories, maxSize 60) et les saisons thématiques devenues trop grosses en
 * périmètre mondial (maxSize 150). Les créateurs d'une même catégorie restent
 * ensemble — un morceau ne mélange pas la moitié d'un jeu avec la moitié d'un
 * autre — sauf si la catégorie dépasse à elle seule `maxSize`, auquel cas elle
 * est découpée en tranches.
 *
 * Pure et exportée pour être testable indépendamment du catalogue réel.
 */
export function splitSeason(
  entries: SeasonEntry[],
  { id, name, tagline }: { id: string; name: string; tagline: string },
  maxSize = DEFAULT_CATCH_ALL_MAX,
): Season[] {
  if (!entries.length) return [];
  if (maxSize < 1) return [toSeason(entries, { id, name, tagline })];

  // 1. Regroupement par catégorie : un morceau ne mélange pas la moitié d'un
  //    jeu avec la moitié d'un autre.
  const byCategory = new Map<string, SeasonEntry[]>();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category);
    if (bucket) bucket.push(entry);
    else byCategory.set(entry.category, [entry]);
  }

  // 2. Remplissage glouton des morceaux, sans jamais dépasser maxSize.
  const packed: SeasonEntry[][] = [];
  let current: SeasonEntry[] = [];
  for (const bucket of byCategory.values()) {
    if (current.length && current.length + bucket.length > maxSize) {
      packed.push(current);
      current = [];
    }
    if (bucket.length > maxSize) {
      // 3. Catégorie à elle seule plus grosse que maxSize (un jeu très
      //    représenté chez les petits streamers) : on la découpe en tranches.
      for (let index = 0; index < bucket.length; index += maxSize) {
        packed.push(bucket.slice(index, index + maxSize));
      }
      continue;
    }
    current.push(...bucket);
  }
  if (current.length) packed.push(current);

  if (packed.length === 1) return [toSeason(packed[0], { id, name, tagline })];

  return packed.map((chunk, index) =>
    toSeason(chunk, {
      id: `${id}-${index + 1}`,
      name: `${name} · ${index + 1}/${packed.length}`,
      tagline,
    }),
  );
}

type BuiltSeasons = {
  seasons: Season[];
  /** Identifiants de configuration ayant donné au moins une saison. */
  populated: Set<string>;
};

function buildSeasons(): BuiltSeasons {
  const explicitCategories = new Set(CONFIG.seasons.flatMap((season) => season.categories));
  const seasons: Season[] = [];
  const populated = new Set<string>();
  const seasonMax = CONFIG.seasonMaxSize ?? DEFAULT_SEASON_MAX;

  for (const definition of CONFIG.seasons) {
    const members: SeasonEntry[] = CREATORS.filter((creator) =>
      definition.categories.includes(creator.category),
    ).map((creator) => ({ slug: creator.slug, category: creator.category }));
    // Une catégorie peut disparaître du catalogue au fil des régénérations
    // (jeu plus streamé) : une saison vide ne s'affiche pas.
    if (!members.length) continue;
    populated.add(definition.id);
    seasons.push(...splitSeason(members, definition, seasonMax));
  }

  // Les catégories non listées (petits jeux, événements ponctuels) atterrissent
  // dans une saison « Découverte » : aucun créateur n'est laissé de côté.
  const leftovers = CREATORS.filter((creator) => !explicitCategories.has(creator.category));
  if (leftovers.length) {
    seasons.push(
      ...splitSeason(
        leftovers.map((creator) => ({ slug: creator.slug, category: creator.category })),
        {
          id: CONFIG.catchAll.id,
          name: CONFIG.catchAll.name,
          tagline: CONFIG.catchAll.tagline,
        },
        CONFIG.catchAll.maxSize ?? DEFAULT_CATCH_ALL_MAX,
      ),
    );
  }

  return { seasons, populated };
}

const BUILT = buildSeasons();
export const SEASONS: Season[] = BUILT.seasons;

export const SEASON_BY_ID = new Map(SEASONS.map((season) => [season.id, season]));

const SEASON_BY_SLUG = new Map<string, Season>(
  SEASONS.flatMap((season) => season.slugs.map((slug) => [slug, season] as const)),
);

/** Saison d'un créateur. Tout créateur appartient à exactement une saison. */
export function seasonOf(slug: string): Season | undefined {
  return SEASON_BY_SLUG.get(slug);
}

/**
 * Saisons annoncées par la configuration mais sans aucun créateur dans le
 * catalogue courant (catégorie renommée ou jeu plus streamé). Le build les
 * signale en avertissement ; l'application les ignore.
 */
export function emptySeasonIds(): string[] {
  return (seasonConfig as SeasonConfig).seasons
    .map((season) => season.id)
    .filter((id) => !BUILT.populated.has(id));
}

/** Nombre total de créateurs couverts par les saisons (vaut la taille du catalogue). */
export function seasonsCoverage(): number {
  return SEASONS.reduce((sum, season) => sum + season.slugs.length, 0);
}
