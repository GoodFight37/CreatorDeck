/** Types du découpage de saisons partagé (voir seasons-split.mjs). */

export type SeasonSplitEntry = { slug: string; region?: string };

export type SeasonSplitMeta = { id: string; name: string; tagline: string };

export type SplitSeason = {
  id: string;
  name: string;
  tagline: string;
  /** Familles (langues) couvertes par la vague. */
  regions: string[];
  slugs: string[];
};

export declare function splitSeason(
  entries: SeasonSplitEntry[],
  meta: SeasonSplitMeta,
  maxSize?: number,
): SplitSeason[];

/** Identifiant de famille d'une saison : `S01-2` → `S01`. */
export declare function familyIdOf(seasonId: string): string;

/** Numéro de vague d'une saison (1 pour une famille entière). */
export declare function pieceOf(seasonId: string): number;
