/**
 * CreatorDeck: audit exploratoire de la progression avec le VRAI moteur local.
 *
 * npm run progression:bilan
 * Tirages reproductibles : --seed=20261010, fuseau fixé Europe/Paris.
 * npm run progression:bilan -- --runs=100 (100 trajectoires par profil/durée).
 * Ne teste PAS Supabase, les échanges, les achats marché, ni les horaires réels.
 */
import { CREATORS, RARITY_META } from "../src/lib/catalog";
import {
  createInitialState, openPack, openScenePack, refreshBalances,
  bulkRecycleCards, claimMissions, claimMilestone, milestoneViews,
  claimSeason, seasonViews, craftCreator, buyWithTokens,
  claimStreakJackpot, ownedSlugs, duplicateGroups,
  type PlayerState,
} from "../src/lib/game-engine";

type Profile = { name: string; hours: number[] };
type Strategy = "epargne" | "craft-et-jetons";
// Remplacement limité à ce processus d'audit. Aucun changement du hasard du jeu.
process.env.TZ = "Europe/Paris";
let seedState = 1;
const nextUint = () => {
  seedState = (seedState + 0x6d2b79f5) >>> 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return (t ^ (t >>> 14)) >>> 0;
};
const nativeCrypto = globalThis.crypto;
Object.defineProperty(globalThis, "crypto", { configurable: true, value: {
  getRandomValues(array: Uint32Array | Uint8Array) {
    for (let i = 0; i < array.length; i++) array[i] = nextUint();
    return array;
  },
} });
const profiles: Profile[] = [
  { name: "occasionnel", hours: [9, 21] },
  { name: "regulier", hours: [8, 8, 13, 13, 20, 20] },
  { name: "intensif", hours: [7, 7, 10, 10, 13, 13, 16, 16, 19, 19, 22, 22] },
];
const origin = Date.UTC(2026, 9, 12, 0, 0);
const nowAt = (day: number, hour: number, minute = 0) =>
  origin + day * 86_400_000 + hour * 3_600_000 + minute * 60_000;

