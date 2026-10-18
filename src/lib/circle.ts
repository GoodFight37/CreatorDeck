/**
 * « Mes chaînes » — le cercle du joueur.
 *
 * Une proposition, jamais une condition : *quelles chaînes regardes-tu déjà ?*
 * De 0 à 15 noms (0058) ; zéro est un état valide et laisse le pool mondial. Le cercle exprime ce que le joueur regarde, pas une
 * autre rareté : chaque carte garde la rareté du catalogue à l'ouverture,
 * dans le classeur et pour l'artisanat. Son seul signe personnel est
 * « Préférée » (position 0) ou « Dans tes chaînes ».
 * Les coefficients historiques de 0054 restent internes à l'aperçu invité ;
 * ils ne changent ni les cartes, ni leur cadre, leur libellé ou leur son.
 * Aucun accès au réseau ou au stockage, aucun changement des tirages serveur.
 */
import { CREATOR_BY_SLUG, type Rarity } from "@/lib/catalog";

/** Un seul signe de cercle, commun à la révélation et au classeur. */
export function circleLabel(circle: readonly string[], slug: string): "Préférée" | "Dans tes chaînes" | null {
  const position = circle.indexOf(slug);
  return position < 0 ? null : position === 0 ? "Préférée" : "Dans tes chaînes";
}

/** Aucun nom n'est exigé (0058) : un cercle vide vaut « pas de cercle ». */
export const CIRCLE_MIN = 0;
export const CIRCLE_MAX = 15;
/** Un booster du cercle compte cinq cartes, comme le Live Drop. */
export const CIRCLE_PACK_SIZE = 5;

/** Ordre des coefficients de sélection historiques, sans effet visuel. */
export const CIRCLE_RARITY_ORDER: readonly Rarity[] = [
  "legendary",
  "epic",
  "rare",
  "uncommon",
  "common",
];

/**
 * Coefficients historiques de l'aperçu, conservés pour son choix des slugs.
 * Leurs noms ne décrivent jamais la rareté d'une carte et ne sont pas affichés.
 */
export const CIRCLE_TIER_THRESHOLDS = { epic: 30, rare: 55, uncommon: 80 } as const;

/**
 * Poids historiques du choix des slugs de l'aperçu invité. Ils ne garantissent
 * aucune rareté visuelle ; les cartes retournées portent celle du catalogue.
 */
export const CIRCLE_SLOT_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 30,
  uncommon: 30,
  rare: 22,
  epic: 14,
  legendary: 4,
};
export const CIRCLE_LAST_SLOT_WEIGHTS: Readonly<Partial<Record<Rarity, number>>> = {
  rare: 45,
  epic: 35,
  legendary: 20,
};

/** Ce dont le module a besoin d'un créateur : rien qui vienne du réseau. */
export type CircleCreator = Readonly<{
  slug: string;
  login: string;
  displayName: string;
  rank: number;
}>;

export type CircleCard = { creatorSlug: string; rarity: Rarity };

/** Un tirage d'entier dans [0, maxExclusive), injectable pour les tests. */
export type RandomInt = (maxExclusive: number) => number;

const defaultRandom: RandomInt = (max) => {
  // Les tirages qui comptent sont décidés en ligne ; celui-ci n'alimente que
  // l'aperçu invité, sans aucun gain. Un générateur cryptographique suffit.
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] % max;
};

/* ------------------------------------------------------------------------- */
/* Lire ce que le joueur écrit                                                */
/* ------------------------------------------------------------------------- */

/**
 * Forme comparable d'un nom de chaîne : minuscules, sans accent, sans `@`, sans
 * l'adresse `twitch.tv/` si le joueur a collé un lien, sans rien d'autre que
 * lettres, chiffres et tiret bas.
 */
export function normalizeChannelName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//, "")
    .replace(/^(www\.)?twitch\.tv\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "");
}

export type CreatorIndex = {
  byName: ReadonlyMap<string, CircleCreator>;
  list: readonly CircleCreator[];
};

