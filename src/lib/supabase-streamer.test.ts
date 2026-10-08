/**
 * Garde-fous sur `supabase/migrations/0036_streamer.sql` — la chaîne.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est le
 * **contrat** entre le SQL et `src/data/streamer.json`, le fichier que lit le
 * moteur local. L'exécution réelle — l'absence payée, le plafond de sept jours,
 * l'horloge reculée qui ne crédite rien, une seule vidéo par jour, le versement
 * sur le solde des jetons — est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : la chaîne **paie en jetons**, et les jetons achètent des cartes. Si
 * un palier, une chance ou le plafond divergeait d'une copie à l'autre, le
 * joueur verrait un chiffre à l'écran et le serveur en paierait un autre.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PROGRESSION } from "@/lib/progression";
import { CAP_DAYS, STREAMER, STREAMER_TOKENS, TIERS } from "@/lib/streamer";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const FICHIER = "0036_streamer.sql";
const SQL = readFileSync(path.join(MIGRATIONS, FICHIER), "utf8");
/** Le fichier sans ses commentaires, puis sans ses retours à la ligne. */
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
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

describe("0036_streamer.sql (la chaîne)", () => {
  it("paie le même barème que le fichier, palier par palier", () => {
    // Les seuils et les gains, dans l'ordre décroissant du `case` : la dernière
    // branche est le palier de départ (0 abonné).
    const attendu = [...TIERS].sort((a, b) => b.at - a.at);
    for (const tier of attendu.slice(0, -1)) {
      expect(FLAT).toContain(`when coalesce(p_subscribers, 0) >= ${tier.at} then ${tier.perDay}`);
    }
    expect(FLAT).toMatch(/else 240 end/);
    expect(attendu[attendu.length - 1].perDay).toBe(240);
  });

  it("plafonne l'absence à sept journées, comme le fichier", () => {
    expect(FLAT).toMatch(/select 7;/);
    expect(CAP_DAYS).toBe(7);
  });

  it("porte les mêmes chances, pour chaque format", () => {
    for (const format of STREAMER.formats) {
      const ligne = `('${format.id}', ${format.successChancePermille}, ${format.gainPermille}, ${format.buzzPermille}, ${format.badBuzzPermille ?? 0}, ${format.requiresCreator ? "true" : "false"})`;
      expect(FLAT).toContain(ligne.replace(/\s+/g, " ").replace(/\(/g, "("));
    }
    // Et pas un format de plus d'un seul côté.
    expect(STREAMER.formats.length).toBe(4);
    expect((FLAT.match(/\('(letsplay|irl|ragebait|collab)', \d+, \d+, \d+, \d+, (true|false)\)/g) ?? []).length).toBe(4);
  });

  it("verse et plafonne les mêmes jetons que le fichier", () => {
    expect(FLAT).toMatch(
      new RegExp(`when coalesce\\(p_success, false\\) then ${STREAMER_TOKENS.perSuccess} \\+ case when coalesce\\(p_buzz, false\\) then ${STREAMER_TOKENS.perBuzz} else 0 end`),
    );
    expect(FLAT).toContain(`select ${STREAMER_TOKENS.perDayCap};`);
  });

  it("compte la journée de jeu comme les missions (6 h UTC)", () => {
    // Une deuxième définition de la journée serait un piège : la même heure
    // ferait basculer la série, les missions et la chaîne ensemble.
    expect(FLAT).toContain(`interval '${PROGRESSION.missions.resetHourUtc} hours'`);
    expect(PROGRESSION.missions.resetHourUtc).toBe(6);
  });

  it("est la dernière à écrire le rapport de version", () => {
    // `schema_versions()` est réécrit par `0035` puis par `0036` : le rapport
    // final est celui de la **dernière** migration recollée. Le marqueur de la
    // `0036` est une table — une table se voit, un morceau de code pourrait
    // traîner dans un commentaire.
    const rapport = derniereDefinition("schema_versions");
    expect(rapport).toContain("'0036'");
    expect(rapport).toMatch(/to_regclass\('public\.streamer_channels'\)/);
    expect(rapport).toContain("'0035'");
  });

  it("ferme ses tables et ses fonctions internes au joueur", () => {
    // Le client passe par `streamer_status()`, `streamer_visit()` et
    // `streamer_publish()` — jamais par les tables, ni par les tirages.
    for (const table of ["streamer_channels", "streamer_videos"]) {
      expect(FLAT).toContain("revoke all on table public." + table + " from public, anon, authenticated");
      expect(FLAT).toContain("alter table public." + table + " enable row level security");
    }
    for (const fonction of [
      "_streamer_ensure(uuid)",
      "_streamer_game_day(timestamptz)",
      "_streamer_day_number(timestamptz)",
      "_streamer_cap_days()",
      "_streamer_per_day(bigint)",
      "_streamer_format(text)",
      "_streamer_token_gain(boolean, boolean)",
      "_streamer_token_cap()",
    ]) {
      expect(FLAT).toContain(`revoke all on function public.${fonction} from public, anon, authenticated`);
    }
    for (const ouverte of ["streamer_status()", "streamer_visit()", "streamer_publish(text)"]) {
      expect(FLAT).toContain(`grant execute on function public.${ouverte} to authenticated`);
    }
  });

  it("passe par le journal des jetons, pas par une écriture directe", () => {
    // Le versement doit rester idempotent : c'est `_tokens_apply()` (dont le
    // journal unique porte la journée) qui paie, jamais un `insert` dans
    // `tokens`.
    expect(FLAT).toContain("perform public._tokens_apply(v_user, v_paid, 'streamer', v_day)");
    expect(FLAT).not.toMatch(/insert into public\.tokens/);
    // Et une seule vidéo par journée de jeu : l'index unique le garantit.
    expect(FLAT).toContain("create unique index if not exists streamer_videos_one_per_day");
  });
});
