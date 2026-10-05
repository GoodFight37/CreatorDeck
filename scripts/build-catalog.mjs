/**
 * Build du catalogue CreatorDeck.
 *
 * Valide les données du jeu (créateurs, tables de tirage, découpage des
 * saisons) puis publie un catalogue compact et versionné dans `dist/catalog/`.
 * Le modèle est celui de pokemon-tcg-pocket-database (MIT) : `src/data/` reste
 * la source de vérité rédigée à la main, `dist/` est un artefact généré — à
 * joindre à une GitHub Release, jamais dans Git.
 *
 *   node scripts/build-catalog.mjs           # valide + écrit dist/catalog/
 *   node scripts/build-catalog.mjs --check   # valide seulement (CI)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");

const CREATORS_FILE = path.join(ROOT, "src/data/creators.json");
const SEASONS_FILE = path.join(ROOT, "src/data/seasons.config.json");
const RATES_FILE = path.join(ROOT, "src/data/pull-rates.json");
const PORTRAITS_DIR = path.join(ROOT, "public/creators");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const OUT_DIR = path.join(ROOT, "dist/catalog");

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

/** Vérifie la cohérence du catalogue des 500 créateurs. */
function validateCreators(creators) {
  if (!Array.isArray(creators)) {
    fail("creators.json : tableau attendu.");
    return;
  }
  if (creators.length !== 500) {
    fail(`creators.json : 500 créateurs attendus, ${creators.length} trouvés.`);
  }

  const slugs = new Set();
  const ranks = new Set();
  for (const creator of creators) {
    for (const field of ["slug", "displayName", "category", "rank", "rarity"]) {
      if (creator[field] === undefined || creator[field] === "") {
        fail(`creators.json : ${creator.slug ?? "(sans slug)"} — champ « ${field} » manquant.`);
      }
    }
    if (slugs.has(creator.slug)) fail(`creators.json : slug dupliqué « ${creator.slug} ».`);
    slugs.add(creator.slug);
    if (ranks.has(creator.rank)) fail(`creators.json : rang dupliqué ${creator.rank}.`);
    ranks.add(creator.rank);
    if (!RARITIES.includes(creator.rarity)) {
      fail(`creators.json : rareté inconnue « ${creator.rarity} » (${creator.slug}).`);
    }
    if (!existsSync(path.join(PORTRAITS_DIR, `${creator.slug}.jpg`))) {
      warn(`portrait manquant : public/creators/${creator.slug}.jpg`);
    }
  }

  for (let rank = 1; rank <= creators.length; rank += 1) {
    if (!ranks.has(rank)) fail(`creators.json : rang ${rank} absent du Top 500.`);
  }

  return creators;
}

/** Vérifie le découpage des saisons (source : seasons.config.json). */
function validateSeasons(creators, config) {
  const seen = new Map();
  for (const season of config.seasons) {
    if (!season.id || !season.name) fail(`seasons.config.json : saison sans identifiant ou nom.`);
    const members = creators.filter((creator) => season.categories.includes(creator.category));
    if (!members.length) fail(`Saison ${season.id} : aucune catégorie ne correspond au catalogue.`);
    for (const category of season.categories) {
      if (seen.has(category)) {
        fail(`Catégorie « ${category} » présente dans ${seen.get(category)} et ${season.id}.`);
      }
      seen.set(category, season.id);
    }
  }

  const known = new Set(creators.map((creator) => creator.category));
  const unassigned = [...known].filter((category) => !seen.has(category));
  const missing = [...seen.keys()].filter((category) => !known.has(category));
  if (missing.length) fail(`Catégories inconnues du catalogue : ${missing.join(", ")}.`);

  const covered = creators.filter((creator) => seen.has(creator.category)).length;
  return {
    unassigned,
    covered,
    catchAll: { id: config.catchAll.id, name: config.catchAll.name, creators: creators.length - covered },
    seasons: config.seasons.map((season) => ({
      id: season.id,
      name: season.name,
      categories: season.categories.length,
      creators: creators.filter((creator) => season.categories.includes(creator.category)).length,
    })),
  };
}

