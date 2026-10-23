import { beforeEach, describe, expect, it, vi } from "vitest";
import { drawImgflipPack, IMGFLIP_POOL } from "@/lib/imgflip-booster";
import { PULL_RATES, RARITIES } from "@/lib/pull-rates";
import { randomInt } from "@/lib/random";

vi.mock("@/lib/random", () => ({ randomInt: vi.fn() }));
const random = vi.mocked(randomInt);
beforeEach(() => random.mockReset());

describe("tirage temporaire Imgflip", () => {
  it("conserve les 999 cartes, leurs raretés et leurs WebP", () => {
    expect(IMGFLIP_POOL).toHaveLength(999);
    expect(Object.fromEntries(RARITIES.map(rarity => [rarity, IMGFLIP_POOL.filter(card => card.rarity === rarity).length])))
      .toEqual({ common: 300, uncommon: 300, rare: 230, epic: 120, legendary: 49 });
    expect(IMGFLIP_POOL.every(card => card.image?.startsWith("/imgflip-web/") && card.image.endsWith(".webp"))).toBe(true);
  });

  it("respecte chaque borne des poids Live, avec cinq cartes distinctes du seul pool Imgflip", () => {
    const table = PULL_RATES.live;
    const slots = [...table.slots.map(slot => slot.weights), table.guaranteed.weights];
    slots.forEach((weights, index) => {
      let start = 0;
      RARITIES.forEach(rarity => {
        const weight = weights[rarity] ?? 0;
        if (!weight) return;
        for (const roll of [start, start + weight - 1]) {
          let call = 0;
          random.mockImplementation(() => {
            const n = call++;
            return n === 0 ? 999 : n === 1 + index * 2 ? roll : 0;
          });
          const cards = drawImgflipPack();
          expect(cards).toHaveLength(5);
          expect(new Set(cards.map(card => card.id)).size).toBe(5);
          expect(cards.every(card => IMGFLIP_POOL.includes(card))).toBe(true);
          expect(cards[index].rarity).toBe(rarity);
        }
        start += weight;
      });
    });
  });

  it("reprend le Perfect et la garantie légendaire sans créer de mythique", () => {
    random.mockReturnValue(0);
    expect(drawImgflipPack().every(card => card.rarity === "epic")).toBe(true);
    expect(drawImgflipPack(true)[4].rarity).toBe("legendary");
    random.mockReturnValueOnce(999).mockReturnValue(0);
    expect(drawImgflipPack(true)[4].rarity).toBe("legendary");
  });
});
