/**
 * Garde-fous sur `supabase/migrations/0004_tirage.sql`.
 *
 * Le PL/pgSQL de ce fichier ne peut pas être exécuté par Vitest : ces tests
 * vérifient donc ce qui est vérifiable ici — le contrat avec
 * `src/data/pull-rates.json` (le serveur doit tirer exactement comme l'écran
 * « Taux de drop ») et les pièges de PL/pgSQL déjà rencontrés, qui ne se voient
 * qu'à l'exécution chez le joueur :
 *   * `case unnest(...)` → « set-returning functions are not allowed in CASE » ;
 *   * `for i in a..b by -1` → le pas d'une boucle entière doit être positif ;
 *   * un indice de tableau qui dépasse la taille → Postgres étend le tableau
 *     avec un NULL, qui remonte jusqu'au journal (`cards` NULL).
 *
 * L'exécution réelle (Postgres jetable, 200 tirages) est dans
 * `scripts/verify-supabase-migrations.mjs`, lancé à la main :
 *   npm install --no-save embedded-postgres pg
 *   node scripts/verify-supabase-migrations.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PULL_RATES } from "@/lib/pull-rates";
import { PACKS } from "@/lib/catalog";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0004_tirage.sql"), "utf8");
// Les contrôles de motifs portent sur le code seul : les commentaires qui
// expliquent un piège citent forcément le motif interdit.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
const live = PULL_RATES.live;

/** Toutes les tables de poids écrites en littéral JSON dans le SQL. */
function weightLiterals(): Array<Record<string, number>> {
  const found = SQL.matchAll(/'(\{[^']*\})'::jsonb/g);
  return [...found].map((match) => JSON.parse(match[1] ?? "{}") as Record<string, number>);
}

/** Compare deux tables de poids sans dépendre de l'ordre des clés. */
function sameWeights(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a[key] ?? 0) === (b[key] ?? 0));
}

describe("0004_tirage.sql", () => {
  it("reprend exactement les poids des slots de pull-rates.json", () => {
    const literals = weightLiterals();
    live.slots.forEach((slot, index) => {
      expect(
        literals.some((weights) => sameWeights(weights, slot.weights)),
        `slot ${index + 1} : poids ${JSON.stringify(slot.weights)} absents du SQL`,
      ).toBe(true);
    });
  });

  it("reprend le slot garanti et le mode « Perfect »", () => {
    const literals = weightLiterals();
    expect(literals.some((weights) => sameWeights(weights, live.guaranteed.weights))).toBe(true);
    expect(literals.some((weights) => sameWeights(weights, live.rareDrop.weights))).toBe(true);
    // Tirage de la variante sur 10 000, comme chooseVariant().
    expect(SQL).toContain("_pack_random_int(10000)");
  });

  it("reprend les seuils de variantes et de Perfect", () => {
    expect(SQL).toContain(`< ${live.variants.holoPermille}`);
    expect(SQL).toContain(`< ${live.rareDrop.variantUpgradePermille}`);
    expect(SQL).toContain(`< ${live.rareDrop.chancePermille}`);
    // Holo dès « Peu commune » et Gold réservé au Perfect, comme le moteur.
    expect(SQL).toMatch(/p_rarity in \('uncommon', 'rare', 'epic', 'legendary'\)/);
    expect(SQL).toMatch(/return 'gold'/);
  });

  it("reprend la recharge du booster (30 min, plafond 4)", () => {
    expect(SQL).toContain(String(PACKS.live.regenMs));
    expect(SQL).toMatch(/p_current_packs >= p_max/);
  });

  it("n'utilise pas de fonction d'ensemble dans un CASE", () => {
    // Postgres refuse « set-returning functions are not allowed in CASE ».
    expect(CODE).not.toMatch(/case\s+unnest/i);
    expect(CODE).not.toMatch(/then\s+unnest/i);
  });

  it("n'utilise pas de pas négatif dans une boucle entière", () => {
    // Le sens vient du mot-clé REVERSE, le pas doit être positif.
    expect(CODE).not.toMatch(/by\s+-/i);
    expect(CODE).toMatch(/for v_i in reverse array_length\(v_drawn, 1\) \.\. 2 loop/);
  });

  it("borne le mélange pour ne jamais écrire hors du tableau", () => {
    // `_pack_random_int(v_i)` puis +1 : la position reste ≤ v_i ≤ taille.
    expect(CODE).not.toMatch(/_pack_random_int\(v_i \+ 1\)/);
    expect(CODE).toMatch(/v_swap := public\._pack_random_int\(v_i\);/);
  });

  it("réserve les fonctions aux joueurs connectés", () => {
    for (const fn of ["open_pack", "pack_status"]) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(\\) from public, anon;`));
      expect(SQL).toMatch(new RegExp(`grant execute on function public\\.${fn}\\(\\) to authenticated;`));
    }
    // Les fonctions internes ne doivent pas être appelables directement.
    for (const internal of ["_pack_random_int", "_pack_choose_creator", "_pack_choose_variant", "_pack_refresh"]) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${internal}\\(`));
    }
  });

  it("protège les tables par RLS, en lecture seule", () => {
    expect(SQL).toMatch(/alter table public\.pack_state enable row level security;/);
    expect(SQL).toMatch(/alter table public\.pack_draws enable row level security;/);
    // Une seule policy d'écriture : aucune. Tout passe par les fonctions.
    expect(SQL).not.toMatch(/for (insert|update|delete|all)\s+to authenticated/i);
  });

  it("écrit le journal d'audit avant de renvoyer les cartes", () => {
    expect(SQL).toMatch(/insert into public\.pack_draws \(user_id, drawn_at, cards\)/);
  });
});
