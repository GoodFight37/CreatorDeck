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
import { readdir } from "node:fs/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { splitSeason } from "./lib/seasons-split.mjs";
import {
  formatBytes,
  selectMissing,
  selectOrphans,
  sumFileSizes,
} from "./lib/portraits.mjs";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const argv = process.argv.slice(2);
/**
 * Contrôle renforcé (CI) : un portrait manquant ou orphelin fait échouer la
 * vérification au lieu d'avertir. C'est ce qu'exige un catalogue embarqué dans
 * l'APK : une image absente laisse un trou, une image orpheline pèse pour rien.
 */
const STRICT_AVATARS =
  process.argv.includes("--strict-avatars") ||
  ["1", "true", "oui"].includes(String(process.env.STRICT_AVATARS ?? "").toLowerCase());
/** Taille attendue du catalogue : `--expect N`, sinon src/data/catalog.config.json. */
const EXPECT_OPTION = (() => {
  const index = argv.indexOf("--expect");
  return index >= 0 && argv[index + 1] ? Number(argv[index + 1]) : null;
})();

const CREATORS_FILE = path.join(ROOT, "src/data/creators.json");
const SEASONS_FILE = path.join(ROOT, "src/data/seasons.config.json");
const RATES_FILE = path.join(ROOT, "src/data/pull-rates.json");
const PORTRAITS_DIR = path.join(ROOT, "public/creators");
const CATALOG_CONFIG_FILE = path.join(ROOT, "src/data/catalog.config.json");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const OUT_DIR = path.join(ROOT, "dist/catalog");

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const VARIANTS = ["standard", "live", "holo", "gold"];

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

/**
 * Vérifie la cohérence du catalogue des créateurs.
 *
 * La taille attendue vient de `src/data/catalog.config.json` (écrit par
 * scripts/build-twitch-catalog.mjs) ou de `--expect N` : un catalogue tronqué est
 * donc détecté, quelle que soit la cible (500, 1000, 2000…).
 */
function validateCreators(creators, expectedSize) {
  if (!Array.isArray(creators)) {
    fail("creators.json : tableau attendu.");
    return;
  }
  if (expectedSize && creators.length !== expectedSize) {
    fail(
      `creators.json : ${expectedSize} créateurs attendus (catalog.config.json), ${creators.length} trouvés.`,
    );
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
      const message = `portrait manquant : public/creators/${creator.slug}.jpg`;
      if (STRICT_AVATARS) fail(message);
      else warn(message);
    }
  }

  for (let rank = 1; rank <= creators.length; rank += 1) {
    if (!ranks.has(rank)) fail(`creators.json : rang ${rank} absent du classement.`);
  }

  return creators;
}

/**
 * Vérifie les familles de collection (source : seasons.config.json).
 *
 * Depuis la bascule « langues » : le générateur écrit un champ `region` sur
 * chaque créateur (sa langue de diffusion), la configuration décrit les
 * familles, et le rapport applique **le même découpage en vagues que
 * l'application** (module partagé) — sinon le rapport annoncerait une famille de
 * 276 créateurs là où l'app en affiche déjà deux vagues.
 */
function validateRegions(creators, config) {
  const families = config.families ?? [];
  const catchAll = config.catchAll ?? { id: "S99", name: "Sans frontière", maxSize: 150 };
  const waveSize = config.waveSize ?? 150;
  if (!families.length) fail("seasons.config.json : aucune famille déclarée.");

  const seenIds = new Set();
  const seenLanguages = new Map();
  for (const family of families) {
    if (!family.id || !family.name) fail("seasons.config.json : famille sans identifiant ou nom.");
    if (seenIds.has(family.id)) fail(`seasons.config.json : famille ${family.id} déclarée deux fois.`);
    seenIds.add(family.id);
    for (const language of family.languages ?? []) {
      if (seenLanguages.has(language)) {
        fail(`Langue « ${language} » présente dans ${seenLanguages.get(language)} et ${family.id}.`);
      }
      seenLanguages.set(language, family.id);
    }
  }

  const known = new Set(families.map((family) => family.id));
  const unknown = creators.filter((creator) => !creator.region || !known.has(creator.region));
  // Un catalogue antérieur aux régions n'a pas ce champ : ce n'est pas une
  // erreur, tout tombe dans « Sans frontière » en attendant la régénération.
  if (unknown.length) {
    warn(
      `${unknown.length} créateurs sans famille connue → « ${catchAll.name} » ` +
        `(catalogue généré avant les régions ? relance npm run catalog:source).`,
    );
  }
  const empty = families.filter(
    (family) => !creators.some((creator) => creator.region === family.id),
  );
  if (empty.length) {
    warn(`Familles sans créateur dans ce catalogue : ${empty.map((family) => family.id).join(", ")}.`);
  }
  if (catchAll.id && known.has(catchAll.id)) {
    fail(`seasons.config.json : la famille fourre-tout ${catchAll.id} est aussi déclarée comme famille.`);
  }

  const entriesOf = (list) =>
    list.map((creator) => ({ slug: creator.slug, region: creator.region }));

  return {
    covered: creators.length - unknown.length,
    unassigned: unknown.length,
    catchAll: {
      id: catchAll.id,
      name: catchAll.name,
      creators: unknown.length,
      maxSize: catchAll.maxSize ?? waveSize,
      // Tailles réelles des vagues du fourre-tout (même découpage que l'app).
      sizes: splitSeason(
        entriesOf(unknown),
        { id: catchAll.id, name: catchAll.name, tagline: catchAll.tagline ?? "" },
        catchAll.maxSize ?? waveSize,
      ).map((piece) => piece.slugs.length),
    },
    // Vagues réelles : on applique le même découpage que l'application.
    seasons: families.map((family) => {
      const members = entriesOf(creators.filter((creator) => creator.region === family.id));
      const pieces = splitSeason(members, family, waveSize);
      return {
        id: family.id,
        name: family.name,
        languages: (family.languages ?? []).length,
        creators: members.length,
        pieces: pieces.map((piece) => ({ id: piece.id, size: piece.slugs.length })),
      };
    }),
  };
}

