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
