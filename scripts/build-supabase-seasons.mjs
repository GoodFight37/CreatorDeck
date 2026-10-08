/**
 * Génère `supabase/migrations/0028_wallet_saisons.sql` depuis le catalogue et
 * `src/data/seasons.config.json`.
 *
 * Pourquoi un fichier généré : depuis `0027_wallet.sql`, c'est le **serveur**
 * qui paie les paliers d'une famille. Il ne peut pas deviner ce que l'écran
 * affiche — les seuils (25/50/75/100 % d'une vague) et les montants viennent du
 * même module que l'application (`scripts/lib/seasons-split.mjs`, utilisé par
 * `src/lib/seasons.ts`). Ce script les écrit en SQL, une fois :
 *
 *   * `wallet_season_members` — les créateurs de chaque vague (pour compter ce
 *     que le joueur possède, sans le croire) ;
 *   * `wallet_season_tiers` — le seuil et les points de chaque palier.
 *
 *   node scripts/build-supabase-seasons.mjs           # génère le SQL
 *   node scripts/build-supabase-seasons.mjs --check   # échoue si le fichier a dérivé
 *
 * Le mode `--check` est branché sur `catalog:ci` : un catalogue ou une
 * configuration de saisons retouchés sans regénération font échouer la CI.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { splitSeason, tiersFor } from "./lib/seasons-split.mjs";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");

const CREATORS_FILE = path.join(ROOT, "src/data/creators.json");
const CONFIG_FILE = path.join(ROOT, "src/data/seasons.config.json");
const OUTPUT_FILE = path.join(ROOT, "supabase/migrations/0028_wallet_saisons.sql");

const DEFAULT_WAVE_SIZE = 150;
const DEFAULT_CATCH_ALL = { id: "S99", name: "Sans frontière", tagline: "Les chaînes sans famille." };

async function main() {
  const creators = JSON.parse(await readFile(CREATORS_FILE, "utf8"));
  const config = JSON.parse(await readFile(CONFIG_FILE, "utf8"));

  if (!Array.isArray(creators) || creators.length === 0) {
    console.error("creators.json est vide ou invalide.");
    process.exit(1);
  }
  if (!Number.isInteger(config?.pointsPerCreator) || config.pointsPerCreator < 1) {
    console.error("seasons.config.json : pointsPerCreator manquant ou invalide.");
    process.exit(1);
  }

  const seasons = buildSeasons(creators, config);
  if (!seasons.length) {
    console.error("Aucune saison construite : catalogue ou configuration vide.");
    process.exit(1);
  }

  const sql = generateSql(seasons, creators.length, config);

  if (CHECK_ONLY) {
    const existing = await readFile(OUTPUT_FILE, "utf8").catch(() => null);
    if (existing === null) {
      console.error(
        "0028_wallet_saisons.sql manquant. Lance : node scripts/build-supabase-seasons.mjs",
      );
      process.exit(1);
    }
    if (existing !== sql) {
      console.error(
        "0028_wallet_saisons.sql a dérivé du catalogue ou des saisons. Relance : node scripts/build-supabase-seasons.mjs",
      );
      process.exit(1);
    }
    console.log("0028_wallet_saisons.sql est à jour.");
    return;
  }

  await writeFile(OUTPUT_FILE, sql, "utf8");
  const members = seasons.reduce((sum, season) => sum + season.slugs.length, 0);
  console.log(
    `Écrit ${OUTPUT_FILE} (${seasons.length} saisons, ${members} créateurs, ${seasons.length * 4} paliers au plus).`,
  );
}

/**
 * Les mêmes vagues que l'application : familles de la configuration, découpées
 * par `splitSeason` (le module partagé), puis les paliers de chaque vague.
 *
 * `src/lib/seasons.ts` fait exactement le même appel, dans le même ordre — c'est
 * la garantie que le serveur paie ce que l'écran annonce.
 */
function buildSeasons(creators, config) {
  const families = config.families ?? [];
  const catchAll = config.catchAll ?? DEFAULT_CATCH_ALL;
  const waveSize = config.waveSize ?? DEFAULT_WAVE_SIZE;
  const known = new Set(families.map((family) => family.id));

  const seasons = [];
  for (const family of families) {
    const members = creators
      .filter((creator) => creator.region === family.id)
      .map((creator) => ({ slug: creator.slug, region: creator.region }));
    if (!members.length) continue;
    seasons.push(...splitSeason(members, family, waveSize));
  }

  // Comme l'application : aucun créateur n'est laissé de côté.
  const leftovers = creators.filter((creator) => !creator.region || !known.has(creator.region));
  if (leftovers.length) {
    seasons.push(
      ...splitSeason(
        leftovers.map((creator) => ({ slug: creator.slug, region: catchAll.id })),
        { id: catchAll.id, name: catchAll.name, tagline: catchAll.tagline },
        catchAll.maxSize ?? waveSize,
      ),
    );
  }

  return seasons.map((season) => ({
    ...season,
    tiers: tiersFor(season.slugs.length, config),
  }));
}

