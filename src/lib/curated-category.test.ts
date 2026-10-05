import { describe, expect, it } from "vitest";
import {
  FALLBACK_CATEGORY,
  curatedCategory,
} from "../../scripts/lib/curated-category.mjs";

/**
 * Têtes d'affiche hors direct : Twitch ne donne pas ce qu'elles streament,
 * seulement leur dernier jeu programmé. Étiqueter une carte légendaire avec un
 * jeu auquel plus personne ne l'associe est une invention — ces tests figent la
 * règle prudente : fait observé d'abord, jeu modélisé ensuite, placeholder
 * sinon.
 */
describe("catégorie des têtes d'affiche", () => {
  it("en direct, la catégorie observée fait foi", () => {
    expect(
      curatedCategory({
        liveGame: "Grand Theft Auto V",
        lastGame: "Among Us",
        knownCategories: [],
      }),
    ).toBe("Grand Theft Auto V");
  });

  it("hors direct, un jeu modélisé est conservé", () => {
    // jynxzi hors direct : Rainbow Six Siege est un vrai jeu de sa famille,
    // l'étiquette informe plus qu'un placeholder générique.
    const known = ["Rainbow Six Siege", "World of Warcraft", "Just Chatting"];
    expect(curatedCategory({ lastGame: "Rainbow Six Siege", knownCategories: known })).toBe(
      "Rainbow Six Siege",
    );
    expect(curatedCategory({ lastGame: "World of Warcraft", knownCategories: known })).toBe(
      "World of Warcraft",
    );
  });

  it("hors direct, un jeu non modélisé devient le placeholder", () => {
    // ibai → Among Us, coscu → Magic: The Gathering, illojuan → GTA: San
    // Andreas : des restes de programme, pas des étiquettes de diffuseur.
    const known = ["Rainbow Six Siege", "Just Chatting"];
    for (const lastGame of ["Among Us", "Magic: The Gathering", "Grand Theft Auto: San Andreas"]) {
      expect(curatedCategory({ lastGame, knownCategories: known })).toBe(FALLBACK_CATEGORY);
    }
  });

  it("sans aucune information, c'est le placeholder", () => {
    expect(curatedCategory({})).toBe(FALLBACK_CATEGORY);
    expect(curatedCategory({ liveGame: "  ", lastGame: null })).toBe(FALLBACK_CATEGORY);
    expect(curatedCategory({ lastGame: "", knownCategories: ["Just Chatting"] })).toBe(
      FALLBACK_CATEGORY,
    );
  });

  it("accepte un Set comme un tableau, et ignore les espaces", () => {
    const known = new Set(["Retro"]);
    expect(curatedCategory({ lastGame: "  Retro  ", knownCategories: known })).toBe("Retro");
    expect(curatedCategory({ liveGame: "  Just Chatting  " })).toBe("Just Chatting");
  });
});
