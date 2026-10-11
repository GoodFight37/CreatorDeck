import { SEASONS } from "@/lib/seasons";
import { REGION_FAMILIES } from "@/lib/regions";

export const BINDER_FAMILIES = [...new Set(SEASONS.map((season) => season.familyId))].map((id) => {
  const seasons = SEASONS.filter((season) => season.familyId === id);
  return {
    id,
    name: REGION_FAMILIES.find((family) => family.id === id)?.name ?? seasons[0].name,
    slugs: seasons.flatMap((season) => season.slugs),
  };
});

/** Petits objectifs de lecture du classeur, sans récompense ni règle serveur. */
export const BINDER_COLLECTIONS = BINDER_FAMILIES.flatMap((season) =>
  Array.from({ length: Math.ceil(season.slugs.length / 12) }, (_, index) => ({
    id: `${season.id}:page-${index + 1}`,
    familyId: season.id,
    name: `${season.name} · Page ${index + 1}`,
    slugs: season.slugs.slice(index * 12, (index + 1) * 12),
  })),
);

export const BINDER_COLLECTION_BY_ID = new Map(BINDER_COLLECTIONS.map((collection) => [collection.id, collection]));

export function binderCollectionProgress(owned: ReadonlySet<string>) {
  return BINDER_COLLECTIONS.map((collection) => {
    const missing = collection.slugs.filter((slug) => !owned.has(slug));
    return { ...collection, total: collection.slugs.length, owned: collection.slugs.length - missing.length, missing };
  });
}

/** Favoriser un objectif commencé et proche de la fin, sans gonfler les doublons. */
export function recommendBinderCollection(progress: ReturnType<typeof binderCollectionProgress>) {
  return progress.filter((collection) => collection.owned > 0 && collection.missing.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.owned / b.total - a.owned / a.total || a.id.localeCompare(b.id))[0]
    ?? null;
}
