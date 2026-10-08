/**
 * Garde-fou sur `supabase/migrations/0018_arena.sql` — l'arène.
 *
 * Même contrat que `0013`/`progression.json` et `0014`/`pull-rates.json` : les
 * règles du jeu vivent dans `src/data/arena.json`, et le SQL les **recopie**.
 * Deux endroits, une seule vérité — ce fichier est ce qui l'empêche de diverger.
 * Si quelqu'un change le seuil des Légendaires dans `arena.json` sans toucher au
 * SQL (ou l'inverse), la suite de tests s'arrête ici plutôt qu'à l'écran d'un
 * joueur.
 *
 * Ce qui se vérifie sans base : les nombres, les fenêtres de temps et le
 * contrat des fonctions. L'exécution réelle (dépôt d'une arène, score, refus,
 * classement, récompenses, draft reproductible) est dans
 * `scripts/verify-supabase-migrations.mjs`, sur une base jetable.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARENA_DRAFT_CHOICES,
  ARENA_EMBLEM_TOP,
  ARENA_LINEUP_SIZE,
  ARENA_MAX_LEGENDARY,
  ARENA_REQUIRES_LIVE,
  arenaDraftWindow,
  arenaHourglasses,
  arenaWeekKey,
} from "@/lib/arena";
import { LIVE_TTL_MS } from "@/lib/live";

const SQL = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "0018_arena.sql"),
  "utf8",
);
// Les contrôles de motifs portent sur le code seul : un commentaire qui explique
// une règle cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0018_arena.sql (l'arène)", () => {
  it("cinq cartes, au plus une Légendaire, un direct obligatoire", () => {
    expect(ARENA_LINEUP_SIZE).toBe(5);
    expect(ARENA_MAX_LEGENDARY).toBe(1);
    expect(ARENA_REQUIRES_LIVE).toBe(true);

    expect(CODE).toContain("constraint arena_cinq_cartes check (jsonb_array_length(lineup) = 5)");
    expect(CODE).toContain("constraint arena_draft_cinq check (jsonb_array_length(picks) = 5)");
    expect(CODE).toContain("if v_legendaries > 1 then");
    expect(CODE).toContain("if not v_has_live then");
    // Le message est celui que l'écran affichera : il ne doit pas changer seul.
    expect(CODE).toContain("Il faut au moins un créateur en direct dans l''arène.");
    expect(CODE).toContain("Deux fois la même carte dans l''arène : non.");
  });

  it("la semaine commence le lundi à 6 h UTC, comme le jour de jeu", () => {
    // Le SQL dérive du « jour de jeu » de 0014 (6 h UTC) et recule au lundi :
    // la même transformation que `arenaWeekKey()` en TypeScript.
    expect(CODE).toContain("public._pack_game_day(p_at)");
    expect(CODE).toContain("(extract(dow from public._pack_game_day(p_at))::integer + 6) % 7");
    expect(CODE).toContain("'YYYY-MM-DD'");
    // Deux dates de référence, vérifiées des deux côtés.
    expect(arenaWeekKey(Date.parse("2026-10-07T12:00:00Z"))).toBe("2026-10-05");
    expect(arenaWeekKey(Date.parse("2026-10-05T05:59:00Z"))).toBe("2026-09-28");
    // La fin de semaine publiée est le lundi suivant à 6 h UTC.
    expect(CODE).toContain("interval '7 days 6 hours'");
  });

  it("le draft n'ouvre que le week-end — samedi et dimanche, 0 compris", () => {
    // `extract(dow …)` rend 0 pour dimanche : la même erreur a été commise en
    // TypeScript, la voilà écrite dans les deux langages.
    expect(CODE).toContain("extract(dow from public._pack_game_day(p_at))::integer in (6, 0)");
    const samedi = Date.parse("2026-10-10T12:00:00Z");
    const dimanche = Date.parse("2026-10-11T21:00:00Z");
    const mercredi = Date.parse("2026-10-07T12:00:00Z");
    expect(arenaDraftWindow(samedi).open).toBe(true);
    expect(arenaDraftWindow(dimanche).open).toBe(true);
    expect(arenaDraftWindow(mercredi).open).toBe(false);
    // Quarante-huit heures, pas une de plus.
    expect(arenaDraftWindow(samedi).closesAt - arenaDraftWindow(samedi).opensAt).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("le draft propose trois cartes par emplacement, sur cinq emplacements", () => {
    expect(ARENA_DRAFT_CHOICES).toBe(3);
    expect(CODE).toContain("for v_slot in 0..4 loop");
    // Quinze cartes prises à la suite dans la collection triée, à partir d'un
    // point de départ tiré du joueur et de la semaine — donc reproductible, et
    // sans doublon quand la collection compte au moins quinze cartes.
    expect(CODE).toContain("for v_index in 0..14 loop");
    expect(CODE).toContain("v_cards := v_cards || p_owned[1 + ((v_start - 1 + v_index) % v_count)]");
    expect(CODE).toContain("hashtext(p_user::text || '|' || p_week || '|grille')");
    // Trois cartes par emplacement, dans l'ordre du tirage.
    expect(CODE).toContain("v_cards[v_slot * 3 + 1]");
    expect(CODE).toContain("v_cards[v_slot * 3 + 3]");
  });

  it("les récompenses sont celles des données, pas celles du SQL", () => {
    expect(arenaHourglasses(1)).toBe(5);
    expect(arenaHourglasses(2)).toBe(3);
    expect(arenaHourglasses(3)).toBe(2);
    expect(arenaHourglasses(10)).toBe(1);
    expect(ARENA_EMBLEM_TOP).toBe(10);

    expect(CODE).toContain("when v_rank = 1 then 5");
    expect(CODE).toContain("when v_rank = 2 then 3");
    expect(CODE).toContain("when v_rank = 3 then 2");
    expect(CODE).toContain("when v_rank <= 10 then 1");
    expect(CODE).toContain("v_rank <= 10)");
  });

  it("le score ne compte que le direct frais, comme le bonus Direct", () => {
    // Dix minutes : la même fraîcheur que `LIVE_TTL_MS`, sinon un score
    // calculé sur un direct périmé serait un score faux.
    expect(LIVE_TTL_MS).toBe(10 * 60 * 1000);
    expect(CODE).toContain("s.refreshed_at > now() - interval '10 minutes'");
    expect(CODE).toContain("'viewers', v_viewers_n");
    expect(CODE).toContain("'live', v_viewers_n > 0");
  });

  it("une arène ne se dégrade pas", () => {
    // Le meilleur score de la semaine reste : un essai raté n'efface pas un bon
    // dépôt. C'est une règle de jeu, elle doit être visible dans le SQL.
    expect(CODE).toContain("score        = greatest(e.score, excluded.score)");
    expect(CODE).toContain("'kept', coalesce(v_before, -1) > (v_scored ->> 'score')::integer");
  });

  it("les récompenses ne se réclament qu'une fois, et seulement après la semaine", () => {
    expect(CODE).toContain("raise exception 'arène : la semaine n''est pas terminée'");
    expect(CODE).toContain("from public.arena_claims c");
    expect(CODE).toContain("primary key (user_id, week_key)");
    // Le deuxième appel répond « déjà réclamé » avec zéro sablier.
    expect(CODE).toContain("'claimed', true");
    expect(CODE).toContain("'hourglasses', 0");
  });

  it("les tables ne sont lisibles que par les fonctions", () => {
    for (const table of ["arena_entries", "arena_drafts", "arena_claims"]) {
      expect(CODE).toContain(`revoke all on table public.${table} from public, anon, authenticated;`);
      expect(CODE).toContain(`alter table public.${table} enable row level security;`);
    }
    // Aucune politique : personne ne lit ces tables directement.
    expect(CODE).not.toMatch(/create policy[^;]*arena_/);
  });

  it("les droits suivent la règle du dépôt : rien pour anon, sauf le classement", () => {
    for (const fn of [
      "arena_submit(text[])",
      "arena_me()",
      "arena_claim(text)",
      "arena_draft_choices()",
      "arena_draft_pick(text[])",
    ]) {
      expect(CODE).toContain(`revoke all on function public.${fn} from public, anon;`);
      expect(CODE).toContain(`grant execute on function public.${fn} to authenticated;`);
    }
    // Le classement est un tableau d'affichage : il se lit même sans compte.
    expect(CODE).toContain("grant execute on function public.arena_leaderboard(text) to anon, authenticated;");
    // Les fonctions internes ne sont appelables par personne.
    for (const fn of [
      "_arena_week_key(timestamptz)",
      "_arena_owned_slugs(uuid)",
      "_arena_owned_catalog_slugs(uuid)",
      "_arena_live_viewers()",
      "_arena_live_slugs(uuid, text[])",
      "_arena_legendary_slugs(text[])",
      "_arena_score(text[])",
      "_arena_problems(uuid, text[])",
      "_arena_draft_slots(uuid, text, text[], text[], text[])",
    ]) {
      expect(CODE).toContain(`revoke all on function public.${fn} from public, anon;`);
    }
  });

  it("garantit un draft jouable : une carte en direct, jamais deux triples légendaires", () => {
    // Un draft injouable est un draft perdu : il n'y en a qu'un par semaine.
    // Deux garanties, écrites dans le SQL et vérifiées aussi sur une vraie base
    // (`scripts/verify-supabase-migrations.mjs`).
    expect(CODE).toContain("public._arena_live_slugs(v_user, v_owned)");
    expect(CODE).toContain("public._arena_owned_catalog_slugs(v_user)");
    expect(CODE).toContain("public._arena_legendary_slugs(v_owned)");
    expect(CODE).toContain("if not v_has_live then");
    expect(CODE).toContain("if v_forced > 1 and v_plain_count > 0 then");
    // Le choix accepte une carte du tirage **de base** : entre l'écran et
    // l'envoi, le direct peut bouger, et l'arène reste jugée à l'instant du
    // choix par `_arena_problems`.
    expect(CODE).toContain("v_base := public._arena_draft_slots(v_user, v_week, v_owned);");
    expect(CODE).toContain("v_problems := public._arena_problems(v_user, p_lineup);");
  });

  it("est rejouable : rien à supprimer, rien à recréer de zéro", () => {
    expect(CODE).not.toMatch(/drop table/);
    // Une seule suppression, et elle est motivée : l'ancienne signature de
    // l'aide au draft (trois arguments), qui resterait sinon appelable **sans**
    // les garanties du draft.
    const drops = CODE.match(/drop function[^;]*;/g) ?? [];
    expect(drops).toHaveLength(1);
    expect(drops[0]).toContain("drop function if exists public._arena_draft_slots(uuid, text, text[])");
    expect(CODE).toContain("create table if not exists public.arena_entries");
    expect(CODE).toContain("create table if not exists public.arena_drafts");
    expect(CODE).toContain("create table if not exists public.arena_claims");
  });
});
