/**
 * Le tri du classeur : cinq ordres, une seule fonction pure.
 *
 * Ce qui compte ici, c'est le **départage** : à égalité de doublons ou
 * d'audience, on retombe sur le rang Twitch. Sans lui, l'ordre dépendrait de
 * l'ordre d'entrée et deux rendus successifs pourraient ne pas se ressembler.
 */
import { describe, expect, it } from "vitest";
import { BINDER_SORTS, sortBinder } from "@/lib/binder-sort";
import type { Creator } from "@/lib/catalog";

const creator = (over: Partial<Creator> & { slug: string }): Creator =>
  ({
    login: over.slug,
    displayName: over.slug,
    rarity: "common",
    rank: 500,
    region: "fr",
    category: "Just Chatting",
    ...over,
  }) as Creator;

const A = creator({ slug: "alpha", displayName: "Alpha", rank: 3, followers: 100 });
const B = creator({ slug: "bravo", displayName: "Bravo", rank: 1, followers: 900_000 });
const C = creator({ slug: "charlie", displayName: "Charlie", rank: 2, followers: 5_000 });

const counts: Record<string, number> = { alpha: 1, bravo: 4, charlie: 2 };
const dates: Record<string, number> = { alpha: 300, bravo: 100, charlie: 200 };
const countOf = (slug: string) => counts[slug] ?? 0;
const latestOf = (slug: string) => dates[slug] ?? 0;
const slugs = (list: Creator[]) => list.map((c) => c.slug);

describe("le tri du classeur", () => {
  it("propose cinq ordres, le rang Twitch en tête", () => {
    expect(BINDER_SORTS).toHaveLength(5);
    expect(BINDER_SORTS[0].id).toBe("catalog");
    // Chaque ordre a un libellé lisible : le sélecteur n'affiche pas d'identifiant.
    expect(BINDER_SORTS.every((entry) => entry.label.length > 2)).toBe(true);
  });

  it("« Rang Twitch » range par rang, comme le catalogue", () => {
    expect(slugs(sortBinder([A, B, C], "catalog", countOf, latestOf))).toEqual([
      "bravo",
      "charlie",
      "alpha",
    ]);
  });

  it("« Doublons d'abord » met la pile à recycler en tête", () => {
    expect(slugs(sortBinder([A, B, C], "duplicates", countOf, latestOf))).toEqual([
      "bravo",
      "charlie",
      "alpha",
    ]);
  });

  it("« Dernières obtenues » met les cartes qu'on n'a pas encore à la fin", () => {
    const jamais = creator({ slug: "delta", displayName: "Delta", rank: 4 });
    expect(slugs(sortBinder([jamais, A, B, C], "recent", countOf, latestOf))).toEqual([
      "alpha",
      "charlie",
      "bravo",
      "delta",
    ]);
  });

  it("« Audience » classe par followers, et les inconnus en dernier", () => {
    const sansAudience = creator({ slug: "echo", displayName: "Echo", rank: 0 });
    expect(slugs(sortBinder([A, B, C, sansAudience], "audience", countOf, latestOf))).toEqual([
      "bravo",
      "charlie",
      "alpha",
      "echo",
    ]);
  });

  it("« A → Z » suit l'alphabet français, casse ignorée", () => {
    const Émile = creator({ slug: "emile", displayName: "émile", rank: 9 });
    expect(slugs(sortBinder([A, C, Émile], "alpha", countOf, latestOf))).toEqual([
      "alpha",
      "charlie",
      "emile",
    ]);
  });

  it("départage les égalités par le rang Twitch, quel que soit l'ordre d'entrée", () => {
    const egal = [creator({ slug: "un", rank: 7 }), creator({ slug: "deux", rank: 2 })];
    const toujoursZero = () => 0;
    expect(slugs(sortBinder(egal, "duplicates", toujoursZero, toujoursZero))).toEqual(["deux", "un"]);
    expect(slugs(sortBinder([...egal].reverse(), "audience", toujoursZero, toujoursZero))).toEqual([
      "deux",
      "un",
    ]);
  });

  it("ne touche pas au tableau reçu", () => {
    const liste = [A, B, C];
    const avant = slugs(liste);
    sortBinder(liste, "alpha", countOf, latestOf);
    expect(slugs(liste)).toEqual(avant);
  });
});
