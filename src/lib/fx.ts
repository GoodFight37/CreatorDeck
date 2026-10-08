/**
 * Les effets de **moment rare** : ce qui s'affiche par-dessus la carte quand
 * elle tombe Épique, Légendaire, ou quand le paquet est un Perfect.
 *
 * Deux règles, et elles tiennent tout le module :
 *
 *   1. **le rare se mérite.** Une commune qui fait des étincelles rend le
 *      Légendaire ordinaire — c'est exactement l'inverse du but. Commune, peu
 *      commune et rare ne déclenchent **rien** ;
 *   2. **l'effet ne décide de rien.** Il ne lit ni le tirage, ni la collection,
 *      ni l'horloge : on lui donne une rareté, il rend un nom d'effet. C'est ce
 *      qui permet de le tester (`src/lib/fx.test.ts`) et de le couper d'un seul
 *      coup (le réglage « Reflets des cartes » et `prefers-reduced-motion`
 *      éteignent le CSS, pas la logique).
 *
 * Les images sont des **planches** (`public/fx/*.png`) : toutes les images d'une
 * animation sur une seule ligne. Le CSS les fait défiler en `steps()`, ce qui
 * donne des pixels nets et zéro JavaScript par image. Elles viennent du pack
 * d'effets pixel-art déjà dans le dépôt ; le dossier livré pèse des dizaines de
 * mégaoctets, on n'en embarque que **trois planches et une couronne** (44 Ko).
 */
import type { Rarity } from "@/lib/catalog";

/** Les effets disponibles, par nom de planche (`public/fx/<nom>.png`). */
export type FxKind = "explosion" | "eclat" | "fumee";

export type FxSheet = {
  /** Nombre d'images côte à côte dans la planche. */
  frames: number;
  /** Côté d'une image, en pixels source. */
  frame: number;
  /** Durée de l'animation complète, en ms. */
  durationMs: number;
  /** Taille affichée sur un téléphone, en pixels CSS. */
  size: number;
};

/**
 * La table des effets.
 *
 * `durationMs` suit une règle simple : 30 ms par image pour les éclats (le
 * rythme du pixel-art), 35 ms pour la fumée, qui doit traîner un peu.
 */
export const FX_SHEETS: Record<FxKind, FxSheet> = {
  // Le grand : 15 images de 192 px, l'explosion dorée du pack d'effets.
  explosion: { frames: 15, frame: 192, durationMs: 450, size: 330 },
  // Le moyen : 13 images de 128 px, l'éclat orange.
  eclat: { frames: 13, frame: 128, durationMs: 390, size: 210 },
  // La disparition/arrivée d'un objet acheté : 21 images de 64 px.
  fumee: { frames: 21, frame: 64, durationMs: 735, size: 150 },
};

/** L'URL de la planche d'un effet. */
export function fxUrl(kind: FxKind): string {
  return `/fx/${kind}.png`;
}

/**
 * L'effet d'une carte révélée — ou `null` s'il n'y en a pas.
 *
 * Le Perfect ouvre **le plus grand** : c'est le paquet entier qui est rare, pas
 * une carte dedans. Dans ce cas `rarity` n'est que la rareté de l'emplacement
 * courant, elle ne décide de rien.
 */
export function burstFor(rarity: Rarity, perfect = false): FxKind | null {
  if (perfect) return "explosion";
  if (rarity === "legendary") return "explosion";
  if (rarity === "epic") return "eclat";
  return null;
}

/**
 * L'écran blanc, réservé au Légendaire et au Perfect.
 *
 * C'est le seul effet **plein écran** du jeu : il coûte une image blanche et il
 * fatigue l'œil. Il ne se déclenche donc que là où il raconte quelque chose —
 * une Épique garde son éclat, sans flash.
 */
export function flashFor(rarity: Rarity, perfect = false): boolean {
  return perfect || rarity === "legendary";
}

/** Combien de temps l'écran reste occupé par l'effet (le test s'en sert). */
export function fxDurationMs(kind: FxKind): number {
  return FX_SHEETS[kind].durationMs;
}
