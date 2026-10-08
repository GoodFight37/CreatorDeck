/**
 * Store client de la partie : charge la sauvegarde locale, applique les
 * actions du moteur (src/lib/game-engine.ts) et persiste après chaque
 * mutation. Exposé à React via `useSyncExternalStore` (src/hooks/use-game.ts).
 *
 * Module sans effet à l'import : rien n'est lu tant qu'un composant ne
 * s'abonne pas, ce qui reste compatible avec le pré-rendu statique.
 */
import {
  bulkRecycleCards as engineBulkRecycleCards,
  buyWithTokens as engineBuyWithTokens,
  claimMilestone as engineClaimMilestone,
  claimMissions as engineClaimMissions,
  claimSeason as engineClaimSeason,
  claimStreakJackpot as engineClaimStreakJackpot,
  claimTribunal as engineClaimTribunal,
  markTribunalClaimed as engineMarkTribunalClaimed,
  craftCreator as engineCraftCreator,
  equipTheme as engineEquipTheme,
  createInitialState,
  openPack as engineOpenPack,
  openScenePack as engineOpenScenePack,
  recordVerdict as engineRecordVerdict,
  recycleCard as engineRecycleCard,
  spendHourglass as engineSpendHourglass,
  type DrawnCard,
  type LiveLogins,
  type StreakRewardGrant,
  type PlayerState,
  type TribunalVerdict,
} from "@/lib/game-engine";
import { deviceStorage } from "@/lib/storage";
import {
  SAVE_KEY,
  clearState,
  exportSave,
  importSave,
  loadState,
  saveState,
  type KeyValueStorage,
} from "@/lib/save-store";

type Listener = () => void;

let state: PlayerState | null = null;
let loaded = false;
const listeners = new Set<Listener>();

// Stockage désactivé (navigation privée stricte, quota…) : la partie vivra en
// mémoire le temps de la session.
const storage = deviceStorage;

/**
 * Abonnés aux écritures : le cloud s'en sert pour programmer un envoi après une
 * partie jouée, sans que le moteur ait besoin de connaître le réseau.
 */
const persistListeners = new Set<(state: PlayerState) => void>();

function emit() {
  for (const listener of listeners) listener();
}

function notifyPersist(next: PlayerState) {
  for (const listener of persistListeners) listener(next);
}

function persist(next: PlayerState) {
  state = next;
  const target = storage();
  if (target) {
    try {
      saveState(target, next);
    } catch {
      // Quota dépassé ou stockage indisponible : on garde l'état en mémoire.
    }
  }
  emit();
  notifyPersist(next);
}

/** S'abonne aux écritures de la partie (renvoie la fonction de désabonnement). */
export function onPersist(listener: (state: PlayerState) => void): () => void {
  persistListeners.add(listener);
  return () => persistListeners.delete(listener);
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  const target = storage();
  const restored = target ? loadState(target) : null;
  state = restored ?? createInitialState();
  if (!restored && target) {
    try {
      saveState(target, state);
    } catch {
      /* voir persist() */
    }
  }
}

