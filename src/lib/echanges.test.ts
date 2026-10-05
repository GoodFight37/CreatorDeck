/**
 * Garde-fous sur `supabase/migrations/0005_echanges.sql`.
 *
 * Le troc est la partie où une erreur se paie le plus cher : une carte volée ou
 * dupliquée est irréparable. Ces tests verrouillent le contrat entre le SQL et
 * le client, sans exécuter Postgres (l'exécution réelle, trois joueurs et
 * quatre échanges joués de bout en bout, est dans
 * `scripts/verify-supabase-migrations.mjs`).
 *
 * Les trois invariants :
 *   1. **un client ne peut pas écrire dans `trades`** — aucune politique
 *      d'insertion, de mise à jour ni de suppression, et les fonctions internes
 *      sont interdites aux joueurs ;
 *   2. **les deux collections bougent ensemble** — `respond_trade` verrouille
 *      les deux sauvegardes, retire les cartes, les ajoute et contrôle que les
 *      deux états restent valides avant d'écrire ;
 *   3. **le client applique exactement la même règle** — retrait de la copie la
 *      plus ancienne, marque `fromTrade` (identifiants d'idempotence), variantes
 *      limitées à celles du catalogue.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyTradeResult, createInitialState, type OwnedCard, type PlayerState } from "@/lib/game-engine";
import { VARIANT_META } from "@/lib/catalog";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0005_echanges.sql"), "utf8");
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/** Fonctions publiques que les joueurs appellent (et les internes, préfixées `_`). */
const PUBLIC_FUNCTIONS = [
  "search_players",
  "player_variants",
  "create_trade",
  "respond_trade",
  "cancel_trade",
  "list_trades",
] as const;
const INTERNAL_FUNCTIONS = [
  "_trade_cards",
  "_trade_missing",
  "_trade_remove",
  "_trade_add",
  "_trade_json",
  "_trade_clean_showcase",
] as const;

const card = (id: string, variant: OwnedCard["variant"], obtainedAt: number): OwnedCard => ({
  id,
  creatorSlug: "ibai",
  rarity: "legendary",
  variant,
  obtainedAt,
  rareDrop: false,
});

