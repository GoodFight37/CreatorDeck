/**
 * La grille des familles (`supabase/migrations/0028_wallet_saisons.sql`) est un
 * fichier **généré** et committé : elle doit rester le reflet exact du catalogue
 * et des saisons du jeu.
 *
 * Ce test exécute le même `--check` que la CI, dans le dépôt puis dans un
 * dossier temporaire, pour vérifier que la dérive est bien détectée (et pas
 * seulement annoncée). Le contenu lui-même est comparé aux paliers du jeu dans
 * `src/lib/supabase-wallet.test.ts`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "build-supabase-seasons.mjs");

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
  const root = mkdtempSync(path.join(tmpdir(), "creatordeck-saisons-"));
  mkdirSync(path.join(root, "src", "data"), { recursive: true });
  mkdirSync(path.join(root, "supabase", "migrations"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "data", "creators.json"),
    JSON.stringify([
      { slug: "kaicenat", displayName: "KaiCenat", rarity: "legendary", rank: 1, login: "kaicenat", region: "S04" },
      { slug: "squeezie", displayName: "Squeezie", rarity: "epic", rank: 2, login: "squeezie", region: "S01" },
    ]),
  );
  writeFileSync(
    path.join(root, "src", "data", "seasons.config.json"),
    JSON.stringify({
      pointsPerCreator: 4,
      hourglassesPerSeason: 3,
      families: [{ id: "S01", name: "France & francophonie", tagline: "Le talk." }],
      catchAll: { id: "S99", name: "Sans frontière", tagline: "Le reste." },
    }),
  );
  if (sql !== null) {
    writeFileSync(path.join(root, "supabase", "migrations", "0028_wallet_saisons.sql"), sql);
  }
  return root;
}

describe("grille Supabase des saisons", () => {
  it("est à jour vis-à-vis du catalogue et des saisons", () => {
    const { output, status } = runCheck(ROOT);
    expect(status).toBe(0);
    expect(output).toContain("à jour");
  });

  it("décrit chaque vague du jeu, avec ses paliers", () => {
    const sql = readFileSync(
      path.join(ROOT, "supabase", "migrations", "0028_wallet_saisons.sql"),
      "utf8",
    );
    // Les deux tables que le wallet lit pour vérifier un palier de famille.
    expect(sql).toContain("create table if not exists public.wallet_season_members");
    expect(sql).toContain("create table if not exists public.wallet_season_tiers");
    expect(sql).toContain("primary key (season_id, creator_slug)");
    expect(sql).toContain("primary key (season_id, tier)");
    // Fermées au client, comme le reste du wallet.
    expect(sql).toContain("revoke all on table public.wallet_season_members from public, anon, authenticated");
    expect(sql).toContain("revoke all on table public.wallet_season_tiers from public, anon, authenticated");
    // Rejouable : la table est vidée avant d'être remplie, donc un catalogue
    // régénéré remplace l'ancienne grille au lieu de s'y ajouter.
    expect(sql).toContain("delete from public.wallet_season_members;");
    expect(sql).toContain("delete from public.wallet_season_tiers;");
    // La plus petite famille du catalogue n'a que deux paliers : la grille ne
    // doit pas inventer des seuils qui n'existent pas.
    expect(sql).toContain("('S09', 1, 1, 1),");
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
