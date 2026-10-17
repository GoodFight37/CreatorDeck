/**
 * Mise à jour de l'APK de test depuis l'appli (D-144) — logique pure.
 *
 * Le workflow « APK de test » publie, à chaque `main` vérifiée, une APK et un
 * petit fichier `latest.json` dans une « release » du dépôt public
 * `GoodFight37/creatordeck-apk` (aucun code dedans : l'APK fait ~110 Mo, au-delà
 * des 50 Mo par fichier du stockage Supabase gratuit).
 * L'appli Android compare ce numéro au sien et propose « Mettre à jour » ;
 * Android demande ensuite une confirmation (aucune installation silencieuse
 * n'est possible hors Play Store).
 *
 * Rien ici ne touche au jeu : pas de règle, pas de sauvegarde. Sur le site
 * (navigateur), la fonction ne s'affiche jamais : le site est toujours à jour.
 */

export type UpdateManifest = {
  versionCode: number;
  versionName: string;
  /** Commit compilé (40 caractères). */
  sha: string;
  /** Adresse https de l'APK. */
  url: string;
  /** Empreinte SHA-256 de l'APK, en hexadécimal minuscule. */
  sha256: string;
  /** Taille en octets. */
  size: number;
  /** Date de compilation (ISO). */
  builtAt: string;
};

/** Le dépôt public qui ne contient que les APK publiées. */
export const UPDATE_REPO = "GoodFight37/creatordeck-apk";
export const UPDATE_MANIFEST_NAME = "latest.json";

/** Adresse du fichier « dernière version » : toujours celui de la release la plus récente. */
export function updateManifestUrl(repo: string = UPDATE_REPO): string {
  return `https://github.com/${repo}/releases/latest/download/${UPDATE_MANIFEST_NAME}`;
}

/** Préfixe obligatoire de l'adresse d'une APK publiée. */
export function updateDownloadPrefix(repo: string = UPDATE_REPO): string {
  return `https://github.com/${repo}/releases/download/`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Lit `latest.json`. Strict : un champ manquant ou douteux donne `null`, et
 * l'appli ne propose rien plutôt qu'une mise à jour bancale. L'APK doit être
 * une release du dépôt attendu, en https.
 */
export function parseUpdateManifest(payload: unknown, repo: string = UPDATE_REPO): UpdateManifest | null {
  const record = asRecord(payload);
  if (!record) return null;
  const { versionCode, versionName, sha, url, sha256, size, builtAt } = record;
  if (typeof versionCode !== "number" || !Number.isInteger(versionCode) || versionCode <= 0) return null;
  if (typeof url !== "string" || typeof sha256 !== "string" || typeof sha !== "string") return null;
  if (!/^[0-9a-f]{64}$/.test(sha256) || !/^[0-9a-f]{7,40}$/.test(sha)) return null;
  if (!url.startsWith(updateDownloadPrefix(repo)) || !url.endsWith(".apk")) return null;
  return {
    versionCode,
    versionName: typeof versionName === "string" && versionName ? versionName : sha.slice(0, 7),
    sha,
    url,
    sha256,
    size: typeof size === "number" && size > 0 ? size : 0,
    builtAt: typeof builtAt === "string" ? builtAt : "",
  };
}

/** Une version plus récente que celle installée est-elle publiée ? */
export function isUpdateAvailable(installedVersionCode: number, manifest: UpdateManifest | null): manifest is UpdateManifest {
  return manifest !== null && manifest.versionCode > installedVersionCode;
}

/** « 105 Mo » : la taille lisible, pour prévenir avant un téléchargement en données mobiles. */
export function formatDownloadSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(".", ",")} Mo`;
}

/** Pourcentage de téléchargement, borné ; `null` si la taille totale est inconnue. */
export function downloadPercent(done: number, total: number): number | null {
  if (!(total > 0)) return null;
  return Math.max(0, Math.min(100, Math.floor((done / total) * 100)));
}
