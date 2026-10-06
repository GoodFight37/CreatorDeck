import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_SESSION_KEY, CloudApi, CloudError } from "@/lib/cloud/api";
import type { CloudFetch } from "@/lib/cloud/transport";
import type { KeyValueStorage } from "@/lib/save-store";

const CONFIG = { url: "https://projet.supabase.co", anonKey: "anon-key-de-test-suffisamment-longue" };

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

type Call = { url: string; init: RequestInit | undefined };

function fakeFetch(
  handler: (url: string, init: RequestInit | undefined, index: number) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>,
) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const target = String(url);
    const result = await handler(target, init as unknown as RequestInit, calls.length);
    calls.push({ url: target, init: init as unknown as RequestInit });
    const status = result.status ?? 200;
    const text = result.body === undefined ? "" : JSON.stringify(result.body);
    return new Response(text, { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as CloudFetch;
  return { impl, calls };
}

const SESSION_BODY = {
  access_token: "access-1",
  refresh_token: "refresh-1",
  expires_in: 3600,
  user: { id: "11111111-1111-4111-8111-111111111111", email: "joueur@exemple.fr" },
};

function client(handler: Parameters<typeof fakeFetch>[0], storage = memoryStorage()) {
  const { impl, calls } = fakeFetch(handler);
  return { api: new CloudApi(CONFIG, storage, impl), calls, storage };
}

describe("authentification par code", () => {
  it("demande un code sans créer de session", async () => {
    const { api, calls, storage } = client(() => ({ body: {} }));
    await api.requestOtp("joueur@exemple.fr");
    expect(calls[0]?.url).toBe("https://projet.supabase.co/auth/v1/otp");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ email: "joueur@exemple.fr", create_user: true });
    expect((calls[0]?.init?.headers as Record<string, string>).apikey).toBe(CONFIG.anonKey);
    expect(storage.data.has(CLOUD_SESSION_KEY)).toBe(false);
  });

  it("valide le code et mémorise la session", async () => {
    const { api, calls, storage } = client(() => ({ body: SESSION_BODY }));
    const session = await api.verifyOtp("joueur@exemple.fr", " 123456 ");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      email: "joueur@exemple.fr",
      token: "123456",
      type: "email",
    });
    expect(session.email).toBe("joueur@exemple.fr");
    expect(session.userId).toBe(SESSION_BODY.user.id);
    expect(api.session()?.accessToken).toBe("access-1");
    expect(storage.data.has(CLOUD_SESSION_KEY)).toBe(true);
  });

  it("explique un code refusé sans jargon", async () => {
    const { api } = client(() => ({ status: 401, body: { error_code: "otp_expired", msg: "Token has expired" } }));
    await expect(api.verifyOtp("joueur@exemple.fr", "000000")).rejects.toThrowError(/Code incorrect ou expiré/);
    await expect(api.verifyOtp("joueur@exemple.fr", "000000")).rejects.toBeInstanceOf(CloudError);
  });

  it("signale les tentatives trop nombreuses", async () => {
    const { api } = client(() => ({ status: 429, body: { msg: "Too many requests" } }));
    await expect(api.requestOtp("joueur@exemple.fr")).rejects.toThrowError(/Trop de tentatives/);
  });

  it("oublie une session illisible", () => {
    const storage = memoryStorage();
    storage.setItem(CLOUD_SESSION_KEY, "{pas du json");
    const { api } = client(() => ({ body: {} }), storage);
    expect(api.session()).toBeNull();
  });

  it("efface la session à la déconnexion, même si le réseau tombe", async () => {
    const storage = memoryStorage();
    storage.setItem(CLOUD_SESSION_KEY, JSON.stringify({ ...SESSION_BODY, expiresAt: Date.now() + 3600_000 }));
    const { api } = client(() => {
      throw new Error("réseau coupé");
    }, storage);
    await api.signOut();
    expect(storage.data.has(CLOUD_SESSION_KEY)).toBe(false);
  });
});

describe("compte invité et profil", () => {
  it("crée un compte sans e-mail et mémorise la session", async () => {
    const { api, calls, storage } = client(() => ({
      body: { ...SESSION_BODY, user: { id: SESSION_BODY.user.id } },
    }));
    const session = await api.signInAnonymously();
    expect(calls[0]?.url).toBe("https://projet.supabase.co/auth/v1/signup");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ data: {}, gotrue_meta_security: {} });
    expect(session.userId).toBe(SESSION_BODY.user.id);
    expect(session.email).toBeNull();
    expect(storage.data.has(CLOUD_SESSION_KEY)).toBe(true);
  });

  it("explique comment activer les comptes invités", async () => {
    const { api } = client(() => ({ status: 422, body: { error_code: "anonymous_provider_disabled" } }));
    await expect(api.signInAnonymously()).rejects.toThrowError(/Authentication → Sign In \/ Providers → Anonymous/);
  });

  it("lit et modifie le nom affiché", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const { api, calls } = client((url) =>
      url.startsWith("https://projet.supabase.co/rest/v1/profiles?user_id=eq.")
        ? { body: [{ display_name: "Kaicenat", showcase_slugs: ["kaicenat"] }] }
        : { body: null },
      storage,
    );
    const profile = await api.profile(SESSION_BODY.user.id);
    expect(profile).toEqual({ displayName: "Kaicenat", showcaseSlugs: ["kaicenat"] });

    const { api: patching, calls: patchCalls } = client(() => ({ body: null }), storage);
    await patching.updateDisplayName(SESSION_BODY.user.id, "  Mon pseudo  ");
    expect(patchCalls[0]?.init?.method).toBe("PATCH");
    expect(patchCalls[0]?.url).toContain("profiles?user_id=eq.");
    expect(JSON.parse(String(patchCalls[0]?.init?.body))).toMatchObject({ display_name: "Mon pseudo" });
  });
});

