/** Types de l'entretien du dossier public/creators (voir portraits.mjs). */

/** L'extension des portraits (`.webp`) — une seule, pour tout le dépôt. */
export declare const PORTRAIT_EXT: string;

export declare function expectedPortraitNames(slugs: string[]): string[];

/** Fichiers du dossier qui ne correspondent à aucun créateur du catalogue. */
export declare function selectOrphans(fileNames: string[], slugs: string[]): string[];

/** Créateurs sans fichier de portrait. */
export declare function selectMissing(fileNames: string[], slugs: string[]): string[];

export declare function sumFileSizes(dir: string, fileNames: string[]): Promise<number>;

/** Supprime les portraits orphelins ; `apply: false` se contente de lister. */
export declare function pruneOrphans(input: {
  dir: string;
  slugs: string[];
  apply?: boolean;
}): Promise<{ orphans: string[]; bytes: number; removed: number }>;

export declare function formatBytes(bytes: number): string;
