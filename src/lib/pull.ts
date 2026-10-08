/**
 * Le geste d'ouverture : tirer le booster vers le haut.
 *
 * Le déballage est le pic d'émotion du jeu, et un clic sur un bouton ne le
 * raconte pas. Mais un geste mal calibré est pire qu'un bouton : s'il faut
 * tracer un trait parfait, le joueur s'énerve et croit à un bug. Ce module est
 * donc **permissif par construction**, et il est pur — il ne connaît ni le
 * doigt, ni React, ni le moteur. Il reçoit un déplacement en pixels et une
 * durée, il répond « armé » ou « pas armé ». C'est testable sans navigateur, et
 * la même règle vaut pour la souris et pour le doigt.
 *
 * Deux façons d'armer, parce qu'une seule ne suffit pas :
 *
 *   * **tirer loin** : `PULL_THRESHOLD_PX` de remontée, sans se presser — le
 *     geste lent et sûr, celui qu'on fait quand on ne connaît pas le jeu ;
 *   * **tirer sec** : `PULL_FLICK_PX` en moins de `PULL_FLICK_MS`, une
 *     chiquenaude franche vers le haut — le geste du joueur qui ouvre son
 *     dixième paquet.
 *
 * **Ce qu'aucune des deux ne doit accepter : un effleurement.** Rapporté par le
 * joueur le 7 octobre 2026 : « quand j'effleure le booster ça l'ouvre
 * directement, des fois je fais même pas exprès ». La première version armait à
 * **30 px en 260 ms** (≈ 115 px/s) : un doigt qui se pose, glisse d'un pixel et
 * se retire, ou le tout début d'un défilement, ouvrait un booster — un geste
 * qui consomme une réserve. Les deux seuils sont donc ceux d'un vrai geste :
 * 88 px de remontée, ou 80 px en moins de 200 ms (≈ 400 px/s). Une chiquenaude
 * légitime les dépasse largement ; un effleurement, jamais.
 *
 * Le retour visuel est continu (`progress`, de 0 à 1) : le paquet monte, la
 * couture s'ouvre, et le joueur voit qu'il avance **avant** que ça arme. Le
 * seuil n'est pas une surprise, c'est une ligne qu'on voit venir.
 */

/** Distance de tirer à atteindre pour armer, en pixels CSS. */
export const PULL_THRESHOLD_PX = 88;
/** Une chiquenaude vers le haut : cette distance… */
export const PULL_FLICK_PX = 80;
/** …en moins de ce temps (≈ 400 px/s : une chiquenaude, pas un glissement). */
export const PULL_FLICK_MS = 200;
/** Au-delà, le visuel est à fond (mais le seuil reste celui du dessus). */
export const PULL_VISUAL_MAX_PX = 150;
/** En dessous, on considère que ce n'était pas un geste (tap, tremblement). */
export const PULL_DEAD_ZONE_PX = 6;

export type PullVerdict = {
  /** 0 → 1 : ce que le visuel montre de l'avancement du geste. */
  progress: number;
  /** Le geste compte : relâcher maintenant ouvre le booster. */
  armed: boolean;
  /** Le geste a commencé (au-delà de la zone morte) : le visuel prend la main. */
  active: boolean;
};

/**
 * Le verdict d'un geste, à un instant donné.
 *
 * @param dy   Déplacement vertical **vers le haut**, en pixels (positif = on tire).
 * @param dt   Durée écoulée depuis le début du geste, en millisecondes.
 */
export function pullVerdict(dy: number, dt: number): PullVerdict {
  if (dy <= PULL_DEAD_ZONE_PX) {
    // Vers le bas, ou un tremblement : rien n'est commencé — ni le visuel, ni le
    // geste. C'est ce qui laisse la page défiler quand le doigt part vers le bas,
    // et ce qui évite qu'un tap fasse sauter le paquet.
    return { progress: 0, armed: false, active: false };
  }
  const progress = Math.min(1, dy / PULL_VISUAL_MAX_PX);
  const far = dy >= PULL_THRESHOLD_PX;
  const flick = dy >= PULL_FLICK_PX && dt <= PULL_FLICK_MS;
  return { progress, armed: far || flick, active: true };
}
