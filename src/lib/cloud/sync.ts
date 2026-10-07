/**
 * Décisions de synchronisation, sans entrée/sortie : tout est calculé à partir
 * de deux sauvegardes et de leurs horodatages. C'est la partie où une erreur
 * coûte cher (écraser la partie de quelqu'un), donc elle est isolée ici et
 * testée à part (`src/lib/cloud/sync.test.ts`).
 *
 * Vocabulaire :
 *   * **local**  : la sauvegarde de l'appareil (`localStorage`) ;
 *   * **cloud**  : la sauvegarde du serveur ;
 *   * **grâce**  : tolérance de 30 s entre deux horodatages d'appareils, le
 *     temps qu'une horloge dérive un peu.
 *
 * On ne fusionne **jamais** deux parties automatiquement : une collection est
 * un tout cohérent (les cartes, les points, les paliers réclamés). Mélanger
 * deux progressions donnerait un état impossible à défendre côté serveur. En
 * cas de doute, on demande au joueur.
 */
import type { PlayerState } from "@/lib/game-engine";

export const SYNC_GRACE_MS = 30_000;

export type LocalSave = {
  state: PlayerState;
  /** Horodatage de la dernière écriture locale (`state.updatedAt`). */
  updatedAt: number;
};

export type RemoteSave = {
  state: PlayerState;
  /** Horodatage fourni par l'appareil qui a envoyé la sauvegarde. */
  deviceUpdatedAt: number;
};

export type SyncAction = "push" | "pull" | "noop" | "conflict";

export type SyncDecision = {
  action: SyncAction;
  /** Explication courte, affichée telle quelle dans l'écran de compte. */
  reason: string;
};

/**
 * Empreinte du contenu d'une partie : sert à reconnaître deux sauvegardes
 * identiques sans les envoyer, et de garde-fou dans les tests. Volontairement
 * insensible à l'ordre des cartes pour que deux appareils qui ont joué les
 * mêmes tirages dans un ordre différent soient reconnus égaux.
 */
export function stateFingerprint(state: PlayerState): string {
  const cards = state.cards
    .map(
      (card) =>
        `${card.id}:${card.creatorSlug}:${card.rarity}:${card.variant}:${card.obtainedAt}:${card.rareDrop ? 1 : 0}`,
    )
    .sort();
  const claimed = Object.entries(state.claimedTiers)
    .map(([season, tier]) => `${season}:${tier}`)
    .sort();
  // Tout ce qui compose une partie entre dans l'empreinte, y compris
  // l'économie « secondaire » (sabliers, jetons, plancher de malchance,
  // missions, série, Paquet Scène). Sans elle, deux appareils dont seule
  // l'économie a divergé étaient vus comme identiques : le `noop` sautait
  // l'envoi et la divergence restait.
  const missions = Object.entries(state.missions)
    .map(([id, value]) => `${id}:${value}`)
    .sort();
  const material = [
    state.version,
    state.themeId,
    state.level,
    state.xp,
    state.points,
    state.hourglasses,
    state.tokens,
    state.packs,
    state.openings,
    state.pityCounter,
    state.missionDay,
    ...missions,
    state.streakDay,
    state.streak,
    state.streakJackpot ? 1 : 0,
    state.sceneDay,
    state.cards.length,
    ...cards,
    ...claimed,
  ].join("|");
  return fnv1a(material);
}

/** FNV-1a 32 bits : court, déterministe, suffisant pour comparer deux parties. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Que faire des deux côtés ? Ne renvoie jamais une fusion : au pire un
 * `conflict`, que l'écran de compte traduit en choix explicite.
 */
export function decideSync(local: LocalSave, cloud: RemoteSave | null): SyncDecision {
  if (!cloud) {
    return { action: "push", reason: "Aucune sauvegarde dans le cloud : envoi de ta collection." };
  }
  if (stateFingerprint(local.state) === stateFingerprint(cloud.state)) {
    return { action: "noop", reason: "Les deux côtés sont déjà identiques." };
  }

  const gap = local.updatedAt - cloud.deviceUpdatedAt;
  if (gap > SYNC_GRACE_MS) {
    return { action: "push", reason: "Ta partie locale est plus récente : envoi au cloud." };
  }
  if (-gap > SYNC_GRACE_MS) {
    return {
      action: "pull",
      reason: "Le cloud est plus récent (autre appareil) : tu peux charger cette partie.",
    };
  }
  return {
    action: "conflict",
    reason: "Les deux parties ont avancé en même temps : à toi de choisir celle à garder.",
  };
}

export type SyncStats = {
  uniqueCreators: number;
  totalCards: number;
  legendaryCards: number;
  epicCards: number;
  level: number;
  points: number;
};

/**
 * Statistiques d'une partie, calculées localement. Le serveur applique
 * exactement les mêmes règles (`refresh_stats()` dans la migration) : ces
 * valeurs servent à l'affichage et au diagnostic, jamais à faire autorité.
 */
export function syncStats(state: PlayerState): SyncStats {
  const unique = new Set(state.cards.map((card) => card.creatorSlug));
  const count = (rarity: string) => state.cards.filter((card) => card.rarity === rarity).length;
  return {
    uniqueCreators: unique.size,
    totalCards: state.cards.length,
    legendaryCards: count("legendary"),
    epicCards: count("epic"),
    level: state.level,
    points: state.points,
  };
}

/** Formule l'état de la synchronisation pour l'écran de compte. */
export function describeSync(decision: SyncDecision, cloudUpdatedAt: number | null, now = Date.now()): string {
  if (!cloudUpdatedAt) return "Jamais synchronisé.";
  const seconds = Math.max(0, Math.round((now - cloudUpdatedAt) / 1000));
  // « à l'instant » sous la minute (l'arrondi des secondes éviterait un
  // « il y a 1 min » trompeur juste après un envoi).
  if (seconds < 45) return "Synchronisé à l'instant.";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Synchronisé il y a ${minutes} min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synchronisé il y a ${hours} h.`;
  return `Synchronisé il y a ${Math.round(hours / 24)} j (${decision.action}).`;
}
