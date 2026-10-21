/**
 * Garde-fous sur `supabase/migrations/0060_cercle_hors_catalogue.sql` : une
 * chaîne hors catalogue entre dans « Mes chaînes » sans carte. Le PL/pgSQL
 * s'exécute dans `scripts/verify-circle-hors-catalogue.mjs` (`npm run supabase:verify`).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CIRCLE_MAX, CUSTOM_PREFIX, customLogin, isValidCircle } from "@/lib/circle";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const SQL = readFileSync(path.join(DIR, "0060_cercle_hors_catalogue.sql"), "utf8").replace(/\r\n/g, "\n");
const CODE = SQL.replace(/--[^\n]*/g, "");
const EDGE = readFileSync(path.join(process.cwd(), "supabase", "functions", "refresh-live", "index.ts"), "utf8");

describe("0060 — une chaîne hors catalogue, sans carte", () => {
  it("s'applique automatiquement et reste seule de son numéro", () => {
    expect(SQL.split("\n")[0]).toBe("-- creatordeck-deploy: automatic");
    expect(readdirSync(DIR).filter((name) => name.startsWith("0060_"))).toEqual(["0060_cercle_hors_catalogue.sql"]);
  });

  it("même forme que le client : twitch:<login>, 15 au plus, slugs nus revérifiés", () => {
    expect(CUSTOM_PREFIX).toBe("twitch:");
    expect(CODE).toContain("'^twitch:[a-z0-9_]{4,25}$'");
    expect(CODE).toContain(`if v_n > ${CIRCLE_MAX} then`);
    expect(CODE).toContain("en double");
    expect(CODE).toMatch(/c\.slug = any \(v_clean\) and not c\.retired\)\s+<> \(select count\(\*\) from unnest\(v_clean\) s where s not like 'twitch:%'\)/);
    expect(customLogin("twitch:abcd")).toBe("abcd");
    expect(customLogin("twitch:abc")).toBeNull();
    expect(isValidCircle(["twitch:abcd", "ibai"])).toBe(true);
  });

  it("ne redéfinit aucun tirage : open_pack et _pack_circle_missing joignent creators", () => {
    expect(CODE).not.toMatch(/function public\.(open_pack|_pack_circle_missing|open_return_gift_pack)\b/);
    const missing = readFileSync(path.join(DIR, "0056_cercle_vrai.sql"), "utf8");
    expect(missing).toMatch(/join public\.creators c on c\.slug = t\.slug and not c\.retired/);
  });

  it("le direct lit des logins seuls, plafonnés, réservés au rôle de service", () => {
    expect(CODE).toContain("returns text[]");
    expect(CODE).toContain("least(coalesce(p_limit, 500), 500)");
    expect(CODE).toContain("revoke all on function public.live_circle_logins(integer) from public, anon, authenticated;");
    expect(CODE).not.toMatch(/user_id\s*(,|as)/);
    expect(SQL).toMatch(/shortcut: 500/);
    expect(EDGE).toContain("rpc/live_circle_logins");
    expect(EDGE).toMatch(/new Set\(\[\.\.\.catalogue\.map/);
  });
});
