/**
 * Garde-fous sur `supabase/migrations/0015_wishlist.sql` — le créateur épinglé.
 *
 * Ce qui se vérifie sans base : les règles de sécurité et la forme du contrat.
 * L'exécution réelle (épingler, remplacer, retirer, refus d'un slug inconnu,
 * fermeture de l'écriture directe) est dans
 * `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : la wishlist est la **seule** donnée du jeu qu'un joueur écrit à la
 * main et qu'un autre lit. Une erreur ici, et n'importe qui pourrait épingler
 * n'importe quoi sur la fiche de quelqu'un d'autre — ou écrire un slug qui
 * n'existe pas au catalogue.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "0015_wishlist.sql"),
  "utf8",
);
// Les contrôles de motifs portent sur le code seul : un commentaire qui explique
// une règle cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0015_wishlist.sql (la wishlist)", () => {
  it("une ligne par joueur : épingler remplace, il n'y a pas de liste", () => {
    expect(CODE).toContain("user_id    uuid primary key references auth.users (id) on delete cascade");
    expect(CODE).toMatch(/on conflict \(user_id\) do update/);
    // Pas de tableau de slugs, pas de plafond : c'est un nom, pas une sélection.
    expect(CODE).not.toMatch(/slug\s+text\[\]/);
  });

  it("le créateur épinglé doit exister au catalogue", () => {
    // La clé étrangère ne suffit pas (un client pourrait écrire un slug périmé
    // en direct) : la fonction vérifie, et le message le dit.
    expect(CODE).toContain("references public.creators (slug) on delete cascade");
    expect(CODE).toMatch(/select c\.slug\s+into v_slug\s+from public\.creators c/);
    expect(CODE).toContain("wishlist : ce créateur n''est pas au catalogue");
  });

  it("n'exige pas la possession — c'est justement le but", () => {
    // À l'inverse de `set_showcase`, qui relit la sauvegarde du joueur. Le
    // contrôle porte sur le corps de `set_wishlist` : `player_profile`, plus
    // bas, lit bien les collections (c'est son métier).
    const body = CODE.slice(
      CODE.indexOf("function public.set_wishlist"),
      CODE.indexOf("function public.clear_wishlist"),
    );
    expect(body).not.toContain("saves");
    expect(body).not.toContain("user_cards");
    expect(body).toContain("from public.creators c");
  });

  it("tout le monde peut lire, seul le propriétaire peut écrire, et seulement par les fonctions", () => {
    expect(CODE).toContain("alter table public.wishlist enable row level security;");
    expect(CODE).toMatch(/create policy "wishlist lisible par tous"[\s\S]{0,60}using \(true\)/);
    expect(CODE).toContain("using (auth.uid() = user_id)");
    expect(CODE).toContain("with check (auth.uid() = user_id)");
    // L'écriture directe est retirée aux clients : sans ça, un joueur PATCHerait
    // sa ligne avec un slug inventé.
    expect(CODE).toContain("revoke insert, update, delete on public.wishlist from anon, authenticated;");
  });

  it("trois fonctions, toutes vérifiant l'identité, toutes fermées à l'anonyme", () => {
    for (const fn of [
      "public.wishlist_slug(p_user_id uuid default null)",
      "public.set_wishlist(p_slug text)",
      "public.clear_wishlist()",
    ]) {
      expect(CODE).toContain(`create or replace function ${fn}`);
    }
    // Chaque écriture exige un compte : le message le dit en français.
    expect(CODE).toContain("wishlist : connecte-toi pour épingler un créateur");
    expect(CODE).toContain("wishlist : connecte-toi pour retirer ton épinglé");

    for (const signature of ["wishlist_slug(uuid)", "set_wishlist(text)", "clear_wishlist()"]) {
      expect(CODE).toContain(`revoke all on function public.${signature} from public, anon;`);
      expect(CODE).toContain(`grant execute on function public.${signature} to authenticated;`);
    }
  });

  it("les trois fonctions sont `security definer` et figent leur `search_path`", () => {
    // Les trois fonctions de la wishlist, plus `player_profile` redéfinie.
    expect(CODE.match(/security definer/g)?.length).toBe(4);
    expect(CODE.match(/set search_path = public/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("le profil public porte l'épinglé", () => {
    // `player_profile` est redéfinie entièrement : la version de 0006 ne
    // connaissait pas la wishlist.
    expect(CODE).toMatch(/create or replace function public\.player_profile\(p_user_id uuid default null\)/);
    expect(CODE).toContain("'wishlist_slug', t.wishlist_slug");
    expect(CODE).toMatch(/select w\.slug from public\.wishlist w where w\.user_id = s\.user_id/);
    // La redéfinition ne perd rien de la version d'origine.
    for (const field of [
      "'showcase_slugs', t.showcase_slugs",
      "'by_rarity'",
      "'by_region'",
      "'rank_completion'",
      "'rank_cards'",
      "'catalog_size'",
    ]) {
      expect(CODE).toContain(field);
    }
  });

  it("reste rejouable", () => {
    expect(CODE).toContain("create table if not exists public.wishlist");
    expect(CODE).not.toMatch(/drop table/i);
    expect(CODE).not.toMatch(/drop function/i);
  });
});
