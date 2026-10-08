/**
 * **La pièce du studio, vérifiée contre les vrais fichiers.**
 *
 * Ce test existe parce que le décor de « Ta chaîne » se compose d'images : les
 * coordonnées du fichier `src/data/studio-room.json` sont muettes. Ici on ouvre
 * les PNG du kit (`public/streamer/4/Isometric`) et on vérifie ce que le module
 * promet :
 *
 *   * la **taille annoncée** est celle de l'en-tête du PNG — remplacer une image
 *     par une autre (un bureau par une armoire) casse le test, pas la pièce ;
 *   * le **point d'appui** tombe sur du dessin, pas dans le vide : un sprite
 *     pose sur un pixel transparent flotterait au-dessus du sol ;
 *   * chaque **palier de setup** a de quoi se voir : un palier payé qui
 *     n'allumerait rien serait un mensonge du décor (les identifiants sont ceux
 *     de `src/data/streamer.json`, jamais réécrits ici) ;
 *   * la **géométrie** : neuf tuiles de sol, des murs sur les arêtes, un ordre du
 *     peintre qui ne laisse pas un objet passer devant la caméra.
 *
 * Le décodeur PNG est minimal (palette + tRNS + filtres) : ces images sont
 * indexées, un lecteur RGBA naïf les verrait entièrement opaques.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { SETUP_LEVELS } from "@/lib/streamer";
import {
  STUDIO_GRID,
  iso,
  studioAccessories,
  studioCanvas,
  studioEntries,
  studioFloor,
  studioFurniture,
  studioLights,
  studioSpriteUrl,
  studioStands,
  studioWallPanels,
  studioWalls,
} from "@/lib/studio-room";

const KIT = path.join(process.cwd(), "public", "streamer", "4", "Isometric");

type Image = { w: number; h: number; pixel: (x: number, y: number) => boolean };

/** Décode un PNG indexé (color type 3, 8 bits) jusqu'à l'alpha du pixel. */
function lirePng(fichier: string): Image {
  const buf = readFileSync(fichier);
  let pos = 8;
  let w = 0;
  let h = 0;
  let palette = Buffer.alloc(0);
  let transparence: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const longueur = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const donnees = buf.subarray(pos + 8, pos + 8 + longueur);
    if (type === "IHDR") {
      w = donnees.readUInt32BE(0);
      h = donnees.readUInt32BE(4);
      expect(donnees[8]).toBe(8); // profondeur
      expect(donnees[9]).toBe(3); // palette
    } else if (type === "PLTE") palette = donnees;
    else if (type === "tRNS") transparence = donnees;
    else if (type === "IDAT") idat.push(donnees);
    pos += longueur + 12;
  }
  expect(palette.length).toBeGreaterThan(0);

  // Les filtres PNG, ligne par ligne : chaque ligne commence par son octet de
  // filtre, puis `w` index de palette.
  const brut = inflateSync(Buffer.concat(idat));
  const index = Buffer.alloc(w * h);
  let precedent = Buffer.alloc(w);
  for (let y = 0; y < h; y += 1) {
    const filtre = brut[y * (w + 1)];
    const ligne = Buffer.from(brut.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)));
    for (let x = 0; x < w; x += 1) {
      const gauche = x > 0 ? ligne[x - 1] : 0;
      const haut = precedent[x];
      const diagonale = x > 0 ? precedent[x - 1] : 0;
      if (filtre === 1) ligne[x] = (ligne[x] + gauche) & 255;
      else if (filtre === 2) ligne[x] = (ligne[x] + haut) & 255;
      else if (filtre === 3) ligne[x] = (ligne[x] + ((gauche + haut) >> 1)) & 255;
      else if (filtre === 4) {
        const p = gauche + haut - diagonale;
        const da = Math.abs(p - gauche);
        const db = Math.abs(p - haut);
        const dc = Math.abs(p - diagonale);
        const predit = da <= db && da <= dc ? gauche : db <= dc ? haut : diagonale;
        ligne[x] = (ligne[x] + predit) & 255;
      }
    }
    ligne.copy(index, y * w);
    precedent = ligne;
  }

  return {
    w,
    h,
    pixel: (x, y) => {
      const i = index[y * w + x];
      if (!transparence) return true;
      return i < transparence.length ? transparence[i] > 0 : true;
    },
  };
}

