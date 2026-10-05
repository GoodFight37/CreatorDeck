/** Types de la catégorie d'une tête d'affiche (voir curated-category.mjs). */

/** Placeholder quand aucune catégorie fiable n'est disponible. */
export declare const FALLBACK_CATEGORY: string;

export declare function curatedCategory(input: {
  liveGame?: string | null;
  lastGame?: string | null;
  /** Catégories modélisées par les familles du catalogue. */
  knownCategories?: Iterable<string>;
  fallback?: string;
}): string;
