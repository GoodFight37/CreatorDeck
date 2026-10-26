/** Moteur autonome du mode Histoire : aucune dépendance cloud, carte ou IA. */
export const STORY_SAVE_KEY = "creatordeck.histoire.prologue.v3";
export const STORY_STATS = ["public", "energie", "argent", "confiance"] as const;
export type StoryStat = (typeof STORY_STATS)[number];
export type StoryStats = Record<StoryStat, number>;
export type StoryDirection = "left" | "right";
export const STORY_CHANNELS = ["LIVE", "CHAT", "CLIP", "DM", "MAIL", "CONTRAT", "ARCHIVE"] as const;
export type StoryChannel = (typeof STORY_CHANNELS)[number];

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
  /** Support narratif affiché sur le moniteur de la carte, sans effet sur les règles. */
  channel: StoryChannel;
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
    if (!STORY_CHANNELS.includes(scene.channel)) errors.push(`Canal invalide : ${scene.id}`);
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


/** Épilogue personnel : les décisions mémorisées comptent au-delà des jauges. */
export function storyEpilogue(run: StoryRun): string[] {
  if (!run.ending) return [];
  const flags = new Set(run.flags);
  const memories: string[] = [];
  if (flags.has("flo_spectatrice_libre")) memories.push("Flo est revenue comme spectatrice, sans devoir reprendre les clés de la modération.");
  else if (flags.has("rupture_flo")) memories.push("Flo n'est pas revenue. Le chat défile encore, mais personne ne répond à ta place.");
  else if (flags.has("flo_pilier") || flags.has("duo_flo")) memories.push("Flo est restée. Elle se souvient du jour où tu lui as laissé le droit de souffler.");
  else if (flags.has("flo_protegee")) memories.push("Flo t'écrit après le dernier direct. Elle n'a pas oublié que tu as respecté ses limites.");
  else if (flags.has("flo_epuisee")) memories.push("Flo a pris ses distances. Tu as compris trop tard que la loyauté ne remplace pas le repos.");
  if (flags.has("double_mensonge")) memories.push("Les captures de ton contrat et ton accusation contre Nox continuent de circuler.");
  else if (flags.has("aveu_double") || flags.has("transparence_tardive")) memories.push("Tes excuses sont toujours en ligne. Certains sont partis, d'autres ont choisi de te croire.");
  else if (flags.has("sponsor_cache")) memories.push("Le premier contrat secret de Mona laisse une trace dans les archives de ta chaîne.");
  else if (flags.has("sponsor_clair")) memories.push("Mona te recontacte pour une campagne dont les règles sont écrites noir sur blanc.");
  if (flags.has("pacte_brise") || flags.has("dette_nox_refusee")) memories.push("Le silence de Nox raconte ce qui s'est passé entre vos deux chaînes.");
  else if (flags.has("paix_durable_nox") || flags.has("nox_scene_partagee")) memories.push("Nox est revenu sans chercher une revanche. Votre relation a changé de nature.");
  else if (flags.has("nox_allie_final") || flags.has("duo_nox")) memories.push("Nox t'envoie un dernier message : « On remet ça ? » Cette fois, c'est une invitation.");
  else if (flags.has("guerre_nox") && !flags.has("paix_nox")) memories.push("Nox ne te parle plus. Vos deux communautés connaissent encore chaque épisode du conflit.");
  else if (flags.has("respect_nox")) memories.push("Nox continue de saluer ton travail, même lorsque vos chaînes prennent des chemins différents.");
  if (flags.has("collectif_autonome")) memories.push("Flo choisit elle-même son rôle. Le collectif continue sans que son nom soit à vendre.");
  else if (flags.has("collectif_commercial")) memories.push("La campagne a payé le studio, mais Flo n'a pas oublié que tu as décidé pour elle.");
  if (flags.has("pacte_tenu")) memories.push("Nox signe le générique avec toi. Vos deux chaînes restent distinctes, et la promesse tient.");
  else if (flags.has("pacte_brise")) memories.push("Nox a coupé son direct avant la fin. La promesse était écrite, la rupture est publique.");
  if (flags.has("agence")) memories.push("Le contrat d'exclusivité est toujours sur ton bureau. Les prochains choix ne seront plus seulement les tiens.");
  else if (flags.has("libre")) memories.push("Tu gardes les clés de ta chaîne. Cette liberté a un prix, mais tu l'as choisi.");
  if (flags.has("vote_respecte")) memories.push("Tu as accepté de perdre un contrat pour tenir la parole donnée au collectif. Ce vote reste son point de départ.");
  else if (flags.has("vote_trahi")) memories.push("Tu as gardé les clés du studio. Les membres du collectif, eux, n'ont pas tous gardé la confiance.");
  else if (flags.has("pouvoir_partage")) memories.push("Le collectif a survécu au moment où tu as accepté de ne plus être seul à décider.");
  if (flags.has("dette_nox_reglee")) memories.push("Nox a reçu ce que tu lui devais. Le sujet ne reviendra pas comme une menace.");
  else if (flags.has("dette_nox_refusee")) memories.push("Tu proposais des vues en échange de son travail. Nox a conservé les relevés.");
  if (flags.has("source_protegee")) memories.push("Lina n'a jamais dévoilé l'identité de sa source. Tu as compris que la transparence n'autorise pas tout.");
  else if (flags.has("source_menacee")) memories.push("La source de Lina a disparu des réseaux. La recherche d'un nom est devenue une autre histoire.");
  if (flags.has("audit_dons")) memories.push("Les comptes de la collecte sont publics. L'erreur a coûté cher, mais personne n'attend plus un virement.");
  else if (flags.has("dons_opacite")) memories.push("Le total affiché lors de la collecte reste différent du montant reçu par l'association.");
  if (flags.has("saison_collective")) memories.push("Après le générique, quatre micros diffusent encore. Cette chaîne a désormais plus d'une voix.");
  else if (flags.has("saison_duo")) memories.push("Ton dernier direct se termine à deux. Nox sourit, puis vous coupez chacun votre caméra.");
  else if (flags.has("saison_transmission")) memories.push("Tu as laissé à Nox le dernier mot. Partager la lumière n'a pas réduit la tienne.");
  else if (flags.has("saison_transparente")) memories.push("Lina a publié les documents du direct. Les contradictions y sont visibles, comme tes efforts pour les réparer.");
  else if (flags.has("saison_verite")) memories.push("Le compteur a fini par disparaître de ton écran. Ton récit, lui, restera accessible.");
  else if (flags.has("saison_spectacle")) memories.push("Le final bat un record d'audience. Les questions sans réponse défilent encore sous la vidéo.");
  else if (flags.has("saison_vedette")) memories.push("L'équipe était derrière toi, mais le générique n'affichait qu'un seul visage.");
  else if (flags.has("saison_ambigue")) memories.push("Tu as raconté une version défendable de l'histoire. D'autres détiennent encore les pièces manquantes.");
  return memories;
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


/**
 * Variations réellement appliquées par le dernier choix.
 * Les effets déclarés dans le scénario sont des intentions : à 100 ou à 0,
 * une jauge est plafonnée et l'affichage ne doit pas inventer des points.
 * Les sauvegardes V3 conservent les effets bruts pour être rejouées et validées.
 */
export function lastStoryAppliedEffects(script: StoryScript, run: StoryRun): Partial<StoryStats> | null {
  if (!run.history.length) return null;
  const before = { ...script.initialStats };
  for (const entry of run.history.slice(0, -1)) {
    for (const stat of STORY_STATS) {
      before[stat] = Math.max(0, Math.min(100, before[stat] + (entry.effects[stat] ?? 0)));
    }
  }
  const applied: Partial<StoryStats> = {};
  for (const stat of STORY_STATS) {
    const delta = run.stats[stat] - before[stat];
    if (delta !== 0) applied[stat] = delta;
  }
  return applied;
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
