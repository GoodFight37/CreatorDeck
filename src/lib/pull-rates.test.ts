import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/catalog";
import { PULL_RATES, RARITIES, packOdds } from "@/lib/pull-rates";

const PACK_TYPES = Object.keys(PACKS) as (keyof typeof PACKS)[];

describe("pull-rates", () => {
  it("décrit exactement les boosters du catalogue", () => {
    expect(PACK_TYPES.length).toBeGreaterThan(0);
    for (const pack of PACK_TYPES) {
      const table = PULL_RATES[pack];
      expect(table.slots).toHaveLength(PACKS[pack].size - 1);
      expect(table.slotCount).toBe(PACKS[pack].size - 1);
      expect(table.slots.length + 1).toBe(PACKS[pack].size);

      // Chaque rareté doit être atteignable, sinon elle serait un mensonge
      // dans l'écran « Taux de drop ».
      for (const rarity of RARITIES) {
        const declared = [
          ...table.slots.map((slot) => slot.weights),
          table.guaranteed.weights,
          table.rareDrop.weights,
        ].some((weights) => (weights[rarity] ?? 0) > 0);
        expect(declared, `${pack} · ${rarity}`).toBe(true);
      }
    }
  });

  it("publie des probabilités qui somment à 100 %", () => {
    for (const pack of PACK_TYPES) {
      const odds = packOdds(pack);
      expect(odds.cardCount).toBe(PACKS[pack].size);

      for (const slot of odds.slots) {
        const sum = RARITIES.reduce((acc, rarity) => acc + slot.probabilities[rarity], 0);
        expect(sum).toBeCloseTo(1, 10);
      }

      const perCardSum = RARITIES.reduce((acc, rarity) => acc + odds.perCard[rarity], 0);
      expect(perCardSum).toBeCloseTo(1, 10);

      for (const rarity of RARITIES) {
        expect(odds.perPack[rarity]).toBeGreaterThanOrEqual(odds.perCard[rarity]);
        expect(odds.perPack[rarity]).toBeLessThanOrEqual(1);
      }

      expect(odds.rareDrop.chance).toBeGreaterThan(0);
      expect(odds.rareDrop.chance).toBeLessThan(0.02);
      expect(odds.slots.at(-1)?.id).toBe("guaranteed");
    }
  });

  it("reflète la montée des taux au fil du booster", () => {
    const odds = packOdds("live");
    const top = (probabilities: (typeof odds.slots)[number]["probabilities"]) =>
      probabilities.epic + probabilities.legendary;
    const first = odds.slots[0].probabilities;
    const lastOrdinary = odds.slots[odds.slots.length - 2].probabilities;
    expect(top(lastOrdinary)).toBeGreaterThan(top(first));
  });
});