describe("jetons", () => {
  it("rafraîchit un jeton expiré avant d'appeler le serveur", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({
        accessToken: "vieux",
        refreshToken: "refresh-1",
        expiresAt: Date.now() - 1000,
        userId: SESSION_BODY.user.id,
        email: "joueur@exemple.fr",
      }),
    );
    const { api, calls } = client((url) =>
      url.includes("grant_type=refresh_token")
        ? { body: { ...SESSION_BODY, access_token: "neuf" } }
        : { body: { status: "pushed", save: { state: {}, save_version: 5, device_updated_at: 7, state_checksum: "x", updated_at: "2026-03-01T10:00:00Z" } } },
      storage,
    );
    const result = await api.pushSave({ cards: [] }, 7, 5);
    expect(result.status).toBe("pushed");
    expect(calls[0]?.url).toContain("grant_type=refresh_token");
    expect((calls[1]?.init?.headers as Record<string, string>).Authorization).toBe("Bearer neuf");
  });

  it("retente une fois après un 401 puis abandonne proprement", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({
        accessToken: "jeton",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 3600_000,
        userId: SESSION_BODY.user.id,
        email: null,
      }),
    );
    let rpcCalls = 0;
    const { api } = client((url) => {
      if (url.includes("grant_type=refresh_token")) return { body: { ...SESSION_BODY, access_token: "encore-neuf" } };
      rpcCalls += 1;
      return rpcCalls === 1 ? { status: 401, body: { message: "JWT expired" } } : { body: { status: "unchanged", save: { state: {}, save_version: 5, device_updated_at: 7, state_checksum: "x", updated_at: "2026-03-01T10:00:00Z" } } };
    }, storage);
    await expect(api.pushSave({}, 7, 5)).resolves.toMatchObject({ status: "unchanged" });
    expect(rpcCalls).toBe(2);
  });
});

describe("sauvegardes", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("envoie la partie et transmet les bons paramètres", async () => {
    const { api, calls, storage } = client(() => ({
      body: { status: "pushed", save: { state: {}, save_version: 5, device_updated_at: 42, state_checksum: "abc", updated_at: "2026-03-01T10:00:00Z", verified: true } },
    }));
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const result = await api.pushSave({ cards: [] }, 42, 5, true);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      p_state: { cards: [] },
      p_save_version: 5,
      p_device_updated_at: 42,
      p_force: true,
    });
    expect(result).toMatchObject({ status: "pushed" });
    if (result.status === "pushed") expect(result.save.deviceUpdatedAt).toBe(42);
  });

  it("remonte un refus du serveur tel quel", async () => {
    const { api, storage } = client(() => ({
      body: { status: "rejected", problems: ["carte sans créateur"] },
    }));
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    await expect(api.pushSave({}, 1, 5)).resolves.toEqual({ status: "rejected", problems: ["carte sans créateur"] });
  });

  it("distingue un conflit d'un succès", async () => {
    const { api, storage } = client(() => ({
      body: { status: "conflict", save: { state: {}, save_version: 5, device_updated_at: 99, state_checksum: "z", updated_at: "2026-03-01T11:00:00Z" } },
    }));
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const result = await api.pushSave({}, 1, 5);
    expect(result.status).toBe("conflict");
  });

  it("renvoie null quand le compte n'a rien dans le cloud", async () => {
    const { api, storage } = client(() => ({ body: null }));
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    expect(await api.pullSave()).toBeNull();
  });

  it("refuse d'écrire sans session", async () => {
    const { api } = client(() => ({ body: {} }));
    await expect(api.pushSave({}, 1, 5)).rejects.toThrowError(/Connecte-toi/);
  });

  it("ne plante pas sans réseau et le dit en français", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const { api } = client(() => {
      throw new TypeError("fetch failed");
    }, storage);
    await expect(api.pullSave()).rejects.toThrowError(/Réseau injoignable/);
  });
});

