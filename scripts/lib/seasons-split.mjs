/**
 * Découpage d'une saison en morceaux de taille raisonnable.
 *
 * Module partagé, sans dépendance : il est utilisé par l'application
 * (`src/lib/seasons.ts`, via ses déclarations `.d.mts`) **et** par l'outil de
 * vérification (`scripts/build-catalog.mjs`). Sans ce partage, le rapport de
 * `catalog:check` annonçait une famille de 170 créateurs là où l'application en
 * affichait déjà deux morceaux de 150 et 20 — un rapport qui ment est pire
 * qu'une absence de rapport.
 *
 * Règles :
 *   1. regroupement par catégorie — un morceau ne mélange pas la moitié d'un
 *      jeu avec la moitié d'un autre ;
 *   2. remplissage glouton, jamais au-delà de `maxSize` ;
 *   3. une catégorie plus grosse que `maxSize` à elle seule est découpée en
 *      tranches (un jeu très représenté chez les petits streamers) ;
 *   4. un seul morceau → l'identifiant d'origine est conservé ;
 *      plusieurs morceaux → `S01-1`, `S01-2`… et le nom porte « · 1/2 ».
 */

/**
 * @param {{slug: string, category: string}[]} entries
 * @param {{id: string, name: string, tagline: string}} meta
 * @param {number} [maxSize]
 * @returns {{id: string, name: string, tagline: string, categories: string[], slugs: string[]}[]}
 */
export function splitSeason(entries, { id, name, tagline }, maxSize = 60) {
  if (!entries.length) return [];
  const whole = () => [
    {
      id,
      name,
      tagline,
      categories: [...new Set(entries.map((entry) => entry.category))].sort(),
      slugs: entries.map((entry) => entry.slug),
    },
  ];
  if (maxSize < 1) return whole();

  // 1. Regroupement par catégorie.
  const byCategory = new Map();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category);
    if (bucket) bucket.push(entry);
    else byCategory.set(entry.category, [entry]);
  }

  // 2. Remplissage glouton.
  const packed = [];
  let current = [];
  for (const bucket of byCategory.values()) {
    if (current.length && current.length + bucket.length > maxSize) {
      packed.push(current);
      current = [];
    }
    if (bucket.length > maxSize) {
      // 3. Catégorie à elle seule trop grosse : découpage en tranches.
      for (let index = 0; index < bucket.length; index += maxSize) {
        packed.push(bucket.slice(index, index + maxSize));
      }
      continue;
    }
    current.push(...bucket);
  }
  if (current.length) packed.push(current);

  if (packed.length === 1) return whole();

  return packed.map((chunk, index) => ({
    id: `${id}-${index + 1}`,
    name: `${name} · ${index + 1}/${packed.length}`,
    tagline,
    categories: [...new Set(chunk.map((entry) => entry.category))].sort(),
    slugs: chunk.map((entry) => entry.slug),
  }));
}

/** Identifiant de famille d'une saison : `S01-2` → `S01`. */
export function familyIdOf(seasonId) {
  return String(seasonId).replace(/-\d+$/, "");
}

/** Numéro de morceau d'une saison (1 pour une famille entière). */
export function pieceOf(seasonId) {
  const match = /-(\d+)$/.exec(String(seasonId));
  return match ? Number(match[1]) : 1;
}
