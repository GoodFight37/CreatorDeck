/**
 * Étude : quelle taille de catalogue pour CreatorDeck ?
 *
 * Simule l'ouverture de boosters avec les vrais taux (`src/data/pull-rates.json`)
 * contre une population de N créateurs répartis selon l'échelle de raretés, et
 * mesure le temps qu'il faut pour compléter sa collection.
 *
 *   node scripts/study-top-size.mjs                 # 500 / 800 / 1000 / 2000
 *   node scripts/study-top-size.mjs --counts 500,1500
 *
 * Aucun accès réseau : c'est un modèle, pas la vraie courbe de jeu (les joueurs
 * ne tirent pas uniformément), mais il donne l'ordre de grandeur qui manque
 * quand on choisit la taille du catalogue.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { rarityForRank } from "./lib/rarity-ladder.mjs";

const ROOT = process.cwd();
const RATES = JSON.parse(await readFile(path.join(ROOT, "src/data/pull-rates.json"), "utf8")).packs;

const argv = process.argv.slice(2);
const countsArg = argv.includes("--counts") ? argv[argv.indexOf("--counts") + 1] : "500,800,1000,2000";
const COUNTS = countsArg.split(",").map((value) => Number(value.trim())).filter(Boolean);
const ROUNDS = 30;
// Assez haut pour dépasser le dernier point de contrôle : une simulation qui
// s'arrête à la fin de collection laisserait des colonnes vides.
const MAX_PACKS = 12_000;
/** Rythmes de jeu testés : occasionnel et régulier (boosters réellement ouverts / jour). */
const PACKS_PER_DAY = [6, 12];
/** Tailles de saison à étudier (seasonMaxSize = 150, fourre-tout = 60). */
const SEASON_SIZES = [60, 150];

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

function pickWeighted(weights) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Ouverture d'un booster : renvoie les raretés tirées (5 slots pour le Live). */
function openPack(pack) {
  const rareDrop = Math.random() * 1000 < pack.rareDrop.chancePermille;
  const weights = rareDrop ? pack.rareDrop.weights : null;
  const drawn = [];
  for (const slot of pack.slots) drawn.push(pickWeighted(weights ?? slot.weights));
  drawn.push(pickWeighted(weights ?? pack.guaranteed.weights));
  return drawn;
}

/** Population : chaque rang a la rareté que lui donne l'échelle du catalogue. */
function population(size) {
  const byRarity = { common: [], uncommon: [], rare: [], epic: [], legendary: [] };
  for (let rank = 1; rank <= size; rank += 1) byRarity[rarityForRank(rank, size)].push(rank);
  return byRarity;
}

