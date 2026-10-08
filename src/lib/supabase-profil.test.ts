/**
 * Garde-fous sur `supabase/migrations/0006_profil_public.sql`.
 *
 * Cette migration ouvre une chose et en ferme une autre : elle publie des
 * chiffres sur chaque joueur (complétion, rangs, vitrine) et, pour cela, recopie
 * les cartes de tout le monde dans une table indexable. Une erreur de politique
 * RLS y exposerait la collection complète d'un joueur ; une erreur de comptage y
 * gonflerait la complétion affichée. Ces tests verrouillent le contrat sans
 * exécuter Postgres — l'exécution réelle (projection, complétion, rangs, tri
 * Gold, trois joueurs dont un invraisemblable) est dans
 * `scripts/verify-supabase-migrations.mjs`.
 *
 * Les quatre invariants :
 *   1. `user_cards` est **invisible des clients** : aucune politique, et les
 *      droits de table sont retirés même au rôle `authenticated` ;
 *   2. la projection ne garde que des **créateurs du catalogue** — sinon 900
 *      slugs inventés fabriqueraient 90 % de complétion ;
 *   3. `player_profile()` est `security definer` (elle doit lire la projection)
 *      mais ne renvoie jamais une carte : des compteurs, la vitrine, rien
 *      d'autre ;
 *   4. le classement expose les nouveaux tris et reste réservé aux joueurs
 *      connectés.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0006_profil_public.sql"), "utf8");
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/** Le corps d'une fonction, jusqu'à la définition suivante. */
function bodyOf(name: string): string {
  const start = CODE.indexOf(`function public.${name}(`);
  expect(start, `${name} introuvable dans 0006`).toBeGreaterThan(-1);
  const rest = CODE.slice(start);
  const next = rest.indexOf("create or replace function", 10);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("0006_profil_public.sql", () => {
  it("garde la projection des cartes hors de portée des clients", () => {
    expect(CODE).toMatch(/create table if not exists public\.user_cards/);
    expect(CODE).toMatch(/alter table public\.user_cards enable row level security/);
    // Aucune politique sur `user_cards` : c'est ce qui la rend invisible, même
    // pour le joueur dont les cartes y sont.
    expect(CODE).not.toMatch(/create policy[\s\S]{0,120}on public\.user_cards/);
    expect(CODE).toMatch(/revoke all on table public\.user_cards from public, anon, authenticated/);
  });

  it("ne projette que des créateurs du catalogue", () => {
    const projection = bodyOf("project_cards");
    expect(projection).toMatch(/exists\s*\(\s*select 1 from public\.creators c where c\.slug = lower/);
    expect(projection).toMatch(/security definer/);
    expect(projection).toMatch(/set search_path = public/);
    // Une écriture par `delete` + `insert` : la projection suit la sauvegarde au
    // lieu de s'y ajouter.
    expect(projection).toMatch(/delete from public\.user_cards where user_id = new\.user_id/);
    expect(projection).toMatch(/on conflict \(user_id, card_id\) do nothing/);
  });

  it("recalcule la projection à chaque écriture de sauvegarde", () => {
    expect(CODE).toMatch(/create trigger saves_project_cards\s*\n\s*after insert or update of state on public\.saves/);
    // Et remplit la table pour les joueurs déjà en ligne, par le trigger (un
    // seul chemin de calcul, pas deux).
    expect(CODE).toMatch(/update public\.saves set state = state;/);
  });

  it("ne compte que les créateurs réels dans les statistiques", () => {
    const stats = bodyOf("refresh_stats");
    expect(stats).toMatch(/exists\s*\(\s*select 1 from public\.creators c where c\.slug = lower/);
    expect(stats).toMatch(/gold_cards/);
    expect(stats).toMatch(/holo_cards/);
    // `total_cards` reste le compte brut de la sauvegarde.
    expect(stats).toMatch(/jsonb_array_length\(cards\)/);
  });

  it("publie un profil complet sans jamais nommer une carte", () => {
    const profile = bodyOf("player_profile");
    expect(profile).toMatch(/security definer/);
    expect(profile).toMatch(/set search_path = public/);
    for (const field of ["completion", "rank_completion", "rank_cards", "by_rarity", "showcase_slugs", "catalog_size"]) {
      expect(profile, `champ ${field} manquant`).toMatch(new RegExp(`'${field}'`));
    }
    // La projection sert à compter, pas à recracher : aucun identifiant de carte
    // ne sort de la fiche.
    expect(profile).not.toMatch(/card_id/);
    // Aucun agrégat de cartes non plus : la fiche compte, elle ne liste pas.
    expect(profile).not.toMatch(/jsonb_agg|array_agg|jsonb_build_array/);
  });

  it("ajoute le tri Gold au classement, sans perdre les anciens", () => {
    const leaderboard = bodyOf("leaderboard");
    for (const metric of ["unique_creators", "total_cards", "legendary_cards", "gold_cards"]) {
      expect(leaderboard, `tri ${metric} manquant`).toMatch(new RegExp(metric));
    }
    expect(leaderboard).toMatch(/completion/);
    expect(leaderboard).toMatch(/where s\.verified/);
    // La signature change : l'ancienne fonction doit être supprimée avant.
    const drop = CODE.indexOf("drop function if exists public.leaderboard(integer, text)");
    expect(drop).toBeGreaterThan(-1);
    expect(drop).toBeLessThan(CODE.indexOf("create or replace function public.leaderboard("));
  });

  it("classe aussi par famille de collection", () => {
    const leaderboard = bodyOf("leaderboard");
    // Le tri par famille lit `user_cards`, fermé aux clients : la fonction doit
    // donc être `security definer`, et ne rendre qu'un compteur par famille.
    expect(leaderboard).toMatch(/p_region text default null/);
    expect(leaderboard).toMatch(/when p_metric = 'family' then coalesce\(o\.owned, 0\)/);
    expect(leaderboard).toMatch(/family_owned/);
    expect(leaderboard).toMatch(/family_total/);
    expect(leaderboard).toMatch(/coalesce\(c\.region, 'S10'\)/);
    expect(leaderboard).toMatch(/security definer/);
    expect(leaderboard).not.toMatch(/creator_slug as|uc\.card_id/);
    // L'ancienne signature à deux arguments est supprimée aussi : sans cela,
    // deux fonctions coexisteraient et un client pourrait appeler celle qui
    // ignore les familles.
    expect(CODE).toMatch(/drop function if exists public\.leaderboard\(integer, text, text\)/);
  });

  it("n'ouvre rien aux visiteurs non connectés", () => {
    for (const fn of ["player_profile(uuid)", "leaderboard(integer, text, text)"]) {
      expect(CODE).toMatch(new RegExp(`revoke all on function public\\.${fn.replace(/[()]/g, "\\$&")} from public, anon`));
      expect(CODE).toMatch(new RegExp(`grant execute on function public\\.${fn.replace(/[()]/g, "\\$&")} to authenticated`));
    }
    // La fonction du trigger ne s'appelle pas depuis un client.
    expect(CODE).toMatch(/revoke all on function public\.project_cards\(\) from public, anon, authenticated/);
  });

  it("reste rejouable", () => {
    expect(CODE.match(/add column if not exists/g)).toHaveLength(2);
    expect(CODE).toMatch(/drop trigger if exists saves_project_cards/);
    expect(CODE).toMatch(/drop function if exists public\.leaderboard\(integer, text\)/);
    expect(CODE).toMatch(/drop function if exists public\.leaderboard\(integer, text, text\)/);
  });
});
