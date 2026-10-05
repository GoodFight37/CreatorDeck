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

/** Noms de fichiers attendus pour une liste de slugs : `<slug>.jpg`. */
export function expectedPortraitNames(slugs) {
  return slugs.map((slug) => `${slug}.jpg`);
}

/**
 * Fichiers du dossier qui ne correspondent à aucun créateur du catalogue.
 *
 * Deux précautions, parce qu'un élagage supprime des fichiers :
 *   - seuls les `.jpg` / `.jpeg` **en minuscules** sont candidats — c'est ce
 *     que le générateur écrit et ce que l'application demande ; un `.JPG`
 *     posé à la main n'est jamais supprimé (il sera signalé comme portrait
 *     manquant, ce qui est exact : `<slug>.jpg` n'existe pas) ;
 *   - les autres fichiers (README, index, sous-dossiers) sont ignorés.
 */
export function selectOrphans(fileNames, slugs) {
  const keep = new Set(expectedPortraitNames(slugs));
  return fileNames.filter((name) => /\.jpe?g$/.test(name) && !keep.has(name)).sort();
}

/** Créateurs sans fichier de portrait. */
export function selectMissing(fileNames, slugs) {
  const present = new Set(fileNames);
  return slugs.filter((slug) => !present.has(`${slug}.jpg`));
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
