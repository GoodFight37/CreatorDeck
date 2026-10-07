/**
 * Garde-fous sur `supabase/migrations/0027_wallet.sql` — les points au serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui se vérifie ici, c'est le
 * **contrat**. D'abord les prix : ils vivent en SQL parce que c'est le serveur
 * qui paie, mais ils viennent du jeu (`catalog.ts`, `game-engine.ts`,
 * `seasons.config.json`). Si quelqu'un change un prix d'un côté seulement, ce
 * test casse **avant** que le jeu ne paie deux prix différents selon qu'on est
 * hors ligne ou en ligne.
 *
 * Ensuite les portes : qui peut appeler quoi. L'exécution réelle (un Postgres
 * jetable, une sauvegarde trafiquée qui n'achète rien) est dans
 * `scripts/verify-supabase-migrations.mjs`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PACKS, RARITY_META } from "@/lib/catalog";
import { MILESTONES } from "@/lib/game-engine";
import { SEASONS } from "@/lib/seasons";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0027_wallet.sql"), "utf8");
// Les contrôles portent sur le code seul : un commentaire qui explique une règle
// cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/** Lit un prix dans `wallet_prices()`, tel que le SQL l'écrit. */
function prix(bloc: string, cle: string): number {
  const found = new RegExp(`'${cle}',\\s*(\\d+)`).exec(bloc);
  if (!found) throw new Error(`prix « ${cle} » introuvable dans ${bloc.slice(0, 40)}…`);
  return Number(found[1]);
}

const PRIX = CODE.slice(CODE.indexOf("create or replace function public.wallet_prices"), CODE.indexOf("revoke all on function public.wallet_prices"));
const RECYCLAGE = PRIX.slice(PRIX.indexOf("'recycle'"), PRIX.indexOf("'craft'"));
const ARTISANAT = PRIX.slice(PRIX.indexOf("'craft'"), PRIX.indexOf("'milestone'"));
const PALIERS = PRIX.slice(PRIX.indexOf("'milestone'"), PRIX.indexOf("'seasonPerCreator'"));

