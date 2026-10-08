/**
 * Le geste de la carte d'imprévu : un glissement **horizontal**, permissif, et
 * deux garde-fous qui viennent de l'usage réel.
 *
 * Pourquoi un module à part, comme `pull.ts` et `tilt.ts` : un geste ne se
 * vérifie pas à l'œil. Ce qui se décide ici — le seuil, et surtout ce qui
 * **n'arme pas** — doit être lisible et testable, sans navigateur.
 *
 * Deux refus, et une permission :
 *
 *   * un **effleurement** (moins de `SWIPE_ARM_PX` de course) ne choisit rien :
 *     la carte se repose toute seule, et le joueur garde son choix ;
 *   * un geste surtout **vertical** est un défilement, pas un choix — la feuille
 *     de la chaîne se fait défiler au doigt, et il ne faut pas qu'un scroll
 *     réponde à un imprévu ;
 *   * le reste est **permissif** : au-delà du seuil, le côté se décide sur le
 *     sens du glissement, sans condition de vitesse ni de relâchement précis.
 *     Exiger plus serait un geste de connaisseur ; la carte a un bouton de
 *     repli pour qui préfère appuyer.
 */

/** La course horizontale, en pixels, à partir de laquelle le côté est armé. */
export const SWIPE_ARM_PX = 64;

export type SwipeSide = "gauche" | "droite";

export type SwipeVerdict = {
  /** Le déplacement horizontal courant, en pixels (négatif vers la gauche). */
  dx: number;
  /** Le côté armé, ou `null` si le geste ne décide rien. */
  armed: SwipeSide | null;
};

/**
 * Ce que vaut le geste en cours.
 *
 * `dx` est la course horizontale (gauche négative), `dy` la course verticale du
 * même geste. Aucune durée n'entre en compte : c'est la **distance** qui décide,
 * et elle seule — un geste lent mais franc vaut mieux qu'un coup de doigt
 * nerveux de trois millimètres.
 */
export function swipeVerdict(dx: number, dy = 0): SwipeVerdict {
  const course = Math.abs(dx);
  const verticale = Math.abs(dy);
  if (course < SWIPE_ARM_PX || verticale > course) {
    return { dx, armed: null };
  }
  return { dx, armed: dx < 0 ? "gauche" : "droite" };
}
