/**
 * Le seed Supabase (`supabase/migrations/0003_catalogue.sql`) est un fichier
 * **généré** et committé : il doit rester le reflet exact de
 * `src/data/creators.json`. Ce test exécute le même `--check` que
 * `npm run catalog:ci`, dans le dépôt puis dans un dossier temporaire, pour
 * vérifier que la dérive est bien détectée (et pas seulement annoncée).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "build-supabase-catalogue.mjs");

/** Lance le script `--check` dans un dossier donné et capture sa sortie. */
function runCheck(cwd: string): { output: string; status: number } {
  try {
    const output = execFileSync(process.execPath, [SCRIPT, "--check"], { cwd, encoding: "utf8" });
    return { output, status: 0 };
  } catch (error) {
    const failure = error as { status?: number | null; stdout?: string; stderr?: string };
    return {
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
      status: failure.status ?? 1,
    };
  }
}

/** Petit dépôt factice : juste ce que lit le script (cwd = racine). */
function fakeRepo(sql: string | null): string {
  const root = mkdtempSync(path.join(tmpdir(), "creatordeck-catalogue-"));
  mkdirSync(path.join(root, "src", "data"), { recursive: true });
  mkdirSync(path.join(root, "supabase", "migrations"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "data", "creators.json"),
    JSON.stringify([{ slug: "kaicenat", displayName: "KaiCenat", rarity: "legendary", rank: 1 }]),
  );
  if (sql !== null) {
    writeFileSync(path.join(root, "supabase", "migrations", "0003_catalogue.sql"), sql);
  }
  return root;
}

describe("seed Supabase du catalogue", () => {
  it("est à jour vis-à-vis de creators.json", () => {
    const { output, status } = runCheck(ROOT);
    expect(status).toBe(0);
    expect(output).toContain("à jour");
  });

  it("reprend chaque créateur dans le fichier généré", () => {
    const creators = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "creators.json"), "utf8")) as Array<{
      slug: string;
      login: string;
      displayName: string;
      rarity: string;
      rank: number;
    }>;
    const sql = readFileSync(path.join(ROOT, "supabase", "migrations", "0003_catalogue.sql"), "utf8");
    expect(sql).toContain(`-- ${creators.length} créateurs`);
    // Premier et dernier du catalogue : de quoi détecter une troncature.
    for (const creator of [creators[0], creators[creators.length - 1]]) {
      const name = creator.displayName.replace(/'/g, "''");
      expect(sql).toContain(
        `('${creator.slug}', '${creator.login}', '${name}', '${creator.rarity}', ${creator.rank})`,
      );
    }
    // Pas de contenu hors catalogue : une seule table, un seul insert massif.
    expect(sql).toContain("create table if not exists public.creators");
    expect(sql).toContain("on conflict (slug) do update set");
    // Le `login` Twitch est la clé du statut « en direct » : il doit être dans le
    // fichier généré, et la colonne doit pouvoir arriver sur une base existante
    // (`create table if not exists` ne l'ajouterait pas).
    expect(sql).toContain("login        text,");
    expect(sql).toContain("alter table public.creators add column if not exists login text;");
    expect(sql).toContain("  login        = excluded.login;".replace(";", ","));
  });

  it("échoue quand le fichier a dérivé", () => {
    const { output, status } = runCheck(fakeRepo("-- fichier périmé\n"));
    expect(status).toBe(1);
    expect(output).toContain("a dérivé");
  });

  it("échoue quand le fichier généré manque", () => {
    const { output, status } = runCheck(fakeRepo(null));
    expect(status).toBe(1);
    expect(output).toContain("manquant");
  });
});
