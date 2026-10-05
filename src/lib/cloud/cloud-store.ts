/**
 * État du compte et de la synchronisation, exposé à React.
 *
 * Le store ne connaît ni React ni le DOM : on l'instancie avec ses dépendances
 * (`createCloudStore`), ce qui permet de le tester avec un faux client et une
 * fausse partie (`src/lib/cloud/cloud-store.test.ts`). L'instance utilisée par
 * l'application est exportée en bas du fichier.
 *
 * Règle de conduite : **jamais de perte silencieuse**. Si le cloud est plus
 * récent, on ne remplace pas la partie locale tout seul — on le dit, et le
 * joueur décide.
 */
import { applyPackResult, applyPackStatus, type DrawnCard, type PlayerState } from "@/lib/game-engine";
import type { KeyValueStorage } from "@/lib/save-store";
import { sanitizeState } from "@/lib/save-store";
import { CLOUD_DISABLED_HINT, cloudConfig, type CloudConfig } from "@/lib/cloud/config";
import { CloudApi, CloudError, type LeaderboardRow } from "@/lib/cloud/api";
import { decideSync, stateFingerprint, syncStats, type SyncAction } from "@/lib/cloud/sync";
import { MAX_SHOWCASE, normalizeShowcase } from "@/lib/cloud/showcase";
import { deviceStorage } from "@/lib/storage";
import { gameStore, onPersist } from "@/lib/game-store";

/** Délai après la dernière action avant l'envoi automatique de la partie. */
export const AUTO_PUSH_DEBOUNCE_MS = 20_000;

export type LeaderboardMetric = "unique_creators" | "total_cards" | "legendary_cards";

export type CloudState = {
  /** Un projet Supabase est-il configuré dans ce build ? */
  configured: boolean;
  /** Adresse e-mail du compte connecté, sinon `null` (compte invité). */
  email: string | null;
  /** Nom affiché au classement, tel qu'enregistré côté serveur. */
  displayName: string | null;
  /** Cartes épinglées sur le profil public (0 à 4 slugs, dans l'ordre choisi). */
  showcase: string[];
  userId: string | null;
  /** Nom court du projet Supabase (affiché pour rassurer). */
  project: string | null;
  /** Un appel est en cours. */
  busy: boolean;
  /** Dernier message à afficher (succès ou erreur). */
  message: string | null;
  isError: boolean;
  /** Dernière décision de synchronisation calculée. */
  decision: SyncAction | null;
  /** Horodatage serveur de la sauvegarde cloud connue. */
  remoteUpdatedAt: number | null;
  lastSyncAt: number | null;
  /** Des changements locaux attendent d'être envoyés. */
  pending: boolean;
  leaderboard: LeaderboardRow[];
  leaderboardMetric: LeaderboardMetric;
};

/**
 * Résultat d'une demande d'ouverture côté serveur.
 *
 * `drawn` : le serveur a tiré les cartes, elles sont déjà dans la partie
 * locale. `unavailable` : rien n'a été tiré ; `reason` dit quoi corriger —
 * `offline`/`no-session` → se connecter (`offline` = cloud configuré mais
 * réseau injoignable), `no-packs` → attendre la recharge, `not-configured` →
 * build sans cloud, `error` → autre refus du serveur.
 */
export type PackOpenOutcome =
  | { status: "drawn"; cards: DrawnCard[] }
  | {
      status: "unavailable";
      reason: "offline" | "no-session" | "no-packs" | "not-configured" | "error";
      message: string;
    };

export type CloudDeps = {
  config: () => CloudConfig | null;
  storage: () => KeyValueStorage | null;
  api: (config: CloudConfig, storage: KeyValueStorage | null) => CloudApi;
  readState: () => PlayerState | null;
  applyState: (state: PlayerState) => void;
  now: () => number;
};