/** Vérifie les tables de tirage : chaque slot doit être jouable et borné. */
function validateRates(rates) {
  if (rates?.version !== 1) fail("pull-rates.json : version 1 attendue.");
  for (const pack of Object.values(rates?.packs ?? {})) {
    const slots = [...(pack.slots ?? []), pack.guaranteed];
    if (!pack.slots?.length || !pack.guaranteed) {
      fail("pull-rates.json : chaque booster doit avoir des slots ordinaires et un slot garanti.");
    }
    if (pack.slotCount !== pack.slots.length) {
      fail(`pull-rates.json : slotCount incohérent (${pack.label}).`);
    }
    slots.forEach((slot, index) => {
      const entries = Object.entries(slot.weights ?? {});
      const sum = entries.reduce((acc, [, value]) => acc + value, 0);
      if (sum <= 0) fail(`pull-rates.json : slot ${index + 1} sans poids (${pack.label}).`);
      for (const [rarity, weight] of entries) {
        if (!RARITIES.includes(rarity)) fail(`pull-rates.json : rareté inconnue « ${rarity} ».`);
        if (!(weight > 0)) fail(`pull-rates.json : poids ${rarity}=${weight} invalide.`);
      }
    });
    const drop = pack.rareDrop ?? {};
    if (!(drop.chancePermille > 0 && drop.chancePermille <= 1000)) {
      fail(`pull-rates.json : chance du tirage Perfect invalide (${pack.label}).`);
    }
    if (!(drop.variantUpgradePermille >= 0 && drop.variantUpgradePermille <= 10_000)) {
      fail(`pull-rates.json : variantUpgradePermille hors bornes (${pack.label}).`);
    }
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Version publiée : celle de package.json, sinon le commit courant. */
function catalogVersion(pkg) {
  if (typeof pkg.version === "string" && pkg.version) return pkg.version;
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "0.0.0";
  }
}

async function main() {
  const [creators, seasonsConfig, rates, pkg] = await Promise.all([
    readJson(CREATORS_FILE),
    readJson(SEASONS_FILE),
    readJson(RATES_FILE),
    readJson(PACKAGE_FILE),
  ]);

  validateCreators(creators);
  validateRates(rates);
  const seasonReport = validateSeasons(creators, seasonsConfig);

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} avertissement(s) :`);
    for (const message of warnings.slice(0, 10)) console.log(`   - ${message}`);
    if (warnings.length > 10) console.log(`   … et ${warnings.length - 10} autres.`);
  }

  if (errors.length) {
    console.error(`\n❌ Catalogue invalide (${errors.length} erreur(s)) :`);
    for (const message of errors) console.error(`   - ${message}`);
    process.exit(1);
  }

  const byRarity = Object.fromEntries(
    RARITIES.map((rarity) => [rarity, creators.filter((c) => c.rarity === rarity).length]),
  );

  console.log(`\n✅ Catalogue valide : ${creators.length} créateurs, ${byRarity.legendary} légendaires.`);
  for (const season of seasonReport.seasons) {
    console.log(`   ${season.id} ${season.name} — ${season.creators} créateurs (${season.categories} catégories)`);
  }
  if (seasonReport.catchAll.creators) {
    console.log(
      `   ${seasonReport.catchAll.id} ${seasonReport.catchAll.name} — ${seasonReport.catchAll.creators} créateurs (catégories non listées)`,
    );
  }

  if (CHECK_ONLY) {
    console.log("\n--check : aucune écriture.\n");
    return;
  }

  const raw = await readFile(CREATORS_FILE, "utf8");
  const meta = {
    name: "creatordeck-catalog",
    version: catalogVersion(pkg),
    ratesChecksum: sha256(await readFile(RATES_FILE, "utf8")),
    generatedAt: new Date().toISOString(),
    source: "src/data/creators.json",
    checksum: sha256(raw),
    counts: { creators: creators.length, byRarity, seasons: seasonReport.seasons.length + (seasonReport.catchAll.creators ? 1 : 0) },
    packs: rates.packs,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "creators.min.json"), `${JSON.stringify(creators)}\n`);
  await writeFile(path.join(OUT_DIR, "seasons.json"), `${JSON.stringify(seasonsConfig, null, 2)}\n`);
  await writeFile(path.join(OUT_DIR, "catalog-meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

  console.log(`\n📦 Catalogue publié dans dist/catalog/ (version ${meta.version}, empreinte ${meta.checksum}).`);
  console.log("   À joindre à une GitHub Release, jamais dans Git (voir .gitignore).\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