function simulate(size, packType) {
  const pack = RATES[packType];
  const buckets = population(size);
  const owned = new Set();
  const totals = { packsTo50: [], packsTo90: [], packsToSeason: {}, uniqueAt: {} };
  const checkpoints = [200, 500, 1000, 2500, 5000, 10_000];

  for (let round = 0; round < ROUNDS; round += 1) {
    owned.clear();
    const seasonTargets = SEASON_SIZES.map((seasonSize) => new Set());
    const seasonDone = SEASON_SIZES.map(() => null);
    const uniqueAt = {};
    let packsTo50 = null;
    let packsTo90 = null;

    for (let packs = 1; packs <= MAX_PACKS; packs += 1) {
      const drawn = openPack(pack);
      const inPack = new Set();
      for (const rarity of drawn) {
        const bucket = buckets[rarity];
        if (!bucket.length) continue;
        let rank = bucket[(Math.random() * bucket.length) | 0];
        // Pas de doublon dans un même booster : on retire au hasard.
        let guard = 0;
        while (inPack.has(rank) && guard < 8) {
          rank = bucket[(Math.random() * bucket.length) | 0];
          guard += 1;
        }
        inPack.add(rank);
        owned.add(rank);
        seasonTargets.forEach((target, index) => {
          if (target.size < SEASON_SIZES[index]) target.add(rank % SEASON_SIZES[index]);
        });
      }

      if (!packsTo50 && owned.size >= size * 0.5) packsTo50 = packs;
      if (!packsTo90 && owned.size >= size * 0.9) packsTo90 = packs;
      seasonDone.forEach((value, index) => {
        if (value === null && seasonTargets[index].size >= SEASON_SIZES[index]) {
          seasonDone[index] = packs;
        }
      });
      if (checkpoints.includes(packs)) uniqueAt[packs] = owned.size;
    }

    totals.packsTo50.push(packsTo50 ?? Infinity);
    totals.packsTo90.push(packsTo90 ?? Infinity);
    SEASON_SIZES.forEach((seasonSize, index) => {
      (totals.packsToSeason[seasonSize] ??= []).push(seasonDone[index] ?? Infinity);
    });
    for (const [checkpoint, value] of Object.entries(uniqueAt)) {
      (totals.uniqueAt[checkpoint] ??= []).push(value);
    }
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[(sorted.length / 2) | 0];
  };
  const share = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    packsTo50: median(totals.packsTo50),
    packsTo90: median(totals.packsTo90),
    packsToSeason: Object.fromEntries(
      SEASON_SIZES.map((seasonSize) => [seasonSize, median(totals.packsToSeason[seasonSize])]),
    ),
    uniqueAt: Object.fromEntries(
      Object.entries(totals.uniqueAt).map(([checkpoint, values]) => [checkpoint, share(values)]),
    ),
  };
}

console.log(
  `\nÉtude de taille — ${ROUNDS} simulations par ligne, taux réels (Live + Archives mélangés 2:1)\n`,
);
console.log(
  ["Top", "Images 600px", "50 %", "90 %", "Saison 60", "Saison 150", "1000 pk", "5000 pk"]
    .map((label, index) => label.padEnd(index === 0 ? 6 : 13))
    .join(""),
);

for (const size of COUNTS) {
  const live = simulate(size, "live");
  const archive = simulate(size, "archive");
  // Mélange 2 boosters Live pour 1 Archives.
  const mix = (a, b) => (a * 2 + b) / 3;
  const packsTo50 = mix(live.packsTo50, archive.packsTo50);
  const packsTo90 = mix(live.packsTo90, archive.packsTo90);
  const season60 = mix(live.packsToSeason[60], archive.packsToSeason[60]);
  const season150 = mix(live.packsToSeason[150], archive.packsToSeason[150]);
  const unique1000 = mix(live.uniqueAt[1000] ?? 0, archive.uniqueAt[1000] ?? 0);
  const unique5000 = mix(live.uniqueAt[5000] ?? 0, archive.uniqueAt[5000] ?? 0);
  const days = (packs, perDay) => `${Math.round(packs / perDay)}j`;

  console.log(
    [
      String(size),
      `${(size * 0.034).toFixed(0)} Mo`,
      `${Math.round(packsTo50)} (${days(packsTo50, 6)})`,
      packsTo90 === Infinity ? "jamais" : `${Math.round(packsTo90)} (${Math.round(packsTo90 / 6)}j)`,
      `${Math.round(season60)} pk (${Math.round(season60 / 6)}j)`,
      season150 === Infinity ? "—" : `${Math.round(season150)} pk (${Math.round(season150 / 6)}j)`,
      `${((unique1000 / size) * 100).toFixed(0)} %`,
      `${((unique5000 / size) * 100).toFixed(0)} %`,
    ]
      .map((value, index) => value.padEnd(index === 0 ? 6 : 13))
      .join(""),
  );
}

console.log(
  `\nLecture (rythme 6 boosters/jour, soit ~1 toutes les 4 h en jouant matin et soir) :`,
);
console.log(
  "  • « 50 % » = temps pour posséder la moitié du catalogue ; « 90 % » = fin de collection.\n",
);
