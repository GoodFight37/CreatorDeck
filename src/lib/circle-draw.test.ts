import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { createInitialState, drawPack, openPack } from "@/lib/game-engine";

const CIRCLE = CREATORS.filter(c => c.rarity === "common").slice(0, 8).map(c => c.slug);

describe("le cercle reste le pool de chaque Live Drop", () => {
  it.each([0, 1, 2, 5, 7])("avec %i chaînes déjà obtenues : trois absentes et la dernière absente", count => {
    const owned = new Set(CIRCLE.slice(0, count));
    const missing = CIRCLE.filter(slug => !owned.has(slug));
    for (let run = 0; run < 25; run++) {
      const cards = drawPack("live", owned, { circle: CIRCLE, rareDrop: false });
      expect(cards).toHaveLength(5);
      expect(cards.filter(c => missing.includes(c.creatorSlug)).length).toBeGreaterThanOrEqual(3);
      expect(missing).toContain(cards[4].creatorSlug);
      // Les doublons ne sont nécessaires qu'en dessous de trois absentes.
      if (missing.length >= 3) expect(new Set(cards.map(c => c.creatorSlug)).size).toBe(5);
    }
  });

  it.each([{ pity: true }, { rareDrop: true }])("la complétion prime aussi sur %j", options => {
    const cards = drawPack("live", new Set(), { circle: CIRCLE, ...options });
    expect(CIRCLE).toContain(cards[4].creatorSlug);
    expect(cards.filter(c => CIRCLE.includes(c.creatorSlug)).length).toBeGreaterThanOrEqual(3);
  });

  it("la préférée à poids égal est sélectionnée même après le premier booster", () => {
    const state = { ...createInitialState(1000), openings: 5 };
    const result = openPack(state, 1000, { circle: CIRCLE, rareDrop: false });
    expect(result.cards.some(c => c.creatorSlug === CIRCLE[0])).toBe(true);
    expect(CIRCLE).toContain(result.cards[4].creatorSlug);
  });

  it("cercle complet : retour au pool mondial et à sa garantie", () => {
    const cards = drawPack("live", new Set(CIRCLE), { circle: CIRCLE, pity: true });
    expect(cards[4].rarity).toBe("legendary");
    expect(cards.some(c => !CIRCLE.includes(c.creatorSlug))).toBe(true);
  });
});
