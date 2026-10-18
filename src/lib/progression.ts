/**
 * Les règles de progression : jetons, missions du jour, série de jours et
 * Prime Time.
 *
 * Pourquoi un module plutôt qu'une poignée de constantes éparpillées : ces
 * règles décident de ce que le joueur **gagne**, et plusieurs sont sensibles
 * au temps (une journée qui commence à 6 h UTC et pas à minuit, une fenêtre de
 * 20 h à 23 h). Une erreur d'une heure ici, et la mission du jour se remet à
 * zéro au milieu de la soirée d'un streameur.
 *
 * Tout est pur : on donne un instant, on obtient une réponse. C'est testable
 * sans navigateur, et c'est la même réponse pour l'écran et pour le moteur.
 */
import progression from "@/data/progression.json";

export type MissionId = "pack" | "recycle" | "family" | "tribunal";

export type MissionDef = {
  id: MissionId;
  label: string;
  detail: string;
  target: number;
  fromDay?: number;
};

type ProgressionData = {
  version: number;
  note: string;
  /**
   * Le départ d'une partie neuve. C'est une **règle**, pas un réglage : le
   * serveur sert la même réserve (`_pack_initial_packs()`, `0033`), et un test
   * miroir refuse que les deux divergent — un écran qui annonce deux boosters
   * quand le serveur en donne trois, c'est un mensonge à chaque ouverture.
   */
  start: { points: number; hourglasses: number; packs: number; note: string };
  tokens: { label: string; perPack: number; primeTimeBonus: number; targetCost: number; note: string };
  primeTime: { label: string; fromHour: number; toHour: number; note: string };
  missions: {
    resetHourUtc: number;
    reward: { hourglasses: number };
    note: string;
    list: MissionDef[];
  };
  streak: {
    days: number;
    protectedMisses: number;
    jackpotHourglasses: number;
    /**
     * Ce que la série paie **avant** le 7ᵉ jour : une petite récompense par
     * jour coché. Le 7ᵉ jour n'est pas ici — il paie le booster Perfect garanti,
     * qui ne se cumule pas avec le booster quotidien.
     */
    rewards: StreakReward[];
    note: string;
  };
};

export const PROGRESSION = progression as ProgressionData;

/** Une journée de série, et ce qu'elle rapporte. */
export type StreakReward = {
  /** 1 → 6. Le 7ᵉ jour, c'est le jackpot (`streak.jackpotHourglasses`). */
  day: number;
  points?: number;
  hourglasses?: number;
  tokens?: number;
  packs?: number;
};

/** Les six micro-récompenses, dans l'ordre des jours. */
export const STREAK_REWARDS: readonly StreakReward[] = PROGRESSION.streak.rewards;

const STREAK_REWARD_BY_DAY = new Map(STREAK_REWARDS.map((reward) => [reward.day, reward]));

/**
 * Ce que le jour `day` de la série rapporte, ou `null` s'il ne paie rien.
 *
 * Le 7ᵉ jour renvoie `null` : son paiement est le jackpot, décidé ailleurs
 * (`claimStreakJackpot`). Un jour hors bornes aussi — un compteur venu d'une
 * sauvegarde bricolée ne doit pas inventer de récompense.
 */
export function streakRewardFor(day: number): Required<Omit<StreakReward, "day">> & { day: number } | null {
  const reward = STREAK_REWARD_BY_DAY.get(day);
  if (!reward) return null;
  return {
    day,
    points: reward.points ?? 0,
    hourglasses: reward.hourglasses ?? 0,
    tokens: reward.tokens ?? 0,
    packs: reward.packs ?? 0,
  };
}

/**
 * La récompense en une phrase, pour l'écran : « +1 booster ».
 *
 * Écrite ici et pas dans un composant : c'est la même phrase qui s'affiche
 * pendant la révélation, dans la notification, et dans les tests.
 */
export function streakRewardLabel(reward: {
  points?: number;
  hourglasses?: number;
  tokens?: number;
  packs?: number;
}): string {
  return streakRewardParts(reward, "points").join(" · ");
}

/**
 * Le même barème en morceaux courts, un par ligne d'écran : « +80 pts »,
 * « +10 jetons ». Les cases du planning n'ont pas la place d'une phrase.
 */
