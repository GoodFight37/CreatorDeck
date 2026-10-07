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

export type MissionId = "pack" | "recycle" | "family";

export type MissionDef = {
  id: MissionId;
  label: string;
  detail: string;
  target: number;
};

type ProgressionData = {
  version: number;
  note: string;
  tokens: { label: string; perPack: number; primeTimeBonus: number; targetCost: number; note: string };
  primeTime: { label: string; fromHour: number; toHour: number; note: string };
  missions: {
    resetHourUtc: number;
    reward: { hourglasses: number };
    note: string;
    list: MissionDef[];
  };
  streak: { days: number; jackpotHourglasses: number; note: string };
};

export const PROGRESSION = progression as ProgressionData;

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
