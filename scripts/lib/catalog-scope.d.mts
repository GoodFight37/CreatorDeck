/**
 * Types du module de périmètre (scripts/lib/catalog-scope.mjs), pour que les
 * tests TypeScript puissent l'importer sans `allowJs`.
 */
export type CatalogScopeConfig = {
  expectedSize: number;
  scope: "FR" | "world";
  scopeLabel: string;
  audience: string;
  label: string;
  eyebrow: string;
  edition: string;
  note: string;
};

export declare function scopeConfig(input: {
  size: number;
  languages?: string[];
}): CatalogScopeConfig;

/** Langues de repli pour la requête de direct globale (voir le .mjs). */
export declare const WORLD_LIVE_LANGUAGES: readonly string[];

/** Libellé de journal (« monde », « FR », « FR/EN », « 12 langues »). */
export declare function scopeLogLabel(languages?: readonly string[]): string;
