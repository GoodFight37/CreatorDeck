import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { SEASONS } from "@/lib/seasons";
import { BINDER_COLLECTIONS, binderCollectionProgress, recommendBinderCollection } from "@/lib/binder-collections";

describe("les petites collections du Binder", () => {
  it("couvre chaque créateur actuel une seule fois, sans perdre sa famille", () => {
    const slugs = BINDER_COLLECTIONS.flatMap((collection) => collection.slugs);
    expect(new Set(slugs).size).toBe(CREATORS.length);
    expect([...slugs].sort()).toEqual(CREATORS.map((creator) => creator.slug).sort());
    for (const collection of BINDER_COLLECTIONS) {
      expect(collection.slugs.length).toBeGreaterThan(0);
      expect(collection.slugs.length).toBeLessThanOrEqual(12);
      const family = SEASONS.filter((season) => season.familyId === collection.familyId).flatMap((season) => season.slugs);
      expect(collection.slugs.every((slug) => family.includes(slug))).toBe(true);
    }
  });

  it("ignore les doublons et les anciens créateurs dans le compteur", () => {
    const collection = BINDER_COLLECTIONS[0];
    const progress = binderCollectionProgress(new Set([collection.slugs[0], collection.slugs[0], "ancien-createur"]));
    expect(progress[0].owned).toBe(1);
    expect(progress[0].missing).not.toContain(collection.slugs[0]);
    expect(progress[0].missing).toHaveLength(collection.slugs.length - 1);
  });

  it("ne suggère rien pour une collection vide ni pour le catalogue complet", () => {
    expect(recommendBinderCollection(binderCollectionProgress(new Set()))).toBeNull();
    expect(recommendBinderCollection(binderCollectionProgress(new Set(CREATORS.map((creator) => creator.slug))))).toBeNull();
  });

  it("suggère une page commencée proche de la fin et saute les pages complètes", () => {
    const [first, second] = BINDER_COLLECTIONS.filter((collection) => collection.slugs.length === 12);
    const owned = new Set([...first.slugs.slice(0, 2), ...second.slugs.slice(0, 11)]);
    expect(recommendBinderCollection(binderCollectionProgress(owned))?.id).toBe(second.id);
    owned.add(second.slugs[11]);
    expect(recommendBinderCollection(binderCollectionProgress(owned))?.id).toBe(first.id);
  });
});
