import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import { circleDrawSlots, missingCircle, pickMissingCircle } from "@/lib/circle-draw";
import { DIRECT_BONUS, PULL_RATES } from "@/lib/pull-rates";

const SQL = readFileSync("supabase/migrations/0056_cercle_vrai.sql", "utf8");
const CODE = SQL.replace(/--[^\n]*/g, "");
describe("0056 — SQL et TypeScript du cercle vrai", () => {
  it("lit la collection actuelle et refuse les Sortants, comme le miroir", () => {
    expect(CODE).toContain("from public.user_cards uc");
    expect(CODE).toContain("not c.retired");
    const creator = CREATORS[0];
    expect(missingCircle([creator.slug, creator.slug, "inconnu"], new Set())).toEqual([creator]);
    expect(missingCircle([creator.slug], new Set([creator.slug]))).toEqual([]);
  });
  it("réserve la dernière absente et applique trois slots aux deux tirages", () => {
    expect(CODE).toContain("v_i <= 2");
    expect(CODE).toContain("v_i = 5");
    expect(CODE.match(/public\._pack_circle_missing\(v_user(?:_id)?\)/g)).toHaveLength(2);
    const pool = CREATORS.filter(c => c.rarity === "common").slice(0, 3);
    const slots = circleDrawSlots(pool, pool[0].slug, [...PULL_RATES.live.slots.map(s => s.weights), PULL_RATES.live.guaranteed.weights])!;
    expect(new Set(slots.slice(0, 2).map(c => c!.slug))).toEqual(new Set(pool.slice(1).map(c => c.slug)));
    expect(slots.slice(2, 4)).toEqual([null, null]);
    expect(slots[4]!.slug).toBe(pool[0].slug);
  });
  it("la préférée prime à poids égal, y compris au repli de rareté", () => {
    const pool = CREATORS.filter(c => c.rarity === "common").slice(0, 3);
    for (let i = 0; i < 30; i++) expect(pickMissingCircle(pool, { legendary: 1 }, pool[0].slug)).toBe(pool[0]);
    expect(CODE).toContain("v_preferred_weight = v_chosen_weight");
    expect(CODE).toContain(`then ${Math.round(DIRECT_BONUS.creatorBias * 1000)} else 1000`);
  });
  it("conserve les poids mondiaux et les écritures serveur de 0055", () => {
    for (const weights of [...PULL_RATES.live.slots.map(s => s.weights), PULL_RATES.live.guaranteed.weights, PULL_RATES.live.rareDrop.weights]) {
      const literals = [...CODE.matchAll(/'(\{"[^']+\})'::jsonb/g)].map(m => JSON.parse(m[1]));
      expect(literals).toContainEqual(weights);
    }
    expect(CODE).toContain("public._save_add_pack_cards");
    expect(CODE).toContain("public._save_add_gift_cards");
    expect(CODE).toContain("public.card_claim_add");
    expect(CODE).not.toContain("le booster de ton cercle est déjà ouvert");
  });
  it("les helpers restent privés et les deux portes cadeaux sont serveur", () => {
    expect(CODE).toContain("revoke all on function public._pack_circle_missing(uuid) from public, anon, authenticated;");
    expect(CODE).toContain("revoke all on function public._pack_circle_pick(text[], jsonb, text) from public, anon, authenticated;");
    expect(CODE).toContain("v_result := public.open_return_gift_pack();");
    expect(SQL).toMatch(/^-- creatordeck-deploy: manual/);
  });
});