describe("classement", () => {
  /** Session en mémoire, comme le ferait un joueur connecté. */
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  it("lit les lignes renvoyées par le serveur", async () => {
    const storage = signedIn();
    const { api, calls } = client(() => ({
      body: [
        {
          rank: 1,
          user_id: "u1",
          display_name: "Kaicenat",
          unique_creators: 940,
          total_cards: 5100,
          legendary_cards: 48,
          level: 62,
          points: 12_000,
          showcase_slugs: ["kaicenat"],
        },
      ],
    }), storage);
    const rows = await api.leaderboard(20, "legendary_cards");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_limit: 20, p_metric: "legendary_cards", p_region: null });
    expect(rows[0]).toMatchObject({
      rank: 1,
      displayName: "Kaicenat",
      legendaryCards: 48,
      showcaseSlugs: ["kaicenat"],
      // Champs ajoutés par `0006_profil_public.sql` : une réponse d'une version
      // antérieure du serveur ne doit pas casser l'écran (zéro par défaut).
      epicCards: 0,
      goldCards: 0,
      holoCards: 0,
      completion: 0,
    });
  });

  it("transmet la famille demandée et lit son compteur", async () => {
    const { api, calls } = client(
      () => ({
        body: [
          {
            rank: 1,
            user_id: "u2",
            display_name: "Diane",
            unique_creators: 137,
            total_cards: 402,
            legendary_cards: 9,
            epic_cards: 31,
            gold_cards: 3,
            holo_cards: 12,
            level: 12,
            points: 640,
            completion: 0.137,
            showcase_slugs: [],
            family_owned: 97,
            family_total: 402,
          },
        ],
      }),
      signedIn(),
    );
    const rows = await api.leaderboard(20, "family", "S04");

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      p_limit: 20,
      p_metric: "family",
      p_region: "S04",
    });
    expect(rows[0]?.familyOwned).toBe(97);
    expect(rows[0]?.familyTotal).toBe(402);
  });

  it("transmet le tri Gold et lit la complétion", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const { api, calls } = client(() => ({
      body: [
        {
          rank: 1,
          user_id: "u2",
          display_name: "Diane",
          unique_creators: 137,
          total_cards: 402,
          legendary_cards: 9,
          epic_cards: 31,
          gold_cards: 3,
          holo_cards: 12,
          level: 12,
          points: 640,
          // PostgREST renvoie `numeric` en nombre, le pilote local en chaîne :
          // les deux formes doivent être lues.
          completion: "0.1370",
          showcase_slugs: [],
        },
      ],
    }), storage);
    const rows = await api.leaderboard(20, "gold_cards");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_limit: 20, p_metric: "gold_cards", p_region: null });
    expect(rows[0]).toMatchObject({ goldCards: 3, holoCards: 12, epicCards: 31, completion: 0.137 });
  });

  it("tolère une réponse vide ou inattendue", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    const { api } = client(() => ({ body: { pas: "un tableau" } }), storage);
    expect(await api.leaderboard()).toEqual([]);
  });
});

describe("profil public", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  const PROFILE = {
    user_id: "u2",
    display_name: "Diane",
    level: 12,
    points: 640,
    verified: true,
    unique_creators: 137,
    total_cards: 402,
    legendary_cards: 9,
    epic_cards: 31,
    gold_cards: 3,
    holo_cards: 12,
    catalog_size: 1000,
    completion: 0.137,
    rank_completion: 42,
    rank_cards: 118,
    showcase_slugs: ["kaicenat", "ibai"],
    by_rarity: {
      common: { owned: 60, total: 300 },
      legendary: { owned: 4, total: 50 },
      rare: { owned: 40, total: 230 },
    },
    by_region: {
      S01: { owned: 10, total: 155 },
      S04: { owned: 100, total: 402 },
      S02: { owned: 0, total: 62 },
    },
  };

  it("lit un profil complet, du plus rare au plus commun", async () => {
    const { api, calls } = client(() => ({ body: PROFILE }), signedIn());
    const profile = await api.playerProfile("u2");

    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/player_profile");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_user_id: "u2" });
    expect(profile).toMatchObject({
      userId: "u2",
      displayName: "Diane",
      completion: 0.137,
      rankCompletion: 42,
      goldCards: 3,
      catalogSize: 1000,
      showcaseSlugs: ["kaicenat", "ibai"],
    });
    // Les raretés absentes de la réponse ne sont pas inventées, et l'ordre est
    // celui de l'affichage (legendary → common), pas celui du hasard de JSON.
    expect(profile?.byRarity.map((row) => row.rarity)).toEqual(["legendary", "rare", "common"]);
  });

  it("lit la complétion par famille, la plus avancée d'abord", async () => {
    const { api } = client(() => ({ body: PROFILE }), signedIn());
    const profile = await api.playerProfile("u2");

    // L'ordre suit la progression, pas l'ordre des clés JSON ; une famille à
    // zéro est gardée (c'est justement ce qui reste à collectionner).
    expect(profile?.byRegion.map((family) => family.regionId)).toEqual(["S04", "S01", "S02"]);
    expect(profile?.byRegion[0]).toEqual({ regionId: "S04", owned: 100, total: 402 });
  });

  it("se passe d'un serveur qui ne calcule pas encore les familles", async () => {
    // Une migration pas encore recollée : le champ manque, la fiche s'affiche
    // sans la section — elle ne casse pas.
    const { api } = client(() => ({ body: { ...PROFILE, by_region: undefined } }), signedIn());
    expect((await api.playerProfile("u2"))?.byRegion).toEqual([]);
  });

  it("ne demande aucun identifiant pour son propre profil", async () => {
    const { api, calls } = client(() => ({ body: PROFILE }), signedIn());
    await api.playerProfile();
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_user_id: null });
  });

  it("renvoie null quand le joueur n'a jamais envoyé sa partie", async () => {
    const { api } = client(() => ({ body: null }), signedIn());
    expect(await api.playerProfile("u3")).toBeNull();
  });

  it("ne montre aucun rang à un joueur non vérifié", async () => {
    const { api } = client(() => ({ body: { ...PROFILE, verified: false, rank_completion: null, rank_cards: null } }), signedIn());
    const profile = await api.playerProfile("u2");
    expect(profile?.verified).toBe(false);
    expect(profile?.rankCompletion).toBeNull();
  });
});

