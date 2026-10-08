/**
 * Les crédits : **complets**, et **obligatoires**.
 *
 * Deux licences demandent qu'on nomme ce qu'on utilise — celle du pack d'effets
 * veut sa ligne, celle du pack de sons interdit qu'on revende ses fichiers tels
 * quels. Une relecture distraite peut effacer ces lignes sans que rien ne
 * casse : c'est exactement ce que ce test empêche.
 *
 * Il vérifie aussi que les crédits **ne parlent pas d'infrastructure**, comme
 * tout le reste de l'interface : une licence se nomme, un fichier non.
 */
import { describe, expect, it } from "vitest";

import { CREDIT_EFFETS, CREDITS } from "@/lib/credits";
import { offenses } from "../../scripts/check-jargon.mjs";

describe("les crédits", () => {
  it("nomme chaque chose une seule fois, et dit qui l'a faite", () => {
    const vus = new Set<string>();
    for (const ligne of CREDITS) {
      // Un crédit sans auteur n'est pas un crédit : c'est un titre.
      expect(ligne.quoi.length, ligne.quoi).toBeGreaterThan(3);
      expect(ligne.qui.length, ligne.quoi).toBeGreaterThan(3);
      expect(ligne.licence.length, ligne.quoi).toBeGreaterThan(3);
      expect(vus.has(ligne.quoi), `en double : ${ligne.quoi}`).toBe(false);
      vus.add(ligne.quoi);
    }
    expect(vus.size).toBe(CREDITS.length);
  });

  it("garde la ligne que la licence du pack d'effets exige", () => {
    // « (Nom du pack) - Will Tice / unTied Games » : c'est la seule ligne de
    // crédit que quelqu'un d'autre réclame, et un test la surveille.
    expect(CREDITS.some((ligne) => ligne.qui.includes(CREDIT_EFFETS))).toBe(true);
  });

  it("crédite tout ce qui vient d'ailleurs", () => {
    // Le jeu n'a dessiné ni ses portraits, ni son décor, ni ses effets, ni ses
    // sons, ni ses icônes, ni ses polices : six lignes, et pas cinq.
    const texte = CREDITS.map((ligne) => `${ligne.quoi} ${ligne.qui}`).join(" | ");
    for (const nom of ["Twitch", "Kenney", "unTied Games", "Chequered Ink", "Lucide", "IBM Plex"]) {
      expect(texte, `crédit manquant : ${nom}`).toContain(nom);
    }
  });

  it("dit le vrai des licences", () => {
    // Le kit de meubles est en domaine public (CC0) ; le pack de sons autorise
    // l'usage mais pas la revente des fichiers bruts ; le pack d'effets demande
    // le crédit. Ces trois phrases-là sont vérifiables.
    const parQuoi = new Map(CREDITS.map((ligne) => [ligne.quoi, ligne]));
    expect(parQuoi.get("Le décor du Studio")?.licence).toContain("domaine public");
    expect(parQuoi.get("Les bruitages")?.licence).toContain("revente");
    expect(
      CREDITS.find((ligne) => ligne.quoi.startsWith("Les effets"))?.licence,
    ).toContain("crédit");
  });

  it("ne parle pas d'infrastructure", () => {
    // Le même scanner que tout l'écran : si un crédit cite un fichier ou un nom
    // de service, le contrôle de vocabulaire le refusera — autant l'apprendre
    // ici, avec le fichier qui l'écrit.
    const source = CREDITS.map((ligne) =>
      [ligne.quoi, ligne.qui, ligne.licence].map((texte) => `  ${texte},`).join("\n"),
    ).join("\n");
    expect(offenses(source)).toEqual([]);
  });
});