function handleStorageEvent(event: StorageEvent) {
  // Un autre onglet a modifié la sauvegarde : on se réaligne dessus.
  if (event.key !== SAVE_KEY || event.storageArea !== window.localStorage) return;
  const target = storage();
  const fresh = target ? loadState(target) : null;
  if (fresh) {
    state = fresh;
    emit();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const wasLoaded = loaded;
  ensureLoaded();
  if (!wasLoaded) {
    // Premier abonné : l'état vient d'être chargé, on prévient React.
    listener();
  }
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

export function getSnapshot(): PlayerState | null {
  return state;
}

export function getServerSnapshot(): PlayerState | null {
  return null;
}

function current(): PlayerState {
  ensureLoaded();
  return state as PlayerState;
}

export const gameStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,

  /**
   * Ouvre un booster côté appareil (build sans cloud). `options.liveLogins`
   * apporte le bonus Direct : les `login` des créateurs qui streament, lus
   * dans le cache du direct au moment du geste.
   */
  openPack(
    now = Date.now(),
    options: { liveLogins?: LiveLogins } = {},
  ): { cards: DrawnCard[]; streakReward: StreakRewardGrant | null } {
    const result = engineOpenPack(current(), now, options);
    persist(result.state);
    // La récompense de série remonte avec les cartes : c'est l'écran de
    // révélation qui l'annonce, au moment où elle est gagnée.
    return { cards: result.cards, streakReward: result.streakReward };
  },

  /**
   * Ouvre le **Paquet Scène** du jour (build sans cloud). Le paquet choisit sa
   * famille tout seul — celle que le joueur complète — et refuse un second
   * paquet le même jour de jeu.
   */
  openScenePack(now = Date.now()): DrawnCard[] {
    const result = engineOpenScenePack(current(), now);
    persist(result.state);
    return result.cards;
  },

  useHourglass(now = Date.now()): void {
    persist(engineSpendHourglass(current(), now));
  },

  /** Recycle un doublon : +points, la carte est retirée du classeur. */
  recycleCard(cardId: string, now = Date.now()): void {
    persist(engineRecycleCard(current(), cardId, now));
  },

  /** Recycle d'un seul coup tous les doublons du classeur. */
  bulkRecycleCards(now = Date.now()): void {
    persist(engineBulkRecycleCards(current(), now));
  },

  /** Rejoint un créateur manquant contre des points (Atelier). */
  craftCreator(creatorSlug: string, now = Date.now()): void {
    persist(engineCraftCreator(current(), creatorSlug, now));
  },

  /** Réclame les paliers débloqués d'une saison. */
  claimSeason(seasonId: string, now = Date.now()): void {
    persist(engineClaimSeason(current(), seasonId, now));
  },

  /** Réclame la récompense d'un jalon atteint (écran Objectifs). */
  claimMilestone(milestoneId: string, now = Date.now()): void {
    persist(engineClaimMilestone(current(), milestoneId, now));
  },

  /** Réclame les sabliers des missions du jour terminées. */
  claimMissions(now = Date.now()): number {
    const before = current().hourglasses;
    const next = engineClaimMissions(current(), now);
    persist(next);
    return next.hourglasses - before;
  },

  /**
   * Dépense la récompense de série : le Perfect garanti, ou 3 sabliers.
   * Renvoie ce que ça a donné (sabliers crédités, ou 0 pour le Perfect).
   */
  claimStreakJackpot(choice: "perfect" | "hourglasses", now = Date.now()): number {
    const before = current().hourglasses;
    const next = engineClaimStreakJackpot(current(), choice, now);
    persist(next);
    return next.hourglasses - before;
  },

  /** Achète un créateur manquant avec 400 jetons (jamais une Légendaire). */
  buyWithTokens(creatorSlug: string, now = Date.now()): void {
    persist(engineBuyWithTokens(current(), creatorSlug, now));
  },

  /**
   * Rend un verdict au Tribunal des Bannis (build sans cloud).
   *
   * Le moteur vérifie que le dossier fait partie du tirage du jour : un
   * verdict hors séance est refusé, et l'écran remonte l'erreur au lieu de
   * l'avaler.
   */
  recordVerdict(dossierId: string, verdict: TribunalVerdict, now = Date.now()): void {
    persist(engineRecordVerdict(current(), dossierId, verdict, now));
  },

  /**
   * Verse la récompense de la séance **sur l'appareil** (build sans cloud).
   *
   * Compte connecté, les points viennent du serveur (voir `use-points.ts`) :
   * cette porte ne s'ouvre que hors ligne, sinon le gain serait repris à la
   * première synchronisation.
   */
  claimTribunal(points: number, now = Date.now()): void {
    persist(engineClaimTribunal(current(), points, now));
  },

  /**
   * Scelle la séance du jour sans rien verser (le serveur a déjà payé, ou la
   * séance ne payait pas). Sans ce sceau, l'écran du Tribunal reproposerait la
   * récompense à chaque ouverture.
   */
  markTribunalClaimed(now = Date.now()): void {
    persist(engineMarkTribunalClaimed(current(), now));
  },

  /** Équipe un thème de collection débloqué (cosmétique). */
  equipTheme(themeId: string, now = Date.now()): void {
    persist(engineEquipTheme(current(), themeId, now));
  },

  reset(now = Date.now()): void {
    const target = storage();
    if (target) clearState(target);
    persist(createInitialState(now));
  },

  /**
   * Remplace la partie locale par une sauvegarde venue d'ailleurs (cloud,
   * fichier importé). Passe par `persist()` : les abonnés sont prévenus, donc
   * le cloud ne se renvoie pas sa propre sauvegarde en boucle.
   */
  replaceState(next: PlayerState): void {
    persist(next);
  },

  exportSave(): string {
    return exportSave(current());
  },

  importSave(json: string, now = Date.now()): void {
    persist(importSave(json, now));
  },
};
