/**
 * Garde-fous sur `supabase/migrations/0013_progression.sql` — le plancher de
 * malchance et la série de jours côté serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est
 * le **contrat** — le seuil publié dans `pull-rates.json`, la définition de la
 * journée de jeu (identique au moteur local), et les règles de sécurité.
 * L'exécution réelle (12 boosters amorcés, garantie vérifiée, série cassée puis
 * raccommodée) est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : `open_pack()` reçoit la sauvegarde d'un appareil que le joueur peut
 * modifier. Si le compteur vivait dedans, il suffirait d'écrire « 12 » pour
 * obtenir une Légendaire à chaque booster. La migration le déduit donc du
 * journal des tirages — et si un jour quelqu'un y met un compteur client, ces
 * tests tombent.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROGRESSION, START, gameDay } from "@/lib/progression";
import { PITY } from "@/lib/pull-rates";
import { STREAK_REWARDS } from "@/lib/progression";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const SQL = readFileSync(path.join(MIGRATIONS, "0013_progression.sql"), "utf8");
// Le **seuil** et la série ne vivent plus dans l'historique : plusieurs
// migrations reprennent `open_pack()` en entier (c'est la seule façon de
// remplacer une fonction PL/pgSQL), et seule la **dernière** compte. Plutôt que
// de citer un numéro de fichier — qui périme à chaque livraison —, on lit la
// dernière définition de chaque fonction. `0013` garde le contrat de structure :
// `_pack_pity()`, le journal des tirages, la journée de jeu.
const migrations = readdirSync(MIGRATIONS)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

/** Le contenu de la **dernière** migration qui définit `nom`. */
function derniereDefinition(nom: string): { fichier: string; sql: string } {
  let trouve: { fichier: string; sql: string } | null = null;
  for (const fichier of migrations) {
    const sql = readFileSync(path.join(MIGRATIONS, fichier), "utf8");
    if (sql.includes(`create or replace function public.${nom}(`)) trouve = { fichier, sql };
  }
  if (!trouve) throw new Error(`aucune migration ne définit ${nom}`);
  return trouve;
}

const OPEN_PACK = derniereDefinition("open_pack");
const SQL_PITY = OPEN_PACK.sql;
const SQL_SERIE = OPEN_PACK.sql;
// Les contrôles de motifs portent sur le code seul : un commentaire qui
// explique une règle cite forcément la règle, et un test qui lit les
// commentaires ne teste rien.
/**
 * Le corps d'**une** fonction, pas le fichier entier : une migration qui reprend
 * `open_pack()` contient aussi tout le reste, et une règle cherchée « quelque
 * part dans le fichier » finirait par être trouvée dans le mauvais corps.
 */
function corpsFonction(sql: string, nom: string): string {
  const debut = sql.indexOf(`create or replace function public.${nom}(`);
  if (debut < 0) throw new Error(`${nom} absente du fichier`);
  const fin = sql.indexOf("$$;", debut);
  return sql.slice(debut, fin < 0 ? undefined : fin);
}

const sansCommentaires = (sql: string) =>
  sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
const SQL_BAREME = derniereDefinition("_streak_reward_points").sql;
const SQL_DEPART = derniereDefinition("_pack_initial_packs").sql;
const CODE_BAREME = sansCommentaires(corpsFonction(SQL_BAREME, "_streak_reward_points"));
const CODE_DEPART = sansCommentaires(corpsFonction(SQL_DEPART, "_pack_initial_packs"));
const CODE = sansCommentaires(SQL);
const CODE_PITY = sansCommentaires(SQL_PITY);
const CODE_SERIE = sansCommentaires(SQL_SERIE);

