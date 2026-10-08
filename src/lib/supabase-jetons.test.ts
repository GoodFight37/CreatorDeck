/**
 * Garde-fous sur `supabase/migrations/0035_jetons.sql` — les jetons au serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est
 * le **contrat** entre le SQL, le barème publié (`src/data/progression.json`) et
 * le moteur local. L'exécution réelle — bascule d'un compte existant, tirage
 * qui paie 5 ou 7, Prime Time aux bornes dans le fuseau du jeu, refus d'une
 * Légendaire, solde gonflé recollé — est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : le solde vivait dans la sauvegarde, donc un client bricolé s'offrait
 * les cartes de son choix — et ces cartes comptaient dans la collection, celle
 * sur laquelle le serveur paie les paliers de complétion. Ce fichier tient les
 * deux copies du barème ensemble : si quelqu'un retouche 5, 7, 10, 15 ou 400
 * d'un seul côté, la suite tombe avant le jeu.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOKEN_TARGET_COST, PROGRESSION, tokensForPack } from "@/lib/progression";
import { applyPackResult, applyTokens, createInitialState, type PlayerState } from "@/lib/game-engine";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const SQL = readFileSync(path.join(MIGRATIONS, "0035_jetons.sql"), "utf8");
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
/** Le fichier sans ses retours à la ligne : une expression court sur deux lignes. */
const FLAT = CODE.replace(/\s+/g, " ");

const migrations = readdirSync(MIGRATIONS)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

/** Le contenu de la **dernière** migration qui définit `nom`. */
function derniereDefinition(nom: string): string {
  let trouve = "";
  for (const fichier of migrations) {
    const sql = readFileSync(path.join(MIGRATIONS, fichier), "utf8");
    if (sql.includes(`create or replace function public.${nom}(`)) trouve = sql;
  }
  if (!trouve) throw new Error(`aucune migration ne définit ${nom}`);
  return trouve;
}

function corpsFonction(sql: string, nom: string): string {
  const debut = sql.indexOf(`create or replace function public.${nom}(`);
  if (debut < 0) throw new Error(`${nom} absente du fichier`);
  const fin = sql.indexOf("$$;", debut);
  return sql.slice(debut, fin < 0 ? undefined : fin);
}

