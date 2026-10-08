/**
 * **Les crédits** : ce que le jeu n'a pas fait lui-même, et qui l'a fait.
 *
 * Le jeu n'affiche pas de générique, et c'en est un quand même : trois choses
 * ici viennent d'ailleurs et deux licences **demandent** d'en parler. Le pack
 * d'effets (« Super Pixel Effects ») demande une ligne de crédit, l'enregistreur
 * de sons demande qu'on ne revende pas ses fichiers tels quels — et la façon de
 * le dire, c'est cette page.
 *
 * Ce que ce fichier **est** : des données. Il dit qui a fait quoi, et sous
 * quelle licence. Ce qu'il n'est pas : une place où ranger les remerciements
 * personnels — il n'y en a qu'un, le joueur, et il n'a pas besoin d'un écran
 * pour le lire.
 *
 * La règle de rédaction est la même que partout ailleurs dans l'interface : ce
 * que le joueur lit ne parle pas d'infrastructure (`scripts/check-jargon.mjs`).
 * Une licence, ça se nomme ; un fichier, non.
 */

export type Credit = {
  /** Ce que le jeu affiche : l'élément, dit simplement (« Les bruitages »). */
  quoi: string;
  /** Qui l'a fait : le nom de l'auteur ou du studio, et l'œuvre. */
  qui: string;
  /** Ce que la licence permet, en trois mots — ce que le joueur a le droit de savoir. */
  licence: string;
};

/**
 * Les crédits, dans l'ordre où un joueur les cherche : d'abord ce qu'il a sous
 * les yeux (les portraits), puis ce qu'il entend (les bruits), puis les outils
 * qu'il ne voit pas (icônes, polices). Le décor du Studio avait sa ligne tant
 * que le kit Kenney était dans le jeu : il est parti le 8 octobre 2026 avec la
 * pièce, et sa ligne est partie avec lui — un crédit pour un fichier qui n'est
 * plus là serait un mensonge poli.
 */
export const CREDITS: readonly Credit[] = [
  {
    quoi: "Les portraits des créateurs",
    qui: "Twitch — les photos officielles des chaînes, affichées telles quelles",
    licence: "utilisées pour illustrer les cartes",
  },
  {
    quoi: "Les effets : éclats, explosions, fumées",
    qui: "Will Tice / unTied Games — « Super Pixel Effects »",
    licence: "crédit demandé par la licence",
  },
  {
    quoi: "Les bruitages",
    qui: "Chequered Ink — « 400 Sounds Pack »",
    licence: "usage libre, revente des fichiers interdite",
  },
  {
    quoi: "Les icônes",
    qui: "Lucide",
    licence: "libres",
  },
  {
    quoi: "Les polices d'écriture",
    qui: "IBM Plex Sans et Barlow Condensed",
    licence: "libres",
  },
];

/**
 * Le crédit **obligatoire** du pack d'effets, dans la forme que sa licence
 * demande : « (Nom du pack) - Will Tice / unTied Games ».
 *
 * Il est déjà dans la liste ci-dessus, et il est écrit ici aussi parce que c'est
 * lui qu'un test surveille : faire disparaître la seule ligne que quelqu'un
 * d'autre exige est exactement le genre de retouche qu'on ne voit pas.
 */
export const CREDIT_EFFETS = "Will Tice / unTied Games — « Super Pixel Effects »";
