import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FX_SHEETS, burstFor, flashFor, fxDurationMs, fxUrl } from "@/lib/fx";

/**
 * Les effets de moment rare. Deux promesses, et le test les tient :
 *
 *   * **le rare se mérite** : rien en dessous de l'Épique — sinon un Légendaire
 *     ne se distingue plus de rien ;
 *   * les planches existent et sont décrites **juste** : une planche annoncée à
 *     15 images qui en compte 14 décale toute l'animation d'une image, et le CSS
 *     ne peut pas s'en apercevoir.
 */
describe("l'effet d'une carte révélée", () => {
  it("ne donne rien pour une carte ordinaire", () => {
    // Le point le plus important du module : pas de paillettes sur du commun.
    expect(burstFor("common")).toBeNull();
    expect(burstFor("uncommon")).toBeNull();
    expect(burstFor("rare")).toBeNull();
  });

  it("donne un éclat à l'Épique, une explosion à la Légendaire", () => {
    expect(burstFor("epic")).toBe("eclat");
    expect(burstFor("legendary")).toBe("explosion");
  });

  it("réserve le plus grand au Perfect, quelle que soit la carte", () => {
    // Le Perfect, c'est le paquet entier : même l'emplacement d'une commune
    // reçoit l'explosion, puisque le moment est celui du paquet.
    expect(burstFor("common", true)).toBe("explosion");
    expect(burstFor("epic", true)).toBe("explosion");
    expect(burstFor("legendary", true)).toBe("explosion");
  });

  it("ne fait clignoter l'écran que pour le Légendaire et le Perfect", () => {
    // Un flash plein écran fatigue l'œil : il ne se déclenche que là où il
    // raconte quelque chose.
    expect(flashFor("common")).toBe(false);
    expect(flashFor("epic")).toBe(false);
    expect(flashFor("legendary")).toBe(true);
    expect(flashFor("common", true)).toBe(true);
  });

  it("décrit des planches cohérentes", () => {
    for (const [kind, sheet] of Object.entries(FX_SHEETS)) {
      expect(sheet.frames, kind).toBeGreaterThan(1);
      expect(sheet.frame, kind).toBeGreaterThan(16);
      expect(sheet.size, kind).toBeGreaterThanOrEqual(sheet.frame);
      expect(sheet.durationMs, kind).toBeGreaterThan(200);
      expect(sheet.durationMs, kind).toBeLessThan(1_500);
      // Un effet n'est pas une animation perpétuelle : il joue, puis il part.
      expect(fxDurationMs(kind as keyof typeof FX_SHEETS)).toBe(sheet.durationMs);
    }
  });

  it("pointe des images servies depuis le dossier public", () => {
    expect(fxUrl("explosion")).toBe("/fx/explosion.png");
    expect(fxUrl("eclat")).toBe("/fx/eclat.png");
    expect(fxUrl("fumee")).toBe("/fx/fumee.png");
  });
});

/**
 * Les planches **sur le disque** : c'est le seul endroit où l'on peut savoir si
 * le nombre d'images annoncé est le bon. Le CSS découpe la planche en tranches
 * égales ; si le PNG en compte une de moins que la table, chaque image est
 * décalée d'un cran et l'animation part en biais — sans qu'aucun test ne le
 * voie, sinon celui-ci.
 */
describe("les planches d'effets", () => {
  /** Largeur et hauteur d'un PNG, lues dans son en-tête (IHDR). */
  function taillePng(chemin: string): { largeur: number; hauteur: number } {
    const octets = readFileSync(chemin);
    // Signature PNG (8 octets), longueur + type du bloc IHDR (8 de plus), puis
    // la largeur et la hauteur en gros-boutiste.
    expect(octets.subarray(1, 4).toString("ascii")).toBe("PNG");
    return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
  }

  it("existent, avec exactement le nombre d'images annoncé", () => {
    for (const [kind, sheet] of Object.entries(FX_SHEETS)) {
      const chemin = path.join(process.cwd(), "public", "fx", `${kind}.png`);
      const { largeur, hauteur } = taillePng(chemin);
      expect(largeur, `${kind} : ${largeur} px de large`).toBe(sheet.frames * sheet.frame);
      expect(hauteur, `${kind} : ${hauteur} px de haut`).toBe(sheet.frame);
    }
  });

  it("tiennent dans un budget ridiculement petit", () => {
    // Le pack d'effets livré pèse des dizaines de mégaoctets ; on n'en embarque
    // que quatre images, et c'est ce qui rend l'ajout acceptable.
    let total = 0;
    for (const kind of Object.keys(FX_SHEETS)) {
      total += statSync(path.join(process.cwd(), "public", "fx", `${kind}.png`)).size;
    }
    total += statSync(path.join(process.cwd(), "public", "fx", "couronne.png")).size;
    expect(total).toBeLessThan(200 * 1024);
  });

  it("garde la couronne de l'emblème d'Arène", () => {
    // Elle ne s'anime pas : c'est un objet posé sur une étagère.
    const { largeur, hauteur } = taillePng(path.join(process.cwd(), "public", "fx", "couronne.png"));
    expect(largeur).toBe(64);
    expect(hauteur).toBe(48);
  });
});
