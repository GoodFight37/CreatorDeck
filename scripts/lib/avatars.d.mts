/** Types du pipeline de portraits Twitch (voir avatars.mjs). */

/** Résolution cible (px) des fichiers écrits dans public/creators/. */
export declare const AVATAR_SIZE: number;
/** Qualité JPEG (mozjpeg). */
export declare const AVATAR_QUALITY: number;
/** Tailles servies par le CDN, de la plus grande à la plus petite. */
export declare const CDN_SIZES: number[];
/**
 * En deçà de cet écart-type (sur 0-255), un portrait est considéré comme uni —
 * l'avatar par défaut que Twitch sert aux chaînes sans photo de profil.
 */
export declare const FLAT_PORTRAIT_STDEV: number;

/** `…-profile_image-300x300.png` -> `…-profile_image-600x600.png` (ou null). */
export declare function avatarUrlAtSize(url: string, size: number): string | null;

/** Télécharge la plus grande variante disponible d'un portrait. */
export declare function downloadLargestAvatar(
  url: string,
  options?: { timeoutMs?: number },
): Promise<{ bytes: Buffer; size: number | null; url: string }>;

/** Encode un portrait en JPEG carré ; rend la taille (px) de la source. */
export declare function encodeAvatar(
  bytes: Buffer | Uint8Array,
  target: string,
  options?: { size?: number },
): Promise<number>;

/** Portrait de secours (dégradé, silhouette, initiale) pour une chaîne sans photo. */
export declare function encodePlaceholder(
  creator: { displayName?: string; login?: string },
  target: string,
  options?: { size?: number },
): Promise<void>;

/** Statistiques `sharp.stats()` : un tableau de canaux avec moyenne et écart-type. */
export declare type SharpStats = {
  channels?: Array<{ mean?: number; stdev?: number; min?: number; max?: number }>;
};

/**
 * Vrai si l'image est parfaitement plate (écart-type nul sur tous les canaux) :
 * c'est l'avatar par défaut de Twitch, pas une photo.
 */
export declare function isFlatStats(stats: SharpStats | null | undefined): boolean;

/** Le même verdict, lu depuis un fichier ou des octets. */
export declare function isFlatPortrait(source: string | Buffer | Uint8Array): Promise<boolean>;

/** Dimensions d'un fichier existant, ou null s'il est absent / illisible. */
export declare function readAvatarSize(file: string): Promise<number | null>;
