/**
 * « Mes chaînes » en ligne (D-143) : qui gagne entre l'appareil et le compte ?
 *
 * Logique pure, testée seule. Le cercle vit sur l'appareil
 * (`creatordeck.circle.v1`) et, pour un compte connecté, dans
 * `player_circles` (0054, via `set_circle`). À la connexion :
 *
 *   - rien en ligne, un cercle sur l'appareil → on l'envoie ;
 *   - rien sur l'appareil, un cercle en ligne → on le reprend (nouveau
 *     téléphone, app réinstallée, site) ;
 *   - les deux, identiques → rien ;
 *   - les deux, différents → **le plus récent gagne** (dates d'enregistrement).
 *     Sans date côté appareil, le compte gagne : c'est la seule date sûre.
 *
 * Le serveur revérifie toujours le cercle (`_circle_clean`) : un cercle
 * illisible en ligne est ignoré, jamais recopié. Un cercle vide (0058) vaut
 * « rien à synchroniser » : il ne vide jamais un cercle enregistré ailleurs.
 */
import { isValidCircle } from "@/lib/circle";

export type CircleSyncAction =
  | { kind: "nothing" }
  | { kind: "push"; slugs: readonly string[] }
  | { kind: "adopt"; slugs: readonly string[]; at: number };

export function decideCircleSync(
  local: { slugs: readonly string[]; savedAt: number | null },
  remote: { slugs: readonly string[]; updatedAt: number | null } | null,
  now: number,
): CircleSyncAction {
  const localOk = local.slugs.length > 0 && isValidCircle(local.slugs);
  const remoteOk = remote !== null && remote.slugs.length > 0 && isValidCircle(remote.slugs);
  if (!remoteOk) return localOk ? { kind: "push", slugs: local.slugs } : { kind: "nothing" };
  const remoteAt = remote.updatedAt ?? now;
  if (!localOk) return { kind: "adopt", slugs: remote.slugs, at: remoteAt };
  const same = local.slugs.length === remote.slugs.length && local.slugs.every((slug, index) => slug === remote.slugs[index]);
  if (same) return { kind: "nothing" };
  if (local.savedAt !== null && remote.updatedAt !== null && local.savedAt > remote.updatedAt) {
    return { kind: "push", slugs: local.slugs };
  }
  return { kind: "adopt", slugs: remote.slugs, at: remoteAt };
}
