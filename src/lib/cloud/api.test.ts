import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_SESSION_KEY, CloudApi, CloudError } from "@/lib/cloud/api";
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
  const impl = (async (url: string | URL, init?: RequestInit) => {
    const target = String(url);
    const result = await handler(target, init, calls.length);
    calls.push({ url: target, init });
    const status = result.status ?? 200;
    const text = result.body === undefined ? "" : JSON.stringify(result.body);
    return new Response(text, { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
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
  it("lit les lignes renvoyées par le serveur", async () => {
    const storage = memoryStorage();
    storage.setItem(
      CLOUD_SESSION_KEY,
      JSON.stringify({ ...SESSION_BODY, accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3600_000, userId: SESSION_BODY.user.id }),
    );
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
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ p_limit: 20, p_metric: "legendary_cards" });
    expect(rows[0]).toMatchObject({ rank: 1, displayName: "Kaicenat", legendaryCards: 48, showcaseSlugs: ["kaicenat"] });
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