/** Taille maximale d'une saison avant découpage (défaut de l'application : 150). */
function seasonMaxSize(config) {
  const value = config.seasonMaxSize;
  return Number.isFinite(value) && value > 0 ? value : 150;
}

/**
 * Vérifie les tables de tirage : chaque slot doit être jouable et borné.
 *
 * Versions : 1 = tables de base, 2 = tables + bloc `direct` (le bonus de ceux
 * qui streament). Le contrôle se resserre avec la version — il ne se contente
 * pas de l'accepter.
 */
function validateRates(rates) {
  if (rates?.version !== 1 && rates?.version !== 2) {
    fail("pull-rates.json : version 1 ou 2 attendue.");
  }
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

  // Bonus Direct (v2) : un poids supérieur à 1 (sinon ce n'est pas un bonus),
  // une chance de variante dans [0, 1000] pour mille, et une variante connue.
  if (rates?.version === 2) {
    const direct = rates.direct;
    if (!direct || typeof direct !== "object") {
      fail("pull-rates.json : le bloc « direct » manque pour la version 2.");
    }
    if (!(direct.creatorBias > 1)) {
      fail(`pull-rates.json : creatorBias doit dépasser 1 (reçu ${direct.creatorBias}).`);
    }
    if (!(direct.livePermille >= 0 && direct.livePermille <= 1000)) {
      fail(`pull-rates.json : livePermille hors bornes (${direct.livePermille}).`);
    }
    if (!VARIANTS.includes(direct.variant)) {
      fail(`pull-rates.json : variante du direct inconnue « ${direct.variant} ».`);
    }
  }

  // Le Paquet Scène tient une promesse publique : **aucune Légendaire**. Si un
  // jour un poids légendaire apparaît dans une de ses tables (slot, garantie ou
  // tirage plein), ce n'est plus le paquet annoncé — et le plancher de
  // malchance, qui ne compte que le Live Drop, deviendrait faux.
  const scene = rates?.packs?.scene;
  if (scene) {
    const tables = [
      ...(scene.slots ?? []),
      scene.guaranteed,
      scene.rareDrop,
    ].filter(Boolean);
    if (tables.some((table) => (table.weights?.legendary ?? 0) > 0)) {
      fail("pull-rates.json : le Paquet Scène ne doit contenir aucun poids légendaire.");
    }
    if (!Array.isArray(scene.slots) || scene.slots.length < 4) {
      fail("pull-rates.json : le Paquet Scène doit garder ses slots ordinaires.");
    }
  }

  // Plancher de malchance : un bloc publié, un seuil entier strictement
  // positif, et une explication — c'est une promesse faite au joueur, elle
  // doit être lisible dans le fichier de taux qui la porte.
  const pity = rates?.pity;
  if (!pity || typeof pity !== "object") {
    fail("pull-rates.json : le bloc « pity » (plancher de malchance) manque.");
  }
  if (!Number.isInteger(pity.threshold) || pity.threshold <= 0) {
    fail(`pull-rates.json : seuil de pity invalide (${pity.threshold}).`);
  }
  if (typeof pity.label !== "string" || !pity.label.trim()) {
    fail("pull-rates.json : le pity doit porter un libellé.");
  }
  if (typeof pity.note !== "string" || !pity.note.trim()) {
    fail("pull-rates.json : le pity doit être expliqué (note).");
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
  const [creators, seasonsConfig, rates, pkg, catalogConfig] = await Promise.all([
    readJson(CREATORS_FILE),
    readJson(SEASONS_FILE),
    readJson(RATES_FILE),
    readJson(PACKAGE_FILE),
    readJson(CATALOG_CONFIG_FILE).catch(() => null),
  ]);

  const expectedSize = EXPECT_OPTION ?? catalogConfig?.expectedSize ?? null;
  // Les libellés de l'app viennent de catalog.config.json : on vérifie qu'ils
  // ne mentent pas sur la taille ou le périmètre du catalogue réel.
  const label = catalogConfig?.label;
  if (typeof label === "string" && expectedSize && !label.includes(String(expectedSize))) {
    fail(`catalog.config.json : le libellé « ${label} » ne mentionne pas la taille ${expectedSize}.`);
  }
  if (EXPECT_OPTION && catalogConfig?.expectedSize && EXPECT_OPTION !== catalogConfig.expectedSize) {
    warn(
      `--expect ${EXPECT_OPTION} diffère de catalog.config.json (${catalogConfig.expectedSize}) : c'est la valeur de --expect qui est vérifiée.`,
    );
  }

  validateCreators(creators, expectedSize);
  validateRates(rates);
  const seasonReport = validateRegions(creators, seasonsConfig);

  // --- Portraits : ce qui part réellement dans l'APK -----------------------
  // Contrôlé ici, avant le rapport d'erreurs : en mode strict, un portrait
  // manquant ou orphelin doit faire échouer la commande.
  let portraitFiles = [];
  try {
    portraitFiles = await readdir(PORTRAITS_DIR);
  } catch {
    portraitFiles = [];
  }
  const portraitSlugs = creators.map((creator) => creator.slug);
  const missingPortraits = selectMissing(portraitFiles, portraitSlugs);
  const orphanPortraits = selectOrphans(portraitFiles, portraitSlugs);
  const usedBytes = await sumFileSizes(
    PORTRAITS_DIR,
    portraitFiles.filter((name) => !orphanPortraits.includes(name)),
  );
  const orphanBytes = await sumFileSizes(PORTRAITS_DIR, orphanPortraits);
  if (orphanPortraits.length) {
    const message =
      `portraits orphelins : ${orphanPortraits.length} fichier(s), ${formatBytes(orphanBytes)} ` +
      `inutiles dans public/creators (${orphanPortraits.slice(0, 3).join(", ")}…)`;
    if (STRICT_AVATARS) fail(message);
    else warn(message);
  }

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

  console.log(
    `\n✅ Catalogue valide : ${creators.length} créateurs${expectedSize ? ` (attendu : ${expectedSize})` : ""}, ${byRarity.legendary} légendaires.`,
  );
  console.log(`   Portraits : ${formatBytes(usedBytes)} utilisés dans l'APK`);
  if (missingPortraits.length) {
    console.log(
      `   ℹ️  ${missingPortraits.length} portrait(s) manquant(s) — lance npm run assets:regen pour les compléter.`,
    );
  }
  if (orphanPortraits.length) {
    console.log(
      `   🧹 ${orphanPortraits.length} portrait(s) orphelin(s) (${formatBytes(orphanBytes)}) — ` +
        `node scripts/regen-avatars.mjs --prune`,
    );
  }
  if (catalogConfig?.label) {
    console.log(
      `   Périmètre : ${catalogConfig.scope ?? "?"} — « ${catalogConfig.label} » (${catalogConfig.audience ?? "audience inconnue"})`,
    );
  }
  for (const season of seasonReport.seasons) {
    const split =
      season.pieces.length > 1
        ? ` → découpée en ${season.pieces.length} morceaux (${season.pieces
            .map((piece) => piece.size)
            .join(" + ")})`
        : "";
    console.log(
      `   ${season.id} ${season.name} — ${season.creators} créateurs (${season.languages} langue(s))${split}`,
    );
  }
  if (seasonReport.catchAll.creators) {
    const maxSize = seasonReport.catchAll.maxSize ?? 150;
    const sizes = seasonReport.catchAll.sizes ?? [];
    const chunks = sizes.length || Math.max(1, Math.ceil(seasonReport.catchAll.creators / maxSize));
    console.log(
      `   ${seasonReport.catchAll.id} ${seasonReport.catchAll.name} — ${seasonReport.catchAll.creators} créateurs (langues non listées ou inconnues)` +
        (chunks > 1 ? ` → découpée en ${chunks} saisons de ≤ ${maxSize}` : ""),
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
    counts: {
      creators: creators.length,
      byRarity,
      seasons: seasonReport.seasons.length + (seasonReport.catchAll.creators ? 1 : 0),
      catchAll: seasonReport.catchAll.creators,
    },
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
