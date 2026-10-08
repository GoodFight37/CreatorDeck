/**
 * Garde-fous sur `supabase/migrations/0026_promo_codes.sql` — les codes promo.
 *
 * Un code donné en stream se tape dans les réglages et rend **un booster à
 * ouvrir**. Ces contrôles ne rejouent pas Postgres (c'est le travail de
 * `scripts/verify-supabase-migrations.mjs`) : ils vérifient le **contrat** de la
 * migration — ce qu'elle touche, qui a le droit de l'appeler, et les règles qui
 * doivent survivre à une relecture.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0026_promo_codes.sql"), "utf8");
// Les contrôles portent sur le code seul : un commentaire qui explique une règle
// cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
/** Le texte des deux fonctions, sans le reste du fichier. */
const REDEEM = CODE.slice(CODE.indexOf("create or replace function public.redeem_promo_code"));
const CREATE = CODE.slice(CODE.indexOf("create or replace function public.create_promo_code"));

/** Le plafond de la réserve, tel que `0004` le pose : c'est lui qui fait foi. */
function reserveCap(): number {
  const tirage = readFileSync(path.join(ROOT, "supabase", "migrations", "0004_tirage.sql"), "utf8");
  const found = /create table if not exists public\.pack_state[\s\S]*?check \(packs between 0 and (\d+)\)/.exec(tirage);
  if (!found) throw new Error("plafond de la réserve introuvable dans 0004_tirage.sql");
  return Number(found[1]);
}

describe("0026_promo_codes.sql (les codes promo)", () => {
  it("donne un booster à ouvrir — jamais des points, des jetons ni une carte", () => {
    // Ce que le code ne doit pas devenir : une monnaie parallèle (l'hôtel
    // s'achète avec les points), un raccourci vers le pity (les jetons), ou une
    // carte offerte (ça toucherait la valeur d'une collection).
    expect(REDEEM).toContain("public.pack_state");
    expect(REDEEM).not.toMatch(/insert into public\.(user_cards|cards)/);
    expect(REDEEM).not.toMatch(/update public\.saves/);
    expect(REDEEM).not.toMatch(/points\s*=|hourglasses\s*=|tokens\s*=/);
    expect(REDEEM).not.toContain("card_claim_add");
  });

  it("refuse quand la réserve est pleine, et le plafond est celui de 0004", () => {
    // Le plafond vit dans `0004` (et sa garde dans `0019`). Si quelqu'un le
    // change là-bas sans toucher à ce fichier, un code à quatre boosters
    // dépasserait la réserve dans un sens ou dans l'autre : le test casse.
    const cap = reserveCap();
    expect(cap).toBe(4);
    expect(REDEEM).toContain(`v_reserve + v_row.packs > ${cap}`);
    expect(REDEEM).toContain(`sur ${cap})`);
  });

  it("refuse **avant** de consommer : un code plein sert encore plus tard", () => {
    // L'ordre compte : si la rédemption était enregistrée avant le contrôle de
    // la réserve, le code serait brûlé pour un booster que le joueur n'a jamais
    // reçu.
    const plein = REDEEM.indexOf("réserve est pleine");
    const consacre = REDEEM.indexOf("insert into public.promo_redemptions");
    expect(plein).toBeGreaterThan(-1);
    expect(consacre).toBeGreaterThan(-1);
    expect(plein).toBeLessThan(consacre);
  });

  it("un joueur ne rédème un code qu'une fois — c'est la clé primaire qui le garantit", () => {
    expect(CODE).toMatch(/primary key \(code, user_id\)/);
    expect(REDEEM).toContain("tu as déjà utilisé ce code");
    // Et la ligne part avec le joueur ou le code : rien ne doit rester orphelin.
    expect(CODE).toContain("references auth.users (id) on delete cascade");
    expect(CODE).toContain("references public.promo_codes (code) on delete cascade");
  });

  it("ouvre une seule porte au joueur : la fonction", () => {
    // Les tables sont fermées en lecture comme en écriture : un joueur qui
    // pourrait lire `promo_codes` pourrait énumérer les codes du stream.
    expect(CODE).toContain("alter table public.promo_codes enable row level security");
    expect(CODE).toContain("alter table public.promo_redemptions enable row level security");
    expect(CODE).toContain("revoke all on table public.promo_codes from public, anon, authenticated");
    expect(CODE).toContain("revoke all on table public.promo_redemptions from public, anon, authenticated");
    expect(CODE).toContain("revoke all on function public.redeem_promo_code(text) from public, anon");
    expect(CODE).toContain("grant execute on function public.redeem_promo_code(text) to authenticated");
    // Sans compte, pas de code : `auth.uid()` vide suffit à refuser.
    expect(REDEEM).toContain("connecte-toi");
  });

  it("n'accorde la création de codes qu'au service — jamais à l'application", () => {
    // Un code créé depuis l'application serait un code créé par n'importe qui.
    expect(CREATE).not.toMatch(/grant execute on function public\.create_promo_code[\s\S]*?to authenticated/);
    expect(CODE).toMatch(
      /revoke all on function public\.create_promo_code\(text, integer, integer, timestamptz, text\)\s*\n\s*from public, anon, authenticated/,
    );
    expect(CODE).toMatch(/grant execute on function public\.create_promo_code[\s\S]*?to service_role/);
    // Le rôle de service n'existe pas partout (vérifieur) : la migration doit le
    // supporter sans échouer.
    expect(CODE).toContain("exception when others");
  });

  it("normalise le code pareil à la création et à la rédemption", () => {
    // `booster-2026`, `BOOSTER 2026` et `Booster-2026` désignent le même code :
    // un joueur qui recopie depuis un stream ne tape pas la casse exacte.
    const normalisations = CODE.match(/text := upper\(regexp_replace\([\s\S]*?\)\);/g) ?? [];
    expect(normalisations.length).toBe(2); // une par fonction : créer et rédempter
    const [creation, redemption] = [CREATE, REDEEM].map((fn) => /text := upper\(regexp_replace\(([\s\S]*?)\)\);/.exec(fn)?.[1]);
    expect(creation).toBeTruthy();
    expect(creation).toBe(redemption);
  });

  it("embarque une clé, une seule : la publique, et rien d'autre", () => {
    // Une migration est lue par tout le monde : aucun secret n'y a sa place.
    expect(CODE).not.toContain("sb_secret_");
    expect(CODE).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(CODE).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
  });

  it("reste rejouable : tables if not exists, fonctions replace, création en upsert", () => {
    expect(CODE).toContain("create table if not exists public.promo_codes");
    expect(CODE).toContain("create table if not exists public.promo_redemptions");
    expect(CODE.split("create or replace function").length - 1).toBe(2);
    // Rejouer la même création met à jour le code sans perdre les rédemptions.
    expect(CREATE).toContain("on conflict (code) do update");
  });
});
