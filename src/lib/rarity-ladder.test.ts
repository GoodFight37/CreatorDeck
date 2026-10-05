import { describe, expect, it } from "vitest";
import { RARITY_LADDER, rarityCounts, rarityForRank } from "../../scripts/lib/rarity-ladder.mjs";

/**
 * L'échelle de raretés est exprimée en part du classement : ces tests
 * garantissent que le Top 500 garde exactement ses seuils historiques
 * (25/85/200/350) et que la même échelle tient pour un Top 2000.
 */
describe("rarity-ladder", () => {
  it("reproduit les seuils historiques du Top 500", () => {
    expect(rarityForRank(1, 500)).toBe("legendary");
    expect(rarityForRank(25, 500)).toBe("legendary");
    expect(rarityForRank(26, 500)).toBe("epic");
    expect(rarityForRank(85, 500)).toBe("epic");
    expect(rarityForRank(86, 500)).toBe("rare");
    expect(rarityForRank(200, 500)).toBe("rare");
    expect(rarityForRank(201, 500)).toBe("uncommon");
    expect(rarityForRank(350, 500)).toBe("uncommon");
    expect(rarityForRank(351, 500)).toBe("common");
    expect(rarityForRank(500, 500)).toBe("common");
  });

  it("donne la même répartition que le catalogue actuel", () => {
    expect(rarityCounts(500)).toEqual({
      legendary: 25,
      epic: 60,
      rare: 115,
      uncommon: 150,
      common: 150,
    });
  });

  it("scale proportionnellement à 1000 et 2000", () => {
    expect(rarityCounts(2000)).toEqual({
      legendary: 100,
      epic: 240,
      rare: 460,
      uncommon: 600,
      common: 600,
    });
    for (const total of [500, 1000, 2000]) {
      const counts = rarityCounts(total);
      const sum = Object.values(counts).reduce((acc, value) => acc + value, 0);
      expect(sum).toBe(total);
      // Le cumul reste l'ordre de rareté attendu : jamais plus d'épiques que
      // de communes, etc.
      expect(counts.legendary).toBeLessThan(counts.epic);
      expect(counts.epic).toBeLessThan(counts.rare);
    }
  });

  it("refuse les entrées invalides", () => {
    expect(() => rarityForRank(0, 500)).toThrowError(RangeError);
    expect(() => rarityForRank(1.5, 500)).toThrowError(RangeError);
    expect(() => rarityForRank(1, 0)).toThrowError(RangeError);
  });

  it("expose une échelle strictement croissante qui couvre tout le classement", () => {
    const ladder = [...RARITY_LADDER];
    expect(ladder.at(-1)?.upTo).toBe(1);
    for (let index = 1; index < ladder.length; index += 1) {
      expect(ladder[index].upTo).toBeGreaterThan(ladder[index - 1].upTo);
    }
  });
});
