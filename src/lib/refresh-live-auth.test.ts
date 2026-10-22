import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { describe, expect, it, vi } from "vitest";

const source = transpileModule(readFileSync("supabase/functions/refresh-live/index.ts", "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
}).outputText;

function edge(environment: Record<string, string>) {
  let handler!: (request: Request) => Promise<Response>;
  const fetch = vi.fn(async () => Response.json([]));
  runInNewContext(source, {
    Deno: { env: { get: (key: string) => environment[key] }, serve: (run: typeof handler) => { handler = run; } },
    Request, Response, URL, fetch, console,
  });
  return { handler, fetch };
}

const environment = {
  SUPABASE_ANON_KEY: "anon", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_single",
  SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "sb_publishable_default", rotated: "sb_publishable_rotated" }),
  SUPABASE_SERVICE_ROLE_KEY: "service", SUPABASE_SECRET_KEY: "sb_secret_single",
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_default", rotated: "sb_secret_rotated" }),
};

describe("autorisation réelle de refresh-live", () => {
  it.each(["", "test", "abc", "sb_publishable_unknown"])("rejette %j avant tout accès réseau", async (key) => {
    const { handler, fetch } = edge(environment);
    const response = await handler(new Request("https://fake.invalid/", { headers: { Authorization: `Bearer ${key}` } }));
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["anon", "sb_publishable_single", "sb_publishable_default", "sb_publishable_rotated", "service", "sb_secret_single", "sb_secret_default", "sb_secret_rotated"])("accepte la clé du projet %s", async (key) => {
    const { handler } = edge(environment);
    const response = await handler(new Request("https://fake.invalid/", { headers: { Authorization: `Bearer ${key}` } }));
    // L'auth passe ; le fixture ne fournit volontairement aucun secret Twitch.
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("TWITCH_CLIENT_ID") });
  });

  it.each(["check", "push"])("interdit le mode %s à une clé publique", async (mode) => {
    const { handler, fetch } = edge(environment);
    const response = await handler(new Request(`https://fake.invalid/?${mode}=1`, { headers: { Authorization: "Bearer anon" } }));
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepte une seconde clé de service pour le diagnostic", async () => {
    const { handler } = edge(environment);
    const response = await handler(new Request("https://fake.invalid/?check=1", { headers: { Authorization: "Bearer sb_secret_rotated" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, check: true });
  });

  it("échoue fermé si les variables JSON sont malformées", async () => {
    const { handler, fetch } = edge({ SUPABASE_PUBLISHABLE_KEYS: "broken", SUPABASE_SECRET_KEYS: "broken" });
    expect((await handler(new Request("https://fake.invalid/", { headers: { Authorization: "Bearer broken" } }))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