describe("0027_wallet.sql (les points au serveur)", () => {
  it("paie le recyclage exactement comme le catalogue", () => {
    // Le joueur recycle un doublon : le serveur paie la valeur de la rareté.
    // Deux tables de prix, c'est deux jeux différents.
    for (const [rarete, meta] of Object.entries(RARITY_META)) {
      expect(prix(RECYCLAGE, rarete), `recyclage ${rarete}`).toBe(meta.recycleValue);
    }
  });

  it("fait payer l'artisanat exactement comme le catalogue", () => {
    for (const [rarete, meta] of Object.entries(RARITY_META)) {
      if (meta.craftCost === null) continue;
      expect(prix(ARTISANAT, rarete), `artisanat ${rarete}`).toBe(meta.craftCost);
    }
    // Les Légendaires ne s'artisanat pas : elles ne doivent pas avoir de prix.
    expect(ARTISANAT).not.toMatch(/'legendary',\s*\d/);
  });

  it("paie un booster et un Paquet Scène comme le jeu", () => {
    expect(prix(PRIX, "pack")).toBe(PACKS.live.points);
    expect(prix(PRIX, "scene")).toBe(PACKS.scene.points);
  });

  it("paie les paliers de collection comme le jeu, un par un", () => {
    for (const palier of MILESTONES) {
      expect(prix(PALIERS, palier.id), `palier ${palier.id}`).toBe(palier.reward.points);
    }
    // Et aucun palier en trop : la liste du jeu fait foi des deux côtés.
    const ids = [...PALIERS.matchAll(/'([a-z]+)',\s*\d+/g)].map((found) => found[1]);
    expect([...ids].sort()).toEqual(MILESTONES.map((palier) => palier.id).sort());
  });

  it("paie une saison comme `seasons.config.json`", () => {
    const saison = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "seasons.config.json"), "utf8"));
    expect(prix(PRIX, "seasonPerCreator")).toBe(saison.pointsPerCreator);
    // La fonction compte les créateurs d'une **famille** : les identifiants du
    // config sont ce que le client envoie.
    expect(SEASONS.length).toBeGreaterThan(0);
  });

  it("refuse un débit que le solde ne couvre pas, et le dit", () => {
    // La mise à jour du solde est conditionnée : un débit qui passe sous zéro
    // n'écrit rien. C'est ce `where` qui fait la garantie — pas le message.
    expect(CODE).toMatch(/where public\.wallets\.points \+ p_delta >= 0/);
    expect(CODE).toContain("check (points >= 0)");
    // Et la ligne de journal est retirée quand le débit n'a pas eu lieu, sinon
    // l'événement serait « déjà payé » alors que rien n'a bougé.
    expect(CODE).toContain("delete from public.wallet_ledger");
  });

  it("ne paie un événement qu'une fois : c'est l'index qui le garantit", () => {
    // Pas un contrôle applicatif : une contrainte, donc aucune course ne la
    // contourne.
    expect(CODE).toMatch(/create unique index if not exists wallet_ledger_once\s*\n\s*on public\.wallet_ledger \(user_id, kind, ref\)/);
    expect(CODE).toContain("on conflict (user_id, kind, ref) do nothing");
  });

  it("vérifie l'événement avant de payer, jamais le montant du client", () => {
    // Le tirage doit exister, être au joueur et être du bon genre.
    expect(CODE).toContain("from public.pack_draws d");
    expect(CODE).toContain("d.user_id = v_user");
    // Le prix vient du serveur : aucun montant reçu en paramètre.
    expect(CODE).not.toMatch(/wallet_credit\(p_kind text,\s*p_amount/);
    expect(CODE).not.toMatch(/wallet_spend\([^)]*p_price/);
  });

  it("garde les tables et la mécanique fermées au joueur", () => {
    expect(CODE).toContain("alter table public.wallets enable row level security");
    expect(CODE).toContain("alter table public.wallet_ledger enable row level security");
    expect(CODE).toContain("revoke all on table public.wallets from public, anon, authenticated");
    expect(CODE).toContain("revoke all on function public._wallet_apply(uuid, integer, text, text, boolean) from public, anon, authenticated");
    expect(CODE).toContain("revoke all on function public.wallet_backfill() from public, anon, authenticated");
    // Les trois portes du joueur, et elles seules.
    expect(CODE).toContain("grant execute on function public.wallet_get() to authenticated");
    expect(CODE).toContain("grant execute on function public.wallet_credit(text, text) to authenticated");
    expect(CODE).toContain("grant execute on function public.wallet_spend(text, text) to authenticated");
  });

  it("reprend les soldes existants une fois, à la bascule", () => {
    // Les joueurs avaient déjà des points dans leur sauvegarde : le compte
    // s'ouvre en les reprenant, une seule fois par joueur.
    expect(CODE).toContain("from public.saves s where s.user_id = p_user");
    expect(CODE).toContain("'bascule', '0027'");
    expect(CODE).toContain("least(1000000");
    // Le miroir est réécrit par le serveur : une sauvegarde gonflée à la main
    // est recollée au solde réel.
    expect(CODE).toContain("perform public._wallet_mirror(v_user, v_points)");
  });

  it("reste rejouable", () => {
    expect(CODE).toContain("create table if not exists public.wallets");
    expect(CODE).toContain("create table if not exists public.wallet_ledger");
    expect(CODE).toContain("drop trigger if exists wallet_on_listing");
    expect(CODE).toContain("drop trigger if exists wallet_on_sale");
    // Onze fonctions : le compte (2), les prix, les trois portes du joueur, les
    // trois triggers (tirage, dépôt, vente) et la bascule générale.
    expect(CODE.split("create or replace function").length - 1).toBe(11);
    expect(CODE).toContain("drop trigger if exists wallet_on_draw");
  });
});
