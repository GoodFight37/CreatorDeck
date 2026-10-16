import { describe, expect, it } from "vitest";
import { MEME_BY_ID, MEME_CARDS, MEME_PULLABLE } from "@/lib/memes";

describe("catalogue Mèmes FR distribué", () => {
  it("retire la fiche source sans illustration du classeur et des tirages", () => {
    expect(MEME_BY_ID.has("juventus-rose")).toBe(false);
    expect(MEME_CARDS.some((card) => card.name === "Carte supprimée")).toBe(false);
    expect(MEME_CARDS).toHaveLength(2150);
    expect(MEME_PULLABLE).toHaveLength(2150);
  });
});
