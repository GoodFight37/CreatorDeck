/**
 * Le booster MEMES derrière un seuil (étape 3, D-141).
 *
 * Un joueur qui a nommé ses chaînes découvre **un seul univers** au début : le
 * Live Drop, celui de ses streameurs. Le booster MEMES apparaît sur le Drop une
 * fois `MEMES_UNLOCK_OPENINGS` boosters ouverts. Pourquoi 10 : la réserve se
 * recharge d'un booster toutes les 30 minutes (4 au maximum), donc 10 boosters
 * correspondent à la première journée de jeu ; le premier lot de 5 boosters
 * cadeau en couvre déjà la moitié.
 *
 * C'est de l'affichage, pas une règle : la réserve MEMES existe et se recharge
 * en ligne comme avant, rien n'est retiré ni perdu. Un joueur sans cercle garde
 * le Drop d'avant, avec les deux univers.
 */
export const MEMES_UNLOCK_OPENINGS = 10;

/** Le booster MEMES est-il proposé sur le Drop ? */
export function memesUnlocked(hasCircle: boolean, openings: number): boolean {
  return !hasCircle || openings >= MEMES_UNLOCK_OPENINGS;
}

/** « Le booster MEMES arrive après 10 boosters ouverts (3/10). » */
export function memesUnlockLine(openings: number): string {
  const done = Math.max(0, Math.min(MEMES_UNLOCK_OPENINGS, Math.floor(openings)));
  return `Le booster MEMES arrive après ${MEMES_UNLOCK_OPENINGS} boosters ouverts (${done}/${MEMES_UNLOCK_OPENINGS}).`;
}