/** Échappe une chaîne pour un littéral SQL. */
function q(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Le SQL complet : en-tête, deux tables, puis un `delete` + `insert` massif.
 *
 * Rejouable : le `delete` remet la table dans son état exact avant de la
 * remplir, donc coller le fichier deux fois (ou après un changement de
 * catalogue) ne laisse jamais un ancien créateur dans une vague.
 */
function generateSql(seasons, creatorCount, config) {
  const lines = [];
  lines.push("-- CreatorDeck — les familles et leurs paliers, vus par le serveur.");
  lines.push("--");
  lines.push("-- **Fichier généré** par `scripts/build-supabase-seasons.mjs` depuis");
  lines.push("-- `src/data/creators.json` et `src/data/seasons.config.json`, avec le module");
  lines.push("-- partagé `scripts/lib/seasons-split.mjs` — celui-là même que l'écran utilise");
  lines.push("-- (`src/lib/seasons.ts`). Ne pas modifier à la main : relancer le script.");
  lines.push("--");
  lines.push("-- À coller **après** `0027_wallet.sql` (qui lit ces deux tables) : c'est ce");
  lines.push("-- qui permet au serveur de vérifier un palier de famille au lieu de croire le");
  lines.push("-- client sur parole.");
  lines.push("--");
  lines.push(`-- ${seasons.length} saisons, ${creatorCount} créateurs, ${config.pointsPerCreator} points par créateur.`);
  lines.push("-- Rejouable : la table est vidée puis remplie, donc un catalogue régénéré");
  lines.push("-- remplace l'ancienne grille au lieu de s'y ajouter.");
  lines.push("");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("-- 1. Les créateurs de chaque vague");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("-- Une saison (`S04-2`) est un morceau de famille ; ses créateurs sont ceux que");
  lines.push("-- le serveur compte pour savoir si un palier est atteint. La clé primaire porte");
  lines.push("-- les deux colonnes : un créateur ne peut pas être deux fois dans une vague, et");
  lines.push("-- une vague ne peut pas se contredire d'un collage à l'autre.");
  lines.push("create table if not exists public.wallet_season_members (");
  lines.push("  season_id    text not null,");
  lines.push("  creator_slug text not null,");
  lines.push("  primary key (season_id, creator_slug)");
  lines.push(");");
  lines.push("");
  lines.push("create index if not exists wallet_season_members_slug_idx on public.wallet_season_members (creator_slug);");
  lines.push("");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("-- 2. Les paliers de chaque vague");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("-- `tier` est le rang du palier dans la vague (1 à 4) : le client réclame");
  lines.push("-- `S04-2#3`, le serveur relit ici le seuil (`required`) et les points (`points`).");
  lines.push("-- Le journal des mouvements (`wallet_ledger`) garantit qu'un palier ne se paie");
  lines.push("-- qu'une fois, sans qu'aucune colonne n'ait à le dire ici.");
  lines.push("create table if not exists public.wallet_season_tiers (");
  lines.push("  season_id text not null,");
  lines.push("  tier      integer not null check (tier >= 1),");
  lines.push("  required  integer not null check (required >= 1),");
  lines.push("  points    integer not null check (points >= 0),");
  lines.push("  primary key (season_id, tier)");
  lines.push(");");
  lines.push("");
  lines.push("-- Fermées au client, comme le reste du wallet : le joueur passe par les");
  lines.push("-- fonctions, jamais par les tables.");
  lines.push("alter table public.wallet_season_members enable row level security;");
  lines.push("alter table public.wallet_season_tiers enable row level security;");
  lines.push("revoke all on table public.wallet_season_members from public, anon, authenticated;");
  lines.push("revoke all on table public.wallet_season_tiers from public, anon, authenticated;");
  lines.push("");

  // Les vagues : on écrit la grille exacte, triée pour que le fichier soit
  // stable d'une génération à l'autre (un diff bruyant cacherait une vraie
  // dérive).
  const members = seasons.flatMap((season) => season.slugs.map((slug) => [season.id, slug]));
  const tiers = seasons.flatMap((season) =>
    season.tiers.map((tier, index) => [season.id, index + 1, tier.required, tier.reward.points]),
  );

  lines.push("delete from public.wallet_season_members;");
  lines.push("insert into public.wallet_season_members (season_id, creator_slug) values");
  lines.push(
    members.map(([seasonId, slug]) => `  (${q(seasonId)}, ${q(slug)})`).join(",\n") + ";",
  );
  lines.push("");
  lines.push("delete from public.wallet_season_tiers;");
  lines.push("insert into public.wallet_season_tiers (season_id, tier, required, points) values");
  lines.push(
    tiers.map(([seasonId, tier, required, points]) => `  (${q(seasonId)}, ${tier}, ${required}, ${points})`).join(",\n") + ";",
  );
  lines.push("");
  return lines.join("\n");
}

await main();
