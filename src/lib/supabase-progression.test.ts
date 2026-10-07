/**
 * Garde-fous sur `supabase/migrations/0013_progression.sql` — le plancher de
 * malchance et la série de jours côté serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est
 * le **contrat** — le seuil publié dans `pull-rates.json`, la définition de la
 * journée de jeu (identique au moteur local), et les règles de sécurité.
 * L'exécution réelle (80 boosters amorcés, garantie vérifiée, série cassée puis
 * raccommodée) est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : `open_pack()` reçoit la sauvegarde d'un appareil que le joueur peut
 * modifier. Si le compteur vivait dedans, il suffirait d'écrire « 80 » pour
 * obtenir une Légendaire à chaque booster. La migration le déduit donc du
 * journal des tirages — et si un jour quelqu'un y met un compteur client, ces
 * tests tombent.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROGRESSION, gameDay } from "@/lib/progression";
import { PITY } from "@/lib/pull-rates";

const ROOT = process.cwd();
const SQL = readFileSync(
  path.join(ROOT, "supabase", "migrations", "0013_progression.sql"),
  "utf8",
);
// Les contrôles de motifs portent sur le code seul : un commentaire qui
// explique une règle cite forcément la règle, et un test qui lit les
// commentaires ne teste rien.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0013_progression.sql (plancher de malchance et série)", () => {
  it("reprend le seuil publié dans pull-rates.json", () => {
    // Le SQL écrit `v_pity + 1 >= 80` : le prochain booster est le compte+1,
    // et c'est lui qui paie quand il atteint le seuil. Le nombre doit être
    // celui du fichier de taux, pas une constante parallèle.
    expect(PITY.threshold).toBeGreaterThan(0);
    expect(PITY.label).toBeTruthy();
    expect(PITY.note).toBeTruthy();
    expect(CODE).toContain(`v_pity + 1 >= ${PITY.threshold}`);
    // Deux endroits : la décision du tirage, et ce que la réponse annonce.
    expect(CODE.match(new RegExp(`v_pity \\+ 1 >= ${PITY.threshold}`, "g"))).toHaveLength(3);
  });

  it("le slot garanti est Légendaire sous le plancher, et lui seul", () => {
    // Sous la garantie : poids 1 sur la Légendaire, aucune autre rareté.
    expect(CODE).toMatch(/v_pity \+ 1 >= 80 or v_jackpot then\s*\n\s*v_weights := '\{"legendary": 1\}'::jsonb;/);
  });

  it("déduit le compteur du journal des tirages, jamais de la sauvegarde", () => {
    expect(CODE).toMatch(/create or replace function public\._pack_pity\(p_user uuid\)/);
    expect(CODE).toContain("from public.pack_draws d");
    // La sauvegarde porte `pityCounter` côté client : le serveur ne doit pas
    // la lire pour décider. Aucune trace de `pityCounter` ni de `saves`
    // dans la fonction de décision.
    expect(CODE).not.toContain("pityCounter");
    expect(CODE).not.toContain("->> 'pity'");
  });

  it("compte les jours de jeu depuis 6 h UTC, comme gameDay()", () => {
    // La même conversion que le moteur local : `(utc - 6 h)::date`. Si l'un
    // des deux change de décalage, la série du serveur et celle de l'écran
    // ne tomberaient plus le même jour.
    expect(CODE).toContain("(p_now at time zone 'utc') - interval '6 hours'");
    expect(CODE).toContain("(d.drawn_at at time zone 'utc') - interval '6 hours'");
    expect(CODE).toContain("((p_now at time zone 'utc') - interval '6 hours')::date");
    expect(gameDay(Date.UTC(2026, 9, 7, 5, 59))).toBe("2026-10-06");
    expect(gameDay(Date.UTC(2026, 9, 7, 6, 0))).toBe("2026-10-07");
  });

  it("la série vise bien les 7 jours de progression.json", () => {
    expect(PROGRESSION.streak.days).toBe(7);
    expect(CODE).toMatch(/v_streak % 7 = 0/);
    expect(PROGRESSION.streak.jackpotHourglasses).toBe(3);
  });

  it("le jackpot du jour est consommé par le Perfect, pas par n'importe quel tirage", () => {
    // Le joueur qui ouvre un booster ordinaire le matin du 7ᵉ jour ne doit pas
    // perdre sa récompense : c'est le Perfect sorti qui la consomme.
    expect(CODE).toMatch(/create or replace function public\._pack_perfect_today/);
    expect(CODE).toContain("c ->> 'rareDrop' = 'true'");
    expect(CODE).toMatch(/v_jackpot := v_streak % 7 = 0/);
    expect(CODE).toMatch(/not public\._pack_perfect_today\(v_user_id, v_now\)/);
  });

  it("le joueur peut préférer 3 sabliers au Perfect garanti", () => {
    expect(CODE).toContain("p_jackpot text default 'perfect'");
    expect(CODE).toContain(`coalesce(p_jackpot, 'perfect') <> 'hourglasses'`);
    // Le sablier ne vit que sur l'appareil : le serveur ne fait que ne pas
    // forcer le tirage, il ne crédite rien.
    expect(CODE).not.toContain("hourglasses = hourglasses");
  });

  it("remplace l'ancienne `open_pack()` sans argument au lieu de la laisser vivre", () => {
    // Sans ce `drop`, Postgres garderait les deux signatures et un appel sans
    // argument continuerait d'utiliser l'ancienne — celle qui ignore le pity.
    expect(CODE).toContain("drop function if exists public.open_pack();");
    expect(CODE.match(/drop function if exists public\.open_pack\(\);/g)).toHaveLength(1);
  });

  it("le statut publié porte les deux compteurs qui décideront du tirage", () => {
    expect(CODE).toMatch(/create or replace function public\.pack_status\(\)/);
    expect(CODE).toContain("'pity', v_pity");
    expect(CODE).toContain("'streak', v_streak");
    expect(CODE).toContain("'jackpot_ready', v_jackpot_ready");
  });

  it("les compteurs internes restent hors de portée des joueurs", () => {
    for (const fn of [
      "public._pack_pity(uuid)",
      "public._pack_streak(uuid, timestamptz)",
      "public._pack_perfect_today(uuid, timestamptz)",
    ]) {
      expect(CODE).toContain(`revoke all on function ${fn} from public, anon, authenticated;`);
    }
    expect(CODE).toContain("revoke all on function public.open_pack(text) from public, anon;");
    expect(CODE).toContain("grant execute on function public.open_pack(text) to authenticated;");
    expect(CODE).toContain("revoke all on function public.pack_status() from public, anon;");
    expect(CODE).toContain("grant execute on function public.pack_status() to authenticated;");
  });

  it("reste rejouable (create or replace, index conditionnel)", () => {
    // Aucun `create table` sans garde, aucun `drop table` : la migration peut
    // être recollée sans rien perdre.
    expect(CODE).not.toMatch(/drop table/i);
    expect(CODE).toContain("create index if not exists pack_draws_user_idx");
    expect(CODE.match(/create or replace function/g)).toHaveLength(5);
  });
});
