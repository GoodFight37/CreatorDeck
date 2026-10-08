/**
 * La fumée de l'installation : **où** elle tombe, et combien de bouffées.
 *
 * Le module lit la vraie pièce (`src/data/studio-room.json`) : ces tests parlent
 * donc aussi du décor. Si un palier pose un objet ailleurs, la fumée doit suivre
 * — et si elle ne suivait pas, personne ne le verrait avant de jouer.
 */
import { describe, expect, it } from "vitest";

import { NUAGES_MAX, studioArrivees, studioNuages } from "@/lib/studio-install";
import {
  studioAccessories,
  studioCanvas,
  studioFurniture,
  studioLights,
  studioSpriteSize,
  studioWallPanels,
} from "@/lib/studio-room";

/** Tous les paliers qui posent quelque chose dans la pièce. */
function paliers(): string[] {
  const ids = new Set<string>();
  for (const sprite of [...studioFurniture(), ...studioWallPanels()]) {
    if (sprite.setup) ids.add(sprite.setup);
  }
  for (const lumiere of studioLights()) if (lumiere.setup) ids.add(lumiere.setup);
  for (const gadget of studioAccessories()) if (gadget.setup) ids.add(gadget.setup);
  return [...ids];
}

describe("studioNuages", () => {
  it("ne fume pas pour un palier inconnu", () => {
    // Rien à montrer : l'appelant ne doit pas avoir à vérifier avant de rendre.
    expect(studioNuages("palier-qui-nexiste-pas")).toEqual([]);
  });

  it("pose la fumée au centre de ce qui vient d'arriver", () => {
    // La webcam : un objet sur le bureau, et la forme CSS de la caméra. Le
    // centre est celui du sprite — pas un point écrit à la main dans le module.
    const sprite = studioFurniture().find((entree) => entree.setup === "webcam");
    const gadget = studioAccessories().find((entree) => entree.setup === "webcam");
    expect(sprite).toBeTruthy();
    expect(gadget).toBeTruthy();

    const [largeur, hauteur] = studioSpriteSize(sprite!.asset);
    const attendus = [
      [sprite!.left + largeur / 2, sprite!.top + hauteur / 2],
      gadget!.at,
    ].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

    expect(studioNuages("webcam").map((nuage) => nuage.at)).toEqual(attendus);
  });

  it("n'en met jamais plus de trois, même quand la déco en pose sept", () => {
    // C'est la seule décision du module, et elle se voit tout de suite : sept
    // nuages au lieu de trois, et la pièce disparaît.
    const poses = (setup: string) =>
      [...studioFurniture(), ...studioWallPanels()].filter((s) => s.setup === setup).length +
      studioLights().filter((l) => l.setup === setup).length +
      studioAccessories().filter((g) => g.setup === setup).length;
    expect(poses("deco")).toBeGreaterThan(NUAGES_MAX);

    for (const id of paliers()) {
      const nuages = studioNuages(id);
      expect(nuages.length).toBeGreaterThan(0);
      expect(nuages.length).toBeLessThanOrEqual(NUAGES_MAX);
    }
  });

  it("range les objets du fond vers le devant de la pièce", () => {
    // C'est l'ordre d'arrivée : le décor se remplit comme on le regarde, du fond
    // du mur vers le devant du bureau. Un ordre au hasard se verrait.
    const arrivees = studioArrivees("deco");
    expect(arrivees.length).toBeGreaterThan(1);
    for (let i = 1; i < arrivees.length; i += 1) {
      const avant = arrivees[i - 1]!;
      const apres = arrivees[i]!;
      expect(apres.at[1] > avant.at[1] || (apres.at[1] === avant.at[1] && apres.at[0] >= avant.at[0])).toBe(true);
    }
    // Chaque bouffée tombe sur un objet de la liste, dans le même ordre.
    const ids = new Set(arrivees.map((entree) => entree.at.join(":")));
    for (const nuage of studioNuages("deco")) {
      expect(ids.has(nuage.at.join(":"))).toBe(true);
    }
  });

  it("les fait tomber les unes après les autres, pas ensemble", () => {
    const nuages = studioNuages("deco");
    expect(nuages).toHaveLength(NUAGES_MAX);
    expect(nuages.map((nuage) => nuage.delayMs)).toEqual([0, 140, 280]);
  });

  it("les garde dans la pièce", () => {
    // Un centre hors canevas, et la fumée se ferait couper par le bord
    // (`overflow: hidden`) — invisible, donc, alors qu'on paie pour la voir.
    const [largeur, hauteur] = studioCanvas();
    for (const id of paliers()) {
      for (const nuage of studioNuages(id)) {
        expect(nuage.at[0]).toBeGreaterThanOrEqual(0);
        expect(nuage.at[0]).toBeLessThanOrEqual(largeur);
        expect(nuage.at[1]).toBeGreaterThanOrEqual(0);
        expect(nuage.at[1]).toBeLessThanOrEqual(hauteur);
      }
    }
  });
});
