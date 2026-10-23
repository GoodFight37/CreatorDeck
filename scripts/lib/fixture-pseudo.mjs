/** Pseudo de joueur de test : la même limite que display_name en base (0001_comptes_cloud.sql). */
export const PSEUDO_MAX_CARACTERES = 24;

/** Refuse un pseudo de fixture trop long, avant qu'il n'atteigne la base. */
export function assertPseudoDeTest(nom) {
  if ([...nom].length > PSEUDO_MAX_CARACTERES) throw new Error(`pseudo de test trop long : ${nom}`);
  return nom;
}
