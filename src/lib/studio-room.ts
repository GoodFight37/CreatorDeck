/**
 * **La pièce du studio** : où tombe chaque sprite.
 *
 * Le décor de « Ta chaîne » n'est plus dessiné à la main : c'est une vraie
 * pièce isométrique, composée d'images du kit Kenney « Isometric Miniature »
 * (CC0, voir `docs/assets-graphiques.md`). Le fichier `src/data/studio-room.json`
 * dit **quoi** poser et **où** ; ce module fait le calcul, et rien d'autre.
 *
 * Il est pur pour une raison simple : une pièce isométrique se trompe d'un
 * demi-tile sans prévenir, et on ne peut pas le voir ici (pas de navigateur).
 * Le module est donc testable, et `studio-room.test.ts` vérifie chaque entrée du
 * fichier contre les **vrais PNG** : la taille annoncée est celle de l'en-tête,
 * le point d'appui tombe sur un pixel opaque, le fichier existe. Remplacer une
 * image par une autre casse le test, pas la pièce.
 *
 * Deux conventions, valables pour tout le fichier :
 *
 *  * **la grille** : `iso(cell)` donne le centre de la cellule `[i, j]` en
 *    coordonnées de scène (pixels du canevas). Une tuile de sol pleine couvre
 *    2 x 2 cellules : elle se pose par son centre ;
 *  * **le point d'appui** : chaque sprite se pose par un point choisi dans son
 *    image (`appui`), posé sur un point de la scène (`at`) — le pied d'une lampe
 *    sur le sol, le bas d'un mur sur l'arête de la pièce. C'est la seule règle
 *    de placement, et elle marche pour tout : sol, murs, meubles, panneaux.
 *
 * Ce que ce module **ne fait pas** : décider du contenu. Les paliers qui allument
 * les objets viennent de `src/data/streamer.json` (`setup.levels`) ; ici on dit
 * seulement quelle image porte quel palier.
 */
import room from "@/data/studio-room.json";

/** Un point de la scène, en pixels du canevas. */
export type StudioPoint = [number, number];

export type StudioGrid = {
  /** Le canevas logique : toutes les coordonnées vivent dedans. */
  canvas: StudioPoint;
  /** Le côté de la pièce, en cellules. */
  tiles: number;
  /** Le pas d'une cellule (104 x 76 : le pas du kit). */
  step: StudioPoint;
  /** Le centre de la cellule `[0, 0]`. */
  origin: StudioPoint;
};

/** Un sprite posé dans la pièce. */
export type StudioPlaced = {
  id: string;
  asset: string;
  /** Le point de l'image qui touche la scène. */
  appui: StudioPoint;
  /** Le point de la scène qu'il touche. */
  at: StudioPoint;
  /** Le coin haut-gauche, en pixels du canevas : ce que le DOM applique. */
  left: number;
  top: number;
  /** Le palier de setup qui le fait entrer dans la pièce (`null` : toujours là). */
  setup: string | null;
  /** L'ordre du peintre : le plus petit est dessiné le plus loin. */
  depth: number;
};

/** Un néon, dessiné en CSS : le kit n'en fournit pas. */
export type StudioNeon = {
  id: string;
  kind: "neon" | "halo";
  couleur: string;
  /** Le centre de la forme. */
  at: StudioPoint;
  /** La longueur d'un néon, en pixels du canevas (0 pour un halo). */
  longueur: number;
  /** Son inclinaison, en degrés : la pente du mur qu'il éclaire. */
  angle: number;
  /** Le rayon d'un halo, en pixels du canevas (0 pour un néon). */
  rayon: number;
  setup: string | null;
};

/** Un petit équipement dessiné en CSS (webcam, micro sur bras). */
export type StudioAccessoire = {
  id: string;
  kind: string;
  at: StudioPoint;
  setup: string | null;
};

/** Une place d'invité, en parts du canevas (le DOM la pose en pourcentage). */
export type StudioStand = { id: string; slot: number; x: number; y: number };

type EntreeSprite = {
  id: string;
  asset: string;
  w: number;
  h: number;
  appui: StudioPoint;
  at?: StudioPoint;
  cell?: StudioPoint;
  layer?: number;
  setup?: string;
  kind?: never;
};

const GRILLE = room.grid as unknown as StudioGrid;
/** Le décalage des murs : l'arête haute d'une cellule, pas son centre. */
const DECALAGE_MUR = room.walls.decalage as unknown as StudioPoint;

export const STUDIO_GRID = GRILLE;

/** Le coin haut-gauche d'un sprite, à partir de son point d'appui. */
function poser(appui: StudioPoint, at: StudioPoint) {
  return { left: at[0] - appui[0], top: at[1] - appui[1] };
}

/** Le centre d'une cellule, en coordonnées de scène. */
export function iso(cell: StudioPoint): StudioPoint {
  const [i, j] = cell;
  const [sx, sy] = GRILLE.step;
  const [ox, oy] = GRILLE.origin;
  return [ox + (i - j) * sx, oy + (i + j) * sy];
}

/** Le point de scène d'une entrée : `at` s'il est écrit, sinon sa cellule. */
function ancre(entree: EntreeSprite): StudioPoint {
  if (entree.at) return entree.at;
  if (entree.cell) return iso(entree.cell);
  throw new Error(`entrée sans point de pose : ${entree.id}`);
}

