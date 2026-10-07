/**
 * Garde-fous sur `supabase/migrations/0014_scene_pack.sql` — le Paquet Scène
 * côté serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est
 * le **contrat** avec `src/data/pull-rates.json` (les poids, la promesse
 * « jamais de Légendaire », la journée de jeu) et les règles de sécurité.
 * L'exécution réelle — choix déterministes, tirage conforme accepté, cartes
 * hors liste refusées — est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : c'est la seule partie du tirage où le client propose quelque chose.
 * Si un jour quelqu'un croit le client sur parole (rareté, variante, famille),
 * ces tests tombent.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/catalog";
import { gameDay } from "@/lib/progression";
import { PITY_PACK, PULL_RATES } from "@/lib/pull-rates";

const ROOT = process.cwd();
const SQL = readFileSync(
  path.join(ROOT, "supabase", "migrations", "0014_scene_pack.sql"),
  "utf8",
);
// Les contrôles de motifs portent sur le code seul : un commentaire qui
// explique une règle cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/** Les poids d'un slot, extraits du SQL — pour les comparer au fichier de taux. */
function sqlWeight(block: string, rarity: string): number | null {
  const match = block.match(new RegExp(`"${rarity}":\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
}

describe("0014_scene_pack.sql (le Paquet Scène côté serveur)", () => {
  it("reprend les poids du Paquet Scène, slot par slot", () => {
    const table = PULL_RATES.scene;
    for (const slot of table.slots) {
      for (const [rarity, weight] of Object.entries(slot.weights)) {
        // Le SQL répète chaque créateur `weight` fois : un tableau Postgres ne
        // connaît pas les pondérations, mais l'écrire ainsi dit exactement la
        // même chose que la roue du moteur.
        const pattern = new RegExp(
          `'\\{[^}]*"${rarity}": ${weight}[^}]*\\}'::jsonb`.replace(/\s+/g, "\\s*"),
        );
        expect(CODE, `${rarity} = ${weight}`).toMatch(pattern);
      }
    }
  });

  it("reprend la garantie et le tirage rare, et aucun poids légendaire", () => {
    const table = PULL_RATES.scene;
    for (const [rarity, weight] of Object.entries(table.guaranteed.weights)) {
      expect(sqlWeight(CODE.slice(CODE.indexOf("v_guaranteed jsonb"), CODE.indexOf("v_rare_drop jsonb")), rarity)).toBe(weight);
    }
    expect(CODE).toContain(`v_rare_drop_permille integer := ${table.rareDrop.chancePermille}`);
    expect(CODE).toContain(`v_variant_upgrade_permille integer := ${table.rareDrop.variantUpgradePermille}`);
    expect(CODE).toContain(`v_holo_permille integer := ${table.variants.holoPermille}`);
    // Aucune des tables du paquet ne porte de poids légendaire.
    expect(CODE).not.toMatch(/"legendary":\s*[1-9]/);
  });

  it("exclut les Légendaires même si un poids apparaissait un jour", () => {
    // Ceinture et bretelles : la table n'en contient pas (et `catalog:ci` le
    // vérifie), et la requête des choix les écarte explicitement.
    expect(CODE).toContain("and v_rarity <> 'legendary'");
    expect(PITY_PACK).toBe("live");
  });

  it("ne vérifie pas seulement le créateur : la position, la rareté et la variante aussi", () => {
    // Le cœur du mécanisme : une carte n'est acceptée que si le triplet
    // exact (créateur, rareté, variante) figure dans le choix de **sa**
    // position. Le mensonge le plus simple — « ce commun est une Légendaire » —
    // ne passe donc pas.
    expect(CODE).toMatch(/v_slot @> jsonb_build_array\(jsonb_build_object\(/);
    expect(CODE).toContain("'slug', v_slug, 'rarity', v_rarity, 'variant', v_variant");
    expect(CODE).toMatch(/v_choices -> 'choices'\) -> v_i/);
  });

  it("décide lui-même le tirage rare et les variantes, de façon déterministe", () => {
    // Déterministe parce que la vérification recalcule les choix : si le hasard
    // changeait entre les deux appels, aucune carte ne serait jamais valide.
    expect(CODE).toContain("hashtext(v_user_id::text || v_day::text || p_family)");
    expect(CODE).toMatch(/create or replace function public\._pack_scene_variant/);
    expect(CODE).toMatch(/stable/);
    // Pas de variante Live : le Paquet Scène ignore le bonus Direct.
    expect(CODE).not.toMatch(/then 'live'/);
  });

  it("n'ouvre qu'un paquet par jour de jeu (6 h UTC)", () => {
    expect(CODE).toMatch(/create or replace function public\._pack_game_day/);
    expect(CODE).toContain("(p_at at time zone 'utc') - interval '6 hours'");
    expect(CODE).toMatch(/s\.scene_day = v_day/);
    expect(CODE).toContain("paquet scène : ton paquet du jour est déjà ouvert");
    expect(gameDay(Date.UTC(2026, 9, 7, 5, 59))).toBe("2026-10-06");
    expect(gameDay(Date.UTC(2026, 9, 7, 6, 0))).toBe("2026-10-07");
  });

  it("ne fait pas compter le paquet dans le plancher de malchance ni dans la série", () => {
    // Les lignes du Paquet Scène entrent au journal (le Last Pack doit les
    // voir), mais marquées : les trois compteurs du Live Drop ne lisent que
    // `kind = 'live'`.
    expect(CODE).toContain("add column if not exists kind text not null default 'live'");
    expect(CODE).toMatch(/values \(v_user_id, v_now, v_clean, 'scene'\)/);
    expect(CODE.match(/d\.kind = 'live'/g)?.length).toBe(3);
    // …et les trois fonctions sont bien redéfinies ici, sinon 0013 resterait
    // en vigueur (elle compte tout le journal).
    for (const fn of [
      "_pack_pity(p_user uuid)",
      "_pack_streak(p_user uuid, p_now timestamptz)",
      "_pack_perfect_today(p_user uuid, p_now timestamptz)",
    ]) {
      expect(CODE).toContain(`create or replace function public.${fn}`);
    }
  });

  it("exige une famille connue et assez grande pour cinq cartes", () => {
    expect(CODE).toContain("if (select count(*) from public.creators c where c.region = p_family) < 5 then");
    expect(PACKS.scene.size).toBe(5);
  });

  it("ferme les fonctions internes et n'ouvre que ce qu'il faut", () => {
    expect(CODE).toContain("revoke all on function public._pack_game_day(timestamptz) from public, anon, authenticated;");
    expect(CODE).toContain("revoke all on function public._pack_scene_variant");
    expect(CODE).toContain("revoke all on function public.scene_pack_choices(text) from public, anon;");
    expect(CODE).toContain("grant execute on function public.scene_pack_choices(text) to authenticated;");
    expect(CODE).toContain("revoke all on function public.open_scene_pack(text, jsonb) from public, anon;");
    expect(CODE).toContain("grant execute on function public.open_scene_pack(text, jsonb) to authenticated;");
  });

  it("le journal est en lecture seule pour les joueurs, l'écriture est réservée", () => {
    // `pack_scene` : le joueur lit sa ligne, seule la fonction écrit.
    expect(CODE).toMatch(/create policy "lecture de son paquet scène"/);
    expect(CODE).toContain("alter table public.pack_scene enable row level security;");
    expect(CODE).not.toMatch(/for insert[\s\S]{0,80}to authenticated/);
  });

  it("reste rejouable", () => {
    expect(CODE).toContain("create table if not exists public.pack_scene");
    expect(CODE).not.toMatch(/drop table/i);
    expect(CODE).toMatch(/on conflict \(user_id\) do update/);
  });
});
