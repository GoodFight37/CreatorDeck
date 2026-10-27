import { describe, expect, it } from "vitest";
import { ANIME_CARDS, drawAnimePack } from "@/lib/anime";
import previous from "@/data/kyara-preview.json";
import source from "@/data/anime.json";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

describe("booster Anime local", () => {
  it("raccorde les 1 020 cartes, préserve les anciennes et vérifie chaque image", () => {
    expect(ANIME_CARDS).toHaveLength(1020);
    expect(new Set(ANIME_CARDS.map((card) => card.id)).size).toBe(1020);
    for (const old of previous.cards) {
      expect(ANIME_CARDS.find((card) => card.id === old.id)?.image).toBe(`/anime/${old.sha256}.webp`);
    }
    for (const card of source.cards) {
      const bytes = readFileSync(`public/anime/${card.sha256}.webp`);
      expect(bytes.length).toBe(card.byteLength);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(card.sha256);
      expect(card.sourceUrl).toMatch(/^https:\/\/kyara\.games\/wiki\//);
      expect(card.licenseStatus).toBe("unknown");
    }
  });

  it("permet de tirer une carte absente de l'ancienne sélection", () => {
    const oldIds = new Set(previous.cards.map((card) => card.id));
    const index = ANIME_CARDS.findIndex((card) => !oldIds.has(card.id));
    let remaining = ANIME_CARDS.length;
    const cards = drawAnimePack(() => --remaining === index ? 0 : 1 - Number.EPSILON);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(cards[0]).toBe(ANIME_CARDS[index]);
  });

  it("tire cinq cartes distinctes du catalogue sans modifier le catalogue", () => {
    const before = ANIME_CARDS.map((card) => card.id);
    const cards = drawAnimePack(() => 0.42);

    expect(cards).toHaveLength(5);
    expect(new Set(cards.map((card) => card.id)).size).toBe(5);
    expect(cards.every((card) => ANIME_CARDS.includes(card))).toBe(true);
    expect(ANIME_CARDS.map((card) => card.id)).toEqual(before);
  });
});
