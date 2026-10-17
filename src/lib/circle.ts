/**
 * « Mes chaînes » — le cercle du joueur.
 *
 * Une question, posée avant tout le reste : *quelles chaînes regardes-tu déjà ?*
 * Entre 5 et 15 noms. Le premier booster ne tire que dans ce cercle, et la
 * rareté y est **celle du cercle**, pas le rang mondial : la première chaîne de
 * la liste est la plus précieuse, la dernière la plus commune. C'est le joueur
 * qui écrit la valeur de ses cartes, ce qui règle d'un coup « les têtes
 * désirables sont toutes Légendaires » pour le premier booster.
 *
 * Ce module est **pur** : aucun accès à `window`, au réseau ni au catalogue. Le
 * catalogue lui est passé en argument, ce qui le rend testable seul et permet au
 * serveur de refaire exactement les mêmes calculs (`0054_cercle.sql` recopie les
 * seuils et les poids ci-dessous ; `supabase-cercle.test.ts` tombe si l'un des
 * deux côtés bouge sans l'autre).
 *
 * Ce que le module ne fait PAS : toucher à `pull-rates.json`, à l'économie ou
 * aux cartes déjà possédées. La rareté du cercle est une **couche d'affichage**
 * du premier booster ; la carte enregistrée garde sa rareté mondiale, qui pilote
 * le recyclage et l'artisanat.
 */
import type { Rarity } from "@/lib/catalog";

export const CIRCLE_MIN = 5;
export const CIRCLE_MAX = 15;
/** Un booster du cercle compte cinq cartes, comme le Live Drop. */
export const CIRCLE_PACK_SIZE = 5;

/** Du plus précieux au plus courant : l'ordre des raretés dans le cercle. */
export const CIRCLE_RARITY_ORDER: readonly Rarity[] = [
  "legendary",
  "epic",
  "rare",
  "uncommon",
  "common",
];

/**
 * Seuils de rareté **en pourcentage de la liste** (position 0 = 0 %, dernière
 * position = 100 %). La première chaîne est toujours « Légendaire » ; ensuite,
 * jusqu'à 30 % Épique, 55 % Rare, 80 % Peu commune, le reste Commune. Avec
 * cinq chaînes, le cercle contient exactement une carte de chaque rareté.
 */
export const CIRCLE_TIER_THRESHOLDS = { epic: 30, rare: 55, uncommon: 80 } as const;

/**
 * Poids du premier booster : quatre cartes ordinaires, puis une carte finale
 * garantie Rare ou mieux (dans le cercle). **Ces chiffres ne viennent pas de
 * `pull-rates.json`** : c'est un booster d'accueil, volontairement plus généreux
 * que le Live Drop. À régler au premier essai réel ; ils sont publiés avec les
 * autres taux avant toute mise en ligne (voir le plan, étape 1).
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

/** Les chaînes les plus suivies, pour qui n'a pas d'idée : jamais un doublon. */
export function popularCreators(
  index: CreatorIndex,
  exclude: readonly string[] = [],
  limit = CIRCLE_MIN,
): CircleCreator[] {
  const skip = new Set(exclude);
  return index.list.filter((creator) => !skip.has(creator.slug)).slice(0, limit);
}

/** Complète un cercle trop court avec les chaînes les plus suivies. */
export function completeWithPopular(slugs: readonly string[], index: CreatorIndex): string[] {
  const out = [...slugs];
  if (out.length >= CIRCLE_MIN) return out;
  for (const creator of popularCreators(index, out, CIRCLE_MIN - out.length)) out.push(creator.slug);
  return out;
}

/** Un cercle est jouable : entre 5 et 15 chaînes, toutes différentes. */
export function isValidCircle(slugs: readonly string[]): boolean {
  return (
    slugs.length >= CIRCLE_MIN &&
    slugs.length <= CIRCLE_MAX &&
    new Set(slugs).size === slugs.length
  );
}

/* ------------------------------------------------------------------------- */
/* La rareté du cercle                                                        */
/* ------------------------------------------------------------------------- */

/**
 * La rareté d'une position dans un cercle de `size` chaînes. Arithmétique
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

/** La rareté de chaque chaîne du cercle, par `slug`. */
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
 * Tire le premier booster dans le cercle : cinq chaînes **différentes**, dont la
 * dernière — celle qu'on garde pour la fin de la révélation — est Rare ou mieux
 * *dans le cercle*. Elle est tirée la première, pour que les quatre autres ne
 * puissent pas épuiser les chaînes précieuses ; l'ordre de révélation reste
 * « quatre cartes, puis la carte forte ».
 *
 * Ne sert qu'à l'aperçu d'un joueur sans compte : aucune carte n'est écrite, et
 * le tirage qui compte est décidé en ligne (`0054_cercle.sql`).
 */
export function drawCirclePack(
  slugs: readonly string[],
  random: RandomInt = defaultRandom,
): CircleCard[] {
  if (!isValidCircle(slugs)) {
    throw new Error("Il faut entre 5 et 15 chaînes différentes pour ouvrir ce booster.");
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
    cards.push({ creatorSlug: slug, rarity: tiers[slug] });
  }
  cards.push({ creatorSlug: last, rarity: tiers[last] });
  return cards;
}
