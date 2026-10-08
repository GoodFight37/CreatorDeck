import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_LIVE,
  LIVE_CACHE_KEY,
  LIVE_TTL_MS,
  formatViewers,
  indexLive,
  isLiveFresh,
  liveFor,
  parseLiveRefreshedAt,
  parseLiveStreams,
  readLiveCache,
  viewersLabel,
  writeLiveCache,
  type LiveStream,
} from "@/lib/live";
import { createLiveStore } from "@/lib/live-store";
import type { CloudRequestInit, CloudResponseLike } from "@/lib/cloud/transport";

const T0 = Date.parse("2026-10-06T20:00:00Z");
const CONFIG = { url: "https://projet.supabase.co", anonKey: "anon-key-de-test-suffisamment-longue" };

/** Espace fine insécable, comme `formatViewers`. */
const THIN = "\u202f";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    size: () => data.size,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    login: "kamet0",
    display_name: "Kameto",
    game_name: "Just Chatting",
    title: "Sixième journée",
    viewers: 4120,
    started_at: "2026-10-06T18:12:00Z",
    ...overrides,
  };
}

function response(body: unknown, status = 200): CloudResponseLike {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

/** Transport de test : les URL contiennent « live_state », « live_streams » ou « functions ». */
function transport(pages: {
  state?: unknown;
  streams?: unknown;
  stateStatus?: number;
  streamsStatus?: number;
  onFunctions?: () => void;
}) {
  const calls: string[] = [];
  const request = vi.fn(async (url: string, _init: CloudRequestInit): Promise<CloudResponseLike> => {
    void _init;
    calls.push(url);
    if (url.includes("/functions/v1/")) {
      pages.onFunctions?.();
      return response({ ok: true });
    }
    if (url.includes("live_state")) return response(pages.state ?? [{ refreshed_at: new Date(T0).toISOString(), streams: 1 }], pages.stateStatus ?? 200);
    return response(pages.streams ?? [row()], pages.streamsStatus ?? 200);
  });
  return { request, calls };
}

function store(overrides: Partial<Parameters<typeof createLiveStore>[0]> = {}) {
  const deps = {
    config: () => CONFIG,
    storage: () => null,
    now: () => T0,
    later: (_callback: () => void, _ms: number) => {},
    request: transport({}).request,
    ...overrides,
  };
  return { live: createLiveStore(deps), deps };
}

describe("lecture du direct (table du serveur)", () => {
  it("convertit les lignes PostgREST en diffusions", () => {
    const streams = parseLiveStreams([row(), row({ login: "IBai", viewers: "15000", started_at: "" })]);
    expect(streams).toHaveLength(2);
    expect(streams[0]).toEqual({
      login: "kamet0",
      displayName: "Kameto",
      gameName: "Just Chatting",
      title: "Sixième journée",
      viewers: 4120,
      startedAt: "2026-10-06T18:12:00Z",
    });
    // Le login descend en minuscules (c'est la clé de rapprochement avec le
    // catalogue), le compteur en texte devient un nombre, la date vide devient
    // `null` — jamais la chaîne vide, qui se lit comme une date.
    expect(streams[1].login).toBe("ibai");
    expect(streams[1].viewers).toBe(15000);
    expect(streams[1].startedAt).toBeNull();
  });

  it("ignore ce qui n'est pas exploitable plutôt que de casser l'écran", () => {
    expect(parseLiveStreams(null)).toEqual([]);
    expect(parseLiveStreams({})).toEqual([]);
    expect(parseLiveStreams([null, 12, "kamet0", { login: "  " }, { display_name: "sans login" }])).toEqual([]);
  });

  it("se tait quand la date du cache est illisible", () => {
    expect(parseLiveRefreshedAt([{ refreshed_at: "2026-10-06T20:00:00Z" }])).toBe(T0);
    expect(parseLiveRefreshedAt([])).toBeNull();
    expect(parseLiveRefreshedAt([{ refreshed_at: "hier soir" }])).toBeNull();
    expect(parseLiveRefreshedAt(null)).toBeNull();
  });

  it("indexe par login, sans tenir compte de la casse", () => {
    const index = indexLive(parseLiveStreams([row({ login: "Kamet0" })]));
    expect(index.get("kamet0")?.displayName).toBe("Kameto");
  });

  it("perime le direct au bout de dix minutes", () => {
    expect(isLiveFresh(T0, T0)).toBe(true);
    expect(isLiveFresh(T0, T0 + LIVE_TTL_MS - 1)).toBe(true);
    // La borne elle-même est périmée : à dix minutes pile, on ne dit plus rien.
    expect(isLiveFresh(T0, T0 + LIVE_TTL_MS)).toBe(false);
    expect(isLiveFresh(null, T0)).toBe(false);
    // Une date dans le futur (horloge de l'appareil en retard) ne rend pas la
    // donnée fraîche : c'est une incohérence, pas une preuve.
    expect(isLiveFresh(T0 + 60_000, T0)).toBe(false);
  });

  it("n'annonce un créateur en direct que si la donnée est fraîche", () => {
    const streams = parseLiveStreams([row()]);
    const snapshot = {
      ...EMPTY_LIVE,
      byLogin: indexLive(streams),
      count: 1,
      refreshedAt: T0,
      stale: false,
    };
    expect(liveFor(snapshot, "kamet0", T0)?.viewers).toBe(4120);
    expect(liveFor(snapshot, "KAMET0", T0)?.viewers).toBe(4120);
    expect(liveFor(snapshot, "ibai", T0)).toBeNull();
    expect(liveFor(snapshot, undefined, T0)).toBeNull();
    // Même diffusion, mais vue une heure plus tard : plus rien.
    expect(liveFor(snapshot, "kamet0", T0 + 3_600_000)).toBeNull();
    expect(liveFor({ ...snapshot, stale: true }, "kamet0", T0)).toBeNull();
  });

  it("écrit des compteurs lisibles à la française", () => {
    expect(formatViewers(0)).toBe("0");
    expect(formatViewers(999)).toBe("999");
    expect(formatViewers(4120)).toBe(`4${THIN}120`);
    expect(formatViewers(1234567)).toBe(`1${THIN}234${THIN}567`);
    expect(viewersLabel(1)).toBe("1 spectateur");
    expect(viewersLabel(4120)).toBe(`4${THIN}120 spectateurs`);
    expect(viewersLabel(0)).toBe("En direct");
  });

  it("range le cache local et le relit tel quel", () => {
    const storage = memoryStorage();
    writeLiveCache(storage, parseLiveStreams([row()]), T0);
    const cached = readLiveCache(storage);
    expect(cached?.refreshedAt).toBe(T0);
    expect(cached?.streams[0].login).toBe("kamet0");
    // Un cache écrit par une version antérieure (ou abîmé) ne fait pas planter
    // la lecture : il est simplement ignoré.
    storage.setItem(LIVE_CACHE_KEY, "{ ce n'est pas du JSON");
    expect(readLiveCache(storage)).toBeNull();
    storage.setItem(LIVE_CACHE_KEY, JSON.stringify({ streams: "n'importe quoi" }));
    expect(readLiveCache(storage)?.streams).toEqual([]);
    expect(readLiveCache(null)).toBeNull();
  });
});

describe("store du direct", () => {
  it("ne fait rien quand le cloud n'est pas configuré", async () => {
    const { request } = transport({});
    const { live } = store({ config: () => null, request });
    await live.refresh();
    expect(request).not.toHaveBeenCalled();
    expect(live.getSnapshot()).toEqual(EMPTY_LIVE);
    expect(live.getSnapshot().configured).toBe(false);
  });

  it("affiche le cache local avant même de parler au réseau", () => {
    const storage = memoryStorage();
    writeLiveCache(storage, parseLiveStreams([row()]), T0);
    const { live } = store({ storage: () => storage });
    const snapshot = live.current();
    expect(snapshot.count).toBe(1);
    expect(snapshot.byLogin.get("kamet0")?.viewers).toBe(4120);
    expect(snapshot.refreshedAt).toBe(T0);
    expect(snapshot.stale).toBe(false);
    expect(snapshot.loading).toBe(false);
  });

  it("lit la table et met le cache local à jour", async () => {
    const storage = memoryStorage();
    const { request, calls } = transport({ state: [{ refreshed_at: new Date(T0).toISOString(), streams: 2 }] });
    const { live } = store({ storage: () => storage, request });
    await live.refresh();
    const snapshot = live.getSnapshot();
    expect(snapshot.count).toBe(1);
    expect(snapshot.refreshedAt).toBe(T0);
    expect(snapshot.stale).toBe(false);
    expect(snapshot.error).toBeNull();
    expect(calls.some((url) => url.includes("live_streams"))).toBe(true);
    expect(readLiveCache(storage)?.streams[0].login).toBe("kamet0");
  });

  it("ne redemande rien tant que la donnée est fraîche", async () => {
    const { request } = transport({});
    const { live } = store({ request });
    await live.refresh();
    const after = request.mock.calls.length;
    await live.refresh();
    expect(request.mock.calls.length).toBe(after);
  });

  it("garde la dernière liste connue quand le réseau tombe", async () => {
    const { live } = store({
      request: vi.fn(async (url: string, _init: CloudRequestInit) => {
        void _init;
        if (url.includes("live_state")) return response([{ refreshed_at: new Date(T0).toISOString() }]);
        throw new Error("Réseau injoignable");
      }),
    });
    await live.refresh();
    const snapshot = live.getSnapshot();
    expect(snapshot.loading).toBe(false);
    expect(snapshot.error).toContain("Réseau injoignable");
    expect(snapshot.count).toBe(0);
  });

  it("prévient l'auteur d'une réponse refusée (table absente)", async () => {
    const { live } = store({ request: transport({ streamsStatus: 404 }).request });
    await live.refresh();
    expect(live.getSnapshot().error).toContain("404");
    expect(live.getSnapshot().count).toBe(0);
  });

  it("demande un rafraîchissement au serveur quand le cache est vieux", async () => {
    const onFunctions = vi.fn();
    const old = T0 - 30 * 60 * 1000;
    const { request, calls } = transport({
      state: [{ refreshed_at: new Date(old).toISOString(), streams: 1 }],
      onFunctions,
    });
    const { live } = store({ request });
    await live.refresh();
    expect(onFunctions).toHaveBeenCalledTimes(1);
    expect(calls.some((url) => url.includes("/functions/v1/refresh-live"))).toBe(true);
    // Le POST part avec la clé publique : la fonction se limite elle-même à une
    // requête Twitch toutes les 90 secondes, elle n'a pas besoin d'un jeton.
    const call = request.mock.calls.find(([url]) => url.includes("/functions/v1/"));
    expect(call?.[1]?.method).toBe("POST");
    expect(call?.[1]?.headers.apikey).toBe(CONFIG.anonKey);
    // Donnée vieille → rien n'est annoncé, même si la table répond.
    expect(live.getSnapshot().stale).toBe(true);
  });

  it("ne harcèle pas la fonction serveur (une demande par cycle)", async () => {
    const onFunctions = vi.fn();
    const old = T0 - 30 * 60 * 1000;
    const { request } = transport({
      state: [{ refreshed_at: new Date(old).toISOString(), streams: 1 }],
      onFunctions,
    });
    const { live } = store({ request });
    await live.refresh();
    await live.refresh({ force: true });
    await live.refresh({ force: true });
    expect(onFunctions).toHaveBeenCalledTimes(1);
  });

  it("relit une fois après avoir demandé le rafraîchissement", async () => {
    let publish = T0 - 30 * 60 * 1000;
    const scheduled: (() => void)[] = [];
    const { live } = store({
      later: (callback) => void scheduled.push(callback),
      request: vi.fn(async (url: string, _init: CloudRequestInit) => {
        void _init;
        if (url.includes("/functions/v1/")) {
          // La fonction serveur a publié de nouvelles données.
          publish = T0;
          return response({ ok: true });
        }
        if (url.includes("live_state")) return response([{ refreshed_at: new Date(publish).toISOString() }]);
        return response([row()]);
      }),
    });
    await live.refresh();
    expect(live.getSnapshot().stale).toBe(true);
    // Le rappel différé (six secondes plus tard) relit la table.
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    // La relecture enchaîne deux requêtes puis un `.finally` : on laisse filer
    // une vraie boucle d'événements plutôt que de compter les microtâches.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(live.getSnapshot().stale).toBe(false);
    expect(live.getSnapshot().count).toBe(1);
  });

  it("prévient ses abonnés à chaque publication", async () => {
    const { live } = store({});
    const listener = vi.fn();
    const unsubscribe = live.subscribe(listener);
    await live.refresh();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    const before = listener.mock.calls.length;
    await live.refresh({ force: true });
    expect(listener.mock.calls.length).toBe(before);
  });
});