/** L'index de recherche du catalogue : à construire une fois, à réutiliser. */
export function buildCreatorIndex(creators: readonly CircleCreator[]): CreatorIndex {
  const byName = new Map<string, CircleCreator>();
  // Le login prime sur le nom affiché ; le plus haut classé prime en cas d'égalité.
  const sorted = [...creators].sort((a, b) => a.rank - b.rank);
  for (const creator of sorted) {
    for (const key of [creator.login, creator.slug, creator.displayName]) {
      const name = normalizeChannelName(key);
      if (name && !byName.has(name)) byName.set(name, creator);
    }
  }
  return { byName, list: sorted };
}

export type ResolvedCircleInput = {
  /** Le cercle après ajout : l'ordre est conservé, sans doublon, 15 au plus. */
  slugs: string[];
  /** Les noms que le jeu ne connaît pas (hors du classement). */
  unknown: string[];
  /** Combien de noms valides n'ont pas trouvé de place (au-delà de 15). */
  overflow: number;
};

/**
 * Lit un texte libre (virgules, retours à la ligne, espaces, liens collés) et
 * l'ajoute à un cercle existant.
 */
export function resolveCircleInput(
  text: string,
  index: CreatorIndex,
  already: readonly string[] = [],
): ResolvedCircleInput {
  const slugs = [...already];
  const unknown: string[] = [];
  let overflow = 0;
  const known = new Set(slugs);

  const take = (token: string): boolean => {
    const creator = index.byName.get(normalizeChannelName(token));
    if (!creator) return false;
    if (known.has(creator.slug)) return true;
    if (slugs.length >= CIRCLE_MAX) {
      overflow += 1;
      return true;
    }
    known.add(creator.slug);
    slugs.push(creator.slug);
    return true;
  };

  for (const chunk of text.split(/[\n,;]+/)) {
    const token = chunk.trim();
    if (!token) continue;
    if (take(token)) continue;
    // « kameto squeezie » : un nom affiché peut contenir une espace, un login
    // jamais. On retente mot à mot avant de déclarer le nom inconnu.
    const words = token.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every((word) => index.byName.has(normalizeChannelName(word)))) {
      for (const word of words) take(word);
    } else {
      unknown.push(token);
    }
  }
  return { slugs, unknown, overflow };
}

/** Suggestions pendant la frappe : préfixe d'abord, puis le reste, du plus gros au plus petit. */
export function searchCreators(
  query: string,
  index: CreatorIndex,
  exclude: readonly string[] = [],
  limit = 6,
): CircleCreator[] {
  const needle = normalizeChannelName(query);
  if (needle.length < 2) return [];
  const skip = new Set(exclude);
  const prefix: CircleCreator[] = [];
  const inside: CircleCreator[] = [];
  for (const creator of index.list) {
    if (skip.has(creator.slug)) continue;
    const names = [creator.login, creator.displayName].map(normalizeChannelName);
    if (names.some((name) => name.startsWith(needle))) prefix.push(creator);
    else if (names.some((name) => name.includes(needle))) inside.push(creator);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...inside].slice(0, limit);
}

/** Les chaînes les plus suivies, proposées une à une : jamais un doublon. */
export function popularCreators(
  index: CreatorIndex,
  exclude: readonly string[] = [],
  limit = 6,
): CircleCreator[] {
  const skip = new Set(exclude);
  return index.list.filter((creator) => !skip.has(creator.slug)).slice(0, limit);
}

/** Un cercle est valide : de 0 à 15 chaînes, toutes différentes. */
export function isValidCircle(slugs: readonly string[]): boolean {
  return (
    slugs.length >= CIRCLE_MIN &&
    slugs.length <= CIRCLE_MAX &&
    new Set(slugs).size === slugs.length
  );
}

/* ------------------------------------------------------------------------- */
/* Coefficients historiques de sélection                                      */
/* ------------------------------------------------------------------------- */

/**
 * Le coefficient historique d'une position dans `size` chaînes. Arithmétique
 * entière uniquement : le serveur calcule la même chose en SQL, et un arrondi
 * flottant n'aurait pas le même résultat des deux côtés.
 */