describe("vitrine", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  it("épingle les cartes par la fonction dédiée", async () => {
    const { api, calls } = client(() => ({ body: ["kaicenat", "ibai"] }), signedIn());
    const saved = await api.setShowcase(["kaicenat", "ibai"]);
    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/set_showcase");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_slugs: ["kaicenat", "ibai"] });
    expect(saved).toEqual(["kaicenat", "ibai"]);
  });

  it("remonte le refus du serveur en clair", async () => {
    const { api } = client(
      () => ({ status: 400, body: { code: "P0001", message: "vitrine : carte non possédée (kaicenat)" } }),
      signedIn(),
    );
    await expect(api.setShowcase(["kaicenat"])).rejects.toThrowError(/carte non possédée/);
  });

  it("tolère une réponse inattendue sans casser la vitrine", async () => {
    const { api } = client(() => ({ body: null }), signedIn());
    expect(await api.setShowcase(["kaicenat"])).toEqual([]);
  });
});

describe("tirage serveur", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  it("ouvre un booster et renvoie les cartes + compteurs", async () => {
    const { api, calls } = client(
      () => ({
        body: {
          packs: 2,
          last_regen_at: "2026-01-01T12:30:00Z",
          openings: 7,
          cards: [
            { creatorSlug: "kaicenat", rarity: "legendary", variant: "live", rareDrop: false },
            { creatorSlug: "ibai", rarity: "epic", variant: "holo", rareDrop: false },
            { creatorSlug: "ninja", rarity: "rare", variant: "standard", rareDrop: false },
            { creatorSlug: "auronplay", rarity: "uncommon", variant: "standard", rareDrop: false },
            { creatorSlug: "rubius", rarity: "common", variant: "standard", rareDrop: false },
          ],
        },
      }),
      signedIn(),
    );
    const result = await api.openPack();
    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/open_pack");
    expect(result.packs).toBe(2);
    expect(result.openings).toBe(7);
    expect(result.cards).toHaveLength(5);
    expect(result.cards[0]).toMatchObject({ creatorSlug: "kaicenat", rarity: "legendary", variant: "live" });
  });

  it("refuse sans session", async () => {
    const { api } = client(() => ({ body: {} }));
    await expect(api.openPack()).rejects.toThrowError(/Connecte-toi/);
  });

  it("renvoie une erreur lisible si le serveur refuse le tirage", async () => {
    const { api } = client(
      () => ({ status: 400, body: { code: "P0001", message: "tirage : aucun booster disponible pour le moment" } }),
      signedIn(),
    );
    await expect(api.openPack()).rejects.toThrowError(/Aucun booster/);
  });

  it("lit le statut de la réserve sans rien consommer", async () => {
    const { api, calls } = client(
      () => ({
        body: {
          packs: 3,
          last_regen_at: "2026-01-01T12:00:00Z",
          openings: 5,
          next_pack_at: "2026-01-01T12:30:00Z",
        },
      }),
      signedIn(),
    );
    const status = await api.packStatus();
    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/pack_status");
    expect(status.packs).toBe(3);
    expect(status.nextPackAt).toBe("2026-01-01T12:30:00Z");
  });

  it("teste la joignabilité du projet en lecture seule", async () => {
    const { api, calls } = client(() => ({ body: { version: "1.0" } }));
    const result = await api.ping();
    expect(calls[0]?.url).toBe("https://projet.supabase.co/auth/v1/health");
    expect((calls[0]?.init?.headers as Record<string, string>).apikey).toBe(CONFIG.anonKey);
    expect(result.host).toBe("projet.supabase.co");
  });

  it("nomme l'hôte injoignable plutôt que d'accuser le réseau à tort", async () => {
    const { api } = client(() => {
      throw new TypeError("fetch failed");
    });
    await expect(api.ping()).rejects.toThrowError(/projet\.supabase\.co\/auth\/v1\/health/);
  });

  it("explique quoi coller dans Supabase quand les migrations manquent", async () => {
    const { api } = client(
      () => ({
        status: 404,
        body: {
          code: "PGRST202",
          message: "Could not find the function public.open_pack(p_user_id) in the schema cache",
        },
      }),
      signedIn(),
    );
    await expect(api.openPack()).rejects.toThrowError(/0003_catalogue\.sql puis 0004_tirage\.sql/);
    await expect(api.packStatus()).rejects.toThrowError(/SQL Editor/);
  });

  it("explique quoi faire quand une table manque", async () => {
    const { api } = client(
      () => ({ status: 404, body: { code: "42P01", message: 'relation "public.pack_state" does not exist' } }),
      signedIn(),
    );
    await expect(api.openPack()).rejects.toThrowError(/Table manquante/);
  });

  it("traduit une coupure réseau en phrase française, avec le nom d'hôte", async () => {
    const { api } = client(() => {
      throw new TypeError("fetch failed");
    }, signedIn());
    await expect(api.openPack()).rejects.toThrowError(/Réseau injoignable/);
    // L'hôte et le chemin sont nommés : un échec réseau se distingue d'une
    // adresse erronée, et on sait quel appel a échoué.
    await expect(api.openPack()).rejects.toThrowError(/projet\.supabase\.co\/rest\/v1\/rpc\/open_pack/);
    await expect(api.packStatus()).rejects.toThrowError(/Réseau injoignable/);
  });

  it("refuse un serveur qui répond autre chose que le tirage attendu", async () => {
    const { api } = client(() => ({ body: { packs: 2, cards: "pas un tableau" } }), signedIn());
    const result = await api.openPack();
    // Un `cards` illisible ne fabrique pas de cartes : liste vide, compteurs lus.
    expect(result.cards).toEqual([]);
    expect(result.packs).toBe(2);
  });

  it("renvoie next_pack_at=null quand la réserve est pleine", async () => {
    const { api } = client(
      () => ({
        body: {
          packs: 4,
          last_regen_at: "2026-01-01T12:00:00Z",
          openings: 10,
          next_pack_at: null,
        },
      }),
      signedIn(),
    );
    const status = await api.packStatus();
    expect(status.packs).toBe(4);
    expect(status.nextPackAt).toBeNull();
  });
});

