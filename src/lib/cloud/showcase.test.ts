import { describe, expect, it } from "vitest";
import {
  MAX_SHOWCASE,
  knownShowcase,
  normalizeShowcase,
  ownedCreatorSlugs,
  toggleShowcase,
} from "@/lib/cloud/showcase";
import type { OwnedCard } from "@/lib/game-engine";
import type { Rarity } from "@/lib/catalog";

function card(creatorSlug: string, rarity: Rarity): OwnedCard {
  return {
    id: `${creatorSlug}-${rarity}`,
    creatorSlug,
    rarity,
    variant: "standard",
    obtainedAt: 0,
    rareDrop: false,
  };
}

describe("vitrine : nettoyage", () => {
  it("passe en minuscules, retire les espaces et les doublons", () => {
    expect(normalizeShowcase([" Kaicenat ", "kaicenat", "IBai"])).toEqual(["kaicenat", "ibai"]);
  });

  it("coupe à quatre cartes", () => {
    const trop = ["a", "b", "c", "d", "e"];
    expect(MAX_SHOWCASE).toBe(4);
    expect(normalizeShowcase(trop)).toEqual(["a", "b", "c", "d"]);
  });

  it("ignore ce qui n'est pas une chaîne utile", () => {
    expect(normalizeShowcase(["", "   ", "kaicenat"])).toEqual(["kaicenat"]);
  });
});

describe("vitrine : sélection", () => {
  it("ajoute puis retire une carte", () => {
    const une = toggleShowcase([], "kaicenat");
    expect(une).toEqual(["kaicenat"]);
    expect(toggleShowcase(une, "kaicenat")).toEqual([]);
  });

  it("n'accepte pas une cinquième carte", () => {
    const pleine = ["a", "b", "c", "d"];
    expect(toggleShowcase(pleine, "e")).toEqual(pleine);
  });
});

describe("vitrine : collection du joueur", () => {
  it("classe du plus rare au plus commun, puis par rang Twitch", () => {
    const owned = [card("ninja", "rare"), card("kaicenat", "legendary"), card("ibai", "epic")];
    expect(ownedCreatorSlugs(owned)).toEqual(["kaicenat", "ibai", "ninja"]);
  });

  it("garde la meilleure rareté d'un créateur en double", () => {
    const owned = [card("ibai", "common"), card("ibai", "epic"), card("ninja", "common")];
    expect(ownedCreatorSlugs(owned)).toEqual(["ibai", "ninja"]);
  });

  it("range deux créateurs de même rareté par rang croissant", () => {
    const owned = [card("ninja", "epic"), card("ibai", "epic")];
    expect(ownedCreatorSlugs(owned)).toEqual(["ibai", "ninja"]);
  });
});

describe("vitrine : affichage", () => {
  it("écarte les slugs que le catalogue ne connaît pas", () => {
    expect(knownShowcase(["kaicenat", "createur-inexistant", "kaicenat"])).toEqual(["kaicenat"]);
  });
});
