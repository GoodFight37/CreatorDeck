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
import type { PlayerState } from "@/lib/game-engine";
import type { KeyValueStorage } from "@/lib/save-store";
import { sanitizeState } from "@/lib/save-store";
import { CLOUD_DISABLED_HINT, cloudConfig, type CloudConfig } from "@/lib/cloud/config";
import { CloudApi, CloudError, type LeaderboardRow } from "@/lib/cloud/api";
import { decideSync, stateFingerprint, syncStats, type SyncAction } from "@/lib/cloud/sync";
import { deviceStorage } from "@/lib/storage";
import { gameStore, onPersist } from "@/lib/game-store";

/** Délai après la dernière action avant l'envoi automatique de la partie. */
export const AUTO_PUSH_DEBOUNCE_MS = 20_000;

export type LeaderboardMetric = "unique_creators" | "total_cards" | "legendary_cards";

export type CloudState = {
  /** Un projet Supabase est-il configuré dans ce build ? */
  configured: boolean;
  /** Adresse e-mail du compte connecté, sinon `null`. */
  email: string | null;
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
