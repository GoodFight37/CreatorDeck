import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { SEASONS, emptySeasonIds, seasonOf, seasonsCoverage, splitCatchAll } from "@/lib/seasons";

describe("seasons", () => {
  it("a des identifiants uniques et des récompenses cohérentes", () => {
    const ids = SEASONS.map((season) => season.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const season of SEASONS) {
      expect(season.slugs.length).toBeGreaterThan(0);
      expect(season.reward.points).toBeGreaterThan(0);
      expect(season.reward.hourglasses).toBeGreaterThan(0);
      for (const slug of season.slugs) {
        expect(seasonOf(slug)).toBe(season);
      }
    }
  });

  it("ne classe chaque créateur que dans sa propre catégorie Twitch", () => {
    for (const season of SEASONS) {
      for (const slug of season.slugs) {
        const creator = CREATORS.find((entry) => entry.slug === slug);
        expect(creator).toBeDefined();
        expect(season.categories).toContain(creator?.category);
      }
    }
  });

  it("ignore les saisons configurées mais sans créateur", () => {
    // Dans le catalogue courant toutes les saisons ont des membres ; on vérifie
    // la cohérence des deux vues (liste des vides ↔ saisons présentes).
    for (const id of emptySeasonIds()) {
      expect(SEASONS.some((season) => season.id === id)).toBe(false);
    }
    expect(SEASONS.every((season) => season.slugs.length > 0)).toBe(true);
  });

  it("couvre tout le catalogue, une seule fois", () => {
    expect(seasonsCoverage()).toBe(CREATORS.length);
    const slugs = SEASONS.flatMap((season) => season.slugs);
    expect(new Set(slugs).size).toBe(CREATORS.length);
    expect(new Set(slugs)).toEqual(new Set(CREATORS.map((creator) => creator.slug)));
  });
});

describe("splitCatchAll", () => {
  const meta = { id: "S07", name: "Découverte", tagline: "Le reste du catalogue." };
  const entries = (count: number, category = "Jeu Niche") =>
    Array.from({ length: count }, (_, index) => ({ slug: `chaine-${index}`, category }));

  it("garde une seule saison quand le fourre-tout est petit", () => {
    const seasons = splitCatchAll(entries(3), meta, 60);
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("S07");
    expect(seasons[0].name).toBe("Découverte");
    expect(seasons[0].slugs).toHaveLength(3);
    expect(seasons[0].categories).toEqual(["Jeu Niche"]);
  });

  it("découpe un gros fourre-tout en morceaux de taille bornée", () => {
    const seasons = splitCatchAll(entries(130), meta, 60);
    expect(seasons).toHaveLength(3);
    expect(seasons.map((season) => season.id)).toEqual(["S07-1", "S07-2", "S07-3"]);
    expect(seasons.map((season) => season.name)).toEqual([
      "Découverte · 1/3",
      "Découverte · 2/3",
      "Découverte · 3/3",
    ]);
    // Les morceaux sont pleins à maxSize tant qu'il reste de quoi remplir.
    expect(seasons.map((season) => season.slugs.length)).toEqual([60, 60, 10]);
    // Aucun créateur perdu, aucun doublon entre les morceaux.
    const all = seasons.flatMap((season) => season.slugs);
    expect(new Set(all).size).toBe(130);
  });

  it("décrit les catégories réellement présentes dans chaque morceau", () => {
    const mixed = [
      ...entries(40, "Jeu Niche A"),
      ...entries(30, "Jeu Niche B"),
      ...entries(40, "Jeu Niche C"),
    ].map((entry, index) => ({ ...entry, slug: `chaine-${index}` }));
    const seasons = splitCatchAll(mixed, meta, 60);
    // Aucun couple ne tient sous 60 (40+30, 30+40) : les trois catégories font
    // donc trois morceaux, sans jamais couper une catégorie en deux.
    expect(seasons.map((season) => season.categories)).toEqual([
      ["Jeu Niche A"],
      ["Jeu Niche B"],
      ["Jeu Niche C"],
    ]);
    expect(seasons.map((season) => season.slugs.length)).toEqual([40, 30, 40]);
    // Une catégorie n'apparaît que dans un seul morceau (hors découpe d'un jeu
    // trop gros, cas dans lequel les tranches partagent la catégorie).
    const categories = seasons.flatMap((season) => season.categories);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("ne produit rien sans créateur à classer", () => {
    expect(splitCatchAll([], meta, 60)).toEqual([]);
  });
});