describe("0035_jetons.sql (les jetons au serveur)", () => {
  it("applique le barème publié, à la lettre", () => {
    // 5 par booster, 2 de plus en Prime Time, 400 pour la carte visée, et les
    // primes de série du fichier. Les littéraux sont lus dans le corps des
    // fonctions : un barème cherché « quelque part dans le fichier » finirait
    // par être trouvé dans un commentaire.
    expect(FLAT).toMatch(/select 5 \+ case when public\._tokens_prime_time\(p_at\) then 2 else 0 end/);
    expect(FLAT).toMatch(/'craft', 400/);
    expect(CODE).toMatch(/when 4 then 10/);
    expect(CODE).toMatch(/when 6 then 15/);
    expect(PROGRESSION.tokens.perPack).toBe(5);
    expect(PROGRESSION.tokens.primeTimeBonus).toBe(2);
    expect(TOKEN_TARGET_COST).toBe(400);
    // Les primes de série du fichier, jour par jour — la même table que
    // `_streak_reward_tokens()`, lue là où elle vit.
    const jetonsParJour = new Map(PROGRESSION.streak.rewards.map((r) => [r.day, r.tokens ?? 0]));
    expect(jetonsParJour.get(4)).toBe(10);
    expect(jetonsParJour.get(6)).toBe(15);
    for (const day of [1, 2, 3, 5]) expect(jetonsParJour.get(day) ?? 0).toBe(0);
  });

  it("paie le booster, et pas le Paquet Scène", () => {
    const trigger = corpsFonction(derniereDefinition("_wallet_on_draw"), "_wallet_on_draw");
    expect(trigger).toMatch(/if new\.kind <> 'scene' then/);
    expect(trigger).toMatch(/public\._tokens_per_pack\(new\.drawn_at\)/);
    // Les points du tirage restent payés exactement comme avant (12, ou 10 pour
    // une scène) : cette migration ajoute les jetons, elle ne retouche pas la
    // première caisse.
    expect(trigger).toMatch(/case when new\.kind = 'scene' then 10 else 12 end/);
    expect(trigger).toMatch(/'scene' else 'pack' end,\s+new\.id::text/);
  });

  it("reprend `open_pack` dans sa **dernière** version (la réserve de deux boosters)", () => {
    // Le piège vécu : reprendre `0032` au lieu de `0033` remettait la réserve
    // d'accueil à trois boosters — `0033` annulée en silence, et le contrôle du
    // départ maigre tombait.
    const derniere = derniereDefinition("open_pack");
    const corps = corpsFonction(derniere, "open_pack");
    expect(corps).toMatch(/values \(v_user_id, public\._pack_initial_packs\(\), v_now, 0, v_now\)/);
    // Et c'est bien `0035` qui porte la dernière définition, avec sa prime de
    // jetons et la même référence de journée de jeu que les points.
    expect(derniere).toContain("0035");
    expect(corps).toMatch(/v_tokens_serie := public\._streak_reward_tokens\(v_jour\)/);
    expect(corps).toMatch(/'serie-j' \|\| v_jour::text \|\| '-' \|\| public\._pack_game_day\(v_now\)::text/);
    // La réponse porte les jetons du jour, et l'écran ne les invente pas.
    expect(FLAT).toMatch(/'streak_reward', jsonb_build_object\('day', v_jour, 'points', v_points_serie, 'tokens', v_tokens_serie\)/);
    // Signatures inchangées : `create or replace` remplace, il ne surcharge pas.
    expect(FLAT).toMatch(/create or replace function public\.open_pack\(p_jackpot text default 'perfect'\)/);
  });

  it("garde le solde et son journal au serveur, fermés au client", () => {
    expect(CODE).toMatch(/create table if not exists public\.tokens \(/);
    expect(CODE).toMatch(/create table if not exists public\.token_ledger \(/);
    expect(CODE).toMatch(/create unique index if not exists token_ledger_once\s+on public\.token_ledger \(user_id, kind, ref\)/);
    expect(CODE).toMatch(/alter table public\.tokens enable row level security;/);
    expect(CODE).toMatch(/alter table public\.token_ledger enable row level security;/);
    expect(CODE).toMatch(/revoke all on table public\.tokens from public, anon, authenticated;/);
    expect(CODE).toMatch(/revoke all on sequence public\.token_ledger_id_seq from public, anon, authenticated;/);
    // Les deux portes du joueur sont ouvertes aux connectés seulement.
    expect(CODE).toMatch(/revoke all on function public\.tokens_get\(\) from public, anon;/);
    expect(CODE).toMatch(/grant execute on function public\.tokens_get\(\) to authenticated;/);
    expect(CODE).toMatch(/revoke all on function public\.tokens_spend\(text\) from public, anon;/);
    expect(CODE).toMatch(/grant execute on function public\.tokens_spend\(text\) to authenticated;/);
    // Les internes ne sont ouvertes à personne.
    for (const signature of [
      "public\\._tokens_ensure\\(uuid\\)",
      "public\\._tokens_apply\\(uuid, integer, text, text\\)",
      "public\\._tokens_mirror\\(uuid, integer\\)",
      "public\\._tokens_prime_time\\(timestamptz\\)",
      "public\\._tokens_per_pack\\(timestamptz\\)",
    ]) {
      expect(FLAT).toMatch(new RegExp(`revoke all on function ${signature} from public, anon, authenticated;`));
    }
  });

  it("la bascule reprend le solde de la sauvegarde, une seule fois et bornée", () => {
    const ensure = corpsFonction(SQL, "_tokens_ensure");
    expect(ensure).toMatch(/greatest\(0, least\(1000000, coalesce\(\(s\.state ->> 'tokens'\)::integer, 0\)\)\)/);
    expect(ensure).toMatch(/values \(p_user, v_local, 'bascule', '0035'\)/);
    expect(ensure).toMatch(/on conflict \(user_id, kind, ref\) do nothing/);
    // Un compte existant fait foi : la bascule ne repasse jamais.
    expect(ensure).toMatch(/if v_tokens is not null then\s+return v_tokens;/);
  });

  it("refuse ce qui ne s'achète pas aux jetons", () => {
    const spend = corpsFonction(SQL, "tokens_spend");
    expect(spend).toMatch(/if v_creator\.rarity = 'legendary' then/);
    expect(spend).toMatch(/une Légendaire ne s''achète pas/);
    expect(spend).toMatch(/if v_creator\.retired then/);
    expect(spend).toMatch(/if v_owned then/);
    expect(spend).toMatch(/il te manque % jetons pour cette carte/);
    // Le prix vient du serveur, jamais du client.
    expect(spend).toMatch(/public\.token_prices\(\) ->> 'craft'/);
    // Et le débit passe par le journal, donc une même dépense ne repasse pas.
    expect(spend).toMatch(/public\._tokens_apply\(v_user, -v_cost, 'craft', v_slug\)/);
  });

  it("le moteur ne crédite plus rien quand c'est le serveur qui paie", () => {
    const base = createInitialState(Date.parse("2026-10-07T12:00:00Z"));
    const state: PlayerState = { ...base, packs: 3, streak: 3, tokens: 120 };
    const cartes = [
      { creatorSlug: "ibai", rarity: "rare" as const, variant: "standard" as const, rareDrop: false },
    ];
    const tirage = Date.parse("2026-10-07T12:00:00Z");

    // Hors ligne (ou projet sans `0035`) : le moteur crédite comme avant.
    const local = applyPackResult(state, cartes, 2, tirage, 1, tirage);
    expect(local.state.tokens).toBe(state.tokens + tokensForPack(tirage));

    // En ligne : le serveur a versé, le moteur n'ajoute rien — et le solde est
    // recollé par ce que le serveur a répondu.
    const serveur = applyPackResult(state, cartes, 2, tirage, 1, tirage, {
      pointsFromServer: true,
      tokensFromServer: true,
      rewardDay: 4,
      rewardPoints: 80,
      rewardTokens: 10,
    });
    expect(serveur.state.tokens).toBe(state.tokens);
    // L'annonce, elle, dit ce que le serveur a vraiment versé : le jour 4 paie
    // 10 jetons, et la réponse le confirme.
    expect(serveur.streakReward?.tokens).toBe(10);
    expect(serveur.streakReward?.points).toBe(80);
    // Un jour déjà payé (le serveur dit 0) : il n'y a **rien** à annoncer, et
    // surtout pas des jetons que le serveur n'a pas versés.
    const dejaPaye = applyPackResult(state, cartes, 2, tirage, 1, tirage, {
      pointsFromServer: true,
      tokensFromServer: true,
      rewardDay: 4,
      rewardPoints: 0,
      rewardTokens: 0,
    });
    expect(dejaPaye.state.tokens).toBe(state.tokens);
    expect(dejaPaye.streakReward).toBeNull();
  });

  it("le miroir local est écrit par le serveur, jamais l'inverse", () => {
    const base = createInitialState(0);
    const state: PlayerState = { ...base, tokens: 999_999 };
    // Comme `applyWallet` pour les points : un solde bricolé disparaît à la
    // première lecture, et une réponse illisible ne casse rien.
    expect(applyTokens(state, 400).tokens).toBe(400);
    expect(applyTokens(state, Number.NaN)).toBe(state);
    expect(applyTokens(state, -5).tokens).toBe(0);
    expect(applyTokens(state, 999_999)).toBe(state);
  });
});
