import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { circleDrawSlots } from "@/lib/circle-draw";
import { PULL_RATES } from "@/lib/pull-rates";

const read = (name: string) => readFileSync(`supabase/migrations/${name}.sql`, "utf8").replace(/\r\n/g, "\n");
const SQL = read("0059_cercle_une_fois");
const CODE = SQL.replace(/--[^\n]*/g, "");
const WEIGHTS = [...PULL_RATES.live.slots.map(s => s.weights), PULL_RATES.live.guaranteed.weights];
/** Retire le seul repli modifié par 0059 pour comparer le reste mot pour mot. */
const withoutFallback = (code: string) => code
  .replace(/--[^\n]*/g, "")
  .replace(/if cardinality\(v_circle_pool\) = 0 then[\s\S]*?v_preferred\);\s*(?:end if;)?/g, "<repli>")
  .replace(/\s+/g, " ")
  .replace(/ ?<repli> ?/g, " <repli> ");
const block = (code: string, start: string, end: string) => code.slice(code.indexOf(start), code.indexOf(end, code.indexOf(start)) + end.length);

describe("0059 — une chaîne du cercle au plus une fois par booster", () => {
  it("ne complète plus les slots 1 et 2 en répétant les absentes", () => {
    expect(CODE).not.toContain("v_circle_pool := v_missing");
    // Repli vers le classement, cercle exclu, dans open_pack et le cadeau de retour.
    expect(CODE.match(/if cardinality\(v_circle_pool\) = 0 then\s+v_slug := public\._pack_choose_creator\(v_weights, v_used \|\| v_missing\);/g)).toHaveLength(2);
    expect(SQL).toMatch(/^-- creatordeck-deploy: automatic/);
  });

  it("reprend open_pack de 0057 et le cadeau de 0056 sans autre changement", () => {
    const pairs: [string, string, string][] = [
      ["0057_retention", "create or replace function public.open_pack(", "grant execute on function public.open_pack(text) to authenticated;"],
      ["0056_cercle_vrai", "create or replace function public.open_return_gift_pack()", "grant execute on function public.open_return_gift_pack() to authenticated;"],
    ];
    for (const [file, start, end] of pairs) {
      expect(withoutFallback(block(SQL, start, end))).toBe(withoutFallback(block(read(file), start, end)));
    }
    expect(CODE).toContain("public._pack_streak_state(");
    expect(CODE).toContain("revoke all on function public.open_pack(text) from public, anon;");
  });

  it("miroir TS : sans absente restante, le slot revient au classement", () => {
    const pool = CREATORS.filter(c => c.rarity === "common").slice(0, 2);
    const one = circleDrawSlots(pool.slice(0, 1), pool[0].slug, WEIGHTS)!;
    expect(one.slice(0, 4)).toEqual([null, null, null, null]);
    expect(one[4]!.slug).toBe(pool[0].slug);
    const two = circleDrawSlots(pool, pool[0].slug, WEIGHTS)!;
    expect(two[0]!.slug).not.toBe(two[4]!.slug);
    expect(two.slice(1, 4)).toEqual([null, null, null]);
  });
});
