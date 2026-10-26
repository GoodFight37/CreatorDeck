/** Moteur autonome du mode Histoire : aucune dépendance cloud, carte ou IA. */
export const STORY_SAVE_KEY = "creatordeck.histoire.prologue.v1";
export const STORY_STATS = ["public", "energie", "argent", "confiance"] as const;
export type StoryStat = (typeof STORY_STATS)[number];
export type StoryStats = Record<StoryStat, number>;
export type StoryDirection = "left" | "right";

export interface StoryChoice {
  label: string;
  effects: Partial<StoryStats>;
  addFlags?: string[];
  removeFlags?: string[];
}

export interface StoryScene {
  id: string;
  step: number;
  title: string;
  speaker: string;
  emoji: string;
  text: string;
  /** Les drapeaux sont écrits par les choix précédents, parfois bien avant cette scène. */
  requiresFlags?: string[];
  forbidsFlags?: string[];
  choices: Record<StoryDirection, StoryChoice>;
}

export interface StoryScript {
  id: string;
  version: number;
  title: string;
  subtitle: string;
  initialStats: StoryStats;
  totalSteps: number;
  scenes: StoryScene[];
}

export type StoryEndingId =
  | "silence" | "epuisement" | "faillite" | "scandale" | "surexposition"
  | "phenomene" | "independant" | "business" | "survivant";

export const STORY_ENDINGS: Record<StoryEndingId, { title: string; text: string; emoji: string }> = {
  silence: { title: "Plus personne en ligne", text: "Le compteur est retombé à zéro. Tu peux toujours rallumer la caméra, mais cette histoire s'arrête ici.", emoji: "📴" },
  epuisement: { title: "Dernier stream", text: "Tu avais encore des idées. Ton corps, lui, a coupé le direct.", emoji: "🪫" },
  faillite: { title: "La facture finale", text: "Le studio ferme et le bailleur récupère les clés. Les souvenirs ne règlent pas les loyers.", emoji: "🧾" },
  scandale: { title: "Chat désactivé", text: "Tu as gardé l'audience un moment, mais perdu la confiance de ceux qui te regardaient.", emoji: "🔇" },
  surexposition: { title: "Trop grand pour l'écran", text: "Cent sur cent. Ton visage est partout et ta vie ne t'appartient presque plus.", emoji: "📺" },
  phenomene: { title: "La chaîne que personne n'attendait", text: "Ton dernier direct est un événement. Tu as grandi sans oublier pourquoi tu avais commencé.", emoji: "🌟" },
  independant: { title: "Une communauté, pas un compteur", text: "Tu refuses les raccourcis. Le public est peut-être plus petit, mais il reste quand l'écran s'éteint.", emoji: "🌱" },
  business: { title: "Le studio devient une entreprise", text: "Tu as gagné assez pour choisir tes prochains projets. Reste à ne pas te perdre dans les réunions.", emoji: "🏢" },
  survivant: { title: "Encore une émission", text: "Pas de couronne, pas de générique triomphal. Juste la lumière rouge qui se rallume demain.", emoji: "🔴" },
};

export interface StoryHistoryEntry {
  sceneId: string;
  direction: StoryDirection;
  effects: Partial<StoryStats>;
}

export interface StoryRun {
  scriptId: string;
  scriptVersion: number;
  step: number;
  stats: StoryStats;
  flags: string[];
  history: StoryHistoryEntry[];
  ending: StoryEndingId | null;
}

export function validateStoryScript(script: StoryScript): string[] {
  const errors: string[] = [];
  if (!script.id || !Number.isInteger(script.version) || script.version < 1) errors.push("Identifiant ou version invalide");
  if (!Number.isInteger(script.totalSteps) || script.totalSteps < 1) errors.push("Nombre d'étapes invalide");
  const ids = new Set<string>();
  for (const key of STORY_STATS) {
    if (!Number.isInteger(script.initialStats[key]) || script.initialStats[key] < 1 || script.initialStats[key] > 99) errors.push(`Jauge initiale invalide : ${key}`);
  }
  for (const scene of script.scenes) {
    if (ids.has(scene.id) || !scene.id) errors.push(`Scène dupliquée ou sans id : ${scene.id}`);
    ids.add(scene.id);
    if (!Number.isInteger(scene.step) || scene.step < 0 || scene.step >= script.totalSteps) errors.push(`Étape invalide : ${scene.id}`);
    if (!scene.title.trim() || !scene.text.trim() || !scene.speaker.trim()) errors.push(`Texte manquant : ${scene.id}`);
    if (scene.requiresFlags?.some((flag) => scene.forbidsFlags?.includes(flag))) errors.push(`Conditions contradictoires : ${scene.id}`);
    for (const direction of ["left", "right"] as const) {
      const choice = scene.choices?.[direction];
      if (!choice || !choice.label.trim()) { errors.push(`Choix ${direction} absent : ${scene.id}`); continue; }
      if (choice.addFlags?.some((flag) => choice.removeFlags?.includes(flag))) errors.push(`Drapeau contradictoire : ${scene.id}`);
      for (const [key, value] of Object.entries(choice.effects)) {
        if (!STORY_STATS.includes(key as StoryStat) || !Number.isInteger(value) || Math.abs(value) > 40) errors.push(`Effet invalide : ${scene.id}.${direction}.${key}`);
      }
    }
  }
  for (let step = 0; step < script.totalSteps; step++) {
    if (!script.scenes.some((scene) => scene.step === step && !scene.requiresFlags?.length && !scene.forbidsFlags?.length)) {
      errors.push(`Aucun repli inconditionnel à l'étape ${step}`);
    }
  }
  return errors;
}

