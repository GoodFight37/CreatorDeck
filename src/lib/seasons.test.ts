import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { SEASONS, emptySeasonIds, seasonOf, seasonsCoverage, splitSeason } from "@/lib/seasons";

describe("seasons", () => {
  it("a des identifiants uniques et des paliers cohérents", () => {
    const ids = SEASONS.map((season) => season.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const season of SEASONS) {
      expect(season.slugs.length).toBeGreaterThan(0);
      expect(season.tiers.length).toBeGreaterThan(0);
      // Seuils croissants, jamais au-delà de la taille de la saison.
      const required = season.tiers.map((tier) => tier.required);
      expect([...required].sort((a, b) => a - b)).toEqual(required);
      expect(new Set(required).size).toBe(required.length);
      expect(Math.max(...required)).toBe(season.slugs.length);
      for (const tier of season.tiers) {
        expect(tier.reward.points).toBeGreaterThan(0);
        expect(tier.required).toBeGreaterThan(0);
      }
      // Les sabliers et l'emblème sont réservés à la saison complète.
      expect(season.tiers.at(-1)?.emblem).toBe(true);
      expect(season.tiers.slice(0, -1).every((tier) => !tier.emblem)).toBe(true);
      expect(season.tiers.slice(0, -1).every((tier) => tier.reward.hourglasses === 0)).toBe(true);
      expect(season.tiers.at(-1)?.reward.hourglasses).toBeGreaterThan(0);
      for (const slug of season.slugs) {
        expect(seasonOf(slug)).toBe(season);
      }
    }
  });

  it("répartit exactement l'ancienne récompense unique en paliers", () => {
    // L'économie du jeu ne bouge pas : la somme des paliers vaut le total
    // historique (pointsPerCreator × taille, sabliers de la saison).
    for (const season of SEASONS) {
      const points = season.tiers.reduce((sum, tier) => sum + tier.reward.points, 0);
      const hourglasses = season.tiers.reduce((sum, tier) => sum + tier.reward.hourglasses, 0);
      expect(points).toBe(season.slugs.length * 4);
      expect(hourglasses).toBe(3);
    }
  });

  it("donne moins de paliers à une petite saison, jamais de doublon", () => {
    const small = splitSeason(
      [
        { slug: "a", category: "Jeu" },
        { slug: "b", category: "Jeu" },
        { slug: "c", category: "Jeu" },
      ],
      { id: "T01", name: "Test", tagline: "" },
      60,
    )[0];
    expect(small.slugs.length).toBe(3);
    // 3 créateurs ne peuvent pas produire 4 paliers distincts.
    expect(small.tiers.length).toBe(3);
    expect(small.tiers.map((tier) => tier.required)).toEqual([1, 2, 3]);
    expect(small.tiers.reduce((sum, tier) => sum + tier.reward.points, 0)).toBe(12);

    const single = splitSeason([{ slug: "a", category: "Jeu" }], { id: "T02", name: "Solo", tagline: "" }, 60)[0];
    expect(single.tiers.length).toBe(1);
    expect(single.tiers[0].required).toBe(1);
    expect(single.tiers[0].emblem).toBe(true);
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

describe("splitSeason", () => {
  const meta = { id: "S07", name: "Découverte", tagline: "Le reste du catalogue." };
  const entries = (count: number, category = "Jeu Niche") =>
    Array.from({ length: count }, (_, index) => ({ slug: `chaine-${index}`, category }));

  it("garde une seule saison quand le fourre-tout est petit", () => {
    const seasons = splitSeason(entries(3), meta, 60);
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("S07");
    expect(seasons[0].name).toBe("Découverte");
    expect(seasons[0].slugs).toHaveLength(3);
    expect(seasons[0].categories).toEqual(["Jeu Niche"]);
  });

  it("découpe un gros fourre-tout en morceaux de taille bornée", () => {
    const seasons = splitSeason(entries(130), meta, 60);
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
    const seasons = splitSeason(mixed, meta, 60);
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
    expect(splitSeason([], meta, 60)).toEqual([]);
  });
});

describe("splitSeason sur une saison thématique", () => {
  const meta = { id: "S01", name: "Accueil & IRL", tagline: "Talk et events." };
  const entries = (count: number, category = "Just Chatting") =>
    Array.from({ length: count }, (_, index) => ({ slug: `chaine-${index}`, category }));

  it("laisse intacte une saison de taille raisonnable", () => {
    const seasons = splitSeason(entries(80), meta, 150);
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("S01");
    expect(seasons[0].slugs).toHaveLength(80);
  });

  it("découpe une famille devenue énorme en périmètre mondial", () => {
    // Cas réel : « Just Chatting » au niveau mondial dépasse largement 150.
    const seasons = splitSeason(entries(520), meta, 150);
    expect(seasons).toHaveLength(4);
    expect(seasons.map((season) => season.id)).toEqual(["S01-1", "S01-2", "S01-3", "S01-4"]);
    expect(seasons.map((season) => season.slugs.length)).toEqual([150, 150, 150, 70]);
    expect(seasons[0].name).toBe("Accueil & IRL · 1/4");
    // La famille reste identifiable et aucun créateur n'est perdu.
    expect(new Set(seasons.flatMap((season) => season.slugs)).size).toBe(520);
    expect(seasons.every((season) => season.categories.includes("Just Chatting"))).toBe(true);
  });
});