function claimReady(state: PlayerState, now: number): PlayerState {
  for (const m of milestoneViews(state)) {
    if (m.reached && !m.claimed) state = claimMilestone(state, m.id, now);
  }
  for (const season of seasonViews(state)) {
    if (season.tiers.some(t => t.unlocked && !t.claimed)) {
      state = claimSeason(state, season.id, now);
    }
  }
  try { state = claimMissions(state, now); } catch (e) {
    // Une journée sans mission terminée n'est pas une erreur de simulation.
    if (!(e instanceof Error) || !e.message.includes("Aucune mission")) throw e;
  }
  return state;
}
function missingTarget(state: PlayerState, minCost: number, maxCost: number) {
  const owned = ownedSlugs(state);
  return CREATORS.find(c => !owned.has(c.slug) &&
    RARITY_META[c.rarity].craftable &&
    (RARITY_META[c.rarity].craftCost ?? Infinity) >= minCost &&
    (RARITY_META[c.rarity].craftCost ?? Infinity) <= maxCost);
}
function simulate(profile: Profile, days: number, strategy: Strategy) {
  let state = createInitialState(nowAt(0, 7));
  let live = 0, scene = 0, recycled = 0, recycledPoints = 0, crafted = 0, bought = 0;
  let missingPacks = 0, firstRecycleDay: number | null = null;
  let liveLegendaries = 0, sceneNew = 0;
  for (let day = 0; day < days; day++) {
    // Le Paquet Scène ne dépense aucun Live Drop.
    const sceneNow = nowAt(day, 6, 30);
    const sceneResult = openScenePack(state, sceneNow);
    state = sceneResult.state;
    scene++;
    sceneNew += sceneResult.cards.filter(c => c.isNew).length;
    for (const [index, hour] of profile.hours.entries()) {
      const sameHourBefore = profile.hours.slice(0, index).filter(h => h === hour).length;
      const now = nowAt(day, hour, sameHourBefore);
      state = refreshBalances(state, now);
      if (state.packs <= 0) { missingPacks++; continue; }
      const result = openPack(state, now);
      state = result.state;
      live++;
      liveLegendaries += result.cards.filter(c => c.rarity === "legendary").length;
      // Choix de joueur explicite : le Perfect de la série est conservé pour le prochain tirage.
      if (state.streakJackpot) state = claimStreakJackpot(state, "perfect", now);
    }
    const evening = nowAt(day, 23);
    const before = state.points;
    const recyclable = duplicateGroups(state).filter(g => g.variant !== "live")
      .reduce((n,g) => n + g.recyclableIds.length, 0);
    state = bulkRecycleCards(state, evening);
    if (recyclable) {
      if (firstRecycleDay === null) firstRecycleDay = day + 1;
      recycled += recyclable;
      recycledPoints += state.points - before;
    }
    state = claimReady(state, evening);
    // Stratégie d'essai, NON recommandation de jeu : acheter une épique manquante
    // dès que possible, sinon une rare, pour mesurer les sorties de monnaie.
    const target = strategy === "craft-et-jetons" ? missingTarget(state, 220, 600) : undefined;
    if (strategy === "craft-et-jetons" && target && state.points >= (RARITY_META[target.rarity].craftCost ?? Infinity)) {
      state = craftCreator(state, target.slug, evening);
      crafted++;
    }
    const owned = ownedSlugs(state);
    const tokenTarget = strategy === "craft-et-jetons"
      ? CREATORS.find(c => c.rarity === "epic" && !owned.has(c.slug)) : undefined;
    if (strategy === "craft-et-jetons" && tokenTarget && state.tokens >= 400) {
      state = buyWithTokens(state, tokenTarget.slug, evening);
      bought++;
    }
  }
  const unique = ownedSlugs(state).size;
  return { profile: profile.name, days, strategy, live, scene, missingPacks, unique,
    completionPct: +(unique / CREATORS.length * 100).toFixed(1),
    liveLegendaries, sceneNew, recycled, recycledPoints,
    crafted, bought, pointsLeft: state.points, tokensLeft: state.tokens,
    hourglassesLeft: state.hourglasses, firstRecycleDay };
}
const runsArg = process.argv.find(arg => arg.startsWith("--runs="));
const runs = runsArg ? Number(runsArg.slice("--runs=".length)) : 1;
const seedArg = process.argv.find(arg => arg.startsWith("--seed="));
const seed = seedArg ? Number(seedArg.slice(7)) : 20261010;
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("--seed : entier uint32 attendu.");
if (!Number.isInteger(runs) || runs < 1 || runs > 1000) {
  throw new Error("--runs doit être un entier entre 1 et 1000.");
}
const percentile = (sorted: number[], p: number) =>
  sorted[Math.floor((sorted.length - 1) * p)];
console.log(`AUDIT DU MOTEUR LOCAL — ${runs} trajectoires par scénario ; seed=${seed} ; TZ=${process.env.TZ}`);
console.log("Horaires UTC ; Mulberry32 ; moteur local uniquement, sans Supabase ni échanges.");
function runAudit() {
  for (const days of [7, 30]) for (const [profileIndex, p] of profiles.entries()) for (const strategy of ["epargne", "craft-et-jetons"] as const) {
    const results = Array.from({ length: runs }, (_, run) => {
      // Même origine aléatoire entre stratégies et entre les audits 100/1000.
      seedState = (seed + days * 100000 + profileIndex * 10000 + run) >>> 0;
      return simulate(p, days, strategy);
    });
    if (runs === 1) {
      console.log(JSON.stringify(results[0]));
      continue;
    }
    const fields = ["unique", "completionPct", "liveLegendaries", "recycled",
      "recycledPoints", "crafted", "bought", "pointsLeft", "tokensLeft",
      "hourglassesLeft", "missingPacks"] as const;
    const stats: Record<string, { mean: number; p10: number; median: number; p90: number; min: number; max: number; sd: number }> = {};
    for (const field of fields) {
      const values = results.map(result => result[field]).sort((a, b) => a - b);
      const mean = values.reduce((sum, value) => sum + value, 0) / runs;
      stats[field] = {
        mean: Math.round(mean * 100) / 100,
        p10: percentile(values, 0.10), median: percentile(values, 0.50),
        p90: percentile(values, 0.90),
        min: values[0], max: values[values.length - 1],
        sd: Math.round(Math.sqrt(values.reduce((sum, value) => sum +
          (value - mean) ** 2, 0) / runs) * 100) / 100,
      };
    }
    console.log(JSON.stringify({ profile: p.name, days, strategy, runs, stats }));
  }
}
try { runAudit(); }
finally { Object.defineProperty(globalThis, "crypto", { configurable: true, value: nativeCrypto }); }
