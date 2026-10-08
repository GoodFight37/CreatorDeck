/**
 * Garde-fous sur `supabase/migrations/0017_reinitialiser.sql` — rejouer la
 * partie à zéro, en ligne comprise.
 *
 * Ce qui se vérifie sans base : ce que la fonction efface, ce qu'elle ne touche
 * pas, et à qui elle est ouverte. L'exécution réelle (réserve reconstruite,
 * Paquet Scène rouvert, journal vidé, refus sans compte) est dans
 * `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : c'est la seule fonction du jeu qui **supprime** des lignes du serveur
 * sur demande du client. Trois façons de se tromper, et ce fichier les attrape :
 * effacer autre chose que sa propre partie (`auth.uid()`), effacer ce qui n'est
 * pas de la progression (profil, amitiés, échanges, annonces), ou rester
 * ouverte à `anon`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "0017_reinitialiser.sql"),
  "utf8",
);
// Les contrôles de motifs portent sur le code seul : un commentaire qui explique
// une règle cite forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0017_reinitialiser.sql (recommencer sa partie)", () => {
  it("n'efface que la partie du joueur connecté", () => {
    expect(CODE).toContain("security definer");
    expect(CODE).toContain("set search_path = public");
    expect(CODE).toMatch(/v_user uuid := auth\.uid\(\)/);
    expect(CODE).toContain("raise exception 'reinitialisation : connecte-toi d''abord'");
    // Chaque suppression est filtrée par l'identité, jamais par un paramètre.
    for (const table of ["pack_state", "pack_draws", "pack_scene", "last_packs"]) {
      expect(CODE).toMatch(new RegExp(`delete from public\\.${table}\\s+where user_id = v_user`));
    }
    expect(CODE).not.toMatch(/p_user|p_user_id|p_slug|p_state/);
  });

  it("efface la réserve, le journal des tirages, le Paquet Scène et les Last Pack", () => {
    // La réserve : supprimée pour que la suivante soit reconstruite depuis la
    // sauvegarde neuve (3 boosters), au lieu d'attendre la recharge.
    const deleted = [...CODE.matchAll(/delete from public\.(\w+)/g)].map((match) => match[1]);
    expect(new Set(deleted)).toEqual(new Set(["pack_state", "pack_draws", "pack_scene", "last_packs"]));
  });

  it("ne touche ni au profil, ni aux relations, ni aux échanges, ni à l'hôtel", () => {
    // Une partie qu'on recommence n'efface pas son pseudo, ses amis, un échange
    // conclu ni une annonce en cours.
    for (const table of ["profiles", "friends", "trades", "market_listings", "wishlist", "saves"]) {
      expect(CODE).not.toMatch(new RegExp(`delete from public\\.${table}\\b`));
    }
  });

  it("est fermée à `anon` et rejouable", () => {
    // `public` a l'exécution par défaut sur une fonction neuve : il faut la lui
    // retirer, sinon `anon` hérite du droit de tenter l'opération.
    expect(CODE).toContain("revoke all on function public.reset_progress() from public, anon;");
    expect(CODE).toContain("grant execute on function public.reset_progress() to authenticated;");
    // Rejouable : rien d'autre que `create or replace` et les droits.
    expect(CODE).toContain("create or replace function public.reset_progress()");
    expect(CODE).not.toMatch(/drop function/);
  });

  it("le client connaît la fonction et l'appelle au bon moment", () => {
    // Le client est découpé par domaine : `reset_progress` vit dans `pack.ts`
    // (boosters et sauvegarde), la classe ne fait que déléguer.
    const api = readFileSync(
      path.join(process.cwd(), "src", "lib", "cloud", "api", "pack.ts"),
      "utf8",
    );
    // `resetProgress` vit dans `store/pack.ts` depuis la découpe du magasin.
    const store = readFileSync(
      path.join(process.cwd(), "src", "lib", "cloud", "store", "pack.ts"),
      "utf8",
    );
    // Le geste vit dans la vue « Toi » (`profile-view.tsx`) depuis que la
    // coque a été découpée : c'est là qu'est le bouton rouge, tout en bas.
    const app = readFileSync(
      path.join(process.cwd(), "src", "components", "profile-view.tsx"),
      "utf8",
    );
    expect(api).toContain('core.rpc("reset_progress"');
    // L'appareil d'abord : c'est la partie neuve qui remonte au serveur.
    const resetAt = app.indexOf("gameStore.reset()");
    const cloudAt = app.indexOf("cloudStore.resetProgress()");
    expect(resetAt).toBeGreaterThan(-1);
    expect(cloudAt).toBeGreaterThan(resetAt);
    expect(store).toContain("await ready.api.resetProgress()");
    expect(store).toContain("await ctx.fetchPackStatus()");
  });
});