describe("0005_echanges.sql", () => {
  it("protège chaque fonction sensible en `security definer` avec un `search_path` figé", () => {
    for (const name of PUBLIC_FUNCTIONS) {
      const body = CODE.slice(CODE.indexOf(`function public.${name}(`));
      const head = body.slice(0, body.indexOf("$$"));
      expect(head, `${name} doit être security definer`).toContain("security definer");
      expect(head, `${name} doit figer le search_path`).toContain("set search_path = public");
    }
  });

  it("réserve les fonctions internes aux fonctions, jamais aux joueurs", () => {
    for (const name of INTERNAL_FUNCTIONS) {
      expect(CODE).toMatch(
        new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated`),
      );
    }
  });

  it("n'ouvre les fonctions publiques qu'aux joueurs connectés", () => {
    for (const name of PUBLIC_FUNCTIONS) {
      expect(CODE).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon`));
      expect(CODE).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated`));
    }
  });

  it("laisse `trades` en lecture seule pour les joueurs", () => {
    expect(CODE).toContain("alter table public.trades enable row level security");
    expect(CODE).toContain("on public.trades for select");
    // Aucune politique d'écriture : ni insert, ni update, ni delete.
    expect(CODE).not.toMatch(/on public\.trades\s+for (insert|update|delete)/);
    expect(CODE).not.toMatch(/on public\.trades\s+for all/);
  });

  it("refuse un échange avec soi-même et borne les cartes de chaque côté", () => {
    expect(CODE).toContain("proposer_id <> recipient_id");
    expect(CODE).toMatch(/jsonb_array_length\(proposer_cards\) between 1 and 5/);
    expect(CODE).toMatch(/jsonb_array_length\(recipient_cards\) between 1 and 5/);
  });

  it("accepte exactement les variantes du catalogue", () => {
    const declared = CODE.match(/array\[([^\]]*)\]/)?.at(1) ?? "";
    for (const variant of Object.keys(VARIANT_META)) {
      expect(declared, `variante ${variant} absente du SQL`).toContain(`'${variant}'`);
    }
    // Et rien de plus : une variante inventée côté SQL passerait dans les
    // sauvegardes sans que le client sache l'afficher.
    const mentioned = [...declared.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(new Set(mentioned)).toEqual(new Set(Object.keys(VARIANT_META)));
  });

  it("ne croit pas le client sur la rareté : elle est recopiée du catalogue", () => {
    const helper = CODE.slice(CODE.indexOf("function public._trade_cards("));
    expect(helper.slice(0, helper.indexOf("$$"))).toContain("stable");
    expect(helper).toMatch(/select c\.rarity into v_rarity from public\.creators c where c\.slug = v_slug/);
    expect(helper).toContain("'rarity', v_rarity");
  });

  it("retire la copie la plus ancienne, comme le moteur local", () => {
    const helper = CODE.slice(CODE.indexOf("function public._trade_remove("));
    expect(helper).toContain("order by coalesce((value ->> 'obtainedAt')::bigint, 0), value ->> 'id'");
    expect(helper).toContain("limit 1");

    // Même règle côté client : c'est la vieille copie qui part.
    const state: PlayerState = {
      ...createInitialState(0),
      cards: [card("vieux", "holo", 1_000), card("recent", "holo", 9_000)],
    };
    const moved = applyTradeResult(
      state,
      {
        tradeId: 12,
        given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "holo" }],
        received: [],
      },
      1_000_000,
    );
    expect(moved.cards.map((owned) => owned.id)).toEqual(["recent"]);
  });

  it("marque les cartes reçues d'un `fromTrade` que le client reconnaît", () => {
    expect(CODE).toContain("'fromTrade', p_trade_id");

    const state: PlayerState = {
      ...createInitialState(0),
      cards: [card("mine", "standard", 1_000)],
    };
    const move = {
      tradeId: 42,
      given: [{ creatorSlug: "ibai", rarity: "legendary" as const, variant: "standard" as const }],
      received: [{ creatorSlug: "ibai", rarity: "legendary" as const, variant: "gold" as const }],
    };
    const once = applyTradeResult(state, move, 2_000);
    expect(once.cards.map((owned) => owned.fromTrade)).toEqual([42]);
    // Deuxième application : rien ne bouge (le serveur a déjà écrit ce troc).
    expect(applyTradeResult(once, move, 3_000)).toBe(once);
  });

  it("écrit les deux collections dans la même fonction, sous verrou", () => {
    const full = CODE.slice(CODE.indexOf("function public.respond_trade("));
    const body = full.slice(0, full.indexOf("create or replace function"));
    expect(body).toContain("for update");
    expect(body.match(/update public\.saves/g)?.length).toBe(2);
    expect(body).toContain("_trade_remove(v_trade.proposer_cards");
    expect(body).toContain("_trade_remove(v_trade.recipient_cards");
    // Les deux états sont validés avant l'écriture : sans ça, un troc
    // pousserait un joueur en « collection non vérifiée » au classement.
    expect(body).toContain("public.save_problems(v_proposer_state)");
    expect(body).toContain("public.save_problems(v_recipient_state)");
    expect(body).toContain("state_checksum = md5(");
  });

  it("retire de la vitrine les cartes qui partent en échange", () => {
    const full = CODE.slice(CODE.indexOf("function public.respond_trade("));
    const body = full.slice(0, full.indexOf("create or replace function"));
    expect(body.match(/_trade_clean_showcase\(/g)?.length).toBe(2);
    const helper = CODE.slice(CODE.indexOf("function public._trade_clean_showcase("));
    expect(helper.slice(0, helper.indexOf("$$"))).toContain("security definer");
    expect(helper).toContain("update public.profiles");
    expect(helper).toContain("slug = any (v_owned)");
  });

  it("ne réserve la réponse qu'au destinataire et une seule fois", () => {
    const body = CODE.slice(CODE.indexOf("function public.respond_trade("));
    expect(body).toContain("v_trade.recipient_id <> v_user_id");
    expect(body).toContain("v_trade.status <> 'open'");
  });

  it("ne réserve l'annulation qu'au proposeur", () => {
    const body = CODE.slice(CODE.indexOf("function public.cancel_trade("));
    expect(body).toContain("proposer_id = v_user_id");
    expect(body).toContain("status = 'open'");
  });

  it("demande la connexion avant toute opération, et rien d'autre", () => {
    for (const name of PUBLIC_FUNCTIONS) {
      const body = CODE.slice(CODE.indexOf(`function public.${name}(`));
      expect(body.slice(0, body.indexOf("$$")), `${name} sans contrôle de connexion`).toMatch(
        /security definer/,
      );
      expect(body, `${name} doit exiger auth.uid()`).toContain("auth.uid() is not null");
    }
  });

  it("ne déplace que des cartes : ni points, ni XP, ni boosters", () => {
    expect(CODE).not.toMatch(/jsonb_set\([^)]*'(points|xp|level|packs|openings|hourglasses|lastPackRegen)'/);
  });
});
