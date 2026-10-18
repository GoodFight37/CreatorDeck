/**
 * Garde-fous sur `supabase/migrations/0058_cercle_facultatif.sql` : « Mes
 * chaînes » devient facultatif (0 à 15). Le PL/pgSQL ne s'exécute pas dans
 * Vitest ; on vérifie le contrat ici, et `scripts/verify-circle-optional.mjs`
 * l'exécute sur un Postgres jetable (`npm run supabase:verify`).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CIRCLE_MAX, CIRCLE_MIN, isValidCircle } from "@/lib/circle";
import { createInitialState, openPack } from "@/lib/game-engine";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const SQL = readFileSync(path.join(DIR, "0058_cercle_facultatif.sql"), "utf8");
const CODE = SQL.split("\n").map((line) => line.replace(/--.*$/, "")).join("\n");

describe("0058 — le cercle facultatif", () => {
  it("s'applique automatiquement après la CI verte de main", () => {
    expect(SQL.split("\n")[0]).toBe("-- creatordeck-deploy: automatic");
    expect(readdirSync(DIR).filter((name) => name.startsWith("0058_"))).toEqual(["0058_cercle_facultatif.sql"]);
  });

  it("garde les mêmes bornes que le client : 0 à 15", () => {
    expect(CIRCLE_MIN).toBe(0);
    expect(CODE).toContain(`coalesce(array_length(slugs, 1), 0) <= ${CIRCLE_MAX}`);
    expect(CODE).toContain(`if v_n > ${CIRCLE_MAX} then`);
    expect(CODE).not.toMatch(/v_n < \d/);
    expect(CODE).not.toMatch(/between 5 and 15/);
    expect(isValidCircle([])).toBe(true);
    expect(isValidCircle(["ibai"])).toBe(true);
  });

  it("zéro chaîne retire la ligne au lieu d'inventer une liste", () => {
    expect(CODE).toMatch(/if cardinality\(v_clean\) = 0 then\s+delete from public\.player_circles where user_id = v_user;/);
  });

  it("revérifie toujours doublons, chaînes inconnues et Sortants", () => {
    expect(CODE).toMatch(/count\(distinct s\)[\s\S]+<> v_n/);
    expect(CODE).toMatch(/c\.slug = any \(v_clean\) and not c\.retired/);
  });

  it("ne touche ni au tirage ni aux poids du pool mondial", () => {
    expect(CODE).not.toMatch(/function public\.open_pack|function public\._pack_choose_creator|function public\._pack_circle/);
    expect(CODE).not.toMatch(/::jsonb/);
    expect(CODE).not.toMatch(/update public\.player_circles/);
  });

  it("n'expose aucune fonction interne et exige un compte", () => {
    expect(CODE).toContain("revoke all on function public._circle_clean(text[]) from public, anon, authenticated;");
    expect(CODE).toContain("revoke all on function public.set_circle(text[]) from public, anon;");
    expect(CODE).toContain("grant execute on function public.set_circle(text[]) to authenticated;");
    expect(CODE).toContain("v_user uuid := auth.uid()");
  });

  it("miroir TS : une chaîne nommée entre dans le paquet, zéro n'en invente aucune", () => {
    const t0 = Date.UTC(2026, 9, 18, 10);
    const one = openPack(createInitialState(t0), t0, { circle: ["ibai"] });
    expect(one.cards.at(-1)!.creatorSlug).toBe("ibai");
    const none = openPack(createInitialState(t0), t0, { circle: [] });
    expect(none.cards).toHaveLength(5);
  });
});
