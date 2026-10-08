/**
 * Garde-fous sur `supabase/migrations/0034_last_pack_protege.sql` — le Last
 * Pack protégé.
 *
 * Un paquet exposé montre cinq cartes ; deux d'entre elles ne se prennent pas
 * une Légendaire, et une carte Live. Le PL/pgSQL ne s'exécute pas ici : ce qui
 * est vérifiable dans Vitest, c'est le **contrat** entre le SQL et l'écran
 * (`src/lib/last-pack.ts`). L'exécution réelle — refus de la Légendaire, refus
 * de la Live, carte ordinaire prise quand même, collection et compteur du jour
 * intacts après un refus — est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : c'est la seule chose qui empêche un cercle de cinq amis de se
 * dépouiller de leur plus belle carte, et une Live ne se refait pas (elle
 * n'existe que parce que le créateur streamait à cet instant). Les deux copies
 * de la règle — SQL pour le refus, TS pour griser — ne doivent pas diverger en
 * silence : c'est ici qu'elles se rencontrent.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLastPack } from "@/lib/cloud/api/core";
import { cardIsProtected } from "@/lib/last-pack";

const ROOT = process.cwd();
const SQL = readFileSync(
  path.join(ROOT, "supabase", "migrations", "0034_last_pack_protege.sql"),
  "utf8",
);
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
/** Le fichier sans ses retours à la ligne : une expression peut courir sur deux. */
const FLAT = CODE.replace(/\s+/g, " ");

describe("0034_last_pack_protege.sql (Last Pack protégé)", () => {
  it("dit à l'écran, carte par carte, ce qui ne se prend pas", () => {
    // La règle, dans le même ordre que `cardIsProtected()` : la rareté, puis la
    // variante. La sortie de `_last_pack_cards()` est ce que lit `last_pack_shelf()`.
    expect(FLAT).toMatch(
      /'stealable', \(t\.card ->> 'rarity'\) <> 'legendary' and \(t\.card ->> 'variant'\) <> 'live'/,
    );
    // Réécrite par `create or replace` : la signature ne bouge pas, donc l'écran
    // n'a rien à changer pour continuer de lire la réponse.
    expect(CODE).toMatch(
      /create or replace function public\._last_pack_cards\(p_pack public\.last_packs\)/,
    );
    // La signature s'écrit sur trois lignes dans le fichier : on lit le corps
    // aplati, comme le fait le vérifieur SQL.
    expect(FLAT).toMatch(/create or replace function public\.last_pack_steal\( p_pack bigint, p_index integer \)/);
  });

  it("refuse une Légendaire et une Live, avec le message que l'écran relaie", () => {
    expect(CODE).toMatch(/raise exception 'vol : une Légendaire ne se vole pas'/);
    expect(CODE).toMatch(/raise exception 'vol : une carte Live ne se vole pas'/);
    expect(CODE).toMatch(/if \(v_card ->> 'rarity'\) = 'legendary' then/);
    expect(CODE).toMatch(/if \(v_card ->> 'variant'\) = 'live' then/);
  });

  it("refuse **avant** de verrouiller les collections : un refus ne laisse rien à moitié fait", () => {
    const lecture = CODE.indexOf("v_card := v_pack.cards -> (p_index - 1);");
    const refus = CODE.indexOf("ne se vole pas'");
    // Le prochain `for update` après le refus est celui des deux collections.
    const verrous = CODE.indexOf("for update", refus);
    const ecriture = CODE.indexOf("insert into public.last_pack_steals");
    expect(lecture).toBeGreaterThan(-1);
    expect(refus).toBeGreaterThan(lecture);
    expect(verrous).toBeGreaterThan(refus);
    expect(ecriture).toBeGreaterThan(verrous);
    // La carte visée est lue sous le verrou du paquet : personne ne prend sa
    // place entre la lecture et le refus.
    expect(CODE.indexOf("for update")).toBeLessThan(lecture);
    // Rien n'est lu dans une collection avant le refus : la première lecture
    // d'une sauvegarde est celle qui suit les verrous.
    expect(CODE.indexOf("select * into v_owner_save")).toBeGreaterThan(refus);
    // Les deux refus sont séparés : une carte peut être Légendaire **et** Live,
    // le message dit laquelle des deux raisons tombe en premier.
    expect(CODE.indexOf("= 'legendary' then")).toBeLessThan(CODE.indexOf("= 'live' then"));
  });

  it("garde le même contrat de droits que 0012", () => {
    expect(CODE).toMatch(/revoke all on function public\.last_pack_steal\(bigint, integer\) from public, anon;/);
    expect(CODE).toMatch(/grant execute on function public\.last_pack_steal\(bigint, integer\) to authenticated;/);
    expect(CODE).toMatch(/revoke all on function public\._last_pack_cards\(public\.last_packs\)/);
    // Aucune table touchée, aucun `drop` : la migration se rejoue sans casse.
    expect(CODE).not.toMatch(/\bdrop (function|table|policy|index)\b/i);
    expect(CODE).not.toMatch(/(alter|create) table/i);
  });

  it("et l'écran dit la même chose : le drapeau du serveur, puis la rareté et la variante", () => {
    // Un serveur d'avant `0034` ne dit rien : silence = prenable, jamais l'inverse.
    const shelf = parseLastPack({
      id: 12,
      ownerId: "22222222-2222-4222-8222-222222222222",
      ownerName: "Léa",
      mine: false,
      drawnAt: "2026-10-07T20:00:00Z",
      expiresAt: "2026-10-07T20:10:00Z",
      stealable: true,
      cards: [
        { index: 1, creatorSlug: "ibai", rarity: "rare", variant: "standard", taken: false },
        {
          index: 2,
          creatorSlug: "kaicenat",
          rarity: "legendary",
          variant: "live",
          taken: false,
          stealable: false,
        },
      ],
    });
    expect(shelf?.cards.map((entry) => entry.stealable)).toEqual([true, false]);
    const [ordinaire, legendaireLive] = shelf?.cards ?? [];
    expect(cardIsProtected(ordinaire)).toBe(false);
    expect(cardIsProtected(legendaireLive)).toBe(true);
    // Protégée **même si** le serveur oubliait le drapeau : la ceinture locale
    // s'appuie sur la rareté et la variante, pas seulement sur `stealable`.
    expect(cardIsProtected({ ...legendaireLive, stealable: true })).toBe(true);
  });
});