describe("échanges", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  const TRADE = {
    id: 7,
    status: "open",
    proposerId: SESSION_BODY.user.id,
    recipientId: "22222222-2222-4222-8222-222222222222",
    proposerCards: [{ creatorSlug: "ibai", rarity: "legendary", variant: "holo" }],
    recipientCards: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }],
    createdAt: "2026-03-01T10:00:00Z",
    resolvedAt: null,
  };

  it("propose un échange en envoyant les cartes sans rareté inventée", async () => {
    const { api, calls } = client(
      () => ({ body: { trade: TRADE, recipientMissing: null } }),
      signedIn(),
    );
    const result = await api.createTrade(
      TRADE.recipientId,
      [{ creatorSlug: "ibai", variant: "holo" }],
      [{ creatorSlug: "kaicenat", variant: "gold" }],
    );

    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/create_trade");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      p_recipient: TRADE.recipientId,
      p_given: [{ creatorSlug: "ibai", variant: "holo" }],
      p_wanted: [{ creatorSlug: "kaicenat", variant: "gold" }],
    });
    expect(result.trade.proposerCards[0]).toEqual({ creatorSlug: "ibai", rarity: "legendary", variant: "holo" });
    expect(result.trade.status).toBe("open");
    expect(result.recipientMissing).toBeNull();
  });

  it("signale la carte que le destinataire ne possède pas", async () => {
    const { api } = client(
      () => ({ body: { trade: TRADE, recipientMissing: { creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" } } }),
      signedIn(),
    );
    const result = await api.createTrade(TRADE.recipientId, [{ creatorSlug: "ibai", variant: "holo" }], [{ creatorSlug: "kaicenat", variant: "gold" }]);
    expect(result.recipientMissing?.creatorSlug).toBe("kaicenat");
  });

  it("accepte un échange et lit ce qui est donné et reçu", async () => {
    const { api, calls } = client(
      () => ({
        body: {
          status: "accepted",
          trade: { ...TRADE, status: "accepted", resolvedAt: "2026-03-01T10:06:00Z" },
          given: TRADE.recipientCards,
          received: TRADE.proposerCards,
        },
      }),
      signedIn(),
    );
    const result = await api.respondTrade(7, true);

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_trade: 7, p_accept: true });
    expect(result.status).toBe("accepted");
    expect(result.given[0]?.creatorSlug).toBe("kaicenat");
    expect(result.received[0]?.creatorSlug).toBe("ibai");
  });

  it("refuse une offre sans toucher aux cartes", async () => {
    const { api, calls } = client(
      () => ({ body: { status: "declined", trade: { ...TRADE, status: "declined" }, given: [], received: [] } }),
      signedIn(),
    );
    const result = await api.respondTrade(7, false);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_trade: 7, p_accept: false });
    expect(result.status).toBe("declined");
    expect(result.given).toEqual([]);
  });

  it("annule une offre en attente", async () => {
    const { api, calls } = client(
      () => ({ body: { ...TRADE, status: "cancelled", resolvedAt: "2026-03-01T10:07:00Z" } }),
      signedIn(),
    );
    const trade = await api.cancelTrade(7);
    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/cancel_trade");
    expect(trade.status).toBe("cancelled");
  });

  it("lit la liste des offres, sens compris", async () => {
    const { api } = client(
      () => ({
        body: [
          {
            id: 9,
            direction: "in",
            status: "open",
            partnerId: TRADE.recipientId,
            partnerName: "Bruno",
            given: TRADE.recipientCards,
            received: TRADE.proposerCards,
            createdAt: "2026-03-01T10:00:00Z",
            resolvedAt: null,
          },
          { id: "bizarre" },
        ],
      }),
      signedIn(),
    );
    const list = await api.listTrades();
    expect(list).toHaveLength(1);
    expect(list[0]?.direction).toBe("in");
    expect(list[0]?.partnerName).toBe("Bruno");
    expect(list[0]?.given[0]?.variant).toBe("gold");
  });

  it("cherche un partenaire et lit les variantes qu'il possède", async () => {
    const search = client(
      () => ({ body: [{ userId: TRADE.recipientId, displayName: "Bruno", level: 4, uniqueCreators: 120 }] }),
      signedIn(),
    );
    const players = await search.api.searchPlayers("Brun");
    expect(search.calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/search_players");
    expect(JSON.parse(String(search.calls[0]?.init?.body))).toEqual({ p_query: "Brun" });
    expect(players[0]).toEqual({ userId: TRADE.recipientId, displayName: "Bruno", level: 4, uniqueCreators: 120 });

    const variants = client(() => ({ body: ["standard", "holo"] }), signedIn());
    expect(await variants.api.playerVariants(TRADE.recipientId, "ibai")).toEqual(["standard", "holo"]);
    expect(JSON.parse(String(variants.calls[0]?.init?.body))).toEqual({
      p_user: TRADE.recipientId,
      p_slug: "ibai",
    });
  });

  it("explique quoi coller quand la migration des échanges manque", async () => {
    const { api } = client(
      () => ({
        status: 404,
        body: { code: "PGRST202", message: "Could not find the function public.create_trade" },
      }),
      signedIn(),
    );
    await expect(api.createTrade(TRADE.recipientId, [], [])).rejects.toThrow(/0005_echanges\.sql/);
  });

  it("garde le message du serveur quand il dit déjà quoi faire", async () => {
    const { api } = client(
      () => ({ status: 400, body: { code: "P0001", message: "echange : connecte-toi pour proposer un échange" } }),
      signedIn(),
    );
    await expect(api.createTrade(TRADE.recipientId, [], [])).rejects.toThrow(/connecte-toi pour proposer un échange/);
  });

  it("refuse d'échanger sans session", async () => {
    const { api } = client(() => ({ body: {} }));
    await expect(api.listTrades()).rejects.toThrow(/Connecte-toi/);
  });
});

