import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { SEASONS, seasonOf, seasonsCoverage } from "@/lib/seasons";

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

  it("couvre tout le catalogue, une seule fois", () => {
    expect(seasonsCoverage()).toBe(CREATORS.length);
    const slugs = SEASONS.flatMap((season) => season.slugs);
    expect(new Set(slugs).size).toBe(CREATORS.length);
    expect(new Set(slugs)).toEqual(new Set(CREATORS.map((creator) => creator.slug)));
  });
});
