/**
 * Étude hors jeu : quel effet aurait un catalogue agrandi à probabilités
 * inchangées ? Les entrées ajoutées sont des identifiants mathématiques, jamais
 * des personnes, des portraits ou des cartes publiées dans CreatorDeck.
 *
 * npm run catalogue:growth -- --runs=300 --seed=20261013
 * Modèle Monte-Carlo autonome basé sur les tables de pull-rates.json. Il ne
 * modifie pas CREATORS et ne remplace pas une exécution des RPC Supabase.
 */
import { CREATORS, type Rarity } from "../src/lib/catalog";
import { REGION_FAMILIES } from "../src/lib/regions";
import { PITY, PULL_RATES, RARITIES } from "../src/lib/pull-rates";

type Entry = { id: string; rarity: Rarity; family: string };
type Catalog = {
  size: number;
  entries: Entry[];
  byId: Map<string, Entry>;
  byRarity: Map<Rarity, Entry[]>;
  byFamilyRarity: Map<string, Entry[]>;
  byFamily: Map<string, Entry[]>;
  families: string[];
  sceneFamilies: string[];
};
type Sample = {
  unique: number;
  completionPct: number;
  avgFamilyPct: number;
  completeFamilies: number;
  targetDays: Record<Rarity, number>;
};

process.env.TZ = "Europe/Paris";
const BASE_SIZE = CREATORS.length;
const CATALOGUE_SIZES = [BASE_SIZE, 1500, 2000, 3000];
const PROFILES = [
  { name: "occasionnel", livePacksPerDay: 2 },
  { name: "regulier", livePacksPerDay: 6 },
  { name: "intensif", livePacksPerDay: 12 },
] as const;
const HORIZONS = [30, 90] as const;
let randomState = 1;