const images = new Map<string, Image>();
function image(asset: string): Image {
  if (!images.has(asset)) images.set(asset, lirePng(path.join(KIT, `${asset}.png`)));
  return images.get(asset)!;
}

describe("le studio · les sprites", () => {
  it("annonce la taille réelle de chaque image (une image remplacée se voit)", () => {
    const entrees = studioEntries();
    expect(entrees.length).toBeGreaterThan(20);
    for (const entree of entrees) {
      const reel = image(entree.asset);
      expect(`${entree.asset} ${entree.w}x${entree.h}`, `${entree.id} — ${entree.asset}`).toBe(
        `${entree.asset} ${reel.w}x${reel.h}`,
      );
    }
  });

  it("pose chaque sprite sur sa ligne de contact, jamais dans le vide", () => {
    for (const entree of studioEntries()) {
      const reel = image(entree.asset);
      const [ax, ay] = entree.appui;
      expect(ax, `${entree.id} : appui hors image`).toBeGreaterThanOrEqual(0);
      expect(ax, `${entree.id} : appui hors image`).toBeLessThan(reel.w);
      // L'appui est le **bas** du dessin : la dernière ligne existe, et elle
      // porte du dessin. Une image qui respire en bas de deux pixels ferait
      // flotter l'objet de deux pixels — c'est exactement ce que le décor ne
      // peut pas se permettre, et ce que ce test attrape.
      expect(ay, `${entree.id} : appui hors image`).toBeGreaterThanOrEqual(0);
      expect(ay, `${entree.id} : appui hors image`).toBeLessThanOrEqual(reel.h);
      const ligne = Math.max(0, Math.min(reel.h - 1, ay - 1));
      const pleins: number[] = [];
      for (let x = 0; x < reel.w; x += 1) if (reel.pixel(x, ligne)) pleins.push(x);
      expect(pleins.length, `${entree.id} : rien à la ligne d'appui (${entree.asset})`).toBeGreaterThan(
        0,
      );
      // Et l'appui tombe **sous le dessin** : entre ses deux extrémités, même
      // s'il est dans un creux (un bureau a deux pieds et du vide entre eux).
      expect(ax, `${entree.id} : appui à côté du dessin (${entree.asset})`).toBeGreaterThanOrEqual(
        pleins[0],
      );
      expect(ax, `${entree.id} : appui à côté du dessin (${entree.asset})`).toBeLessThanOrEqual(
        pleins[pleins.length - 1],
      );
    }
  });

  it("ne connaît que les paliers du fichier de règles, et les couvre tous", () => {
    const paliers = SETUP_LEVELS.map((niveau) => niveau.id);
    const vus = new Set<string>();
    for (const entree of [
      ...studioFurniture(),
      ...studioWallPanels(),
      ...studioLights(),
      ...studioAccessories(),
    ]) {
      if (!entree.setup) continue;
      // Un identifiant de palier inventé dans le décor ne s'allumerait jamais.
      expect(paliers, `palier inconnu : ${entree.setup}`).toContain(entree.setup);
      vus.add(entree.setup);
    }
    // Et l'inverse compte autant : un palier acheté doit **se voir**.
    for (const niveau of SETUP_LEVELS) {
      expect([...vus], `le palier « ${niveau.label} » n'allume rien`).toContain(niveau.id);
    }
  });
});

