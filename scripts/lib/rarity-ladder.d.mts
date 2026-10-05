/**
 * Types du module d'échelle de raretés (scripts/lib/rarity-ladder.mjs), pour
 * que les tests TypeScript puissent l'importer sans `allowJs`.
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export declare const RARITY_LADDER: ReadonlyArray<{ rarity: Rarity; upTo: number }>;

/** Rareté d'un rang (1-indexé) pour un catalogue de `total` entrées. */
export declare function rarityForRank(rank: number, total: number): Rarity;

/** Nombre d'entrées de chaque rareté pour un catalogue de `total` entrées. */
export declare function rarityCounts(total: number): Record<Rarity, number>;