export function circleTier(position: number, size: number): Rarity {
  if (position <= 0 || size < 2) return "legendary";
  const percent = Math.floor((position * 100) / (size - 1));
  if (percent <= CIRCLE_TIER_THRESHOLDS.epic) return "epic";
  if (percent <= CIRCLE_TIER_THRESHOLDS.rare) return "rare";
  if (percent <= CIRCLE_TIER_THRESHOLDS.uncommon) return "uncommon";
  return "common";
}

/** Coefficients historiques de sélection de 0054 ; jamais une rareté à afficher. */
export function circleTiers(slugs: readonly string[]): Record<string, Rarity> {
  const out: Record<string, Rarity> = {};
  slugs.forEach((slug, position) => {
    out[slug] = circleTier(position, slugs.length);
  });
  return out;
}

/** Combien de chaînes du cercle le joueur possède déjà. */
export function circleProgress(
  slugs: readonly string[],
  owned: ReadonlySet<string>,
): { owned: number; total: number } {
  return { owned: slugs.filter((slug) => owned.has(slug)).length, total: slugs.length };
}

/* ------------------------------------------------------------------------- */
/* Le premier booster                                                         */
/* ------------------------------------------------------------------------- */

function pickRarity(
  pool: readonly string[],
  tiers: Record<string, Rarity>,
  weights: Readonly<Partial<Record<Rarity, number>>>,
  random: RandomInt,
): Rarity | null {
  const present = CIRCLE_RARITY_ORDER.filter(
    (rarity) => (weights[rarity] ?? 0) > 0 && pool.some((slug) => tiers[slug] === rarity),
  );
  const total = present.reduce((sum, rarity) => sum + (weights[rarity] ?? 0), 0);
  if (!present.length || total <= 0) return null;
  let roll = random(total);
  for (const rarity of present) {
    const weight = weights[rarity] ?? 0;
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return present[present.length - 1];
}

function pickFrom(
  pool: readonly string[],
  tiers: Record<string, Rarity>,
  weights: Readonly<Partial<Record<Rarity, number>>>,
  random: RandomInt,
): string | null {
  const rarity = pickRarity(pool, tiers, weights, random);
  if (!rarity) return null;
  const bucket = pool.filter((slug) => tiers[slug] === rarity);
  return bucket[random(bucket.length)] ?? null;
}

/**
 * Aperçu invité : cinq chaînes différentes, toutes à leur rareté du catalogue.
 * Il faut donc au moins cinq noms ; en dessous, `circlePreviewPack` complète
 * l'aperçu avec le paquet tutoriel (rien n'est inventé dans le cercle).
 * Les coefficients historiques sélectionnent les slugs, sans rareté alternative.
 *
 * Ne sert qu'à l'aperçu d'un joueur sans compte : aucune carte n'est écrite, et
 * le tirage qui compte est décidé en ligne (`0054_cercle.sql`).
 */
export function drawCirclePack(
  slugs: readonly string[],
  random: RandomInt = defaultRandom,
): CircleCard[] {
  if (!isValidCircle(slugs) || slugs.length < CIRCLE_PACK_SIZE || slugs.some(slug => !CREATOR_BY_SLUG.has(slug))) {
    throw new Error("Un aperçu entièrement tiré dans le cercle demande cinq chaînes différentes.");
  }
  const tiers = circleTiers(slugs);
  const last =
    pickFrom(slugs, tiers, CIRCLE_LAST_SLOT_WEIGHTS, random) ??
    pickFrom(slugs, tiers, CIRCLE_SLOT_WEIGHTS, random)!;
  let pool = slugs.filter((slug) => slug !== last);
  const cards: CircleCard[] = [];
  for (let slot = 0; slot < CIRCLE_PACK_SIZE - 1; slot += 1) {
    const slug = pickFrom(pool, tiers, CIRCLE_SLOT_WEIGHTS, random)!;
    pool = pool.filter((item) => item !== slug);
    cards.push({ creatorSlug: slug, rarity: CREATOR_BY_SLUG.get(slug)!.rarity });
  }
  cards.push({ creatorSlug: last, rarity: CREATOR_BY_SLUG.get(last)!.rarity });
  return cards;
}
