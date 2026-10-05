/**
 * Catégorie d'une tête d'affiche résolue par la liste curée.
 *
 * Le problème que ce module résout : pour une chaîne **hors direct**, Twitch
 * n'expose pas ce qu'elle streame, seulement le dernier jeu qu'elle a
 * programmé (`broadcastSettings`). Ce jeu peut être vieux, sponsorisé ou
 * anecdotique — d'où des étiquettes fausses sur les cartes les plus visibles :
 * « ibai → Among Us », « coscu → Magic: The Gathering ».
 *
 * Règle retenue, prudente :
 *   1. chaîne **en direct** → sa catégorie observée, c'est un fait ;
 *   2. hors direct, dernier jeu **modélisé par les familles** du catalogue →
 *      on le garde (c'est le jeu auquel le public l'associe, et il place la
 *      carte dans une famille pertinente) ;
 *   3. sinon → « Variété & Live », le placeholder que le reste du générateur
 *      traite déjà comme tel : dès qu'une découverte ultérieure apporte une
 *      catégorie réelle, elle remplace le placeholder.
 *
 * On n'invente donc jamais un jeu, et on ne détruit pas une étiquette juste
 * pour le plaisir : seules les catégories que le jeu ne modélise pas passent au
 * placeholder.
 *
 * Pur et sans dépendance : testé dans `src/lib/curated-category.test.ts`.
 */

/** Placeholder quand aucune catégorie fiable n'est disponible. */
export const FALLBACK_CATEGORY = "Variété & Live";

/**
 * @param {{liveGame?: string|null, lastGame?: string|null,
 *          knownCategories?: Iterable<string>, fallback?: string}} input
 * @returns {string}
 */
export function curatedCategory({
  liveGame = null,
  lastGame = null,
  knownCategories = [],
  fallback = FALLBACK_CATEGORY,
}) {
  const live = typeof liveGame === "string" ? liveGame.trim() : "";
  if (live) return live;

  const last = typeof lastGame === "string" ? lastGame.trim() : "";
  if (!last) return fallback;

  const known = knownCategories instanceof Set ? knownCategories : new Set(knownCategories);
  return known.has(last) ? last : fallback;

  // Note : le repli ne peut pas tomber dans une catégorie bloquée (casino…)
  // puisqu'il n'affirme aucun jeu. Le blocage reste appliqué aux catégories
  // réellement observées, dans le générateur.
}
