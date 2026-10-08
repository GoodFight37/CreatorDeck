/**
 * Garde-fous sur `supabase/migrations/0012_last_pack.sql` — le Last Pack.
 *
 * Le PL/pgSQL ne s'exécute pas ici : ce qui est vérifiable dans Vitest, c'est
 * le **contrat** entre le SQL, l'écran (`src/lib/last-pack.ts`) et le moteur
 * (`applyLastPackSteal`). L'exécution réelle (vols joués pour de vrai, refus,
 * garde-fou de `push_save`) est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : c'est une migration qui **retire une carte à quelqu'un**. Une fenêtre
 * trop longue, un vol sans amitié ou une carte volée qui pourrait revenir par
 * une vieille sauvegarde, et le jeu devient faux.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LAST_PACK_WINDOW_MS } from "@/lib/last-pack";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0012_last_pack.sql"), "utf8");
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0012_last_pack.sql (Last Pack)", () => {
  it("expose le paquet dix minutes — ni l'écran ni le SQL ne dérivent", () => {
    expect(LAST_PACK_WINDOW_MS).toBe(600_000);
    expect(CODE).toContain(`interval '${LAST_PACK_WINDOW_MS / 60_000} minutes'`);
  });

  it("publie le paquet depuis le journal des tirages, sans toucher au tirage", () => {
    // `open_pack()` reste celui de 0004/0011, au caractère près : le Last Pack
    // se branche sur l'insertion dans `pack_draws`, pas sur le tirage.
    expect(CODE).toMatch(/create trigger pack_draws_last_pack\s+after insert on public\.pack_draws/);
    expect(CODE).not.toMatch(/create or replace function public\.open_pack/);
  });

  it("garde les cinq cartes du tirage, et pas une de plus", () => {
    expect(CODE).toMatch(/jsonb_array_length\(cards\) = 5/);
    expect(CODE).toMatch(/from jsonb_array_elements\(p_pack\.cards\) with ordinality/);
  });

  it("n'accorde le vol qu'à un ami, et pas à soi-même", () => {
    expect(CODE).toMatch(/if not public\.has_friendship\(v_pack\.user_id\) then/);
    expect(CODE).toMatch(/if v_pack\.user_id = v_user then/);
    expect(CODE).toMatch(/constraint last_pack_pas_de_vol_de_soi check \(owner_id <> thief_id\)/);
  });

  it("une carte par jour, et par jour UTC", () => {
    // L'index unique fait foi : deux appels dans la même seconde ne passent pas.
    expect(CODE).toMatch(/create unique index if not exists last_pack_un_vol_par_jour\s+on public\.last_pack_steals \(thief_id, day\)/);
    expect(CODE).toMatch(/\(v_now at time zone 'utc'\)::date/);
  });

  it("refuse une carte que le propriétaire n'a plus", () => {
    // Sinon un vol serait un cadeau : le serveur vérifie la collection du
    // propriétaire avant de retirer quoi que ce soit.
    expect(CODE).toMatch(/public\._trade_missing\(jsonb_build_array\(v_card\), v_owner_save\.state -> 'cards'\)/);
    expect(CODE).toMatch(/public\._trade_remove\(jsonb_build_array\(v_card\), v_owner_save\.state -> 'cards'\)/);
  });

  it("marque la carte volée comme le fait le moteur (`fromLastPack`)", () => {
    // Le nom du champ est un contrat avec `src/lib/game-engine.ts` et
    // `src/lib/save-store.ts` : le changer d'un seul côté perdrait la carte au
    // premier rechargement (ou la dupliquerait).
    expect(SQL).toContain("'fromLastPack'");
    expect(CODE).toMatch(/public\._last_pack_add\(v_card, v_pack\.id, v_now\)/);
    // Une carte volée n'est jamais un « Perfect » : elle n'a pas été tirée.
    expect(CODE).toMatch(/'rareDrop', false/);
  });

  it("empêche une vieille sauvegarde de faire revenir la carte volée", () => {
    // `push_save()` est réécrite dans cette migration pour ce seul contrôle :
    // il vise l'identifiant exact de la carte prise, pas son couple créateur +
    // variante (elle a le droit de retomber d'un booster).
    expect(CODE).toMatch(/create or replace function public\.push_save\(/);
    expect(CODE).toMatch(/s\.owner_id = auth\.uid\(\)/);
    expect(CODE).toMatch(/p_state -> 'cards' @> jsonb_build_array\(jsonb_build_object\('id', s\.card_id\)\)/);
  });

  it("protège les deux tables par RLS, en lecture seule", () => {
    expect(CODE).toMatch(/alter table public\.last_packs enable row level security;/);
    expect(CODE).toMatch(/alter table public\.last_pack_steals enable row level security;/);
    // Une seule policy, en lecture : tes vols et ceux dont tu es la victime.
    expect(CODE).toMatch(/for select\s+to authenticated\s+using \(auth\.uid\(\) = thief_id or auth\.uid\(\) = owner_id\)/);
    expect(CODE).not.toMatch(/for (insert|update|delete|all)\s+to authenticated/i);
  });

  it("réserve les fonctions aux joueurs connectés", () => {
    for (const signature of ["last_pack_shelf\\(\\)", "last_pack_steal\\(bigint, integer\\)", "last_pack_losses\\(integer\\)"]) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${signature} from public, anon;`));
      expect(SQL).toMatch(new RegExp(`grant execute on function public\\.${signature} to authenticated;`));
    }
    for (const internal of ["_last_pack_publish\\(\\)", "_last_pack_add\\(jsonb, bigint, timestamptz\\)"]) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${internal} from public, anon, authenticated;`));
    }
  });
});
