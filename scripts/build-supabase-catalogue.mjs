/**
 * Génère `supabase/migrations/0003_catalogue.sql` depuis `src/data/creators.json`.
 *
 * Le fichier SQL est un seed de données : une table `public.creators` et un
 * `INSERT … ON CONFLICT DO UPDATE` par créateur. Il est **committé** dans le
 * dépôt — c'est ce que le propriétaire colle dans le SQL Editor de Supabase.
 *
 *   node scripts/build-supabase-catalogue.mjs           # génère le SQL
 *   node scripts/build-supabase-catalogue.mjs --check   # échoue si le fichier a dérivé
 *
 * Le mode `--check` est branché sur `catalog:ci` : un catalogue mis à jour
 * (nouveau `creators.json`) sans regénération fait échouer la CI.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");

const CREATORS_FILE = path.join(ROOT, "src/data/creators.json");
const RETIRED_FILE = path.join(ROOT, "src/data/retired.json");
const OUTPUT_FILE = path.join(ROOT, "supabase/migrations/0003_catalogue.sql");

const VALID_RARITIES = new Set(["common", "uncommon", "rare", "epic", "legendary"]);

async function main() {
  const raw = await readFile(CREATORS_FILE, "utf8");
  const creators = JSON.parse(raw);

  // Les Sortants : ils ne sont plus tirables, mais leurs lignes doivent rester
  // en base (des cartes existent, en circulation dans les échanges et l'hôtel).
  // Ils sont donc écrits **après** le catalogue courant, marqués `retired`.
  let retired = [];
  try {
    const parsed = JSON.parse(await readFile(RETIRED_FILE, "utf8"));
    retired = Array.isArray(parsed.creators) ? parsed.creators : [];
  } catch {
    retired = [];
  }
  // Un créateur revenu au classement n'est pas réécrit deux fois.
  const currentSlugs = new Set(creators.map((creator) => creator.slug));
  retired = retired.filter((creator) => creator?.slug && !currentSlugs.has(creator.slug));

  if (!Array.isArray(creators) || creators.length === 0) {
    console.error("creators.json est vide ou invalide.");
    process.exit(1);
  }

  // Validation : chaque créateur doit avoir un slug, un nom et une rareté valide.
  for (const creator of creators) {
    if (!creator.login || typeof creator.login !== "string") {
      console.error(`Créateur sans login Twitch : ${creator.slug ?? "?"}`);
      process.exitCode = 1;
      continue;
    }
    if (!creator.slug || typeof creator.slug !== "string") {
      console.error(`Créateur sans slug : ${JSON.stringify(creator)}`);
      process.exit(1);
    }
    if (!creator.displayName || typeof creator.displayName !== "string") {
      console.error(`Créateur sans nom : ${creator.slug}`);
      process.exit(1);
    }
    if (!VALID_RARITIES.has(creator.rarity)) {
      console.error(`Rareté inconnue pour ${creator.slug} : ${creator.rarity}`);
      process.exit(1);
    }
    if (!Number.isInteger(creator.rank) || creator.rank < 1) {
      console.error(`Rang invalide pour ${creator.slug} : ${creator.rank}`);
      process.exit(1);
    }
    // La région est la famille de collection (voir `src/lib/regions.ts`) : elle
    // sert à la complétion par famille côté serveur. Un créateur sans région
    // tomberait dans « Sans frontière » — acceptable à l'écran, mais un
    // catalogue entier sans région serait un bug silencieux.
    if (typeof creator.region !== "string" || !creator.region) {
      console.error(`Créateur sans région : ${creator.slug}`);
      process.exit(1);
    }
  }

  const sql = generateSql(creators, retired);

  if (CHECK_ONLY) {
    const existing = await readFile(OUTPUT_FILE, "utf8").catch(() => null);
    if (existing === null) {
      console.error(`0003_catalogue.sql manquant. Lance : node scripts/build-supabase-catalogue.mjs`);
      process.exit(1);
    }
    if (existing !== sql) {
      console.error(
        "0003_catalogue.sql a dérivé de creators.json. Relance : node scripts/build-supabase-catalogue.mjs",
      );
      process.exit(1);
    }
    console.log("0003_catalogue.sql est à jour.");
    return;
  }

  await writeFile(OUTPUT_FILE, sql, "utf8");
  console.log(`Écrit ${OUTPUT_FILE} (${creators.length} créateurs).`);
}

/**
 * Produit le SQL complet : en-tête, table, puis un INSERT par créateur.
 *
 * Le `ON CONFLICT DO UPDATE` rend le fichier rejouable : on peut le coller
 * plusieurs fois dans le SQL Editor sans erreur.
 */
