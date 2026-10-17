/**
 * Garde-fous sur `supabase/migrations/0054_cercle.sql` : le premier booster
 * tiré dans le cercle du joueur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest. On vérifie donc le contrat : les
 * seuils et les poids du SQL sont ceux de `src/lib/circle.ts`, la fonction
 * revérifie le cercle côté serveur, et elle n'est pas appelable sans compte.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CIRCLE_LAST_SLOT_WEIGHTS,
  CIRCLE_MAX,
  CIRCLE_MIN,
  CIRCLE_PACK_SIZE,
  CIRCLE_SLOT_WEIGHTS,
  CIRCLE_TIER_THRESHOLDS,
  circleTier,
} from "@/lib/circle";

const SQL = readFileSync(path.join(process.cwd(), "supabase", "migrations", "0054_cercle.sql"), "utf8");
const CODE = SQL.split("\n").map((line) => line.replace(/--.*$/, "")).join("\n");

function jsonWeights(literal: string): Record<string, number> {
  return JSON.parse(literal) as Record<string, number>;
}

describe("0054 — le miroir du cercle", () => {
  it("utilise les mêmes seuils de rareté locale que le client", () => {
    expect(CODE).toContain(`v_percent <= ${CIRCLE_TIER_THRESHOLDS.epic} then return 'epic'`);
    expect(CODE).toContain(`v_percent <= ${CIRCLE_TIER_THRESHOLDS.rare} then return 'rare'`);
    expect(CODE).toContain(`v_percent <= ${CIRCLE_TIER_THRESHOLDS.uncommon} then return 'uncommon'`);
    expect(CODE).toContain("(p_position * 100) / (p_size - 1)");
  });

  it("donne les mêmes poids que le client, ordinaires puis dernière carte", () => {
    const literals = [...CODE.matchAll(/'(\{"[^']+\})'::jsonb/g)].map((match) => jsonWeights(match[1]));
    const ordinary = literals.find((weights) => "common" in weights);
    const last = literals.find((weights) => !("common" in weights));
    expect(ordinary).toEqual(CIRCLE_SLOT_WEIGHTS);
    expect(last).toEqual(CIRCLE_LAST_SLOT_WEIGHTS);
  });

  it("garde les mêmes bornes de cercle et la même taille de booster", () => {
    expect(CODE).toContain(`array_length(slugs, 1) between ${CIRCLE_MIN} and ${CIRCLE_MAX}`);
    expect(CODE).toContain(`v_n < ${CIRCLE_MIN} or v_n > ${CIRCLE_MAX}`);
    expect(CODE).toContain(`for v_i in 1..${CIRCLE_PACK_SIZE - 1} loop`);
    expect(CODE).toContain(`for v_i in 1..${CIRCLE_PACK_SIZE} loop`);
  });

  it("revérifie le cercle côté serveur : doublon, inconnu, Sortant", () => {
    expect(CODE).toMatch(/count\(distinct s\)[\s\S]+<> v_n/);
    expect(CODE).toMatch(/c\.slug = any \(v_clean\) and not c\.retired/);
  });

  it("ne croit pas le client sur la rareté enregistrée", () => {
    expect(CODE).toMatch(/select c\.rarity into v_rarity from public\.creators c where c\.slug = v_slug/);
    expect(CODE).not.toMatch(/p_slugs[^;]*rarity/);
  });

  it("réutilise le cadeau existant : réclamé, tutoriel fait, un seul tirage de cercle", () => {
    expect(CODE).toContain("v_gift.claimed_at is null or v_gift.boosters_remaining < 1");
    expect(CODE).toContain("tutorial_completed_at is not null");
    expect(CODE).toContain("from public.return_gift_draws where user_id = v_user");
    expect(CODE).toContain("_save_add_gift_cards");
    expect(CODE).toContain("card_claim_add(v_user, v_cards, 'cadeau')");
  });

  it("n'expose aucune fonction interne et exige un compte", () => {
    for (const fn of ["_circle_tier(integer, integer)", "_circle_clean(text[])", "_circle_pick(text[], jsonb, jsonb)"]) {
      expect(CODE).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
    }
    for (const fn of ["set_circle(text[])", "open_circle_gift_pack(text[])"]) {
      expect(CODE).toContain(`revoke all on function public.${fn} from public, anon;`);
      expect(CODE).toContain(`grant execute on function public.${fn} to authenticated;`);
    }
    expect(CODE).toContain("v_user uuid := auth.uid()");
  });

  it("verrouille la table des cercles : lecture personnelle, aucune écriture cliente", () => {
    expect(CODE).toContain("alter table public.player_circles enable row level security;");
    expect(CODE).toContain("revoke all on table public.player_circles from public, anon, authenticated;");
    expect(CODE).not.toMatch(/create policy[^;]+for (insert|update|delete|all)/);
  });

  it("garde la fonction SQL de rareté d'accord avec celle du client (positions 0..n-1)", () => {
    // Même formule en entiers : si le SQL change, ce calcul de référence casse.
    for (let size = CIRCLE_MIN; size <= CIRCLE_MAX; size += 1) {
      for (let pos = 0; pos < size; pos += 1) {
        const percent = Math.floor((pos * 100) / (size - 1));
        const sql = pos <= 0 ? "legendary"
          : percent <= 30 ? "epic" : percent <= 55 ? "rare" : percent <= 80 ? "uncommon" : "common";
        expect(circleTier(pos, size)).toBe(sql);
      }
    }
  });
});
