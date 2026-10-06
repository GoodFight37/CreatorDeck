import { describe, expect, it } from "vitest";

import { RARITY_META, VARIANT_META, type CardVariant, type Rarity } from "@/lib/catalog";
import type { OwnedCard } from "@/lib/game-engine";
import { describeCard, formatPoints, PAYOUTS, payoutOf, sellableCards, shelfPrice } from "@/lib/market";

const card = (id: string, creatorSlug: string, rarity: Rarity, variant: CardVariant): OwnedCard => ({
  id,
  creatorSlug,
  rarity,
  variant,
  obtainedAt: 1,
  rareDrop: false,
});

describe("grille des prix", () => {
  it("paie chaque rareté au tarif de la grille", () => {
    expect(PAYOUTS).toEqual({ common: 20, uncommon: 40, rare: 100, epic: 250, legendary: 400 });
    for (const rarity of Object.keys(PAYOUTS) as Rarity[]) {
      expect(payoutOf(rarity, "standard")).toBe(PAYOUTS[rarity]);
    }
  });

  it("multiplie par la variante (une Gold vaut cinq Standard)", () => {
    expect(payoutOf("legendary", "gold")).toBe(2000);
    expect(payoutOf("rare", "holo")).toBe(300);
    expect(payoutOf("common", "live")).toBe(40);
  });

  it("paie toujours plus que le recyclage, pour chaque rareté", () => {
    for (const rarity of Object.keys(PAYOUTS) as Rarity[]) {
      expect(payoutOf(rarity, "standard")).toBeGreaterThan(RARITY_META[rarity].recycleValue);
    }
  });

  it("affiche l'étiquette à une fois et demie le payout, arrondie au supérieur", () => {
    expect(shelfPrice(20)).toBe(30);
    expect(shelfPrice(400)).toBe(600);
    expect(shelfPrice(2000)).toBe(3000);
    expect(shelfPrice(7)).toBe(11);
  });

  it("coupe la boucle vente puis rachat : racheter coûte plus cher que le payout", () => {
    for (const rarity of Object.keys(PAYOUTS) as Rarity[]) {
      for (const variant of Object.keys(VARIANT_META) as CardVariant[]) {
        expect(shelfPrice(payoutOf(rarity, variant))).toBeGreaterThan(payoutOf(rarity, variant));
      }
    }
  });
});

describe("ce qui est proposé au dépôt", () => {
  it("ne garde que les doublons (jamais la dernière copie)", () => {
    const cards = [
      card("a1", "ibai", "rare", "standard"),
      card("a2", "ibai", "rare", "standard"),
      card("b1", "kameto", "epic", "standard"),
      card("c1", "ibai", "rare", "holo"),
    ];
    const sellable = sellableCards(cards).map((entry) => entry.id);
    expect(sellable).toEqual(["a1", "a2"]);
  });

  it("distingue les variantes d'un même créateur", () => {
    const cards = [
      card("a1", "ibai", "rare", "standard"),
      card("a2", "ibai", "rare", "standard"),
      card("c1", "ibai", "rare", "holo"),
      card("c2", "ibai", "rare", "holo"),
    ];
    // Les deux variantes sont proposées — l'holo (mieux payée) passe devant.
    expect(sellableCards(cards).map((entry) => entry.id)).toEqual(["c1", "c2", "a1", "a2"]);
  });

  it("retire les cartes déjà déposées dans la session", () => {
    const cards = [
      card("a1", "ibai", "rare", "standard"),
      card("a2", "ibai", "rare", "standard"),
    ];
    expect(sellableCards(cards, ["a1"]).map((entry) => entry.id)).toEqual(["a2"]);
    expect(sellableCards(cards, ["a1", "a2"])).toEqual([]);
  });

  it("range les plus payantes en premier", () => {
    const cards = [
      card("c1", "ibai", "common", "standard"),
      card("c2", "ibai", "common", "standard"),
      card("g1", "kameto", "legendary", "gold"),
      card("g2", "kameto", "legendary", "gold"),
      card("h1", "kameto", "rare", "holo"),
      card("h2", "kameto", "rare", "holo"),
    ];
    expect(sellableCards(cards).map((entry) => entry.id)).toEqual(["g1", "g2", "h1", "h2", "c1", "c2"]);
  });

  it("ne propose rien quand tout est unique", () => {
    expect(sellableCards([card("a1", "ibai", "rare", "standard")])).toEqual([]);
  });
});

describe("libellés", () => {
  it("écrit la rareté et la variante en clair", () => {
    expect(describeCard("legendary", "gold")).toBe("Légendaire Gold");
    expect(describeCard("common", "standard")).toBe("Commune Standard");
  });

  it("écrit les points à la française", () => {
    expect(formatPoints(2000)).toMatch(/2\s?000 pts/);
  });
});
