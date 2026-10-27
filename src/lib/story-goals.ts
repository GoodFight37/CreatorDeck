import type { StoryRun, StoryStats, StoryStat } from "./story-mode";

/** Défis narratifs optionnels : aucun effet sur les jauges, les fins ou la sauvegarde V4. */
interface StoryGoalSpec {
  id: string;
  title: string;
  detail: string;
  start: number;
  end: number;
  stat?: StoryStat;
  threshold?: number;
}

const GOALS: readonly StoryGoalSpec[] = [
  { id: "premier-direct", title: "Premier direct", detail: "Tenir jusqu'à l'acte II", start: 0, end: 12 },
  { id: "parole-tenue", title: "Parole tenue", detail: "Garder au moins 45 de confiance à l'acte III", start: 12, end: 20, stat: "confiance", threshold: 45 },
  { id: "tenir-le-rythme", title: "Tenir le rythme", detail: "Conserver 30 d'énergie à l'acte IV", start: 20, end: 28, stat: "energie", threshold: 30 },
  { id: "studio-debout", title: "Studio debout", detail: "Conserver 35 d'argent à l'acte V", start: 28, end: 36, stat: "argent", threshold: 35 },
  { id: "dernier-direct", title: "Dernier direct", detail: "Aller au bout des quarante décisions", start: 36, end: 40 },
] as const;

export interface StoryGoal {
  id: string;
  title: string;
  detail: string;
  status: "active" | "success" | "failure";
  progress: number;
  target: number;
  caption: string;
  start: number;
  end: number;
}

function measureGoal(goal: StoryGoalSpec, step: number, stats: StoryStats, isEnded: boolean): StoryGoal {
  const completed = step >= goal.end;
  const status = completed
    ? goal.stat && (stats[goal.stat] < (goal.threshold ?? 0)) ? "failure" : "success"
    : isEnded ? "failure" : "active";
  const progress = goal.stat ? Math.min(goal.threshold ?? 100, stats[goal.stat]) : Math.max(0, Math.min(goal.end - goal.start, step - goal.start));
  const target = goal.stat ? goal.threshold ?? 100 : goal.end - goal.start;
  return {
    ...goal,
    status,
    progress,
    target,
    caption: goal.stat ? `${stats[goal.stat]} / ${goal.threshold}` : `${progress} / ${target}`,
  };
}

/** Objectif présent à l'écran. La fin prématurée n'invente pas une réussite. */
export function currentStoryGoal(run: StoryRun): StoryGoal {
  const index = GOALS.findIndex(goal => run.step < goal.end);
  const goal = GOALS[index === -1 ? GOALS.length - 1 : index];
  return measureGoal(goal, run.step, run.stats, Boolean(run.ending));
}

/** Badge de réussite/échec au passage d'un acte, calculé sans donnée supplémentaire. */
export function finishedStoryGoal(run: StoryRun): StoryGoal | null {
  const completed = GOALS.find(goal => goal.end === run.step);
  return completed ? measureGoal(completed, run.step, run.stats, Boolean(run.ending)) : null;
}

/** Jauges affectées au relâchement de la carte, sans révéler leur signe ni leur valeur.
 * Une jauge plafonnée qui ne bouge réellement pas n'allume pas de point.
 */
export function affectedStoryStats(stats: StoryStats, effects: Partial<StoryStats>): StoryStat[] {
  const keys: readonly StoryStat[] = ["public", "energie", "argent", "confiance"];
  return keys.filter(stat => Math.max(0, Math.min(100, stats[stat] + (effects[stat] ?? 0))) !== stats[stat]);
}
