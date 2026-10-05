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
