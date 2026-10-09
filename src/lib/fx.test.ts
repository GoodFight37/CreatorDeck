import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FX_SHEETS, burstFor, burstScale, flashFor, fxDurationMs, fxUrl } from "@/lib/fx";

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

  it("donne un éclat à l'Épique comme à la Légendaire", () => {
    // L'explosion dorée est partie le 9 octobre 2026 : le joueur ne la trouvait
    // pas belle. Ce qui distingue le Légendaire, c'est la **taille** de
    // l'éclat, pas un autre dessin.
    expect(burstFor("epic")).toBe("eclat");
    expect(burstFor("legendary")).toBe("eclat");
  });

  it("agrandit l'éclat pour le Légendaire et le Perfect", () => {
    // La hiérarchie ne se joue plus sur le sprite mais sur la taille : une
    // Épique à 1, une Légendaire et un Perfect à 1,5.
    expect(burstScale("epic")).toBe(1);
    expect(burstScale("common")).toBe(1);
    expect(burstScale("legendary")).toBeGreaterThan(burstScale("epic"));
    expect(burstScale("common", true)).toBeGreaterThan(burstScale("epic"));
    // Et l'éclat d'un Légendaire reste plus grand que celui d'une Épique.
    expect(burstScale("legendary") * FX_SHEETS.eclat.size).toBeGreaterThan(FX_SHEETS.eclat.size);
  });

  it("réserve le plus grand au Perfect, quelle que soit la carte", () => {
    // Le Perfect, c'est le paquet entier : même l'emplacement d'une commune
    // reçoit l'éclat en grand, puisque le moment est celui du paquet.
    expect(burstFor("common", true)).toBe("eclat");
    expect(burstFor("epic", true)).toBe("eclat");
    expect(burstFor("legendary", true)).toBe("eclat");
    expect(burstScale("common", true)).toBe(burstScale("legendary"));
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

  it("garde le CSS et la table d'accord sur la durée", () => {
    // La durée est écrite **deux fois** : en ligne par `EffectBurst` (depuis
    // `FX_SHEETS`, c'est la vérité) et en valeurs de repli dans le CSS. Si les
    // deux divergent, un effet raccourci dans la feuille de style passerait
    // pour une régression aléatoire. Ce test est la soudure.
    const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");
    for (const [kind, sheet] of Object.entries(FX_SHEETS)) {
      const ligne = css
        .split("\n")
        .find((candidate) => candidate.startsWith(`.fx-${kind} {`));
      expect(ligne, `.fx-${kind} absent de globals.css`).toBeTruthy();
      expect(ligne, `${kind} : la durée du CSS ne suit plus FX_SHEETS`).toContain(
        `--fx-duration: ${sheet.durationMs}ms`,
      );
    }
  });

  it("donne aux effets le temps de se voir, même sur un petit écran", () => {
    // 40 ms par image : en dessous, le pixel-art clignote et disparaît avant
    // que l'œil ait compris. Et ils débordent de la carte, sinon elle les cache.
    for (const [kind, sheet] of Object.entries(FX_SHEETS)) {
      const parImage = sheet.durationMs / sheet.frames;
      expect(parImage, kind).toBeGreaterThanOrEqual(35);
      expect(parImage, kind).toBeLessThanOrEqual(60);
      expect(sheet.size, kind).toBeGreaterThanOrEqual(1.4 * sheet.frame);
    }
    // Un seul effet reste : la taille fait la hiérarchie, plus deux dessins.
    expect(Object.keys(FX_SHEETS)).toEqual(["eclat"]);
  });

  it("pointe des images servies depuis le dossier public", () => {
    expect(fxUrl("eclat")).toBe("/fx/eclat.png");
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
    // Le pack d'effets livré pèse des dizaines de mégaoctets ; on n'embarque
    // qu'**une planche** (11 Ko), et c'est ce qui rend l'ajout acceptable. La
    // fumée de l'arrivée d'un palier et la couronne de l'emblème d'Arène sont
    // parties avec la pièce du Studio, le 8 octobre 2026 (plus d'usager, plus
    // d'octets) ; l'explosion dorée du Légendaire les a suivies le 9 : elle
    // n'était pas belle.
    let total = 0;
    for (const kind of Object.keys(FX_SHEETS)) {
      total += statSync(path.join(process.cwd(), "public", "fx", `${kind}.png`)).size;
    }
    expect(total).toBeLessThan(40 * 1024);
    // Et le dossier `public/fx/` ne garde **rien d'autre** : un fichier oublié
    // là ne se chargerait jamais, mais il pèserait dans l'APK.
    const restants = readdirSync(path.join(process.cwd(), "public", "fx")).sort();
    expect(restants).toEqual(["eclat.png"]);
  });
});