describe("0013_progression.sql (plancher de malchance et série)", () => {
  it("reprend le seuil publié dans pull-rates.json", () => {
    // Le SQL écrit `v_pity + 1 >= 12` : le prochain booster est le compte+1,
    // et c'est lui qui paie quand il atteint le seuil. Le nombre doit être
    // celui du fichier de taux, pas une constante parallèle.
    expect(PITY.threshold).toBeGreaterThan(0);
    expect(PITY.label).toBeTruthy();
    expect(PITY.note).toBeTruthy();
    // Le seuil vit dans la **dernière** définition d'`open_pack` : `0032`, qui
    // reprend le corps de `0031` à l'identique — avec la récompense de série.
    expect(CODE_SERIE).toContain(`v_pity + 1 >= ${PITY.threshold}`);
    // Trois endroits : la décision du tirage, la conversion en Perfect, et ce
    // que la réponse annonce.
    expect(CODE_SERIE.match(new RegExp(`v_pity \\+ 1 >= ${PITY.threshold}`, "g"))).toHaveLength(3);
  });

  it("la série est payée, et la table est celle du fichier des règles", () => {
    // Le barème en points vit dans `progression.json` **et** dans le SQL : les
    // deux doivent dire la même chose, sinon le serveur verserait un montant et
    // l'écran en annoncerait un autre.
    for (const reward of STREAK_REWARDS) {
      const attendu = reward.points ?? 0;
      const ligne = CODE_BAREME.match(new RegExp(`when ${reward.day} then (\\d+)`));
      expect(ligne?.[1], `jour ${reward.day}`).toBe(String(attendu));
    }
    // Le 7ᵉ jour ne paie rien : c'est le jackpot, décidé ailleurs.
    expect(STREAK_REWARDS.some((reward) => reward.day === 7)).toBe(false);
    expect(CODE_BAREME).toMatch(/else 0/);
    // Les points sont versés par `_wallet_apply` — jamais une écriture directe
    // du solde, qui contournerait le journal à usage unique.
    expect(CODE_SERIE).toContain("public._wallet_apply(");
    expect(CODE_SERIE).toContain("'streak'");
    expect(CODE_SERIE).toContain("public._pack_game_day(v_now)");
    expect(CODE_SERIE).not.toMatch(/update public\.wallets/i);
    // Même signature, pas de `drop` : un recollage remplace, il n'empile pas.
    expect(SQL_SERIE).not.toMatch(/drop\s+function/i);
    expect(CODE_SERIE).toContain("create or replace function public.open_pack(p_jackpot text default 'perfect')");
  });

  it("la dernière définition d'open_pack porte toutes les règles en vigueur", () => {
    // Une migration suivante **peut** reprendre `open_pack()` — c'est même la
    // seule façon de le modifier. Ce qui ne doit jamais arriver, c'est qu'elle
    // en oublie une au passage : le seuil publié, la récompense de série ou la
    // réserve d'accueil se sépareraient alors de l'écran en silence.
    expect(OPEN_PACK.fichier).toMatch(/^00\d\d_/);
    expect(CODE_SERIE).toContain(`v_pity + 1 >= ${PITY.threshold}`);
    expect(CODE_SERIE).toContain("public._streak_reward_points(");
    expect(CODE_SERIE).toContain("public._pack_initial_packs()");
    // Et la suite de l'historique ne le redéfinit plus après.
    const apres = migrations.filter((f) => f > OPEN_PACK.fichier).some((f) =>
      readFileSync(path.join(MIGRATIONS, f), "utf8").includes(
        "create or replace function public.open_pack(",
      ),
    );
    expect(apres).toBe(false);
  });

  it("la réserve d'accueil du serveur est celle du fichier des règles", () => {
    // Deux endroits, un seul chiffre : `progression.json` (`start.packs`) et
    // `_pack_initial_packs()` (`0033`). Un écart ici, et l'écran annoncerait
    // deux boosters quand le serveur en donne trois.
    const code = CODE_DEPART;
    expect(code).toMatch(/create or replace function public\._pack_initial_packs\(\)/);
    expect(code).toContain(`select ${START.packs}`);
    // Le reste du départ (sabliers, points) vit sur l'appareil : le serveur ne
    // doit pas le connaître.
    expect(code).not.toContain("hourglass");
    expect(code).not.toContain("points");
    // Même signature, pas de `drop` : un recollage remplace, il n'empile pas.
    expect(SQL_DEPART).not.toMatch(/drop\s+function/i);
    expect(SQL_DEPART).toContain(
      "revoke all on function public._pack_initial_packs() from public, anon, authenticated;",
    );
  });

  it("le slot garanti est Légendaire sous le plancher, et lui seul", () => {
    // Sous la garantie : poids 1 sur la Légendaire, aucune autre rareté. Les
    // deux morceaux sont vérifiés **côte à côte** (une fenêtre juste après la
    // décision), sinon un `v_weights` lointain ferait passer le test.
    const decision = `v_pity + 1 >= ${PITY.threshold} or v_jackpot then`;
    const garantie = `v_weights := '{"legendary": 1}'::jsonb;`;
    const debutPoids = CODE_SERIE.indexOf(decision);
    expect(debutPoids).toBeGreaterThan(-1);
    expect(CODE_SERIE.slice(debutPoids, debutPoids + 240)).toContain(garantie);
  });

  it("déduit le compteur du journal des tirages, jamais de la sauvegarde", () => {
    expect(CODE).toMatch(/create or replace function public\._pack_pity\(p_user uuid\)/);
    expect(CODE).toContain("from public.pack_draws d");
    // La sauvegarde porte `pityCounter` côté client : le serveur ne doit pas
    // la lire pour décider. Aucune trace de `pityCounter` ni de `saves`
    // dans la fonction de décision.
    expect(CODE).not.toContain("pityCounter");
    expect(CODE).not.toContain("->> 'pity'");
  });

  it("compte les jours de jeu depuis 6 h UTC, comme gameDay()", () => {
    // La même conversion que le moteur local : `(utc - 6 h)::date`. Si l'un
    // des deux change de décalage, la série du serveur et celle de l'écran
    // ne tomberaient plus le même jour.
    expect(CODE).toContain("(p_now at time zone 'utc') - interval '6 hours'");
    expect(CODE).toContain("(d.drawn_at at time zone 'utc') - interval '6 hours'");
    expect(CODE).toContain("((p_now at time zone 'utc') - interval '6 hours')::date");
    expect(gameDay(Date.UTC(2026, 9, 7, 5, 59))).toBe("2026-10-06");
    expect(gameDay(Date.UTC(2026, 9, 7, 6, 0))).toBe("2026-10-07");
  });

  it("la série vise bien les 7 jours de progression.json", () => {
    expect(PROGRESSION.streak.days).toBe(7);
    expect(CODE).toMatch(/v_streak % 7 = 0/);
    expect(PROGRESSION.streak.jackpotHourglasses).toBe(3);
  });

  it("le jackpot du jour est consommé par le Perfect, pas par n'importe quel tirage", () => {
    // Le joueur qui ouvre un booster ordinaire le matin du 7ᵉ jour ne doit pas
    // perdre sa récompense : c'est le Perfect sorti qui la consomme.
    expect(CODE).toMatch(/create or replace function public\._pack_perfect_today/);
    expect(CODE).toContain("c ->> 'rareDrop' = 'true'");
    expect(CODE).toMatch(/v_jackpot := v_streak % 7 = 0/);
    expect(CODE).toMatch(/not public\._pack_perfect_today\(v_user_id, v_now\)/);
  });

  it("le joueur peut préférer 3 sabliers au Perfect garanti", () => {
    expect(CODE).toContain("p_jackpot text default 'perfect'");
    expect(CODE).toContain(`coalesce(p_jackpot, 'perfect') <> 'hourglasses'`);
    // Le sablier ne vit que sur l'appareil : le serveur ne fait que ne pas
    // forcer le tirage, il ne crédite rien.
    expect(CODE).not.toContain("hourglasses = hourglasses");
  });

  it("remplace l'ancienne `open_pack()` sans argument au lieu de la laisser vivre", () => {
    // Sans ce `drop`, Postgres garderait les deux signatures et un appel sans
    // argument continuerait d'utiliser l'ancienne — celle qui ignore le pity.
    expect(CODE).toContain("drop function if exists public.open_pack();");
    expect(CODE.match(/drop function if exists public\.open_pack\(\);/g)).toHaveLength(1);
  });

  it("le statut publié porte les deux compteurs qui décideront du tirage", () => {
    expect(CODE).toMatch(/create or replace function public\.pack_status\(\)/);
    expect(CODE).toContain("'pity', v_pity");
    expect(CODE).toContain("'streak', v_streak");
    expect(CODE).toContain("'jackpot_ready', v_jackpot_ready");
  });

  it("les compteurs internes restent hors de portée des joueurs", () => {
    for (const fn of [
      "public._pack_pity(uuid)",
      "public._pack_streak(uuid, timestamptz)",
      "public._pack_perfect_today(uuid, timestamptz)",
    ]) {
      expect(CODE).toContain(`revoke all on function ${fn} from public, anon, authenticated;`);
    }
    expect(CODE).toContain("revoke all on function public.open_pack(text) from public, anon;");
    expect(CODE).toContain("grant execute on function public.open_pack(text) to authenticated;");
    expect(CODE).toContain("revoke all on function public.pack_status() from public, anon;");
    expect(CODE).toContain("grant execute on function public.pack_status() to authenticated;");
  });

  it("reste rejouable (create or replace, index conditionnel)", () => {
    // Aucun `create table` sans garde, aucun `drop table` : la migration peut
    // être recollée sans rien perdre.
    expect(CODE).not.toMatch(/drop table/i);
    expect(CODE).toContain("create index if not exists pack_draws_user_idx");
    expect(CODE.match(/create or replace function/g)).toHaveLength(5);
  });
});