/** L'ordre du peintre : la couche écrite à la main, puis le fond vers l'avant. */
function profondeur(entree: EntreeSprite, at: StudioPoint): number {
  const couche = entree.layer ?? 0;
  // 10 000 : de la place pour dix couches avant que le tri ne déborde, et les
  // coordonnées restent des entiers lisibles dans les tests.
  return couche * 10_000 + Math.round(at[1]) * 4 + Math.round(at[0]) / 1_000;
}

function placer(entree: EntreeSprite, at: StudioPoint): StudioPlaced {
  return {
    id: entree.id,
    asset: entree.asset,
    appui: entree.appui,
    at,
    ...poser(entree.appui, at),
    setup: entree.setup ?? null,
    depth: profondeur(entree, at),
  };
}

/** Le sol : une tuile pleine par cellule, du fond vers l'avant. */
export function studioFloor(): StudioPlaced[] {
  const tuile = room.floor as unknown as EntreeSprite;
  const [sx, sy] = GRILLE.step;
  const cases: StudioPoint[] = [];
  for (let i = 0; i < GRILLE.tiles; i += 1) {
    for (let j = 0; j < GRILLE.tiles; j += 1) cases.push([i, j]);
  }
  return cases
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0])
    .map((cell, index) => {
      const at = iso(cell);
      return placer({ ...tuile, id: `sol-${cell[0]}-${cell[1]}`, layer: -9 }, [
        at[0] + sx / 2,
        at[1] + sy / 2,
      ]);
    });
}

/** Les murs : chaque segment se pose sur l'arête haute de sa cellule. */
export function studioWalls(): StudioPlaced[] {
  return (room.walls.segments as unknown as EntreeSprite[]).map((segment) => {
    const at = ancre(segment);
    return {
      ...placer({ ...segment, layer: -8 }, [at[0] + DECALAGE_MUR[0], at[1] + DECALAGE_MUR[1]]),
      // Un mur est toujours là : c'est la pièce elle-même.
      setup: null,
    };
  });
}

/** Le mobilier et les équipements, dans l'ordre du peintre. */
export function studioFurniture(): StudioPlaced[] {
  return (room.items.list as unknown as EntreeSprite[])
    .map((item) => placer(item, ancre(item)))
    .sort((a, b) => a.depth - b.depth);
}

/** Ce qui se pose sur le mur : les panneaux acoustiques, en sprites. */
export function studioWallPanels(): StudioPlaced[] {
  return (room.wallDecor.list as unknown as EntreeSprite[])
    .filter((entree) => Boolean(entree.asset))
    .map((entree) => placer({ ...entree, layer: -7 }, ancre(entree)));
}

/** Les néons et les halos : des formes CSS, posées à leur centre. */
export function studioLights(): StudioNeon[] {
  return (room.wallDecor.list as unknown as (StudioNeon & { asset?: string })[])
    .filter((entree) => !entree.asset)
    .map((entree) => ({
      id: entree.id,
      kind: entree.kind,
      couleur: entree.couleur,
      at: entree.at,
      longueur: entree.longueur ?? 0,
      angle: entree.angle ?? 0,
      rayon: entree.rayon ?? 0,
      setup: entree.setup ?? null,
    }));
}

/** Les accessoires CSS (webcam, micro) : tout petits, jamais un tableau de bord. */
export function studioAccessories(): StudioAccessoire[] {
  return (room.accessoires.list as unknown as StudioAccessoire[]).map((entree) => ({
    id: entree.id,
    kind: entree.kind,
    at: entree.at,
    setup: entree.setup ?? null,
  }));
}

/** Les deux places d'invités, en parts du canevas (0 à 1). */
export function studioStands(): StudioStand[] {
  const [w, h] = GRILLE.canvas;
  return (room.stands.list as { id: string; at: StudioPoint }[]).map((entree, index) => ({
    id: entree.id,
    slot: index + 1,
    x: entree.at[0] / w,
    y: entree.at[1] / h,
  }));
}

/** L'URL d'un sprite du kit. Les images ne bougent pas : même dossier pour tous. */
export function studioSpriteUrl(asset: string): string {
  return `/streamer/4/Isometric/${asset}.png`;
}

/**
 * La taille d'un sprite, en pixels du canevas — celle du fichier.
 *
 * Elle vient du fichier de règles, et `studio-room.test.ts` la compare à
 * l'en-tête du PNG : le DOM peut donc poser une image en pourcentage sans
 * jamais attendre qu'elle soit chargée (aucun décalage au premier rendu).
 */
export function studioSpriteSize(asset: string): StudioPoint {
  for (const entree of studioEntries()) {
    if (entree.asset === asset) return [entree.w, entree.h];
  }
  throw new Error(`sprite inconnu du fichier de règles : ${asset}`);
}

/** Le canevas : sa taille sert de `viewBox` au DOM. */
export function studioCanvas(): StudioPoint {
  return GRILLE.canvas as StudioPoint;
}

/** Toutes les entrées du fichier, pour les vérifier d'un seul geste. */
export function studioEntries(): { id: string; asset: string; w: number; h: number; appui: StudioPoint }[] {
  const tuile = room.floor as unknown as EntreeSprite;
  const sprites = [
    { ...tuile, id: "sol" },
    ...(room.walls.segments as unknown as EntreeSprite[]),
    ...(room.items.list as unknown as EntreeSprite[]),
    ...(room.wallDecor.list as unknown as EntreeSprite[]).filter((entree) => Boolean(entree.asset)),
  ];
  return sprites.map((entree) => ({
    id: entree.id,
    asset: entree.asset,
    w: entree.w,
    h: entree.h,
    appui: entree.appui,
  }));
}
