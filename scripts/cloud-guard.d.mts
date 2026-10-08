/** Types du garde-fou de compilation du cloud (voir cloud-guard.mjs). */

/**
 * Les deux variables publiques qui décident si le cloud est dans le paquet.
 * (Déclarées en lecture seule : le tableau ne se modifie pas, il se lit.)
 */
export declare const CLOUD_ENV_VARS: readonly string[];

/** Un environnement de compilation, tel que `process.env`. */
export type BuildEnv = Record<string, string | undefined>;

/**
 * Le message d'avertissement quand le cloud manque, ou `null` quand les deux
 * variables publiques sont renseignées.
 */
export declare function cloudBuildWarning(env: BuildEnv | undefined): string | null;

/**
 * Écrit l'avertissement (par défaut sur `console.warn`) et dit s'il a été écrit.
 * Ne lève jamais : le build se poursuit sans cloud, c'est un mode légitime.
 */
export declare function warnIfCloudMissing(
  env: BuildEnv | undefined,
  log?: (message: string) => void,
): boolean;