export function startStory(script: StoryScript): StoryRun {
  const problems = validateStoryScript(script);
  if (problems.length) throw new Error(`Histoire invalide : ${problems.join("; ")}`);
  return {
    scriptId: script.id,
    scriptVersion: script.version,
    step: 0,
    stats: { ...script.initialStats },
    flags: [], history: [], ending: null,
  };
}

export function currentStoryScene(script: StoryScript, run: StoryRun): StoryScene | null {
  if (run.ending || run.step >= script.totalSteps) return null;
  const flags = new Set(run.flags);
  // Scènes conditionnelles d'abord, repli garanti en dernier.
  const choices = script.scenes
    .filter((scene) => scene.step === run.step
      && (scene.requiresFlags ?? []).every((flag) => flags.has(flag))
      && (scene.forbidsFlags ?? []).every((flag) => !flags.has(flag)))
    .sort((a, b) => ((b.requiresFlags?.length ?? 0) + (b.forbidsFlags?.length ?? 0))
      - ((a.requiresFlags?.length ?? 0) + (a.forbidsFlags?.length ?? 0)));
  return choices[0] ?? null;
}

function determineEnding(run: StoryRun, totalSteps: number): StoryEndingId | null {
  const { public: audience, energie, argent, confiance } = run.stats;
  if (energie <= 0) return "epuisement";
  if (argent <= 0) return "faillite";
  if (confiance <= 0) return "scandale";
  if (audience <= 0) return "silence";
  if (audience >= 100) return "surexposition";
  if (run.step < totalSteps) return null;
  if (audience >= 68 && confiance >= 55 && energie >= 25) return "phenomene";
  if (confiance >= 67 && energie >= 35) return "independant";
  if (argent >= 67) return "business";
  return "survivant";
}

export function chooseStory(script: StoryScript, run: StoryRun, direction: StoryDirection): StoryRun {
  if (direction !== "left" && direction !== "right") throw new Error("Direction invalide");
  if (run.scriptId !== script.id || run.scriptVersion !== script.version) throw new Error("Version de partie incompatible");
  if (run.ending) return run; // Fin immuable : pas de double choix ou double conséquence.
  const scene = currentStoryScene(script, run);
  if (!scene) throw new Error(`Scène manquante à l'étape ${run.step}`);
  const choice = scene.choices[direction];
  const flags = new Set(run.flags);
  for (const flag of choice.removeFlags ?? []) flags.delete(flag);
  for (const flag of choice.addFlags ?? []) flags.add(flag);
  const stats = { ...run.stats };
  for (const stat of STORY_STATS) stats[stat] = Math.max(0, Math.min(100, stats[stat] + (choice.effects[stat] ?? 0)));
  const next: StoryRun = {
    ...run, step: run.step + 1, stats,
    flags: [...flags],
    history: [...run.history, { sceneId: scene.id, direction, effects: { ...choice.effects } }],
    ending: null,
  };
  next.ending = determineEnding(next, script.totalSteps);
  return next;
}

/** Une sauvegarde corrompue ou d'une autre version ne remplace jamais un état sain. */
export function restoreStory(script: StoryScript, raw: string | null): StoryRun | null {
  if (!raw) return null;
  try {
    const run: StoryRun = JSON.parse(raw);
    if (!run || run.scriptId !== script.id || run.scriptVersion !== script.version
      || !Number.isInteger(run.step) || run.step < 0 || run.step > script.totalSteps
      || !Array.isArray(run.history) || run.history.length !== run.step
      || !Array.isArray(run.flags) || run.flags.some((flag) => typeof flag !== "string" || flag.length > 80)
      || !run.stats || STORY_STATS.some((key) => !Number.isInteger(run.stats[key]) || run.stats[key] < 0 || run.stats[key] > 100)
      || !(run.ending === null || Object.hasOwn(STORY_ENDINGS, run.ending))) return null;
    // Rejouer l'historique pour vérifier les jauges, les drapeaux et la fin :
    // une sauvegarde ne peut inventer ni conséquences, ni scène conditionnelle.
    let verified = startStory(script);
    for (const entry of run.history) {
      if (!entry || (entry.direction !== "left" && entry.direction !== "right") || verified.ending) return null;
      const scene = currentStoryScene(script, verified);
      if (!scene || scene.id !== entry.sceneId) return null;
      const actualEffects = scene.choices[entry.direction].effects;
      if (!entry.effects || typeof entry.effects !== "object"
        || Object.keys(entry.effects).length !== Object.keys(actualEffects).length
        || Object.entries(actualEffects).some(([key, value]) => entry.effects[key as StoryStat] !== value)) return null;
      verified = chooseStory(script, verified, entry.direction);
    }
    if (verified.step !== run.step || verified.ending !== run.ending
      || run.flags.length !== verified.flags.length
      || run.flags.some((flag, index) => flag !== verified.flags[index])
      || STORY_STATS.some((key) => run.stats[key] !== verified.stats[key])) return null;
    return verified;
  } catch { return null; }
}
