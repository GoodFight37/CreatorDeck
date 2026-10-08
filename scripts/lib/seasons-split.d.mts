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

/** Palier d'une saison, tel que l'application l'affiche et le serveur le paie. */
export type SeasonTierSplit = {
  label: string;
  /** Créateurs de la saison à posséder pour débloquer le palier. */
  required: number;
  reward: { points: number; hourglasses: number };
  /** Le dernier palier est celui de la saison complète : il donne l'emblème. */
  emblem: boolean;
};

export declare const TIER_LABELS: readonly string[];
export declare const TIER_SHARES: readonly number[];

/** Seuils d'une saison de `size` créateurs (25 %, 50 %, 75 %, 100 %). */
export declare function tierThresholds(size: number): number[];

/** Paliers d'une saison de `size` créateurs, pour une configuration donnée. */
export declare function tiersFor(
  size: number,
  config: { pointsPerCreator: number; hourglassesPerSeason: number },
): SeasonTierSplit[];
