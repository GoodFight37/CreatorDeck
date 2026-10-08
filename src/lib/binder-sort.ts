/**
 * L'ordre du classeur.
 *
 * Le classeur montre 1 000 créateurs, neuf par page. L'ordre du catalogue (le
 * rang Twitch) répond à « où en est ma collection », pas à « qu'est-ce que je
 * fais maintenant » : un joueur qui veut recycler cherche ses doublons, un
 * joueur qui cherche une carte précise veut l'alphabet, un joueur qui suit une
 * chaîne veut l'audience. Les trois autres ordres sont là pour ça.
 *
 * Fonction **pure** : elle ne connaît ni React ni le moteur, seulement une
 * liste, un ordre, et deux questions posées au joueur (« combien de copies ? »,
 * « obtenue quand ? »). C'est ce qui la rend testable sans navigateur — le tri
 * est de la donnée, pas de l'affichage.
 *
 * À égalité, on retombe toujours sur le rang Twitch : deux tris successifs ne
 * se marchent pas dessus, et l'ordre reste stable d'un rendu à l'autre.
 */

import type { Creator } from "@/lib/catalog";

export type BinderSort = "catalog" | "recent" | "duplicates" | "audience" | "alpha";

/** Ce que le sélecteur affiche, dans l'ordre : le plus utile en premier. */
export const BINDER_SORTS: { id: BinderSort; label: string }[] = [
  { id: "catalog", label: "Rang Twitch" },
  { id: "recent", label: "Dernières obtenues" },
  { id: "duplicates", label: "Doublons d'abord" },
  { id: "audience", label: "Audience" },
  { id: "alpha", label: "A → Z" },
];

export function sortBinder(
  creators: Creator[],
  sort: BinderSort,
  countOf: (slug: string) => number,
  latestOf: (slug: string) => number,
): Creator[] {
  // Une copie : on ne trie jamais le tableau du rendu par-dessus.
  const copy = [...creators];
  switch (sort) {
    case "duplicates":
      // Le plus de copies d'abord : c'est la file d'attente du recyclage.
      return copy.sort((a, b) => countOf(b.slug) - countOf(a.slug) || a.rank - b.rank);
    case "recent":
      // Les dernières obtenues d'abord ; ce qu'on ne possède pas encore tombe à
      // la fin (date à zéro), dans l'ordre du catalogue.
      return copy.sort((a, b) => latestOf(b.slug) - latestOf(a.slug) || a.rank - b.rank);
    case "audience":
      return copy.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0) || a.rank - b.rank);
    case "alpha":
      return copy.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "fr", { sensitivity: "base" }),
      );
    default:
      // Le rang du catalogue : le rang Twitch, celui qui classe déjà tout.
      return copy.sort((a, b) => a.rank - b.rank);
  }
}
