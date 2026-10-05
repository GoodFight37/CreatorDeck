/** Types du classement par langue (voir regions.mjs). */

export declare const UNKNOWN_LANGUAGE: string;

/** Famille de collection, telle que décrite dans seasons.config.json. */
export type RegionFamily = {
  id: string;
  name: string;
  tagline?: string;
  languages?: string[];
};

export declare function normalizeLanguage(value: unknown): string;

export declare function regionIdForLanguage(
  language: unknown,
  families: RegionFamily[],
  fallbackId: string,
): string;

export declare function coveredLanguages(families: RegionFamily[]): string[];
