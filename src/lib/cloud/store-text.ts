/**
 * Les phrases que le jeu dit de sa **connexion**.
 *
 * Pourquoi ce module : huit écrans (l'Arène, les amis, l'hôtel, le carnet, les
 * codes, la wishlist, le Last Pack, le profil public) affichaient le même genre
 * de bloc — « … demande le cloud » — avec, chaque fois, une explication un peu
 * différente, et presque toujours une bribe d'infrastructure dedans (« il n'y a
 * pas de serveur », « un code se vérifie sur le serveur »).
 *
 * Le joueur, lui, ne veut qu'une chose : savoir **ce qui manque** et **ce qu'il
 * gagne** à se connecter. Le titre est donc écrit une fois — avec la raison
 * propre à l'écran, « l'Arène », « les amis », puisque c'est ce qui fait qu'on
 * reconnaît l'endroit où l'on est — et le reste du bloc appartient à l'écran.
 *
 * C'est du texte pur, donc c'est testé (`src/lib/cloud/store-text.test.ts`).
 */

/** La phrase verte qui dit que tout est en ordre — écrite une seule fois. */
export const PROGRESSION_SYNCHRONISEE = "Progression synchronisée";

/**
 * Le titre du bloc « il faut un compte » : « L'Arène demande une connexion ».
 *
 * `plusieurs` accorde le verbe quand la raison est un pluriel (« Les amis »,
 * « Les codes »). Une faute d'accord dans la première phrase que lit un joueur
 * hors ligne, c'est le genre de détail qui fait qu'on ne croit plus au reste.
 */
export function connecteToi(raison: string, plusieurs = false): string {
  return `${raison} ${plusieurs ? "demandent" : "demande"} une connexion`;
}

/**
 * Les noms des écrans du compte, tels qu'on les cite au joueur dans une phrase.
 *
 * Jamais « Charger le cloud », ni « Envoyer ma collection » : ces gestes
 * n'existent plus. Il n'y a donc rien d'autre à nommer que **où** l'on règle
 * son compte.
 */
export const RACCOURCIS_LISIBLES = {
  compte: "Mon compte",
  public: "Profil public",
  reglages: "Réglages du compte",
} as const;
