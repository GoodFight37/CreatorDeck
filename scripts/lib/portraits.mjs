/**
 * L'extension des portraits, écrite **une fois** pour tout le dépôt.
 *
 * Elle est en WebP depuis le 7 octobre 2026 : les mêmes 1000 visages en 600 px
 * pèsent 16,6 Mo au lieu de 29 — et comme ils font 86 % du poids de l'APK,
 * c'est le seul chiffre qui compte pour l'installation sur un téléphone. Les
 * trois autres endroits qui doivent dire la même chose : `creatorImage()`
 * (`src/lib/catalog.ts`), `encodeAvatar()` (`scripts/lib/avatars.mjs`) et les
 * deux scripts de génération. `npm run catalog:check` tombe si un portrait
 * manque — donc si l'un des quatre part sans les autres.
 */
export const PORTRAIT_EXT = ".webp";

/**
 * Entretien du dossier `public/creators/`.
 *
 * Deux dérives coûtent cher quand le catalogue est embarqué dans l'APK :
 *
 *   1. des portraits **orphelins** — une régénération change de périmètre
 *      (Top 500 FR → Top 1000 mondial) et les anciens fichiers restent sur le
 *      disque : ils partent dans l'APK sans être affichés, et gonflent Git à
 *      chaque commit ;
 *   2. des portraits **manquants** — l'entrée existe dans `creators.json` mais
 *      l'image n'a pas été téléchargée : l'application affiche un trou.
 *
 * Module sans dépendance (ni `sharp`, ni réseau) : la sélection des orphelins
 * est une fonction pure, testée dans `src/lib/portraits.test.ts`.
 */
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

/** Noms de fichiers attendus pour une liste de slugs : `<slug>.webp`. */
export function expectedPortraitNames(slugs) {
  return slugs.map((slug) => `${slug}${PORTRAIT_EXT}`);
}

/**
 * Fichiers du dossier qui ne correspondent à aucun créateur du catalogue.
 *
 * Deux précautions, parce qu'un élagage supprime des fichiers :
 *   - seuls les `.webp` **en minuscules** sont candidats, plus les anciens
 *     `.jpg` / `.jpeg` (le dossier en a porté jusqu'au 7 octobre 2026 — un
 *     portrait resté en JPEG doit pouvoir être élagé) ; un `.WEBP` posé à la
 *     main n'est jamais supprimé (il sera signalé comme portrait manquant, ce
 *     qui est exact : `<slug>.webp` n'existe pas) ;
 *   - les autres fichiers (README, index, sous-dossiers) sont ignorés.
 */
export function selectOrphans(fileNames, slugs) {
  const keep = new Set(expectedPortraitNames(slugs));
  return fileNames
    .filter((name) => /\.(webp|jpe?g)$/.test(name) && !keep.has(name))
    .sort();
}

/** Créateurs sans fichier de portrait. */
export function selectMissing(fileNames, slugs) {
  const present = new Set(fileNames);
  return slugs.filter((slug) => !present.has(`${slug}${PORTRAIT_EXT}`));
}

/** Somme des tailles des fichiers donnés (octets réellement présents). */
export async function sumFileSizes(dir, fileNames) {
  let total = 0;
  for (const name of fileNames) {
    try {
      total += (await stat(path.join(dir, name))).size;
    } catch {
      // Fichier disparu entre deux appels : on l'ignore.
    }
  }
  return total;
}

/**
 * Supprime les portraits orphelins.
 *
 * `apply: false` (défaut) se contente de lister : on ne détruit jamais un
 * fichier sans l'avoir annoncé.
 *
 * @returns {Promise<{orphans: string[], bytes: number, removed: number}>}
 */
export async function pruneOrphans({ dir, slugs, apply = false }) {
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    return { orphans: [], bytes: 0, removed: 0 };
  }
  const orphans = selectOrphans(entries, slugs);
  const bytes = await sumFileSizes(dir, orphans);
  let removed = 0;
  if (apply) {
    for (const name of orphans) {
      try {
        await unlink(path.join(dir, name));
        removed += 1;
      } catch {
        // Fichier déjà absent ou verrouillé : ce n'est pas bloquant.
      }
    }
  }
  return { orphans, bytes, removed };
}

/** Formatage lisible d'une taille (Mo pour les gros volumes). */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
