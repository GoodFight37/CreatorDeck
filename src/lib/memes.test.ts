import { describe, expect, it } from "vitest";
import { MEME_BY_ID, MEME_CARDS, MEME_PULLABLE } from "@/lib/memes";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

describe("catalogue Mèmes FR distribué", () => {
  it("retire la fiche source sans illustration du classeur et des tirages", () => {
    expect(MEME_BY_ID.has("juventus-rose")).toBe(false);
    expect(MEME_CARDS.some((card) => card.name === "Carte supprimée")).toBe(false);
    expect(MEME_CARDS.filter(card => !card.id.startsWith("imgflip-"))).toHaveLength(2150);
    expect(MEME_PULLABLE.filter(card => !card.id.startsWith("imgflip-"))).toHaveLength(2150);
  });
});

const imported = MEME_CARDS.filter(card => card.id.startsWith("imgflip-"));
// La collecte doit être complète avant que l'importeur écrive ce catalogue.
it.skipIf(imported.length === 0)("intègre les modèles accessibles du Top 999 sans collision et avec leurs médias locaux", () => {
  const approvals = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/imgflip-approvals.json"), "utf8"));
  expect(imported).toHaveLength(999);
  expect(imported).toHaveLength(approvals.length);
  expect(new Set(MEME_CARDS.map(card => card.id)).size).toBe(MEME_CARDS.length);
  expect(new Set(MEME_CARDS.map(card => card.number)).size).toBe(MEME_CARDS.length);
  expect(Object.fromEntries(["legendary", "epic", "rare", "uncommon", "common"].map(rarity =>
    [rarity, imported.filter(card => card.rarity === rarity).length])))
    .toEqual({ legendary: 49, epic: 120, rare: 230, uncommon: 300, common: 300 });
  for (const card of imported) {
    expect(card.number).toBeGreaterThan(2303);
    expect(card.number).toBeLessThanOrEqual(3302);
    if (!card.image) throw new Error("Média Imgflip absent");
    expect(existsSync(path.join(process.cwd(), "public", card.image))).toBe(true);
  }
});
