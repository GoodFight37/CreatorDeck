import { describe, expect, it, vi } from "vitest";
import { createInitialState, type PlayerState } from "@/lib/game-engine";
import { CloudError, type CloudApi, type CloudSession, type LeaderboardRow, type PushSaveResult, type RemoteSaveRow } from "@/lib/cloud/api";
import { AUTO_PUSH_DEBOUNCE_MS, EMPTY_CLOUD_STATE, createCloudStore } from "@/lib/cloud/cloud-store";
import { gameStore } from "@/lib/game-store";
import type { KeyValueStorage } from "@/lib/save-store";

const T0 = Date.parse("2026-03-01T10:00:00Z");
const CONFIG = { url: "https://projet.supabase.co", anonKey: "anon-key-de-test-suffisamment-longue" };

const SESSION: CloudSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: T0 + 3_600_000,
  userId: "11111111-1111-4111-8111-111111111111",
  email: "joueur@exemple.fr",
};

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function card(id: string, slug: string) {
  return { id, creatorSlug: slug, rarity: "common" as const, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
}

function saveWith(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createInitialState(T0), ...overrides };
}

function remoteRow(state: PlayerState, updatedAt: string, deviceUpdatedAt = state.updatedAt): RemoteSaveRow {
  return {
    state,
    saveVersion: state.version,
    deviceUpdatedAt,
    stateChecksum: "abc",
    updatedAt,
    verified: true,
  };
}

type FakeApi = {
  session: () => CloudSession | null;
  signInAnonymously: ReturnType<typeof vi.fn>;
  profile: ReturnType<typeof vi.fn>;
  updateDisplayName: ReturnType<typeof vi.fn>;
  setShowcase: ReturnType<typeof vi.fn>;
  requestOtp: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  pushSave: ReturnType<typeof vi.fn>;
  pullSave: ReturnType<typeof vi.fn>;
  leaderboard: ReturnType<typeof vi.fn>;
  openPack: ReturnType<typeof vi.fn>;
  packStatus: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
};

function harness(options: {
  configured?: boolean;
  signedIn?: boolean;
  local?: PlayerState;
  remote?: RemoteSaveRow | null;
  push?: PushSaveResult;
} = {}) {
  const local = options.local ?? saveWith({ updatedAt: T0 });
  const state = { current: local };
  const applied: PlayerState[] = [];
  const session = options.signedIn === false ? null : SESSION;

  const api: FakeApi = {
    session: () => session,
    signInAnonymously: vi.fn(async () => ({ ...SESSION, email: null })),
    profile: vi.fn(async () => ({ displayName: "Kaicenat", showcaseSlugs: [] })),
    updateDisplayName: vi.fn(async () => {}),
    setShowcase: vi.fn(async (slugs: string[]) => slugs),
    requestOtp: vi.fn(async () => {}),
    verifyOtp: vi.fn(async () => SESSION),
    signOut: vi.fn(async () => {}),
    pushSave: vi.fn(async () => options.push ?? { status: "pushed" as const, save: remoteRow(local, "2026-03-01T10:05:00Z") }),
    pullSave: vi.fn(async () => options.remote ?? null),
    leaderboard: vi.fn(async () => [
      {
        rank: 1,
        userId: "u1",
        displayName: "Kaicenat",
        uniqueCreators: 900,
        totalCards: 4000,
        legendaryCards: 40,
        level: 50,
        points: 9000,
        showcaseSlugs: [],
      } satisfies LeaderboardRow,
    ]),
    openPack: vi.fn(async () => ({
      packs: 2,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 4,
      cards: [
        { creatorSlug: "kaicenat", rarity: "legendary", variant: "live", rareDrop: false },
        { creatorSlug: "ibai", rarity: "epic", variant: "holo", rareDrop: false },
        { creatorSlug: "ninja", rarity: "rare", variant: "standard", rareDrop: false },
        { creatorSlug: "auronplay", rarity: "uncommon", variant: "standard", rareDrop: false },
        { creatorSlug: "rubius", rarity: "common", variant: "standard", rareDrop: false },
      ],
    })),
    packStatus: vi.fn(async () => ({
      packs: 3,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 3,
      nextPackAt: "2026-03-01T10:30:00Z",
    })),
    ping: vi.fn(async () => ({ host: "projet.supabase.co" })),
  };

  const store = createCloudStore({
    config: () => (options.configured === false ? null : CONFIG),
    storage: memoryStorage,
    api: () => api as unknown as CloudApi,
    readState: () => state.current,
    applyState: (next) => {
      applied.push(next);
      state.current = next;
    },
    now: () => T0 + 60_000,
  });

  return { store, api, applied, state };
}

