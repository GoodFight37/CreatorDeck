import { describe, expect, it } from "vitest";
import { CLOUD_DISABLED_HINT, cloudProjectName, readCloudConfig } from "@/lib/cloud/config";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${"x".repeat(40)}.${"y".repeat(30)}`;

describe("configuration du cloud", () => {
  it("reste désactivée sans variables d'environnement", () => {
    expect(readCloudConfig({})).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co" })).toBeNull();
    expect(readCloudConfig({ [KEY_VAR]: KEY })).toBeNull();
    expect(CLOUD_DISABLED_HINT).toMatch(/jouable hors ligne/);
  });

  it("accepte un projet Supabase complet", () => {
    const config = readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co", [KEY_VAR]: KEY });
    expect(config).toEqual({ url: "https://abcd.supabase.co", anonKey: KEY });
    expect(cloudProjectName(config!)).toBe("abcd");
  });

  it("accepte une URL d'endpoint recopiée depuis l'écran API", () => {
    // `https://xxx.supabase.co/rest/v1/` (et variantes) doit revenir à l'URL
    // du projet : sinon l'app restait hors ligne sans explication.
    for (const pasted of [
      "https://yzxchpybqrfegvecihxf.supabase.co/rest/v1/",
      "https://yzxchpybqrfegvecihxf.supabase.co/rest/v1",
      "https://yzxchpybqrfegvecihxf.supabase.co/auth/v1/",
      "https://yzxchpybqrfegvecihxf.supabase.co/storage/v1",
    ]) {
      const config = readCloudConfig({ [URL_VAR]: pasted, [KEY_VAR]: KEY });
      expect(config?.url).toBe("https://yzxchpybqrfegvecihxf.supabase.co");
      // Une clé « publishable » (nouveau format Supabase) est acceptée.
      expect(config?.anonKey).toBe(KEY);
    }
    expect(
      readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co/rest/v1/", [KEY_VAR]: "sb_publishable_cbbKecrvKbPcifWUsolQ4w_bmmslot1" }),
    ).toEqual({ url: "https://abcd.supabase.co", anonKey: "sb_publishable_cbbKecrvKbPcifWUsolQ4w_bmmslot1" });
  });

  it("tolère une barre oblique finale et les espaces", () => {
    const config = readCloudConfig({
      [URL_VAR]: "  https://mon-projet.supabase.co/  ",
      [KEY_VAR]: `  ${KEY}  `,
    });
    expect(config?.url).toBe("https://mon-projet.supabase.co");
    expect(config?.anonKey).toBe(KEY);
  });

  it("refuse une adresse ou une clé recopiées de travers", () => {
    // Adresse de la documentation, projet local, clé tronquée : mieux vaut
    // « non configuré » qu'un écran de compte qui échoue à chaque appel.
    expect(readCloudConfig({ [URL_VAR]: "https://ton-projet.supabase.co", [KEY_VAR]: KEY })).not.toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "http://localhost:54321", [KEY_VAR]: KEY })).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co", [KEY_VAR]: "trop-court" })).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "pas une url", [KEY_VAR]: KEY })).toBeNull();
  });
});