function nextRandom(): number {
  randomState = (randomState + 0x6d2b79f5) >>> 0;
  let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
}
function randomInt(max: number): number {
  if (max <= 0) throw new Error(`Tirage aléatoire invalide : ${max}.`);
  return Math.floor(nextRandom() * max);
}
function addLargestRemainder(
  source: Map<string, number>,
  targetTotal: number,
): Map<string, number> {
  const sourceTotal = [...source.values()].reduce((sum, count) => sum + count, 0);
  const allocation = [...source].map(([key, count]) => {
    const exact = count * targetTotal / sourceTotal;
    return { key, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = targetTotal - allocation.reduce((sum, row) => sum + row.count, 0);
  allocation.sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key));
  for (let index = 0; index < left; index += 1) allocation[index].count += 1;
  return new Map(allocation.map(({ key, count }) => [key, count]));
}

function buildCatalog(targetSize: number): Catalog {
  if (targetSize < BASE_SIZE) throw new Error("Cette étude ne réduit pas le catalogue.");
  const entries: Entry[] = CREATORS.map((creator) => ({
    id: creator.slug,
    rarity: creator.rarity,
    family: creator.region ?? "S10",
  }));
  const buckets = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = `${entry.family}/${entry.rarity}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry);
    buckets.set(key, bucket);
  }
  for (const rarity of RARITIES) {
    const current = entries.filter((entry) => entry.rarity === rarity).length;
    const target = Math.round(targetSize * current / BASE_SIZE);
    const rarityBuckets = new Map(
      [...buckets].filter(([key]) => key.endsWith(`/${rarity}`))
        .map(([key, bucket]) => [key, bucket.length]),
    );
    const allocation = addLargestRemainder(rarityBuckets, target);
    for (const [key, targetCount] of allocation) {
      const [family] = key.split("/");
      const bucket = buckets.get(key)!;
      for (let index = bucket.length; index < targetCount; index += 1) {
        const entry = { id: `synthetic:${family}:${rarity}:${index}`, rarity, family };
        bucket.push(entry);
        entries.push(entry);
      }
    }
  }
  if (entries.length !== targetSize) {
    throw new Error(`Le catalogue modèle compte ${entries.length} entrées, attendu ${targetSize}.`);
  }
  const byRarity = new Map<Rarity, Entry[]>(RARITIES.map((rarity) => [rarity, []]));
  for (const entry of entries) byRarity.get(entry.rarity)!.push(entry);
  const byFamily = new Map<string, Entry[]>();
  for (const entry of entries) {
    const family = byFamily.get(entry.family) ?? [];
    family.push(entry);
    byFamily.set(entry.family, family);
  }
  const families = REGION_FAMILIES.map(({ id }) => id)
    .filter((id) => entries.some((entry) => entry.family === id));
  const byFamilyRarity = buckets;
  const sceneFamilies = families.filter((family) => {
    const nonLegendary = (byFamilyRarity.get(`${family}/common`)?.length ?? 0) +
      (byFamilyRarity.get(`${family}/uncommon`)?.length ?? 0) +
      (byFamilyRarity.get(`${family}/rare`)?.length ?? 0) +
      (byFamilyRarity.get(`${family}/epic`)?.length ?? 0);
    return nonLegendary >= 5 && ((byFamilyRarity.get(`${family}/rare`)?.length ?? 0) > 0 ||
      (byFamilyRarity.get(`${family}/epic`)?.length ?? 0) > 0);
  });
  return {
    size: targetSize,
    entries,
    byId: new Map(entries.map((entry) => [entry.id, entry])),
    byRarity,
    byFamilyRarity,
    byFamily,
    families,
    sceneFamilies,
  };
}

function rarityCount(catalog: Catalog, rarity: Rarity, family: string | null): number {
  return (family
    ? catalog.byFamilyRarity.get(`${family}/${rarity}`)
    : catalog.byRarity.get(rarity))?.length ?? 0;
}
function bucket(catalog: Catalog, rarity: Rarity, family: string | null): Entry[] {
  return (family
    ? catalog.byFamilyRarity.get(`${family}/${rarity}`)
    : catalog.byRarity.get(rarity)) ?? [];
}
function usedCount(catalog: Catalog, used: ReadonlySet<string>, rarity: Rarity, family: string | null): number {
  let count = 0;
  for (const id of used) {
    const entry = catalog.byId.get(id);
    if (entry?.rarity === rarity && (!family || entry.family === family)) count += 1;
  }
  return count;
}
function weightedRarity(
  catalog: Catalog,
  weights: Partial<Record<Rarity, number>>,
  family: string | null,
  used: ReadonlySet<string>,
  reserved: string | null,
): Rarity {
  const candidates = RARITIES.flatMap((rarity) => {
    const available = rarityCount(catalog, rarity, family) - usedCount(catalog, used, rarity, family) -
      (reserved && bucket(catalog, rarity, family).some((entry) => entry.id === reserved) && !used.has(reserved) ? 1 : 0);
    const weight = weights[rarity] ?? 0;
    return available > 0 && weight > 0 ? [{ rarity, weight }] : [];
  });
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!total) throw new Error("Aucune rareté disponible pour ce slot.");
  let roll = randomInt(total);
  for (const candidate of candidates) {
    if (roll < candidate.weight) return candidate.rarity;
    roll -= candidate.weight;
  }
  return candidates[candidates.length - 1].rarity;
}
function pickFromRarity(
  catalog: Catalog,
  rarity: Rarity,
  family: string | null,
  used: ReadonlySet<string>,
  reserved: string | null,
): Entry {
  const source = bucket(catalog, rarity, family);
  const available = source.length - usedCount(catalog, used, rarity, family) -
    (reserved && source.some((entry) => entry.id === reserved) && !used.has(reserved) ? 1 : 0);
  if (available <= 0) throw new Error(`Plus de carte ${rarity} disponible dans ${family ?? "le catalogue"}.`);
  let entry: Entry;
  do { entry = source[randomInt(source.length)]; }
  while (used.has(entry.id) || entry.id === reserved);
  return entry;
}
function pickWeightedEntry(
  catalog: Catalog,
  weights: Partial<Record<Rarity, number>>,
  family: string | null,
  used: ReadonlySet<string>,
  reserved: string | null,
): Entry {
  const rarity = weightedRarity(catalog, weights, family, used, reserved);
  return pickFromRarity(catalog, rarity, family, used, reserved);
}
function pickReserved(
  catalog: Catalog,
  weights: Partial<Record<Rarity, number>>,
  family: string | null,
): Entry | null {
  const eligible = RARITIES.flatMap((rarity) => (weights[rarity] ?? 0) > 0
    ? bucket(catalog, rarity, family)
    : []);
  return eligible.length > 0 && eligible.length <= 4
    ? eligible[randomInt(eligible.length)]
    : null;
}

function drawPack(
  catalog: Catalog,
  type: "live" | "scene",
  family: string | null,
  rareDrop: boolean,
  pity: boolean,
): Entry[] {
  const table = PULL_RATES[type];
  const finalWeights: Partial<Record<Rarity, number>> = pity && type === "live"
    ? { legendary: 1 }
    : rareDrop && type !== "scene" ? table.rareDrop.weights : table.guaranteed.weights;
  const hasEpic = family
    ? rarityCount(catalog, "epic", family) > 0
    : rarityCount(catalog, "epic", null) > 0;
  const reservationWeights = type === "scene" && rareDrop && hasEpic
    ? table.rareDrop.weights
    : finalWeights;
  const reservedEntry = pickReserved(catalog, reservationWeights, family);
  const reserved = reservedEntry?.id ?? null;
  const used = new Set<string>();
  const drawn: Entry[] = [];
  for (let slot = 0; slot < table.slotCount; slot += 1) {
    const finalAvailable = RARITIES.reduce((sum, rarity) => sum +
      ((finalWeights[rarity] ?? 0) > 0
        ? rarityCount(catalog, rarity, family) - usedCount(catalog, used, rarity, family)
        : 0), 0);
    const excluded = reserved ?? (finalAvailable === 1
      ? RARITIES.flatMap((rarity) => (finalWeights[rarity] ?? 0) > 0 ? bucket(catalog, rarity, family) : [])
        .find((entry) => !used.has(entry.id))?.id ?? null
      : null);
    let weights = rareDrop ? table.rareDrop.weights : table.slots[slot].weights;
    if (type === "scene" && rareDrop) {
      const epicsRemain = rarityCount(catalog, "epic", family) - usedCount(catalog, used, "epic", family) -
        (excluded && bucket(catalog, "epic", family).some((entry) => entry.id === excluded) && !used.has(excluded) ? 1 : 0);
      if (epicsRemain <= 0) weights = table.slots[slot].weights;
    }
    const creator = pickWeightedEntry(catalog, weights, family, used, excluded);
    used.add(creator.id);
    drawn.push(creator);
  }
  const sceneEpicsRemain = type === "scene" && rareDrop &&
    rarityCount(catalog, "epic", family) > usedCount(catalog, used, "epic", family);
  const guaranteedWeights = sceneEpicsRemain ? table.rareDrop.weights : finalWeights;
  const guaranteed = pickWeightedEntry(catalog, guaranteedWeights, family, used, null);
  drawn.push(guaranteed);
  return drawn;
}

function chooseSceneFamily(catalog: Catalog, owned: ReadonlyMap<string, number>): string {
  let best: string | null = null;
  let bestRatio = -1;
  for (const family of catalog.sceneFamilies) {
    const total = catalog.byFamily.get(family)?.length ?? 0;
    const familyOwned = owned.get(family) ?? 0;
    if (familyOwned >= total) continue;
    const ratio = familyOwned / total;
    if (ratio > bestRatio) { best = family; bestRatio = ratio; }
  }
  if (best) return best;
  return catalog.sceneFamilies.reduce((largest, family) =>
    (catalog.byFamily.get(family)?.length ?? 0) >
      (catalog.byFamily.get(largest)?.length ?? 0) ? family : largest);
}
function score(catalog: Catalog, owned: ReadonlySet<string>, ownedByFamily: ReadonlyMap<string, number>): Omit<Sample, "targetDays"> {
  const familyPcts = catalog.families.map((family) => {
    const total = catalog.byFamily.get(family)?.length ?? 0;
    return (ownedByFamily.get(family) ?? 0) / total * 100;
  });
  return {
    unique: owned.size,
    completionPct: owned.size / catalog.size * 100,
    avgFamilyPct: familyPcts.reduce((sum, pct) => sum + pct, 0) / familyPcts.length,
    completeFamilies: familyPcts.filter((pct) => pct >= 100).length,
  };
}
function simulate(catalog: Catalog, livePacksPerDay: number, horizon: number): Sample {
  const owned = new Set<string>();
  const ownedByFamily = new Map(catalog.families.map((family) => [family, 0]));
  const addOwned = (entry: Entry) => {
    if (!owned.has(entry.id)) {
      owned.add(entry.id);
      ownedByFamily.set(entry.family, (ownedByFamily.get(entry.family) ?? 0) + 1);
    }
  };
  const targets = Object.fromEntries(RARITIES.map((rarity) => [
    rarity,
    bucket(catalog, rarity, null)[randomInt(rarityCount(catalog, rarity, null))].id,
  ])) as Record<Rarity, string>;
  const targetDays = Object.fromEntries(RARITIES.map((rarity) => [rarity, horizon + 1])) as Record<Rarity, number>;
  let pityCounter = 0;
  let jackpotReady = false;
  const snapshots = new Map<number, Omit<Sample, "targetDays"> & { targetDays: Record<Rarity, number> }>();
  for (let day = 1; day <= horizon; day += 1) {
    // Paquet Scène quotidien, dans la famille en cours de complétion.
    const family = chooseSceneFamily(catalog, ownedByFamily);
    const scenePerfect = randomInt(1000) < PULL_RATES.scene.rareDrop.chancePermille;
    const sceneCards = drawPack(catalog, "scene", family, scenePerfect, false);
    for (const card of sceneCards) {
      addOwned(card);
      const rarity = card.rarity;
      if (card.id === targets[rarity] && targetDays[rarity] > horizon) targetDays[rarity] = day;
    }
    for (let pack = 0; pack < livePacksPerDay; pack += 1) {
      const jackpot = jackpotReady;
      const perfect = jackpot || randomInt(1000) < PULL_RATES.live.rareDrop.chancePermille;
      const pity = pityCounter + 1 >= PITY.threshold;
      const cards = drawPack(catalog, "live", null, perfect, pity);
      const hasLegendary = cards.some((card) => card.rarity === "legendary");
      for (const card of cards) {
        addOwned(card);
        if (card.id === targets[card.rarity] && targetDays[card.rarity] > horizon) {
          targetDays[card.rarity] = day;
        }
      }
      pityCounter = hasLegendary ? 0 : pityCounter + 1;
      if (jackpot) jackpotReady = false;
      // La récompense du 7e jour est prête après son premier booster et force
      // le booster suivant, comme le moteur local.
      if (pack === 0 && day % 7 === 0) jackpotReady = true;
    }
    if (HORIZONS.includes(day as (typeof HORIZONS)[number])) {
      snapshots.set(day, { ...score(catalog, owned, ownedByFamily), targetDays: { ...targetDays } });
    }
  }
  const final = snapshots.get(horizon);
  if (!final) throw new Error(`Horizon non enregistré : ${horizon}.`);
  return final;
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const percentile = (part: number) => sorted[Math.floor((sorted.length - 1) * part)];
  return {
    mean: Math.round(average * 100) / 100,
    p10: percentile(0.10),
    median: percentile(0.50),
    p90: percentile(0.90),
    max: sorted[sorted.length - 1],
  };
}
function summarizeTarget(samples: Sample[], rarity: Rarity, horizon: number) {
  const found = samples.map((sample) => sample.targetDays[rarity])
    .filter((day) => day <= horizon);
  return {
    foundPct: Math.round(found.length / samples.length * 10000) / 100,
    medianDaysIfFound: found.length ? summarize(found).median : null,
    p90DaysIfFound: found.length ? summarize(found).p90 : null,
  };
}

const runArg = process.argv.find((arg) => arg.startsWith("--runs="));
const runs = runArg ? Number(runArg.slice("--runs=".length)) : 300;
const seedArg = process.argv.find((arg) => arg.startsWith("--seed="));
const seed = seedArg ? Number(seedArg.slice("--seed=".length)) : 20261013;
if (!Number.isInteger(runs) || runs < 1 || runs > 5000) throw new Error("--runs doit être entre 1 et 5000.");
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("--seed doit être un uint32.");

console.log(`Étude de catalogue — ${runs} parties/scénario ; seed=${seed} ; TZ=Europe/Paris`);
console.log("Taux inchangés ; créations synthétiques sans nom ni portrait ; Live+Scène ; sans Craft, échanges ou RPC serveur.");
for (const [catalogIndex, size] of CATALOGUE_SIZES.entries()) {
  const catalog = buildCatalog(size);
  for (const [profileIndex, profile] of PROFILES.entries()) {
    for (const horizon of HORIZONS) {
      const samples = Array.from({ length: runs }, (_, run) => {
        randomState = (seed + catalogIndex * 100_000_000 + profileIndex * 10_000_000 + horizon * 10_000 + run) >>> 0;
        return simulate(catalog, profile.livePacksPerDay, horizon);
      });
      const metrics: Record<string, unknown> = {
        unique: summarize(samples.map((sample) => sample.unique)),
        completionPct: summarize(samples.map((sample) => sample.completionPct)),
        avgFamilyPct: summarize(samples.map((sample) => sample.avgFamilyPct)),
        completeFamilies: summarize(samples.map((sample) => sample.completeFamilies)),
        targetAcquisition: Object.fromEntries(RARITIES.map((rarity) => [
          rarity, summarizeTarget(samples, rarity, horizon),
        ])),
      };
      const noTarget = Object.fromEntries(RARITIES.map((rarity) => [
        rarity,
        samples.filter((sample) => sample.targetDays[rarity] > horizon).length,
      ]));
      console.log(JSON.stringify({
        catalogueSize: catalog.size,
        sceneFamilies: catalog.sceneFamilies.length,
        profile: profile.name,
        livePerDay: profile.livePacksPerDay,
        days: horizon,
        runs,
        metrics,
        targetNotFoundByHorizon: noTarget,
      }));
    }
  }
}
