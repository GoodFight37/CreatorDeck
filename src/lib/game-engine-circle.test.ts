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
    expect(first.cards.filter(card => CIRCLE.includes(card.creatorSlug)).length).toBeGreaterThanOrEqual(3);
    for (const card of first.cards) {
      expect(card.rarity).toBe(CREATOR_BY_SLUG.get(card.creatorSlug)!.rarity);
      expect(card.displayRarity).toBeUndefined();
    }
    expect(CIRCLE).toContain(first.cards.at(-1)!.creatorSlug);
    expect(first.state.openings).toBe(1);
    expect(first.state.cards).toHaveLength(5);
  });

  it("garde le cercle au second booster sans étendre la rareté d'affichage du premier", () => {
    const first = openPack(createInitialState(T0), T0, { circle: CIRCLE });
    const second = openPack(first.state, T0, { circle: CIRCLE });
    expect(second.cards).toHaveLength(5);
    expect(second.cards.every((card) => card.displayRarity === undefined)).toBe(true);
    const missing = CIRCLE.filter(slug => !first.state.cards.some(card => card.creatorSlug === slug));
    expect(missing).toContain(second.cards.at(-1)!.creatorSlug);
    expect(second.cards.filter(card => missing.includes(card.creatorSlug)).length).toBeGreaterThanOrEqual(3);
  });

  it("avec une seule chaîne nommée, la met dans le paquet (dernière carte)", () => {
    for (let run = 0; run < 40; run += 1) {
      const result = openPack(createInitialState(T0), T0, { circle: ["ibai"] });
      expect(result.cards).toHaveLength(5);
      expect(result.cards.at(-1)!.creatorSlug).toBe("ibai");
    }
  });

  it("avec deux chaînes nommées, ces deux-là comptent", () => {
    const result = openPack(createInitialState(T0), T0, { circle: ["kaicenat", "ibai"] });
    const named = result.cards.filter((card) => ["kaicenat", "ibai"].includes(card.creatorSlug));
    expect(new Set(named.map((card) => card.creatorSlug))).toEqual(new Set(["kaicenat", "ibai"]));
    expect(named.length).toBeGreaterThanOrEqual(3);
  });

  it("sans chaîne, n'invente rien : pool mondial", () => {
    const result = openPack(createInitialState(T0), T0, { circle: [] });
    expect(result.cards).toHaveLength(5);
    expect(result.cards.every((card) => card.displayRarity === undefined)).toBe(true);
  });

  it("ignore un cercle invalide (doublon ou plus de quinze) et tire normalement", () => {
    const result = openPack(createInitialState(T0), T0, { circle: ["kaicenat", "kaicenat"] });
    expect(result.cards).toHaveLength(5);
  });
});