export function streakRewardParts(
  reward: { points?: number; hourglasses?: number; tokens?: number; packs?: number },
  pointsWord = "pts",
): string[] {
  const points = reward.points ?? 0;
  const hourglasses = reward.hourglasses ?? 0;
  const tokens = reward.tokens ?? 0;
  const packs = reward.packs ?? 0;
  return [
    packs > 0 ? `+${packs} booster${packs > 1 ? "s" : ""}` : "",
    points > 0 ? `+${points} ${pointsWord}` : "",
    hourglasses > 0 ? `+${hourglasses} sablier${hourglasses > 1 ? "s" : ""}` : "",
    tokens > 0 ? `+${tokens} jetons` : "",
  ].filter(Boolean);
}

/** Ce avec quoi une partie neuve commence (points, sabliers, boosters). */
export const START = PROGRESSION.start;

/** Ce que chaque mission paie : un sablier, pour l'instant. */
export const MISSION_REWARD = PROGRESSION.missions.reward;
export const MISSIONS: readonly MissionDef[] = PROGRESSION.missions.list;
export const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));

/** 400 jetons = une carte au choix, jamais une Légendaire. */
export const TOKEN_TARGET_COST = PROGRESSION.tokens.targetCost;

/**
 * Le décalage des journées de jeu.
 *
 * Une journée ne commence pas à minuit : à minuit, un streameur est encore en
 * train de jouer, et une mission qui se remet à zéro au milieu de sa soirée
 * serait une punition. Le jour de jeu commence à **6 h UTC** — l'heure où la
 * nuit de streaming est finie des deux côtés de l'Atlantique.
 */
const DAY_SHIFT_MS = PROGRESSION.missions.resetHourUtc * 3_600_000;

/**
 * La journée de jeu d'un instant, en clair (`2026-10-07`).
 *
 * Un instant est toujours dans exactement une journée : c'est une fonction, pas
 * une comparaison — deux instants qui donnent le même texte sont le même jour.
 */
export function gameDay(now: number): string {
  return new Date(now - DAY_SHIFT_MS).toISOString().slice(0, 10);
}

/** La journée de jeu suivante. Sert à reconnaître une série qui continue. */
export function nextGameDay(day: string): string {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) return day;
  return new Date(parsed + 86_400_000).toISOString().slice(0, 10);
}

/** Deux journées qui se suivent (la série continue) ou non (elle repart). */
export function follows(previous: string, day: string): boolean {
  return nextGameDay(previous) === day;
}

/** Une absence d'un jour protégée une fois par cycle de sept jours joués. */
export function advanceStreak(
  state: { streakDay: string; streak: number; streakProtectionUsed?: boolean },
  day: string,
): { streak: number; streakProtectionUsed: boolean } {
  if (state.streakDay === day) return { streak: state.streak, streakProtectionUsed: state.streakProtectionUsed === true };
  const newCycle = state.streak % PROGRESSION.streak.days === 0;
  const used = !newCycle && state.streakProtectionUsed === true;
  const protectedGap = Boolean(state.streakDay) && !used && PROGRESSION.streak.protectedMisses > 0
    && nextGameDay(nextGameDay(state.streakDay)) === day;
  const continues = Boolean(state.streakDay) && (follows(state.streakDay, day) || protectedGap);
  return {
    streak: continues ? state.streak % PROGRESSION.streak.days + 1 : 1,
    streakProtectionUsed: continues && (used || protectedGap),
  };
}

/**
 * Sommes-nous dans le Prime Time ?
 *
 * En **heure locale** de l'appareil : « 20 h – 23 h » veut dire le soir du
 * joueur, pas celui de Greenwich. La borne de fin est exclue (23 h pile n'est
 * plus le Prime Time).
 */
export function isPrimeTime(now: number): boolean {
  const { fromHour, toHour } = PROGRESSION.primeTime;
  const hour = new Date(now).getHours();
  return hour >= fromHour && hour < toHour;
}

/** Le libellé affiché, avec ses horaires : « Prime Time 20 h – 23 h ». */
export function primeTimeLabel(): string {
  const { label, fromHour, toHour } = PROGRESSION.primeTime;
  return `${label} ${fromHour} h – ${toHour} h`;
}

/** Ce qu'un booster rapporte en jetons à cet instant (Prime Time compris). */
export function tokensForPack(now: number): number {
  return PROGRESSION.tokens.perPack + (isPrimeTime(now) ? PROGRESSION.tokens.primeTimeBonus : 0);
}
