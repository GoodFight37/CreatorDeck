/**
 * Découpage d'une famille de collection en vagues de taille raisonnable.
 *
 * Module partagé, sans dépendance : il est utilisé par l'application
 * (`src/lib/seasons.ts`, via ses déclarations `.d.mts`) **et** par l'outil de
 * vérification (`scripts/build-catalog.mjs`). Sans ce partage, le rapport de
 * `catalog:check` annoncerait une famille de 276 créateurs là où l'application
 * en affiche déjà deux vagues — un rapport qui ment est pire qu'une absence de
 * rapport.
 *
 * Il porte aussi les **paliers** d'une saison (`tiersFor`) : l'application les
 * affiche, et le générateur du wallet (`scripts/build-supabase-seasons.mjs`) les
 * écrit en SQL. Une seule implémentation, donc le serveur ne peut pas payer un
 * autre montant que celui que le joueur voit.
 *
 * Règles :
 *   1. **ordre du classement** — la première vague d'une famille, ce sont ses
 *      têtes d'affiche : c'est l'objectif naturel du début de collection ;
 *   2. une vague ne dépasse jamais `maxSize` ;
 *   3. une famille qui tient en une seule vague garde son identifiant
 *      d'origine ; au-delà, les morceaux deviennent `S04-1`, `S04-2`… et le nom
 *      porte « · 1/3 ».
 *
 * Historique : le découpage groupait autrefois par catégorie de jeu. Le
 * classement par langue rend ce regroupement inutile (et faux : un streameur
 * change de jeu en cours de route), donc les vagues suivent simplement l'ordre
 * du classement.
 */

/**
 * @param {{slug: string, region?: string}[]} entries
 * @param {{id: string, name: string, tagline: string}} meta
 * @param {number} [maxSize]
 * @returns {{id: string, name: string, tagline: string, regions: string[], slugs: string[]}[]}
 */
export function splitSeason(entries, { id, name, tagline }, maxSize = 150) {
  if (!entries.length) return [];
  const regionsOf = (list) => [...new Set(list.map((entry) => entry.region).filter(Boolean))].sort();
  const whole = () => [
    {
      id,
      name,
      tagline,
      regions: regionsOf(entries),
      slugs: entries.map((entry) => entry.slug),
    },
  ];
  if (!(maxSize >= 1) || entries.length <= maxSize) return whole();

  const pieces = [];
  for (let index = 0; index < entries.length; index += maxSize) {
    pieces.push(entries.slice(index, index + maxSize));
  }

  return pieces.map((chunk, index) => ({
    id: `${id}-${index + 1}`,
    name: `${name} · ${index + 1}/${pieces.length}`,
    tagline,
    regions: regionsOf(chunk),
    slugs: chunk.map((entry) => entry.slug),
  }));
}

/** Identifiant de famille d'une saison : `S01-2` → `S01`. */
export function familyIdOf(seasonId) {
  return String(seasonId).replace(/-\d+$/, "");
}

/** Numéro de vague d'une saison (1 pour une famille entière). */
export function pieceOf(seasonId) {
  const match = /-(\d+)$/.exec(String(seasonId));
  return match ? Number(match[1]) : 1;
}

/** Libellés des paliers, dans l'ordre (le dernier referme la saison). */
export const TIER_LABELS = ["Bronze", "Argent", "Or", "Arc-en-ciel"];

/**
 * Parts du total de points, cumulées, attribuées aux paliers.
 *
 * La **dernière est toujours forcée à 1** : la somme des paliers retombe
 * exactement sur le total historique (`pointsPerCreator × taille`), donc
 * l'économie ne bouge pas — elle est seulement versée en cours de route.
 */
export const TIER_SHARES = [0.15, 0.4, 0.7, 1];

/**
 * Seuils d'une saison de `size` créateurs : 25 %, 50 %, 75 % et 100 %, toujours
 * croissants, jamais deux fois le même, et jamais au-delà de la taille.
 *
 * @param {number} size
 * @returns {number[]}
 */
export function tierThresholds(size) {
  const thresholds = [];
  for (const share of [0.25, 0.5, 0.75, 1]) {
    const wanted = Math.max(Math.ceil(share * size), (thresholds.at(-1) ?? 0) + 1);
    const bounded = Math.min(size, wanted);
    if (bounded !== thresholds.at(-1)) thresholds.push(bounded);
  }
  return thresholds;
}

/**
 * Paliers d'une saison de `size` créateurs.
 *
 * @param {number} size
 * @param {{ pointsPerCreator: number, hourglassesPerSeason: number }} config
 * @returns {{ label: string, required: number, reward: { points: number, hourglasses: number }, emblem: boolean }[]}
 */
export function tiersFor(size, config) {
  const thresholds = tierThresholds(size);
  const totalPoints = config.pointsPerCreator * size;
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
      reward: { points, hourglasses: last ? config.hourglassesPerSeason : 0 },
      emblem: last,
    };
  });
}
