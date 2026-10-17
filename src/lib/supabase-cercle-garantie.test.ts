/**
 * Garde-fous sur `supabase/migrations/0055_garantie_cercle.sql` (D-142) : sous
 * la garantie Légendaire, le Légendaire vient du cercle du joueur.
 *
 * Le PL/pgSQL s'exécute dans `scripts/verify-supabase-migrations.mjs` (Postgres
 * jetable, scénarios « 0055 : … »). Ici, on verrouille le contrat entre le SQL
 * et le moteur local (`circlePityPool` dans `game-engine.ts`) : mêmes
 * candidats, même seuil, même effet limité à la garantie.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { circlePityPool, drawPack } from "@/lib/game-engine";
import { PITY } from "@/lib/pull-rates";

const SQL = readFileSync(path.join(process.cwd(), "supabase", "migrations", "0055_garantie_cercle.sql"), "utf8");
const CODE = SQL.split("\n").map((line) => line.replace(/--.*$/, "")).join("\n");
const BASE = readFileSync(path.join(process.cwd(), "supabase", "migrations", "0051_boosters_promo_personnels.sql"), "utf8");

function openPackOf(sql: string): string {
  const start = sql.indexOf("create or replace function public.open_pack(");
  const end = sql.indexOf("grant execute on function public.open_pack(text) to authenticated;", start);
  return sql.slice(start, end);
}

const CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius", "anyme023"];

describe("0055 — le miroir de la garantie du cercle", () => {
  it("se déclenche au même seuil que la garantie publiée, et seulement là", () => {
    expect(CODE).toContain(`if v_pity + 1 >= ${PITY.threshold} then\n    v_circle_slug := public._pack_circle_legendary(v_user_id, v_used);`);
  });

  it("choisit les mêmes candidats que le moteur : Légendaires du cercle, tirables, hors booster, jamais obtenues", () => {
    expect(CODE).toContain("c.rarity = 'legendary'");
    expect(CODE).toContain("not c.retired");
    expect(CODE).toContain("not (c.slug = any (coalesce(p_used, '{}'::text[])))");
    expect(CODE).toContain("from public.card_claims cc");
    expect(CODE).toContain("join public.creators c on c.slug = any (pc.slugs)");
  });

  it("ne touche à open_pack qu'à trois endroits, le reste est 0051 à l'identique", () => {
    const before = openPackOf(BASE).split("\n");
    const after = openPackOf(SQL).split("\n");
    const added = after.filter((line) => !before.includes(line));
    const removed = before.filter((line) => !after.includes(line));
    expect(removed).toEqual(["  v_slug := public._pack_choose_creator(v_weights, v_used);"]);
    expect(added.filter((line) => line.trim() && !line.trim().startsWith("--"))).toEqual([
      "  v_circle_slug text;",
      `  if v_pity + 1 >= ${PITY.threshold} then`,
      "    v_circle_slug := public._pack_circle_legendary(v_user_id, v_used);",
      "  if v_circle_slug is not null then",
      "    v_slug := v_circle_slug;",
      // (« v_slug := public._pack_choose_creator(...) » réindenté sous le `else` :
      // la même ligne existe déjà dans la boucle des slots, elle n'est donc pas « ajoutée ».)
      "    'pity_circle', v_circle_slug is not null,",
    ]);
  });

  it("refuse de s'appliquer sans 0054, et reste fermée aux joueurs", () => {
    expect(CODE).toContain("to_regclass('public.player_circles') is null");
    expect(CODE).toContain("revoke all on function public._pack_circle_legendary(uuid, text[]) from public, anon, authenticated;");
  });
});

describe("moteur local — circlePityPool et drawPack", () => {
  it("ne garde que les Légendaires du cercle, ni sortantes, ni dans le booster, ni déjà obtenues", () => {
    const pool = circlePityPool(CIRCLE, new Set(["ninja"]), new Set(["kaicenat"]));
    expect(pool.map((creator) => creator.slug)).toEqual(["ibai", "auronplay", "rubius"]);
    expect(pool.every((creator) => creator.rarity === "legendary")).toBe(true);
    expect(CREATOR_BY_SLUG.get("anyme023")?.rarity).toBe("epic");
  });

  it("sous la garantie, la carte garantie vient du cercle quand une Légendaire manque", () => {
    const owned = new Set(["kaicenat", "ibai", "ninja", "auronplay"]);
    for (let run = 0; run < 40; run += 1) {
      const cards = drawPack("live", owned, { pity: true, circle: CIRCLE });
      const last = cards.at(-1)!;
      expect(last.rarity).toBe("legendary");
      // rubius est la seule manquante, sauf si un slot ordinaire l'a déjà sortie.
      if (!cards.slice(0, -1).some((card) => card.creatorSlug === "rubius")) expect(last.creatorSlug).toBe("rubius");
    }
  });

  it("cercle déjà complet : tirage d'avant ; cercle incomplet : 0056 prend le relais hors garantie", () => {
    const allOwned = new Set(CIRCLE);
    const complete = drawPack("live", allOwned, { pity: true, circle: CIRCLE });
    expect(complete.at(-1)!.rarity).toBe("legendary");
    for (let run = 0; run < 60; run += 1) {
      const cards = drawPack("live", new Set(), { pity: false, circle: CIRCLE, rareDrop: false });
      expect(CIRCLE).toContain(cards.at(-1)!.creatorSlug);
    }
  });
});
