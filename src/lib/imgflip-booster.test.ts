import { describe, expect, it } from "vitest";
import { IMGFLIP_BY_ID, IMGFLIP_POOL } from "@/lib/imgflip-booster";
import { RARITIES } from "@/lib/pull-rates";

describe("catalogue Imgflip côté client (tirage serveur, 0062)", () => {
  it("conserve les 999 cartes, leurs raretés et leurs WebP", () => {
    expect(IMGFLIP_POOL).toHaveLength(999);
    expect(Object.fromEntries(RARITIES.map(rarity => [rarity, IMGFLIP_POOL.filter(card => card.rarity === rarity).length])))
      .toEqual({ common: 300, uncommon: 300, rare: 230, epic: 120, legendary: 49 });
    expect(IMGFLIP_POOL.every(card => card.image?.startsWith("/imgflip-web/") && card.image.endsWith(".webp"))).toBe(true);
  });

  it("indexe chaque carte par son identifiant, sans collision avec les Mèmes FR", () => {
    expect(IMGFLIP_BY_ID.size).toBe(IMGFLIP_POOL.length);
    expect(IMGFLIP_POOL.every(card => card.id.startsWith("imgflip-") && IMGFLIP_BY_ID.get(card.id) === card)).toBe(true);
  });
});
