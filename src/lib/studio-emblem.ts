/**
 * **L'emblème d'Arène, posé sur l'étagère du Studio** — le pont entre les deux
 * univers du jeu.
 *
 * Le TCG se joue dans le Drop, le Binder et l'Arène ; le Studio a sa pièce.
 * Jusqu'ici, rien ne passait de l'un à l'autre : on pouvait gagner l'emblème
 * d'Arène (une semaine terminée dans le top 10) et ne jamais en voir la trace
 * dans sa chaîne. Une couronne **sur l'étagère** fait le lien : elle se gagne
 * dans l'Arène, elle se voit chez soi, et elle ne se vend pas.
 *
 * Le module ne dessine rien : il dit **où** poser les couronnes, à partir de la
 * vraie pièce (`src/data/studio-room.json`). L'étagère est trouvée **par son
 * identifiant** (`etagere`) : si elle déménage demain dans la pièce, la couronne
 * suit — et si elle disparaissait, il n'y aurait simplement plus d'emblème à
 * l'écran (jamais une couronne en l'air, au milieu du vide).
 *
 * Trois couronnes au plus : au-delà, elles se marcheraient dessus. Les semaines
 * gagnées restent toutes listées dans l'Arène.
 */
import { studioFurniture, studioSpriteSize, type StudioPlaced } from "@/lib/studio-room";

/** L'identifiant de l'étagère dans le fichier de la pièce. */
export const ETAGERE_ID = "etagere";

/** Le dessin de l'emblème : une couronne dorée, dans `public/fx/`. */
export const EMBLEME_ASSET = "/fx/couronne.png";

/** Le côté de la couronne dans **public/fx/couronne.png** (64 x 48). */
export const COURONNE_SOURCE = { largeur: 64, hauteur: 48 } as const;

/** Trois, pas plus : la face du haut de l'étagère n'est pas une étagère à couronnes. */
export const EMBLEMES_MAX = 3;

/**
 * Où tombent les couronnes sur la face supérieure du meuble.
 *
 * La bande `[DEBUT, FIN]` est une part de la **largeur du meuble** : la face du
 * haut est un losange, et ses coins ne portent rien. Le milieu de la bande vaut
 * 57 % — c'est là que tombe une couronne seule, au centre du plateau.
 */
const DEBUT = 0.22;
const FIN = 0.92;

/**
 * Le côté d'une couronne, selon le nombre posé (pixels du canevas).
 *
 * Moins il y en a, plus elles sont grandes : une couronne seule est un trophée,
 * trois sont une collection. Les valeurs ont été arrêtées sur des essais
 * d'image, `identify` en main — c'est le genre de réglage qui ne se devine pas.
 */
const TAILLES: Record<number, number> = { 1: 34, 2: 30, 3: 26 };

/** La hauteur de la face du haut, en part de la hauteur du meuble : la couronne s'y pose. */
const PLATEAU = 0.26;

/** Une couronne posée, en pixels du canevas de la pièce (coin haut-gauche). */
export type StudioCouronne = {
  left: number;
  top: number;
  largeur: number;
  hauteur: number;
};

/** L'étagère de la pièce, ou `null` si le fichier n'en pose plus. */
function etagere(): StudioPlaced | null {
  return studioFurniture().find((meuble) => meuble.id === ETAGERE_ID) ?? null;
}

/**
 * Les couronnes à poser, une par emblème gagné — **cadrées à trois**.
 *
 * Zéro emblème rend une liste vide : la pièce est celle d'un joueur qui n'a pas
 * encore gagné l'Arène, et rien ne doit le lui rappeler.
 */
export function emblemesSurLEtagere(nombre: number): StudioCouronne[] {
  const meuble = etagere();
  const gagnes = Math.max(0, Math.min(EMBLEMES_MAX, Math.floor(nombre)));
  if (!meuble || gagnes === 0) return [];

  // Le meuble : sa taille vient de son image (le fichier de la pièce ne la
  // recopie pas), donc la couronne suit si l'étagère change de modèle.
  const [largeurMeuble, hauteurMeuble] = studioSpriteSize(meuble.asset);

  // Une couronne seule se pose en grand ; trois se serrent pour tenir sur la
  // même face sans se chevaucher.
  const largeur = TAILLES[gagnes] ?? 26;
  const hauteur = (largeur * COURONNE_SOURCE.hauteur) / COURONNE_SOURCE.largeur;

  return Array.from({ length: gagnes }, (_, index) => {
    const centre =
      meuble.left + largeurMeuble * (DEBUT + ((index + 0.5) / gagnes) * (FIN - DEBUT));
    return {
      left: centre - largeur / 2,
      top: meuble.top + hauteurMeuble * PLATEAU - hauteur,
      largeur,
      hauteur,
    };
  });
}
