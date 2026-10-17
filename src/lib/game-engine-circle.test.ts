import { describe, expect, it } from "vitest";
import { createInitialState, openPack } from "@/lib/game-engine";
import { CREATOR_BY_SLUG } from "@/lib/catalog";

const CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius", "xqc", "shroud"];
const T0 = Date.UTC(2026, 9, 17, 10, 0, 0);

describe("le premier booster d'une partie sans serveur", () => {
  it("est tiré dans « Mes chaînes », avec la rareté du catalogue enregistrée", () => {
    const first = openPack(createInitialState(T0), T0, { circle: CIRCLE });
    expect(first.cards).toHaveLength(5);
    expect(new Set(first.cards.map((card) => card.creatorSlug)).size).toBe(5);
    for (const card of first.cards) {
      expect(CIRCLE).toContain(card.creatorSlug);
      expect(card.rarity).toBe(CREATOR_BY_SLUG.get(card.creatorSlug)!.rarity);
      expect(card.displayRarity).toBeDefined();
    }
    expect(["rare", "epic", "legendary"]).toContain(first.cards.at(-1)!.displayRarity);
    expect(first.state.openings).toBe(1);
    expect(first.state.cards).toHaveLength(5);
  });

  it("ne sert qu'une fois : le second booster est un tirage ordinaire", () => {
    const first = openPack(createInitialState(T0), T0, { circle: CIRCLE });
    const second = openPack(first.state, T0, { circle: CIRCLE });
    expect(second.cards).toHaveLength(5);
    expect(second.cards.every((card) => card.displayRarity === undefined)).toBe(true);
  });

  it("ignore un cercle invalide et tire normalement", () => {
    const result = openPack(createInitialState(T0), T0, { circle: ["kaicenat", "ibai"] });
    expect(result.cards).toHaveLength(5);
    expect(result.cards.every((card) => card.displayRarity === undefined)).toBe(true);
  });
});
