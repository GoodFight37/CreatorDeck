/**
 * CreatorDeck: audit exploratoire de la progression avec le VRAI moteur local.
 *
 * npm run progression:bilan
 * Tirages aléatoires non seedés : les résultats varient d'une exécution à l'autre.
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
function simulate(profile: Profile, days: number) {
  let state = createInitialState(nowAt(0, 7));
  let live = 0, scene = 0, recycled = 0, recycledPoints = 0, crafted = 0, bought = 0;
  let missingPacks = 0, firstRecycleDay: number | null = null;
  let liveLegendaries = 0, sceneNew = 0;
  for (let day = 0; day < days; day++) {
    // Le Paquet Scène ne dépense aucun Live Drop.
    const sceneNow = nowAt(day, 7, 30);
    const sceneResult = openScenePack(state, sceneNow);
    state = sceneResult.state;
    scene++;
    sceneNew += sceneResult.cards.filter(c => c.isNew).length;
    for (const hour of profile.hours) {
      const now = nowAt(day, hour);
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
    const target = missingTarget(state, 220, 600);
    if (target && state.points >= (RARITY_META[target.rarity].craftCost ?? Infinity)) {
      state = craftCreator(state, target.slug, evening);
      crafted++;
    }
    const tokenTarget = CREATORS.find(c => c.rarity === "epic" && !ownedSlugs(state).has(c.slug));
    if (tokenTarget && state.tokens >= 400) {
      state = buyWithTokens(state, tokenTarget.slug, evening);
      bought++;
    }
  }
  const unique = ownedSlugs(state).size;
  return { profile: profile.name, days, live, scene, missingPacks, unique,
    completionPct: +(unique / CREATORS.length * 100).toFixed(1),
    liveLegendaries, sceneNew, recycled, recycledPoints,
    crafted, bought, pointsLeft: state.points, tokensLeft: state.tokens,
    hourglassesLeft: state.hourglasses, firstRecycleDay };
}
console.log("AUDIT DU MOTEUR LOCAL — une seule trajectoire aléatoire par profil");
console.log("Horaires en UTC, bonus Prime Time dépend du fuseau local du processus.");
for (const days of [7, 30]) for (const p of profiles) {
  console.log(JSON.stringify(simulate(p, days)));
}
