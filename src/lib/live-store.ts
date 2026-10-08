/**
 * Le store du direct : lecture de la table, cache local, et déclenchement du
 * rafraîchissement côté serveur.
 *
 * Il n'y a **pas de tâche planifiée côté Supabase** : c'est l'app qui demande le
 * rafraîchissement quand elle ouvre les yeux et que son cache est vieux. C'est
 * suffisant — un badge « en direct » n'intéresse personne quand personne ne
 * regarde — et ça évite de faire tourner une horloge (et un secret) dans la
 * base. La fonction serveur, elle, se limite à une requête Helix toutes les
 * 90 secondes, pour tous les appelants confondus.
 *
 * Séquence d'une lecture :
 *   1. le cache local s'affiche tout de suite (daté) ;
 *   2. on lit `live_state` + `live_streams` ;
 *   3. si le serveur a une donnée vieille de plus de trois minutes, on lui
 *      demande un rafraîchissement (`POST /functions/v1/refresh-live`) puis on
 *      relit une fois, six secondes plus tard ;
 *   4. tout échec laisse l'écran tel quel : le direct est un bonus, jamais une
 *      condition pour jouer.
 */
import { cloudConfig, type CloudConfig } from "@/lib/cloud/config";
import { cloudRequest, type CloudFetch } from "@/lib/cloud/transport";
import { deviceStorage } from "@/lib/storage";
import {
  EMPTY_LIVE,
  LIVE_REFRESH_MS,
  LIVE_SETTLE_MS,
  indexLive,
  isLiveFresh,
  parseLiveRefreshedAt,
  parseLiveStreams,
  readLiveCache,
  writeLiveCache,
  type LiveSnapshot,
} from "@/lib/live";

export type LiveDeps = {
  /** Configuration cloud (absente dans un build hors ligne). */
  config: () => CloudConfig | null;
  storage: () => { getItem(key: string): string | null; setItem(key: string, value: string): void } | null;
  request: CloudFetch;
  now: () => number;
  /** Rappel différé (injecté : les tests ne patientent pas six secondes). */
  later: (callback: () => void, ms: number) => void;
};

export type LiveStore = ReturnType<typeof createLiveStore>;

/** Les colonnes lues : jamais `select=*` (la table peut grossir). */
const STREAM_COLUMNS = "login,display_name,game_name,title,viewers,started_at";

export function createLiveStore(deps: LiveDeps) {
  const listeners = new Set<() => void>();
  let state: LiveSnapshot = EMPTY_LIVE;
  let inflight: Promise<void> | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopWatching: (() => void) | null = null;
  let booted = false;
  /** Dernier appel au rafraîchissement serveur (anti-boucle). */
  let askedAt = 0;

  function snapshot(): LiveSnapshot {
    return state;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function publish(next: Partial<LiveSnapshot>): void {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  /** Charge le cache local une fois (au premier abonné ou au premier accès). */
  function boot(): void {
    if (booted) return;
    booted = true;
    const config = deps.config();
    const cached = readLiveCache(deps.storage());
    if (!cached) {
      if (config) publish({ configured: true });
      return;
    }
    publish({
      configured: Boolean(config),
      byLogin: indexLive(cached.streams),
      count: cached.streams.length,
      refreshedAt: cached.refreshedAt,
      stale: !isLiveFresh(cached.refreshedAt, deps.now()),
    });
  }

  /** Une lecture réseau : l'état du cache et la liste elle-même. */
  async function read(config: CloudConfig): Promise<void> {
    publish({ loading: true, error: null });
    const headers = { apikey: config.anonKey, "Content-Type": "application/json" };
    try {
      const [stateResponse, streamsResponse] = await Promise.all([
        deps.request(`${config.url}/rest/v1/live_state?id=eq.true&select=refreshed_at,streams`, {
          method: "GET",
          headers,
        }),
        deps.request(
          `${config.url}/rest/v1/live_streams?select=${STREAM_COLUMNS}&order=viewers.desc&limit=1000`,
          { method: "GET", headers },
        ),
      ]);
      if (!streamsResponse.ok) {
        throw new Error(`lecture du direct refusée (${streamsResponse.status})`);
      }
      const streams = parseLiveStreams(await streamsResponse.json().catch(() => null));
      const refreshedAt = stateResponse.ok
        ? parseLiveRefreshedAt(await stateResponse.json().catch(() => null))
        : null;

      publish({
        byLogin: indexLive(streams),
        count: streams.length,
        refreshedAt,
        stale: !isLiveFresh(refreshedAt, deps.now()),
        loading: false,
        error: null,
      });
      writeLiveCache(deps.storage(), streams, refreshedAt);

      // Le cache serveur n'est pas assez frais : on demande poliment, puis on
      // relit une fois. `askedAt` empêche la boucle si le serveur refuse (il se
      // limite lui-même à une requête Helix toutes les 90 secondes).
      const now = deps.now();
      if (!isLiveFresh(refreshedAt, now, LIVE_REFRESH_MS) && now - askedAt > LIVE_REFRESH_MS) {
        askedAt = now;
        void askServer(config);
        deps.later(() => {
          void refresh({ force: true });
        }, LIVE_SETTLE_MS);
      }
    } catch (error) {
      // Message court, gardé pour les tests et un éventuel diagnostic : l'écran
      // n'affiche rien de plus qu'avant.
      publish({
        loading: false,
        error: error instanceof Error ? error.message : "direct indisponible",
      });
    }
  }

  /** Demande à la fonction serveur d'interroger Twitch. Jamais bloquant. */
  async function askServer(config: CloudConfig): Promise<void> {
    try {
      await deps.request(`${config.url}/functions/v1/refresh-live`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    } catch {
      // Fonction non déployée, quota Twitch atteint, réseau coupé : sans
      // importance. On affichera ce que la table contient déjà.
    }
  }

  async function refresh(options: { force?: boolean } = {}): Promise<void> {
    boot();
    const config = deps.config();
    if (!config) return;
    if (inflight) return inflight;
    if (!options.force && isLiveFresh(state.refreshedAt, deps.now())) return;
    inflight = read(config).finally(() => {
      inflight = null;
    });
    return inflight;
  }

  /**
   * Branche le rafraîchissement tant que l'écran principal est monté : une
   * lecture au démarrage, puis une toutes les trois minutes, et une au retour
   * dans l'app (un direct affiché pendant une pause n'est plus un direct).
   */
  function attach(): () => void {
    boot();
    if (timer !== null) return detach;
    void refresh();
    timer = setInterval(() => {
      void refresh();
    }, LIVE_REFRESH_MS);
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      const onVisible = () => {
        if (!document.hidden) void refresh();
      };
      document.addEventListener("visibilitychange", onVisible);
      stopWatching = () => document.removeEventListener("visibilitychange", onVisible);
    }
    return detach;
  }

  function detach(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    stopWatching?.();
    stopWatching = null;
  }

  return {
    subscribe,
    getSnapshot: snapshot,
    getServerSnapshot: () => EMPTY_LIVE,
    attach,
    detach,
    refresh,
    /** Snapshot frais, sans abonnement (utile hors composant). */
    current: () => {
      boot();
      return state;
    },
  };
}

/** Instance de l'application (aucun effet à l'import : tout est paresseux). */
export const liveStore = createLiveStore({
  config: cloudConfig,
  storage: deviceStorage,
  request: cloudRequest,
  now: () => Date.now(),
  later: (callback, ms) => {
    setTimeout(callback, ms);
  },
});
