import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { CATCH_ALL_REGION, REGION_BY_ID, isKnownRegion } from "@/lib/regions";
import { SEASONS, emptySeasonIds, seasonOf, seasonsCoverage, splitSeason } from "@/lib/seasons";

/**
 * Familles de collection : le catalogue est découpé par **langue de diffusion**
 * (champ `region`), pas par jeu joué — un streameur change de jeu, pas de
 * langue. Ces tests tiennent aussi bien sur un catalogue régénéré (régions
 * présentes) que sur un catalogue antérieur, où tout tombe dans la famille
 * fourre-tout « Sans frontière ».
 */
describe("seasons", () => {
  it("a des identifiants uniques et des paliers cohérents", () => {
    const ids = SEASONS.map((season) => season.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const season of SEASONS) {
      expect(season.slugs.length).toBeGreaterThan(0);
      expect(season.tiers.length).toBeGreaterThan(0);
      // Chaque vague appartient à une famille, et les vagues d'une famille
      // découpée partagent cette famille (identité visuelle unique).
      expect(season.familyId.length).toBeGreaterThan(0);
      expect(season.id === season.familyId || season.id.startsWith(`${season.familyId}-`)).toBe(true);
      expect(season.piece).toBeGreaterThanOrEqual(1);
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

  it("marque une seule vague finale par famille", () => {
    const families = new Map<string, typeof SEASONS>();
    for (const season of SEASONS) {
      families.set(season.familyId, [...(families.get(season.familyId) ?? []), season]);
    }
    for (const [familyId, pieces] of families) {
      expect(new Set(pieces.map((piece) => piece.piece)).size).toBe(pieces.length);
      expect(pieces.map((piece) => piece.piece).sort((a, b) => a - b)).toEqual(
        pieces.map((_, index) => index + 1),
      );
      expect(pieces.filter((piece) => piece.finalPiece).length).toBe(1);
      expect(pieces.at(-1)?.finalPiece, `famille ${familyId}`).toBe(true);
    }
  });

  it("range chaque créateur dans la famille de sa langue", () => {
    // C'est l'invariant central : la famille d'une carte vient de son champ
    // `region`, jamais du jeu qu'elle joue au moment de la génération.
    for (const season of SEASONS) {
      for (const slug of season.slugs) {
        const creator = CREATORS.find((entry) => entry.slug === slug);
        expect(creator).toBeDefined();
        const expected = creator?.region && isKnownRegion(creator.region)
          ? creator.region
          : CATCH_ALL_REGION.id;
        expect(season.familyId).toBe(expected);
      }
    }
  });

  it("n'attribue jamais une famille inconnue, et décrit la famille de chaque vague", () => {
    for (const season of SEASONS) {
      expect(REGION_BY_ID.has(season.familyId), `famille ${season.familyId}`).toBe(true);
      expect(season.regions).toEqual([season.familyId]);
    }
  });

  it("décrit les membres d'une famille, même sans région dans les données", () => {
    // Un catalogue généré avant l'arrivée des régions n'a pas le champ : tout
    // tombe dans la fourre-tout, et rien ne disparaît.
    const withoutRegion = CREATORS.filter((creator) => !creator.region);
    const orphans = SEASONS.filter((season) => season.familyId === CATCH_ALL_REGION.id).reduce(
      (sum, season) => sum + season.slugs.length,
      0,
    );
    const unknownRegions = CREATORS.filter(
      (creator) => creator.region && !isKnownRegion(creator.region),
    ).length;
    expect(orphans).toBe(withoutRegion.length + unknownRegions);
  });

  it("ignore les familles configurées mais sans créateur", () => {
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
  const meta = { id: "S10", name: "Sans frontière", tagline: "Le reste du catalogue." };
  const entries = (count: number, region = "S10") =>
    Array.from({ length: count }, (_, index) => ({ slug: `chaine-${index}`, region }));

  it("garde une seule saison quand la famille est petite", () => {
    const seasons = splitSeason(entries(3), meta, 60);
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("S10");
    expect(seasons[0].name).toBe("Sans frontière");
    expect(seasons[0].slugs).toHaveLength(3);
    expect(seasons[0].regions).toEqual(["S10"]);
  });

  it("découpe une grosse famille en vagues de taille bornée", () => {
    const seasons = splitSeason(entries(130), meta, 60);
    expect(seasons).toHaveLength(3);
    expect(seasons.map((season) => season.id)).toEqual(["S10-1", "S10-2", "S10-3"]);
    expect(seasons.map((season) => season.name)).toEqual([
      "Sans frontière · 1/3",
      "Sans frontière · 2/3",
      "Sans frontière · 3/3",
    ]);
    // Les vagues sont pleines tant qu'il reste de quoi remplir.
    expect(seasons.map((season) => season.slugs.length)).toEqual([60, 60, 10]);
    // Aucun créateur perdu, aucun doublon entre les vagues.
    const all = seasons.flatMap((season) => season.slugs);
    expect(new Set(all).size).toBe(130);
  });

  it("respecte l'ordre du classement : la première vague, ce sont les têtes d'affiche", () => {
    const ordered = Array.from({ length: 200 }, (_, index) => ({
      slug: `rang-${index + 1}`,
      region: "S04",
    }));
    const seasons = splitSeason(ordered, { id: "S04", name: "Anglophonie", tagline: "" }, 150);
    expect(seasons.map((season) => season.slugs.length)).toEqual([150, 50]);
    expect(seasons[0].slugs[0]).toBe("rang-1");
    expect(seasons[0].slugs.at(-1)).toBe("rang-150");
    expect(seasons[1].slugs[0]).toBe("rang-151");
  });

  it("ne produit rien sans créateur à classer", () => {
    expect(splitSeason([], meta, 60)).toEqual([]);
  });
});