describe("amis", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  const JOUEUR = "22222222-2222-4222-8222-222222222222";

  it("lit la liste d'amis telle que le serveur la renvoie", async () => {
    const { api, calls } = client(
      () => ({
        body: [
          { id: 11, friendId: JOUEUR, friendName: "Kameto", createdAt: "2026-10-01T10:00:00Z" },
          { id: 12, friendId: "33333333-3333-4333-8333-333333333333", friendName: "Ibai", createdAt: "2026-10-02T10:00:00Z" },
        ],
      }),
      signedIn(),
    );
    const friends = await api.listFriends();
    expect(friends).toEqual([
      { id: 11, friendId: JOUEUR, friendName: "Kameto", createdAt: "2026-10-01T10:00:00Z" },
      { id: 12, friendId: "33333333-3333-4333-8333-333333333333", friendName: "Ibai", createdAt: "2026-10-02T10:00:00Z" },
    ]);
    expect(calls[0]?.url).toBe("https://projet.supabase.co/rest/v1/rpc/list_friends");
  });

  it("ignore une ligne illisible au lieu de perdre toute la liste", async () => {
    const { api } = client(
      () => ({ body: [{ id: 11, friendId: JOUEUR, friendName: "Kameto", createdAt: "" }, { id: 12, friendName: "Sans identifiant" }] }),
      signedIn(),
    );
    const friends = await api.listFriends();
    expect(friends.map((friend) => friend.friendName)).toEqual(["Kameto"]);
  });

  it("distingue une demande envoyée d'une demande croisée", async () => {
    const { api } = client(
      () => ({ body: { request: { id: 5, status: "pending" }, alreadyFriends: false, existingRequest: null } }),
      signedIn(),
    );
    expect(await api.sendFriendRequest(JOUEUR)).toEqual({ sent: true, existing: false, alreadyFriends: false });

    const croise = client(
      () => ({ body: { request: null, alreadyFriends: false, existingRequest: { id: 4, senderId: JOUEUR } } }),
      signedIn(),
    );
    expect(await croise.api.sendFriendRequest(JOUEUR)).toEqual({ sent: false, existing: true, alreadyFriends: false });

    const dejaAmis = client(
      () => ({ body: { request: null, alreadyFriends: true, existingRequest: null } }),
      signedIn(),
    );
    expect(await dejaAmis.api.sendFriendRequest(JOUEUR)).toEqual({ sent: false, existing: false, alreadyFriends: true });
  });

  it("accepte une demande sur le statut que le serveur a écrit, pas sur un objet absent", async () => {
    // Le serveur ne renvoie pas toujours la ligne `friends` (insertion sans
    // conflit) : ce qui compte, c'est que la demande soit passée à « accepted ».
    const { api } = client(
      () => ({ body: { request: { id: 5, status: "accepted" }, friendship: null } }),
      signedIn(),
    );
    expect(await api.acceptFriendRequest(5)).toBe(true);

    const rate = client(() => ({ body: { request: null, friendship: null } }), signedIn());
    expect(await rate.api.acceptFriendRequest(5)).toBe(false);
  });

  it("explique quoi coller quand la migration des amis manque", async () => {
    const { api } = client(
      () => ({
        status: 404,
        body: { code: "PGRST202", message: "Could not find the function public.send_friend_request" },
      }),
      signedIn(),
    );
    await expect(api.sendFriendRequest(JOUEUR)).rejects.toThrow(/0008_friends\.sql/);
  });
});

