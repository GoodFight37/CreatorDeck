import { describe, expect, it } from "vitest";
import { MEME_BY_ID, MEME_CARDS, MEME_PULLABLE } from "@/lib/memes";
import source from "@/data/memes-fr.json";
import imgflip from "@/data/imgflip.json";

describe("catalogue Mèmes FR distribué", () => {
  it("retire la fiche source sans illustration du classeur et des tirages", () => {
    expect(MEME_BY_ID.has("juventus-rose")).toBe(false);
    expect(MEME_CARDS.some((card) => card.name === "Carte supprimée")).toBe(false);
    expect(source).toHaveLength(2150);
    expect(MEME_CARDS).toHaveLength(source.length + imgflip.length);
    expect(MEME_PULLABLE).toHaveLength(MEME_CARDS.filter(card => card.image).length);
    expect(new Set(MEME_CARDS.map(card => card.id)).size).toBe(MEME_CARDS.length);
  });
});