describe("le studio · la géométrie", () => {
  it("pose neuf tuiles de sol, du fond vers l'avant", () => {
    const sol = studioFloor();
    expect(sol).toHaveLength(STUDIO_GRID.tiles * STUDIO_GRID.tiles);
    const [ox, oy] = STUDIO_GRID.origin;
    const [sx, sy] = STUDIO_GRID.step;
    // La première tuile est le fond (cellule 0,0), la dernière l'avant (2,2) :
    // le sol se remplit du fond de la pièce vers la caméra.
    expect(sol[0].at).toEqual([ox + sx / 2, oy + sy / 2]);
    const coin = iso([2, 2]);
    expect(sol[sol.length - 1].at).toEqual([coin[0] + sx / 2, coin[1] + sy / 2]);
    // Un sol se pose par son centre : le coin haut-gauche est au-dessus à gauche.
    expect(sol[0].left).toBe(ox + sx / 2 - 104);
    expect(sol[0].top).toBe(oy + sy / 2 - 76);
  });

  it("tient dans son canevas : rien ne sort de la scène", () => {
    const [w, h] = studioCanvas();
    for (const pose of [...studioFloor(), ...studioWalls(), ...studioFurniture(), ...studioWallPanels()]) {
      const img = image(pose.asset);
      expect(pose.left, `${pose.id} déborde à gauche`).toBeGreaterThanOrEqual(-40);
      expect(pose.left + img.w, `${pose.id} déborde à droite`).toBeLessThanOrEqual(w + 40);
      expect(pose.top + img.h, `${pose.id} déborde en bas`).toBeLessThanOrEqual(h + 40);
      expect(pose.top, `${pose.id} déborde en haut`).toBeGreaterThanOrEqual(-40);
    }
  });

  it("dessine dans l'ordre du peintre : le tapis sous les meubles, la caméra devant", () => {
    const meubles = studioFurniture();
    const tapis = meubles.find((item) => item.id === "tapis")!;
    const bureau = meubles.find((item) => item.id === "bureau")!;
    const ecran = meubles.find((item) => item.id === "ecran")!;
    const chaise = meubles.find((item) => item.id === "chaise")!;
    expect(tapis.depth).toBeLessThan(bureau.depth);
    expect(bureau.depth).toBeLessThan(ecran.depth);
    expect(ecran.depth).toBeLessThan(chaise.depth);
    // Le mobilier arrive déjà trié : le composant n'a pas à trier.
    expect([...meubles].sort((a, b) => a.depth - b.depth)).toEqual(meubles);
  });

  it("pose les deux places d'invités devant le bureau, dans le canevas", () => {
    const places = studioStands();
    expect(places.map((place) => place.slot)).toEqual([1, 2]);
    for (const place of places) {
      expect(place.x).toBeGreaterThan(0.2);
      expect(place.x).toBeLessThan(0.8);
      expect(place.y).toBeGreaterThan(0.5);
      expect(place.y).toBeLessThan(0.95);
    }
    // Les deux places sont de part et d'autre du bureau : jamais l'une sur l'autre.
    expect(places[0].x).toBeLessThan(places[1].x);
    expect(Math.abs(places[0].y - places[1].y)).toBeLessThan(0.02);
  });

  it("donne le centre d'une cellule, dans les deux directions", () => {
    const [ox, oy] = STUDIO_GRID.origin;
    expect(iso([0, 0])).toEqual([ox, oy]);
    expect(iso([1, 0])).toEqual([ox + 104, oy + 76]);
    expect(iso([0, 1])).toEqual([ox - 104, oy + 76]);
  });

  it("pose les fenêtres exactement sur le mur qu'elles remplacent", () => {
    // La fenêtre n'est pas un objet posé *devant* le mur : c'est le **même**
    // sprite, avec une ouverture. Elle doit donc se poser au même point, avec le
    // même appui — sinon elle flotte à côté de la face qu'elle perce, et ça se
    // voit tout de suite (le pack fournit les deux versions exprès).
    const murs = studioWalls();
    const fenetres = studioWallPanels().filter((pose) => pose.asset.includes("Window"));
    expect(fenetres).toHaveLength(2);
    for (const fenetre of fenetres) {
      // L'appariement se fait par la **cellule** : la fenêtre de gauche perce le
      // mur de gauche, celle de droite le mur de droite — les identifiants sont
      // libres, la position ne l'est pas.
      const at = fenetre.at;
      // Le mur qui occupe **le même point de pose** : c'est celui que la
      // fenêtre perce, quel que soit le nom qu'on leur a donné.
      const mur = murs.find((pose) => pose.at[0] === at[0] && pose.at[1] === at[1]);
      expect(mur, `aucun mur pour ${fenetre.id}`).toBeDefined();
      expect([fenetre.at, fenetre.left, fenetre.top], fenetre.id).toEqual([
        mur!.at,
        mur!.left,
        mur!.top,
      ]);
      // Et la fenêtre se dessine **après** son mur : elle recouvre la face.
      expect(fenetre.depth, fenetre.id).toBeGreaterThan(mur!.depth);
    }
  });

  it("sert les images du kit par une seule porte", () => {
    expect(studioSpriteUrl("deskCorner_SE")).toBe("/streamer/4/Isometric/deskCorner_SE.png");
  });
});
