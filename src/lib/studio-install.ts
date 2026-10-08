/**
 * **L'arrivée d'un palier** : où tombe la fumée, et dans quel ordre.
 *
 * Quand un palier s'installe, la pièce change d'un coup — et un objet qui
 * apparaît sans transition ne se remarque pas. Deux choses le rendent visible :
 * l'objet **tombe** en place (une animation sur sa classe, côté CSS) et une
 * **bouffée de fumée** marque l'endroit où on vient de le brancher.
 *
 * Ce module ne fait que la deuxième : il répond à « où », à partir de la **vraie
 * pièce** (`src/data/studio-room.json`, via `studio-room.ts`). Rien n'est écrit
 * à la main ici : si un palier pose un objet ailleurs demain, la fumée suit.
 *
 * La règle du nombre est simple, et c'est la seule décision du module : un
 * palier peut poser jusqu'à sept objets (la déco : quatre panneaux, trois
 * meubles). Sept nuages, c'est un incendie, pas une installation — on en garde
 * **trois au plus**, répartis dans la pièce, et le reste arrive en silence.
 */
import {
  studioAccessories,
  studioFurniture,
  studioLights,
  studioSpriteSize,
  studioWallPanels,
  type StudioPoint,
} from "@/lib/studio-room";

/** Un objet qui entre dans la pièce : son identifiant et son centre. */
export type StudioArrivee = {
  id: string;
  /** Le centre de l'objet, en pixels du canevas (`StudioPoint`). */
  at: StudioPoint;
};

/** Une bouffée : son centre, en pixels du canevas de la pièce. */
export type StudioNuage = {
  /** Le centre du nuage, en pixels du canevas (`StudioPoint`). */
  at: StudioPoint;
  /** Le retard, en ms : la fumée suit l'objet, elle ne part pas avant lui. */
  delayMs: number;
};

/** Trois, pas plus : au-delà, la pièce disparaît dans la fumée. */
export const NUAGES_MAX = 3;

/** Le pas entre deux bouffées : elles se suivent, elles ne se superposent pas. */
const PAS_MS = 140;

/** Le centre d'un sprite du kit, en pixels du canevas. */
function centreDuSprite(left: number, top: number, asset: string): StudioPoint {
  const [largeur, hauteur] = studioSpriteSize(asset);
  return [left + largeur / 2, top + hauteur / 2];
}

/**
 * Les objets qu'un palier fait entrer dans la pièce, **du fond vers le devant**
 * (le haut de l'image vers le bas, puis de gauche à droite).
 *
 * C'est l'ordre dans lequel l'œil parcourt la pièce : les objets arrivent dans
 * cet ordre-là, et la fumée suit. Un identifiant inconnu, un palier qui ne pose
 * rien ou un palier introuvable rendent une liste **vide** : l'appelant n'a rien
 * à décider, la pièce s'affiche comme avant.
 */
export function studioArrivees(setup: string): StudioArrivee[] {
  const arrivees: StudioArrivee[] = [];

  for (const sprite of [...studioFurniture(), ...studioWallPanels()]) {
    if (sprite.setup === setup) {
      arrivees.push({
        id: sprite.id,
        at: centreDuSprite(sprite.left, sprite.top, sprite.asset),
      });
    }
  }
  for (const lumiere of studioLights()) {
    if (lumiere.setup === setup) arrivees.push({ id: lumiere.id, at: lumiere.at });
  }
  for (const gadget of studioAccessories()) {
    if (gadget.setup === setup) arrivees.push({ id: gadget.id, at: gadget.at });
  }

  return arrivees.sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]);
}

/**
 * Les bouffées de fumée d'un palier : **trois au plus**, réparties dans ce qui
 * vient d'arriver.
 *
 * On en prend une sur `pas`, ce qui laisse la fumée tomber des deux bouts de la
 * pièce, jamais trois fois dans le même coin.
 */
export function studioNuages(setup: string): StudioNuage[] {
  const arrivees = studioArrivees(setup);
  if (arrivees.length === 0) return [];
  const pas = Math.max(1, Math.ceil(arrivees.length / NUAGES_MAX));
  return arrivees
    .filter((_, index) => index % pas === 0)
    .slice(0, NUAGES_MAX)
    .map((arrivee, index) => ({ at: arrivee.at, delayMs: index * PAS_MS }));
}
