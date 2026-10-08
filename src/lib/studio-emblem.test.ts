/**
 * L'emblème d'Arène sur l'étagère : **où** il se pose, combien il en tient, et
 * avec quelle image.
 *
 * Le pont TCG → Studio se casse de trois façons, et aucune ne se voit dans le
 * code : une couronne posée à côté du meuble, une couronne seule qui n'est pas
 * centrée, ou une devise qui n'est pas la vraie image (le ratio change, et la
 * couronne s'écrase). Ces tests prennent les trois.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  COURONNE_SOURCE,
  EMBLEMES_MAX,
  EMBLEME_ASSET,
  ETAGERE_ID,
  emblemesSurLEtagere,
} from "@/lib/studio-emblem";
import { studioCanvas, studioFurniture, studioSpriteSize } from "@/lib/studio-room";

/** L'étagère, telle que la pièce la pose : le repère de tous les calculs. */
function etagere() {
  const meuble = studioFurniture().find((entree) => entree.id === ETAGERE_ID);
  if (!meuble) throw new Error(`l'étagère « ${ETAGERE_ID} » a quitté la pièce`);
  const [largeur, hauteur] = studioSpriteSize(meuble.asset);
  return { meuble, largeur, hauteur };
}

describe("l'emblème d'Arène", () => {
  it("n'en pose aucune quand il n'y a rien à fêter", () => {
    expect(emblemesSurLEtagere(0)).toEqual([]);
    expect(emblemesSurLEtagere(-2)).toEqual([]);
  });

  it("pose la couronne sur la face du haut de l'étagère, au milieu", () => {
    const { meuble, largeur, hauteur } = etagere();
    const [couronne] = emblemesSurLEtagere(1);
    expect(couronne).toBeTruthy();

    // Horizontalement : le milieu du plateau (57 % de la largeur du meuble), et
    // la couronne est **centrée** dessus.
    const centre = couronne!.left + couronne!.largeur / 2;
    expect(centre).toBeCloseTo(meuble.left + largeur * 0.57, 6);

    // Verticalement : elle **repose** sur la face du haut (son pied est dessus,
    // son corps au-dessus), jamais devant les étagères ni dans le vide.
    const pied = couronne!.top + couronne!.hauteur;
    expect(pied).toBeGreaterThan(meuble.top);
    expect(pied).toBeLessThan(meuble.top + hauteur * 0.4);
    expect(couronne!.top).toBeLessThan(meuble.top + hauteur * 0.26);
  });

  it("en aligne jusqu'à trois, dans le meuble et sans se chevaucher", () => {
    const { meuble, largeur } = etagere();
    const trois = emblemesSurLEtagere(3);
    expect(trois).toHaveLength(EMBLEMES_MAX);

    const centres = trois.map((couronne) => couronne.left + couronne.largeur / 2);
    // De gauche à droite, et chacun reste sur le plateau.
    expect([...centres].sort((a, b) => a - b)).toEqual(centres);
    for (const centre of centres) {
      expect(centre).toBeGreaterThan(meuble.left + largeur * 0.15);
      expect(centre).toBeLessThan(meuble.left + largeur * 0.98);
    }
    // La même image, posée trois fois : deux couronnes voisines ne se marchent
    // pas dessus (elles peuvent se frôler de quelques pixels, pas se superposer).
    for (let i = 1; i < trois.length; i += 1) {
      const gauche = trois[i - 1]!;
      expect(trois[i]!.left + trois[i]!.largeur).toBeGreaterThan(gauche.left + 6);
    }
  });

  it("grandit la couronne quand il n'y a qu'un emblème à montrer", () => {
    // Une couronne seule est un trophée ; trois sont une collection. Elles se
    // serrent donc en arrivant — c'est réglé par le nombre, pas par le hasard.
    const tailles = [1, 2, 3].map((n) => emblemesSurLEtagere(n)[0]!.largeur);
    expect(tailles[0]).toBeGreaterThan(tailles[1]!);
    expect(tailles[1]).toBeGreaterThan(tailles[2]!);
  });

  it("plafonne à trois, même après six semaines gagnées", () => {
    expect(emblemesSurLEtagere(6)).toHaveLength(EMBLEMES_MAX);
    expect(emblemesSurLEtagere(6.9)).toHaveLength(EMBLEMES_MAX);
  });

  it("garde la couronne dans la pièce", () => {
    const [largeur, hauteur] = studioCanvas();
    for (const couronne of emblemesSurLEtagere(3)) {
      expect(couronne.left).toBeGreaterThanOrEqual(0);
      expect(couronne.left + couronne.largeur).toBeLessThanOrEqual(largeur);
      expect(couronne.top).toBeGreaterThanOrEqual(0);
      expect(couronne.top + couronne.hauteur).toBeLessThanOrEqual(hauteur);
    }
  });

  it("sert la vraie couronne du dépôt, et garde ses proportions", () => {
    // Comme les planches d'effets : on lit l'en-tête du PNG. Une image
    // remplacée par une autre casse ce test, pas la pièce.
    const octets = readFileSync(new URL(`../../public${EMBLEME_ASSET}`, import.meta.url));
    expect(octets.subarray(1, 4).toString("ascii")).toBe("PNG");
    const largeur = octets.readUInt32BE(16);
    const hauteur = octets.readUInt32BE(20);
    expect([largeur, hauteur]).toEqual([COURONNE_SOURCE.largeur, COURONNE_SOURCE.hauteur]);

    // La hauteur affichée suit le ratio du fichier : jamais une couronne écrasée.
    const [couronne] = emblemesSurLEtagere(1);
    expect(couronne!.hauteur / couronne!.largeur).toBeCloseTo(hauteur / largeur, 6);
  });
});