describe("store cloud", () => {
  it("annonce clairement quand le cloud n'est pas configuré", () => {
    const { store } = harness({ configured: false });
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(true));
    expect(store.getSnapshot().configured).toBe(false);
    expect(store.getSnapshot().message).toMatch(/jouable hors ligne/);
    expect(seen.length).toBeGreaterThan(0);
    // Le snapshot serveur reste stable (pré-rendu statique).
    expect(store.getServerSnapshot()).toBe(EMPTY_CLOUD_STATE);
  });

  it("retrouve la session enregistrée sur l'appareil", () => {
    const { store } = harness();
    store.subscribe(() => {});
    expect(store.getSnapshot()).toMatchObject({
      configured: true,
      email: "joueur@exemple.fr",
      userId: SESSION.userId,
      project: "projet",
    });
  });

  it("envoie un code puis accepte la validation", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await store.requestCode("joueur@exemple.fr");
    expect(api.requestOtp).toHaveBeenCalledWith("joueur@exemple.fr");
    expect(store.getSnapshot().message).toMatch(/Code envoyé/);

    await expect(store.verifyCode("joueur@exemple.fr", "123456")).resolves.toBe(true);
    expect(store.getSnapshot().email).toBe("joueur@exemple.fr");
  });

  it("pousse la partie quand le cloud est vide", async () => {
    const { store, api } = harness({ local: saveWith({ updatedAt: T0 }) });
    store.subscribe(() => {});
    await store.sync("auto");
    expect(api.pushSave).toHaveBeenCalledTimes(1);
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
    expect(store.getSnapshot().decision).toBe("push");
    expect(store.getSnapshot().pending).toBe(false);
  });

  it("ne remplace jamais la partie locale sans confirmation", async () => {
    const remote = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 10 * 60_000 });
    const { store, applied } = harness({ local: saveWith({ updatedAt: T0 }), remote: remoteRow(remote, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("auto");
    expect(store.getSnapshot().decision).toBe("pull");
    expect(store.getSnapshot().message).toMatch(/Charger le cloud/);
    expect(applied).toHaveLength(0);
  });

  it("adopte la partie du cloud quand on le demande explicitement", async () => {
    const remote = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 10 * 60_000 });
    const { store, applied } = harness({ remote: remoteRow(remote, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("pull");
    expect(applied).toHaveLength(1);
    expect(applied[0]?.cards).toHaveLength(1);
    expect(store.getSnapshot().message).toMatch(/Partie chargée/);
  });

  it("refuse une sauvegarde cloud illisible sans toucher à la partie", async () => {
    const { store, applied } = harness({ remote: remoteRow({ pas: "une partie" } as unknown as PlayerState, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("pull");
    expect(applied).toHaveLength(0);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("signale un conflit au lieu d'écraser la partie", async () => {
    const { store, api } = harness({
      push: {
        status: "conflict",
        save: remoteRow(saveWith({ updatedAt: T0 + 120_000 }), "2026-03-01T10:02:00Z"),
      },
    });
    store.subscribe(() => {});
    await store.sync("push");
    expect(api.pushSave).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().pending).toBe(true);
    expect(store.getSnapshot().message).toMatch(/plus récente/);
  });

  it("remonte un refus du serveur en clair", async () => {
    const { store } = harness({ push: { status: "rejected", problems: ["carte sans créateur"] } });
    store.subscribe(() => {});
    await store.sync("push");
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/carte sans créateur/);
  });

  it("applique un envoi automatique après une écriture, avec débounce", async () => {
    vi.useFakeTimers();
    try {
      const { store, api } = harness();
      store.subscribe(() => {});
      const detach = store.attach();
      // Simule une partie jouée : le store reçoit l'écriture.
      const local = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 1000 });
      api.pushSave.mockClear();
      emitPersist(local);
      expect(store.getSnapshot().pending).toBe(true);
      expect(api.pushSave).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(AUTO_PUSH_DEBOUNCE_MS + 10);
      expect(api.pushSave).toHaveBeenCalledTimes(1);
      detach();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ne pousse rien tant que personne n'est connecté", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    store.attach();
    api.pushSave.mockClear();
    await store.sync("push");
    expect(api.pushSave).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
  });

  it("crée un compte invité quand on le demande", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await expect(store.signInAsGuest()).resolves.toBe(true);
    expect(api.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().userId).toBe(SESSION.userId);
    expect(store.getSnapshot().email).toBeNull();
    expect(store.getSnapshot().message).toMatch(/Compte invité créé/);
  });

  it("prévient quand les comptes invités sont désactivés", async () => {
    const { store, api } = harness({ signedIn: false });
    api.signInAnonymously.mockRejectedValueOnce(new CloudError("Comptes invités désactivés.", "anonymous_disabled", 422));
    store.subscribe(() => {});
    await expect(store.signInAsGuest()).resolves.toBe(false);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/invités désactivés/);
  });

  it("charge et change le nom du classement", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await store.loadProfile();
    expect(store.getSnapshot().displayName).toBe("Kaicenat");

    await expect(store.rename("  Mon pseudo  ")).resolves.toBe(true);
    expect(api.updateDisplayName).toHaveBeenCalledWith(SESSION.userId, "Mon pseudo");
    expect(store.getSnapshot().displayName).toBe("Mon pseudo");

    // Trop court : refusé sans appeler le serveur.
    api.updateDisplayName.mockClear();
    await expect(store.rename("a")).resolves.toBe(false);
    expect(api.updateDisplayName).not.toHaveBeenCalled();
  });

  it("charge la vitrine du profil avec le nom", async () => {
    const { store, api } = harness();
    api.profile.mockResolvedValueOnce({ displayName: "Kaicenat", showcaseSlugs: ["KaiCenat", "kaicenat", "ibai"] });
    store.subscribe(() => {});
    await store.loadProfile();
    expect(store.getSnapshot().displayName).toBe("Kaicenat");
    expect(store.getSnapshot().showcase).toEqual(["kaicenat", "ibai"]);
  });

  it("enregistre la vitrine et l'oublie à la déconnexion", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await expect(store.setShowcase(["kaicenat", "IBai"])).resolves.toBe(true);
    expect(api.setShowcase).toHaveBeenCalledWith(["kaicenat", "ibai"]);
    expect(store.getSnapshot().showcase).toEqual(["kaicenat", "ibai"]);
    expect(store.getSnapshot().message).toMatch(/Vitrine mise à jour/);

    await store.signOut();
    expect(store.getSnapshot().showcase).toEqual([]);
  });

  it("refuse une cinquième carte sans appeler le serveur", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await expect(store.setShowcase(["a", "b", "c", "d", "e"])).resolves.toBe(false);
    expect(api.setShowcase).not.toHaveBeenCalled();
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/4 cartes au maximum/);
  });

  it("affiche le refus du serveur quand une carte n'est pas possédée", async () => {
    const { store, api } = harness();
    api.setShowcase.mockRejectedValueOnce(new CloudError("vitrine : carte non possédée (kaicenat)", "P0001", 400));
    store.subscribe(() => {});
    await expect(store.setShowcase(["kaicenat"])).resolves.toBe(false);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/carte non possédée/);
  });

  it("charge le classement", async () => {
    const { store } = harness();
    store.subscribe(() => {});
    await store.loadLeaderboard("total_cards");
    expect(store.getSnapshot().leaderboardMetric).toBe("total_cards");
    expect(store.getSnapshot().leaderboard[0]?.displayName).toBe("Kaicenat");
  });

  it("ouvre un booster côté serveur et pousse immédiatement la partie", async () => {
    const { store, api, applied } = harness({ signedIn: true });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome.status).toBe("drawn");
    if (outcome.status !== "drawn") throw new Error("tirage attendu");
    expect(outcome.cards).toHaveLength(5);
    expect(api.openPack).toHaveBeenCalled();
    // Les cartes et les compteurs du serveur entrent dans la partie locale.
    expect(applied.at(-1)?.cards).toHaveLength(5);
    expect(applied.at(-1)?.packs).toBe(2);
    expect(applied.at(-1)?.openings).toBe(4);
    // Après le tirage, la sauvegarde est poussée immédiatement (pas de debounce).
    expect(api.pushSave).toHaveBeenCalled();
    const snapshot = store.getSnapshot();
    expect(snapshot.message).toContain("5 cartes");
    expect(snapshot.isError).toBe(false);
  });

  it("explique qu'il faut le serveur quand le réseau est coupé (pas de repli local)", async () => {
    const { store, api } = harness({ signedIn: true });
    store.subscribe(() => {});
    api.openPack.mockRejectedValueOnce(
      new CloudError("Réseau injoignable : vérifie ta connexion, ta partie locale est intacte.", "network_error", 0),
    );
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({
      status: "unavailable",
      reason: "offline",
      message: "Connecte-toi pour ouvrir un booster.",
    });
    expect(store.getSnapshot().isError).toBe(true);
    // Rien n'a été poussé : aucun tirage n'a eu lieu.
    expect(api.pushSave).not.toHaveBeenCalled();
  });

  it("réaligne la réserve quand le serveur refuse faute de booster", async () => {
    // Réserve locale désynchronisée (sablier, horloge) : le refus du serveur
    // doit corriger l'affichage tout de suite.
    const { store, api, applied } = harness({ signedIn: true, local: saveWith({ packs: 1 }) });
    store.subscribe(() => {});
    api.openPack.mockRejectedValueOnce(
      new CloudError("Aucun booster disponible pour le moment : rouvre quand le compte à rebours est fini.", "P0001", 400),
    );
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-packs" });
    expect(store.getSnapshot().isError).toBe(true);
    // La réserve est relue (sans rien consommer) pour corriger l'affichage.
    expect(api.packStatus).toHaveBeenCalled();
    expect(applied.at(-1)?.packs).toBe(3);
  });

  it("refuse sans session connectée", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-session" });
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
    expect(api.openPack).not.toHaveBeenCalled();
  });

  it("renvoie une raison dédiée quand le build n'a pas de cloud", async () => {
    const { store, api } = harness({ configured: false, signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "not-configured" });
    expect(api.openPack).not.toHaveBeenCalled();
  });

  it("lit le statut de la réserve et l'adopte dans la partie locale", async () => {
    const { store, api, applied } = harness({
      signedIn: true,
      local: saveWith({ packs: 1, lastPackRegen: T0 - 3_600_000, points: 400 }),
    });
    store.subscribe(() => {});
    const status = await store.packStatus();
    expect(status).not.toBeNull();
    expect(status?.packs).toBe(3);
    expect(status?.nextPackAt).toBe("2026-03-01T10:30:00Z");
    expect(api.packStatus).toHaveBeenCalled();
    // La réserve et l'ancre du serveur remplacent les valeurs locales ;
    // points, XP et collection ne bougent pas.
    expect(applied.at(-1)?.packs).toBe(3);
    expect(applied.at(-1)?.lastPackRegen).toBe(T0);
    expect(applied.at(-1)?.points).toBe(400);
  });

  it("teste la connexion et annonce l'hôte joint", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await expect(store.ping()).resolves.toBe(true);
    expect(api.ping).toHaveBeenCalled();
    const snapshot = store.getSnapshot();
    expect(snapshot.message).toContain("projet.supabase.co");
    expect(snapshot.isError).toBe(false);
  });

  it("dit que le projet est injoignable avec le nom d'hôte", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    api.ping.mockRejectedValueOnce(
      new CloudError(
        "Réseau injoignable : impossible de joindre projet.supabase.co/auth/v1/health. Vérifie ta connexion — ta partie locale est intacte.",
        "network_error",
        0,
      ),
    );
    await expect(store.ping()).resolves.toBe(false);
    expect(store.getSnapshot().message).toContain("projet.supabase.co/auth/v1/health");
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("renvoie null si le statut est indisponible", async () => {
    const { store, api } = harness({ signedIn: true });
    store.subscribe(() => {});
    api.packStatus.mockRejectedValueOnce(new Error("hors ligne"));
    const status = await store.packStatus();
    expect(status).toBeNull();
  });
});

/**
 * Le store s'abonne aux écritures du store de jeu (`onPersist`), qui est un
 * singleton de module. Les tests ne jouent pas une vraie partie : on passe par
 * le même chemin, `gameStore.replaceState`, avec un état factice. Le stockage
 * de l'appareil est absent en environnement Node, l'état reste en mémoire.
 */
function emitPersist(state: PlayerState) {
  gameStore.replaceState(state);
}