describe("compte : adresse et mot de passe", () => {
  function signedIn(email: string | null = null) {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, email, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  it("attache une adresse et un mot de passe au compte invité", async () => {
    const storage = signedIn(null);
    const { api, calls } = client(() => ({ body: { id: SESSION_BODY.user.id, email: "joueur@exemple.fr" } }), storage);

    const result = await api.updateAccount({ email: " joueur@exemple.fr ", password: "azerty1234" });

    expect(calls[0]?.url).toBe("https://projet.supabase.co/auth/v1/user");
    expect(calls[0]?.init?.method).toBe("PUT");
    // Le mot de passe part avec l'adresse : un seul appel, aucune confirmation.
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ email: "joueur@exemple.fr", password: "azerty1234" });
    expect(result).toEqual({ applied: true, pendingEmail: null, email: "joueur@exemple.fr" });
    // La session enregistrée connaît la nouvelle adresse (l'écran Compte l'affiche).
    expect(api.session()?.email).toBe("joueur@exemple.fr");
  });

  it("comprend qu'une confirmation par e-mail est en attente", async () => {
    const storage = signedIn(null);
    const { api } = client(() => ({ body: { id: SESSION_BODY.user.id, new_email: "joueur@exemple.fr" } }), storage);

    const result = await api.updateAccount({ email: "joueur@exemple.fr", password: "azerty1234" });

    expect(result.applied).toBe(false);
    expect(result.pendingEmail).toBe("joueur@exemple.fr");
    // Rien n'est appliqué : la session reste sans adresse.
    expect(api.session()?.email).toBeNull();
  });

  it("change le mot de passe seul quand l'adresse est déjà là", async () => {
    const { api, calls } = client(() => ({ body: { id: SESSION_BODY.user.id, email: "joueur@exemple.fr" } }), signedIn("joueur@exemple.fr"));
    const result = await api.updateAccount({ password: "azerty1234" });

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ password: "azerty1234" });
    expect(result.applied).toBe(true);
    expect(result.email).toBe("joueur@exemple.fr");
  });

  it("refuse d'écrire sans session et sans rien à changer", async () => {
    const { api } = client(() => ({ body: {} }));
    await expect(api.updateAccount({ password: "azerty1234" })).rejects.toThrow(/Connecte-toi/);

    const idem = client(() => ({ body: {} }), signedIn(null));
    await expect(idem.api.updateAccount({})).rejects.toThrow(/Rien à enregistrer/);
  });

  it("se connecte par adresse et mot de passe", async () => {
    const { api, calls, storage } = client(() => ({ body: SESSION_BODY }));
    const session = await api.signInWithPassword(" joueur@exemple.fr ", "azerty1234");

    expect(calls[0]?.url).toBe("https://projet.supabase.co/auth/v1/token?grant_type=password");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ email: "joueur@exemple.fr", password: "azerty1234" });
    expect(session.userId).toBe(SESSION_BODY.user.id);
    expect(storage.data.has(CLOUD_SESSION_KEY)).toBe(true);
  });

  it("traduit les refus de connexion en français", async () => {
    const wrong = client(() => ({ status: 400, body: { error_code: "invalid_grant", msg: "Invalid login credentials" } }));
    await expect(wrong.api.signInWithPassword("joueur@exemple.fr", "oublie")).rejects.toThrow(
      /E-mail ou mot de passe incorrect/,
    );

    const unconfirmed = client(() => ({ status: 400, body: { error_code: "email_not_confirmed" } }));
    await expect(unconfirmed.api.signInWithPassword("joueur@exemple.fr", "azerty1234")).rejects.toThrow(/Confirm email/);
  });

  it("explique le bug Supabase quand une adresse ne peut pas être attachée à un invité", async () => {
    // GoTrue valide une adresse vide pour un compte anonyme quand « Confirm
    // email » est actif (supabase/auth#2847) : le message doit dire le réglage
    // à changer, pas « Adresse e-mail refusée ».
    const { api } = client(
      () => ({ status: 400, body: { error_code: "email_address_invalid", msg: 'Email address "" is invalid' } }),
      signedIn(null),
    );
    await expect(api.updateAccount({ email: "joueur@exemple.fr", password: "azerty1234" })).rejects.toThrow(
      /Confirm email/,
    );
  });

  it("dit qu'une adresse appartient déjà à un autre compte", async () => {
    const { api } = client(
      () => ({ status: 422, body: { error_code: "email_exists", msg: "A user with this email address has already been registered" } }),
      signedIn(null),
    );
    await expect(api.updateAccount({ email: "pris@exemple.fr", password: "azerty1234" })).rejects.toThrow(/déjà utilisée/);
  });
});

