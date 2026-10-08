import { describe, expect, it } from "vitest";
import { repairMojibake } from "@/lib/cloud/mojibake";

/**
 * Le texte qu'un joueur a réellement vu à l'écran, recopié tel quel. Sous
 * Windows, `curl.exe ... | Set-Clipboard` fait passer les octets UTF-8 d'une
 * migration par la page de codes de la console : « è » (0xC3 0xA8) devient
 * « ├¿ » (ces deux octets relus en CP850). La base garde ces caractères-là, et
 * c'est cette phrase-là que l'application afficherait au joueur.
 *
 * Les chaînes « manglées » ci-dessous sont écrites en `\uXXXX` pour rester
 * lisibles dans un fichier UTF-8 : ce sont exactement les caractères que la base
 * contient après un collage par la console Windows.
 */
const CASES: Array<[string, string]> = [
  [
    "paquet sc\u251c\u00bfne : ton paquet du jour est d\u251c\u00aej\u251c\u00e1 ouvert",
    "paquet scène : ton paquet du jour est déjà ouvert",
  ],
  [
    "collection refus\u251c\u00aee par le serveur, rien n'a boug\u251c\u00ae",
    "collection refusée par le serveur, rien n'a bougé",
  ],
  [
    "march\u251c\u00ae : cette carte n'est plus \u251c\u00e1 vendre",
    "marché : cette carte n'est plus à vendre",
  ],
  ["r\u251c\u00aeinitialisation : connecte-toi d'abord", "réinitialisation : connecte-toi d'abord"],
  [
    "\u251c\u00aechange refus\u251c\u00ae : tu n'as plus cette carte",
    "échange refusé : tu n'as plus cette carte",
  ],
];

describe("réparation d'un texte doublement encodé", () => {
  for (const [mangled, clean] of CASES) {
    it(`remet « ${clean.slice(0, 32)}… » en français lisible`, () => {
      expect(repairMojibake(mangled)).toBe(clean);
    });
  }

  it("laisse un texte déjà propre intact", () => {
    for (const [, clean] of CASES) expect(repairMojibake(clean)).toBe(clean);
    expect(repairMojibake("paquet scene")).toBe("paquet scene");
    expect(repairMojibake("")).toBe("");
  });

  it("ne touche pas un nom propre accentué", () => {
    // Le piège : « Á », « é », « ç » existent tous en CP850. Pris ensemble, les
    // octets obtenus ne forment pas de l'UTF-8 valide : on rend l'original.
    for (const name of ["Álvaro", "François", "Jérémy", "Léa", "Ник", "加藤純一"]) {
      expect(repairMojibake(name)).toBe(name);
    }
  });

  it("répare même quand le texte était déjà à moitié cassé", () => {
    // Cas réel : un préfixe ASCII (impossible à casser) suivi du message manglé.
    expect(repairMojibake("P0001: r\u251c\u00aeinitialisation : connecte-toi d'abord")).toBe(
      "P0001: réinitialisation : connecte-toi d'abord",
    );
  });
});