/** État neutre : sert aussi de snapshot serveur (pré-rendu statique). */
export const EMPTY_CLOUD_STATE: CloudState = Object.freeze({
  configured: false,
  email: null,
  displayName: null,
  showcase: [],
  userId: null,
  project: null,
  busy: false,
  message: null,
  isError: false,
  decision: null,
  remoteUpdatedAt: null,
  lastSyncAt: null,
  pending: false,
  leaderboard: [],
  leaderboardMetric: "unique_creators",
});

const EMPTY = EMPTY_CLOUD_STATE;

export type CloudStore = ReturnType<typeof createCloudStore>;

export function createCloudStore(deps: CloudDeps) {
  const listeners = new Set<() => void>();
  let state: CloudState = EMPTY;
  let client: CloudApi | null = null;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let detachPersist: (() => void) | null = null;

  function snapshot(): CloudState {
    return state;
  }

  function publish(patch: Partial<CloudState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function resolve(): CloudApi | null {
    if (client) return client;
    const config = deps.config();
    if (!config) return null;
    client = deps.api(config, deps.storage());
    return client;
  }

  /** Rafraîchit les champs qui dépendent de la session stockée. */
  function refreshIdentity(): CloudApi | null {
    const api = resolve();
    const config = deps.config();
    const session = api?.session() ?? null;
    if (!api || !config) {
      publish({ configured: false, email: null, userId: null, project: null, message: CLOUD_DISABLED_HINT });
      return null;
    }
    publish({
      configured: true,
      project: config.url.replace(/^https:\/\//, "").split(".")[0] ?? "supabase",
      email: session?.email ?? null,
      userId: session?.userId ?? null,
    });
    return api;
  }

  function fail(error: unknown, fallback: string) {
    const message = error instanceof CloudError ? error.message : error instanceof Error ? error.message : fallback;
    publish({ busy: false, message, isError: true });
  }

  function networkReady(api: CloudApi | null): api is CloudApi {
    if (!api) {
      publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
      return false;
    }
    if (!api.session()) {
      publish({ busy: false, message: "Connecte-toi d'abord avec ton adresse e-mail.", isError: true });
      return false;
    }
    return true;
  }

  async function push(saveVersion: number, deviceUpdatedAt: number, force: boolean): Promise<void> {
    const api = resolve();
    if (!networkReady(api)) return;
    const local = deps.readState();
    if (!local) return;
    publish({ busy: true });
    try {
      const result = await api.pushSave(local, deviceUpdatedAt, saveVersion, force);
      if (result.status === "pushed") {
        publish({
          busy: false,
          pending: false,
          decision: "push",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || deps.now(),
          lastSyncAt: deps.now(),
          message: "Collection envoyée au cloud.",
          isError: false,
        });
        return;
      }
      if (result.status === "unchanged") {
        publish({
          busy: false,
          pending: false,
          decision: "noop",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || deps.now(),
          lastSyncAt: deps.now(),
          message: "Cloud déjà à jour.",
          isError: false,
        });
        return;
      }
      if (result.status === "conflict") {
        publish({
          busy: false,
          pending: true,
          decision: "conflict",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || null,
          message:
            "Le cloud contient une partie plus récente (autre appareil). « Charger le cloud » l'adopte, « Envoyer » l'écrase.",
          isError: false,
        });
        return;
      }
      publish({
        busy: false,
        isError: true,
        message: `Sauvegarde refusée par le serveur : ${result.problems.join(" ; ")}`,
      });
    } catch (error) {
      fail(error, "Envoi impossible.");
    }
  }

  async function pull(): Promise<void> {
    const api = resolve();
    if (!networkReady(api)) return;
    publish({ busy: true });
    try {
      const remote = await api.pullSave();
      if (!remote) {
        publish({ busy: false, message: "Aucune sauvegarde dans le cloud pour ce compte.", isError: false });
        return;
      }
      const parsed = sanitizeState(remote.state, deps.now());
      if (!parsed) {
        publish({ busy: false, message: "Sauvegarde cloud illisible : rien n'a été modifié.", isError: true });
        return;
      }
      deps.applyState(parsed);
      publish({
        busy: false,
        pending: false,
        decision: "pull",
        remoteUpdatedAt: Date.parse(remote.updatedAt) || null,
        lastSyncAt: deps.now(),
        message: `Partie chargée depuis le cloud (${syncStats(parsed).uniqueCreators} créateurs).`,
        isError: false,
      });
    } catch (error) {
      fail(error, "Chargement impossible.");
    }
  }

  /**
   * Lit la réserve côté serveur (`pack_status()`) et l'adopte dans la partie
   * locale : compteur et compte à rebours affichés sont ceux du serveur, sans
   * rien consommer. Silencieux en cas d'échec (hors ligne, pas de compte) :
   * l'appelant garde alors son calcul local.
   */
  async function fetchPackStatus(): Promise<{ packs: number; nextPackAt: string | null } | null> {
    const api = resolve();
    if (!api?.session()) return null;
    try {
      const status = await api.packStatus();
      const local = deps.readState();
      if (local) {
        const adopted = applyPackStatus(local, status.packs, status.lastRegenAt, deps.now());
        if (adopted !== local) deps.applyState(adopted);
      }
      return { packs: status.packs, nextPackAt: status.nextPackAt };
    } catch {
      // Sans réseau ou erreur : le client retombe sur le calcul local.
      return null;
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) refreshIdentity();
      return () => listeners.delete(listener);
    },
    getSnapshot: snapshot,
    getServerSnapshot: () => EMPTY_CLOUD_STATE,

    /** Branche la synchronisation automatique sur les écritures de la partie. */
    attach() {
      if (detachPersist) return detachPersist;
      detachPersist = onPersist(() => {
        if (!state.configured || !state.userId) return;
        publish({ pending: true });
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          pushTimer = null;
          const local = deps.readState();
          if (!local) return;
          void push(local.version, local.updatedAt, false);
        }, AUTO_PUSH_DEBOUNCE_MS);
      });
      return () => {
        detachPersist?.();
        detachPersist = null;
      };
    },

    async requestCode(email: string): Promise<void> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        await api.requestOtp(email);
        publish({ busy: false, message: "Code envoyé : regarde ta boîte e-mail (et les indésirables).", isError: false });
      } catch (error) {
        fail(error, "Envoi du code impossible.");
      }
    },

    async verifyCode(email: string, token: string): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.verifyOtp(email, token.trim());
        publish({
          busy: false,
          email: session.email,
          userId: session.userId,
          message: "Compte connecté. Ta collection locale reste la référence : envoie-la quand tu veux.",
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Code refusé.");
        return false;
      }
    },

    /** Crée un compte invité (sans e-mail) et s'y connecte immédiatement. */
    async signInAsGuest(): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.signInAnonymously();
        publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          userId: session.userId,
          message: "Compte invité créé. Donne-toi un nom, puis envoie ta collection.",
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Création du compte invité impossible.");
        return false;
      }
    },

    /** Renomme le joueur dans le classement (2 à 24 caractères). */
    async rename(displayName: string): Promise<boolean> {
      const api = resolve();
      if (!networkReady(api)) return false;
      const local = deps.readState();
      const userId = api.session()?.userId;
      if (!local || !userId) return false;
      const name = displayName.trim();
      if (name.length < 2 || name.length > 24) {
        publish({ busy: false, message: "Le nom doit faire entre 2 et 24 caractères.", isError: true });
        return false;
      }
      publish({ busy: true });
      try {
        await api.updateDisplayName(userId, name);
        publish({ busy: false, displayName: name, message: `Nom du classement mis à jour : ${name}.`, isError: false });
        return true;
      } catch (error) {
        fail(error, "Changement de nom impossible.");
        return false;
      }
    },

    /**
     * Épingle jusqu'à 4 cartes de sa collection sur son profil public.
     *
     * Le serveur vérifie la possession : si une carte n'est pas dans la
     * sauvegarde poussée, il refuse et on affiche son message tel quel. En
     * local, on nettoie la liste et on borne à `MAX_SHOWCASE` avant d'appeler.
     */
    async setShowcase(slugs: readonly string[]): Promise<boolean> {
      const api = resolve();
      if (!networkReady(api)) return false;
      const clean = normalizeShowcase(slugs);
      if (slugs.length > MAX_SHOWCASE) {
        publish({ busy: false, message: `Une vitrine affiche ${MAX_SHOWCASE} cartes au maximum.`, isError: true });
        return false;
      }
      publish({ busy: true });
      try {
        const saved = await api.setShowcase(clean);
        publish({
          busy: false,
          showcase: normalizeShowcase(saved.length ? saved : clean),
          message: clean.length
            ? `Vitrine mise à jour (${clean.length} carte${clean.length > 1 ? "s" : ""}).`
            : "Vitrine vidée.",
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Mise à jour de la vitrine impossible.");
        return false;
      }
    },

    /**
     * Ouvre un booster côté serveur : les cartes sont tirées par la fonction
     * `open_pack()` de Supabase, puis appliquées à la partie locale.
     *
     * Après le tirage, la sauvegarde est poussée immédiatement (pas d'attente
     * des ~20 s du debounce) : les cartes sont infalsifiables, il faut les
     * inscrire dans le cloud sans délai.
     *
     * Pas de repli silencieux : si le cloud est configuré mais injoignable (ou
     * sans compte), on ne tire rien en local — l'écran explique qu'il faut se
     * connecter.
     */
    async openPack(): Promise<PackOpenOutcome> {
      const api = resolve();
      if (!api) {
        const message = CLOUD_DISABLED_HINT;
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "not-configured", message };
      }
      if (!api.session()) {
        const message = "Connecte-toi pour ouvrir un booster.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      publish({ busy: true });
      try {
        const result = await api.openPack();
        const cards = result.cards.map((card) => ({
          creatorSlug: card.creatorSlug,
          rarity: card.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary",
          variant: card.variant as "standard" | "live" | "holo" | "gold",
          rareDrop: card.rareDrop,
        }));
        const local = deps.readState();
        if (!local) {
          throw new CloudError("Partie locale illisible : rien n'a été tiré.", "invalid_response", 0);
        }
        const applied = applyPackResult(
          local,
          cards,
          result.packs,
          result.lastRegenAt,
          result.openings,
          deps.now(),
        );
        // Les cartes du serveur entrent dans la partie locale, puis la
        // sauvegarde est poussée immédiatement : pas d'attente des ~20 s du
        // debounce, les cartes infalsifiables doivent être inscrites sans délai.
        deps.applyState(applied.state);
        await push(applied.state.version, applied.state.updatedAt, true);
        publish({
          busy: false,
          message: `Booster ouvert : ${applied.cards.length} carte${applied.cards.length > 1 ? "s" : ""} reçue${applied.cards.length > 1 ? "s" : ""}.`,
          isError: false,
        });
        return { status: "drawn", cards: applied.cards };
      } catch (error) {
        // Réseau coupé : même consigne que sans compte — se connecter.
        if (error instanceof CloudError && error.status === 0) {
          const message = "Connecte-toi pour ouvrir un booster.";
          publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "offline", message };
        }
        // Le serveur a refusé faute de booster : on relit la réserve pour
        // réaligner le compteur et le compte à rebours affichés (sans rien
        // consommer) avant d'expliquer.
        if (error instanceof CloudError && /aucun booster/i.test(error.message)) {
          await fetchPackStatus();
          publish({ busy: false, message: error.message, isError: true });
          return { status: "unavailable", reason: "no-packs", message: error.message };
        }
        const message = error instanceof CloudError ? error.message : "Ouverture du booster impossible.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
    },

    /**
     * Statut de la réserve de boosters, calculé par le serveur.
     *
     * Le client l'appelle à la connexion pour afficher le bon compteur sans
     * dépendre de l'horloge locale. La réserve renvoyée est adoptée par la
     * partie locale (`applyPackStatus`) : la recharge passive repart de la
     * même ancre que le serveur.
     */
    packStatus: fetchPackStatus,

    async signOut(): Promise<void> {
      const api = resolve();
      publish({ busy: true });
      try {
        await api?.signOut();
      } catch {
        // La déconnexion locale suffit.
      }
      publish({
        busy: false,
        email: null,
        displayName: null,
        showcase: [],
        userId: null,
        pending: false,
        decision: null,
        remoteUpdatedAt: null,
        leaderboard: [],
        message: "Déconnecté. La partie continue en local, exactement comme avant.",
        isError: false,
      });
    },

    /** Synchronisation : `auto` respecte le plus récent, `push`/`pull` forcent. */
    async sync(mode: "auto" | "push" | "pull" = "auto"): Promise<void> {
      const local = deps.readState();
      if (!local) return;
      if (mode === "push") return push(local.version, local.updatedAt, true);
      if (mode === "pull") return pull();

      const api = resolve();
      if (!networkReady(api)) return;
      publish({ busy: true });
      try {
        const remote = await api.pullSave();
        const decision = decideSync(
          { state: local, updatedAt: local.updatedAt },
          remote
            ? { state: sanitizeState(remote.state, deps.now()) ?? local, deviceUpdatedAt: remote.deviceUpdatedAt }
            : null,
        );
        publish({ busy: false, remoteUpdatedAt: remote ? Date.parse(remote.updatedAt) || null : null });
        if (decision.action === "push") return push(local.version, local.updatedAt, false);
        if (decision.action === "pull") {
          publish({
            decision: "pull",
            message: "Le cloud est plus récent : ouvre « Charger le cloud » pour récupérer cette partie.",
            isError: false,
          });
          return;
        }
        if (decision.action === "noop") {
          publish({ decision: "noop", pending: false, lastSyncAt: deps.now(), message: decision.reason, isError: false });
          return;
        }
        publish({ decision: "conflict", pending: true, message: decision.reason, isError: false });
      } catch (error) {
        fail(error, "Synchronisation impossible.");
      }
    },

    /** Récupère le nom affiché (et la vitrine) pour préremplir l'écran. */
    async loadProfile(): Promise<void> {
      const api = resolve();
      const userId = api?.session()?.userId;
      if (!api || !userId) return;
      try {
        const profile = await api.profile(userId);
        if (profile) {
          publish({
            displayName: profile.displayName,
            showcase: normalizeShowcase(profile.showcaseSlugs),
          });
        }
      } catch {
        // Sans réseau, on garde le dernier nom connu.
      }
    },

    async loadLeaderboard(metric: LeaderboardMetric = state.leaderboardMetric): Promise<void> {
      const api = resolve();
      if (!networkReady(api)) return;
      publish({ busy: true, leaderboardMetric: metric });
      try {
        const rows = await api.leaderboard(20, metric);
        publish({ busy: false, leaderboard: rows, message: null, isError: false });
      } catch (error) {
        fail(error, "Classement indisponible.");
      }
    },

    /** Empreinte locale, utile pour diagnostiquer un conflit. */
    fingerprint(): string | null {
      const local = deps.readState();
      return local ? stateFingerprint(local) : null;
    },
  };
}

/** Instance de l'application (aucun effet à l'import : tout est paresseux). */
export const cloudStore = createCloudStore({
  config: cloudConfig,
  storage: deviceStorage,
  api: (config, storage) => new CloudApi(config, storage),
  readState: () => gameStore.getSnapshot(),
  applyState: (next) => gameStore.replaceState(next),
  now: () => Date.now(),
});

export const CLOUD_DISABLED_MESSAGE = CLOUD_DISABLED_HINT;