function generateSql(creators, retiredCreators = []) {
  const lines = [];
  lines.push("-- CreatorDeck — catalogue des créateurs pour le serveur de tirage.");
  lines.push("--");
  lines.push("-- **Fichier généré** par `scripts/build-supabase-catalogue.mjs` depuis");
  lines.push("-- `src/data/creators.json`. Ne pas modifier à la main : relancer le script.");
  lines.push("--");
  lines.push("-- Rejouable : `INSERT … ON CONFLICT DO UPDATE` — coller plusieurs fois");
  lines.push("-- dans le SQL Editor est sans effet.");
  lines.push("");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("-- Table des créateurs");
  lines.push("-- --------------------------------------------------------------------------");
  lines.push("create table if not exists public.creators (");
  lines.push("  slug         text primary key,");
  // Le `login` Twitch sert au statut « en direct » : Helix s'interroge par
  // `user_login`, et c'est la seule clé qui relie une diffusion à sa carte
  // (le slug, lui, est nettoyé — « caseoh_ » devient « caseoh »).
  lines.push("  login        text,");
  lines.push("  display_name text not null,");
  lines.push("  rarity       text not null check (rarity in ('common','uncommon','rare','epic','legendary')),");
  lines.push("  rank         integer not null,");
  // La famille de collection (`S01`…`S09`, `S10` pour la fourre-tout). Elle est
  // déjà dans `creators.json` ; la recopier ici permet au serveur de compter la
  // complétion **par famille** sans connaître le catalogue du client.
  lines.push("  region       text,");
  // `retired` : le créateur a quitté le classement. Sa ligne reste (des cartes
  // existent, en circulation), mais le tirage ne le choisit plus — voir
  // `0016_sortants.sql`. Défaut `false` pour les bases qui n'ont pas encore la
  // colonne.
  lines.push("  retired      boolean not null default false");
  lines.push(");");
  lines.push("");
  // Les bases créées avant l'arrivée du direct n'ont pas la colonne :
  // `create table if not exists` ne l'aurait pas ajoutée.
  lines.push("-- Colonnes ajoutées après coup : les bases existantes les reçoivent ici.");
  lines.push("alter table public.creators add column if not exists login text;");
  lines.push("alter table public.creators add column if not exists region text;");
  lines.push("alter table public.creators add column if not exists retired boolean not null default false;");
  lines.push("create index if not exists creators_retired_idx on public.creators (retired);");
  lines.push("create index if not exists creators_region_idx on public.creators (region);");
  lines.push("");

  // La table est la source de vérité du tirage serveur : elle ne s'écrit que
  // depuis le SQL Editor (ou une migration), jamais depuis l'API. RLS activée
  // avec une seule politique de lecture : aucun client ne peut changer une
  // rareté pour se fabriquer de meilleures cartes.
  lines.push("-- RLS : lecture seule pour les joueurs connectés, aucune écriture cliente.");
  lines.push("alter table public.creators enable row level security;");
  lines.push("");
  lines.push('drop policy if exists "lecture du catalogue" on public.creators;');
  lines.push('create policy "lecture du catalogue"');
  lines.push("  on public.creators for select");
  lines.push("  to authenticated");
  lines.push("  using (true);");
  lines.push("");

  // Un seul INSERT massif : plus rapide à coller et à exécuter.
  // Les valeurs sont échappées (slug et display_name sont du texte simple).
  const all = [
    ...creators.map((creator) => ({ ...creator, retired: false })),
    ...retiredCreators.map((creator) => ({ ...creator, retired: true })),
  ];
  lines.push(`-- ${creators.length} créateurs au classement, ${retiredCreators.length} Sortant(s).`);
  lines.push("insert into public.creators (slug, login, display_name, rarity, rank, region, retired) values");

  const valueLines = all.map((creator, index) => {
    const escaped = escapeSql(creator.displayName);
    const comma = index < all.length - 1 ? "," : "";
    return `  ('${escapeSql(creator.slug)}', '${escapeSql(creator.login)}', '${escaped}', '${creator.rarity}', ${creator.rank}, '${escapeSql(creator.region)}', ${creator.retired})${comma}`;
  });

  lines.push(valueLines.join("\n"));
  lines.push("on conflict (slug) do update set");
  lines.push("  login        = excluded.login,");
  lines.push("  display_name = excluded.display_name,");
  lines.push("  rarity       = excluded.rarity,");
  lines.push("  rank         = excluded.rank,");
  lines.push("  region       = excluded.region,");
  // Un revenant redevient tirable : c'est le catalogue courant qui gagne.
  lines.push("  retired      = excluded.retired;");
  lines.push("");

  return lines.join("\n") + "\n";
}

/** Échappe une apostrophe SQL (la seule chose qui peut casser dans un slug ou un nom). */
function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
