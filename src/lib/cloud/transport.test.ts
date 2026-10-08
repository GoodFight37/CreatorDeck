/**
 * Transport réseau : dans l'APK les appels passent par le client HTTP natif
 * de Capacitor (pas de CORS, POST compris), dans le navigateur par `fetch`.
 * Ces tests vérifient les deux chemins et le repli.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestMock, state } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  state: { platform: false },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => state.platform },
  CapacitorHttp: { request: requestMock as unknown as (options: unknown) => Promise<unknown> },
}));

import { cloudRequest } from "@/lib/cloud/transport";

const INIT = {
  method: "POST",
  headers: { apikey: "cle", "Content-Type": "application/json" },
  body: JSON.stringify({ data: {}, gotrue_meta_security: {} }),
};

describe("transport cloud", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    state.platform = false;
    requestMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("utilise fetch dans un navigateur", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const response = await cloudRequest("https://projet.supabase.co/auth/v1/health", { method: "GET", headers: {} });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestMock).not.toHaveBeenCalled();
    expect(response.ok).toBe(true);
  });

  it("utilise le client natif dans l'APK, en transmettant le corps JSON", async () => {
    state.platform = true;
    requestMock.mockResolvedValue({ status: 200, data: { user: { id: "u1" } } });

    const response = await cloudRequest("https://projet.supabase.co/auth/v1/signup", INIT);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(requestMock).toHaveBeenCalledTimes(1);
    const options = requestMock.mock.calls[0]?.[0] as {
      url: string;
      method: string;
      headers: Record<string, string>;
      data: unknown;
    };
    expect(options.url).toBe("https://projet.supabase.co/auth/v1/signup");
    expect(options.method).toBe("POST");
    // Le corps part en objet JSON : le POST natif n'a pas la limite du WebView.
    expect(options.data).toEqual({ data: {}, gotrue_meta_security: {} });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: { id: "u1" } });
  });

  it("renvoie le texte tel quel quand le serveur répond hors JSON", async () => {
    state.platform = true;
    requestMock.mockResolvedValue({ status: 500, data: "boom" });
    const response = await cloudRequest("https://projet.supabase.co/auth/v1/health", { method: "GET", headers: {} });
    expect(response.ok).toBe(false);
    expect(await response.text()).toBe("boom");
    expect(await response.json()).toBeNull();
  });

  it("retombe sur fetch si l'appel natif échoue pour une raison d'outillage", async () => {
    state.platform = true;
    requestMock.mockRejectedValue(new Error("plugin indisponible"));
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const response = await cloudRequest("https://projet.supabase.co/auth/v1/health", { method: "GET", headers: {} });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
  });

  it("remonte l'erreur native quand les deux chemins échouent", async () => {
    state.platform = true;
    requestMock.mockRejectedValue(new Error("pas de réseau"));
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      cloudRequest("https://projet.supabase.co/auth/v1/health", { method: "GET", headers: {} }),
    ).rejects.toThrowError(/pas de réseau/);
  });
});
