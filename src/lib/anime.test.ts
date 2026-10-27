import { describe, expect, it } from "vitest";
import { ANIME_CARDS, drawAnimePack } from "@/lib/anime";

describe("booster Anime local", () => {
  it("tire cinq cartes distinctes du catalogue sans modifier le catalogue", () => {
    const before = ANIME_CARDS.map((card) => card.id);
    const cards = drawAnimePack(() => 0.42);

    expect(cards).toHaveLength(5);
    expect(new Set(cards.map((card) => card.id)).size).toBe(5);
    expect(cards.every((card) => ANIME_CARDS.includes(card))).toBe(true);
    expect(ANIME_CARDS.map((card) => card.id)).toEqual(before);
  });
});