describe("hôtel des ventes", () => {
  function signedIn() {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
    return storage;
  }

  const LISTING = {
    id: 12,
    creatorSlug: "ibai",
    rarity: "legendary",
    variant: "gold",
    price: 3000,
    payout: 2000,
    createdAt: "2026-10-06T18:00:00Z",
    sellerName: "Diane",
  };

  it("lit le comptoir, sans les annonces illisibles", async () => {
    const { api, calls } = client(() => ({ body: [LISTING, { rarity: "rare" }] }), signedIn());
    const shelf = await api.marketShelf(20);
    expect(calls[0]?.url).toContain("/rest/v1/rpc/market_shelf");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_limit: 20 });
    expect(shelf).toHaveLength(1);
    expect(shelf[0]).toMatchObject({
      id: 12,
      creatorSlug: "ibai",
      rarity: "legendary",
      variant: "gold",
      price: 3000,
      payout: 2000,
      sellerName: "Diane",
    });
  });

  it("dépose une carte et lit le payout payé par le serveur", async () => {
    const { api, calls } = client(() => ({ body: { listing: LISTING, payout: 2000, price: 3000, points: 2450 } }), signedIn());
    const result = await api.marketSell("carte-1");
    expect(calls[0]?.url).toContain("/rest/v1/rpc/market_sell");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_card_id: "carte-1" });
    expect(result.payout).toBe(2000);
    expect(result.points).toBe(2450);
    expect(result.listing.id).toBe(12);
  });

  it("refuse une réponse de dépôt sans annonce", async () => {
    const { api } = client(() => ({ body: { payout: 2000 } }), signedIn());
    await expect(api.marketSell("carte-1")).rejects.toThrow("illisible");
  });

  it("achète une carte et garde la marque de l'annonce", async () => {
    const { api, calls } = client(() => ({
      body: {
        card: {
          id: "neuve",
          creatorSlug: "ibai",
          rarity: "legendary",
          variant: "gold",
          obtainedAt: 1_760_000_000_000,
          rareDrop: false,
          fromMarket: 12,
        },
        price: 3000,
        points: 2000,
      },
    }), signedIn());
    const result = await api.marketBuy(12);
    expect(calls[0]?.url).toContain("/rest/v1/rpc/market_buy");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_listing: 12 });
    expect(result.card.fromMarket).toBe(12);
    expect(result.price).toBe(3000);
    expect(result.points).toBe(2000);
  });

  it("refuse une carte achetée sans marque d'annonce", async () => {
    // Sans `fromMarket`, l'appareil ne peut pas reconnaître la carte s'il
    // rejoue l'achat : mieux vaut refuser que risquer un doublon.
    const { api } = client(() => ({
      body: { card: { id: "neuve", creatorSlug: "ibai", rarity: "rare", variant: "standard" }, price: 30, points: 0 },
    }), signedIn());
    await expect(api.marketBuy(12)).rejects.toThrow("illisible");
  });

  it("lit la vitrine d'un joueur", async () => {
    const { api, calls } = client(() => ({ body: [LISTING] }), signedIn());
    const listings = await api.marketListingsOf("u2");
    expect(calls[0]?.url).toContain("/rest/v1/rpc/market_listings_of");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_user: "u2" });
    expect(listings[0]?.price).toBe(3000);
  });

  it("sans identifiant, la vitrine demande la sienne", async () => {
    const { api, calls } = client(() => ({ body: [] }), signedIn());
    await api.marketListingsOf();
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_user: null });
  });

  it("rend une liste vide si le serveur répond autre chose qu'une liste", async () => {
    const { api } = client(() => ({ body: { message: "non" } }), signedIn());
    expect(await api.marketShelf()).toEqual([]);
  });
});
