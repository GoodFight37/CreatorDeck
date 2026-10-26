/** Moteur autonome du mode Histoire : aucune dépendance cloud, carte ou IA. */
export const STORY_SAVE_KEY = "creatordeck.histoire.prologue.v4";
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


/** La cause d'une fin reste chiffrée ; sa formulation tient compte des choix vécus. */
export function storyEndingNarrative(run: StoryRun): { title: string; text: string; emoji: string } | null {
  if (!run.ending) return null;
  const base = STORY_ENDINGS[run.ending];
  const flags = new Set(run.flags);

  if (run.ending === "independant" && flags.has("agence")) {
    return {
      ...base, title: "Une communauté sous contrat",
      text: "Le public te fait confiance, mais un comité peut encore bloquer tes vidéos. La liberté que tu veux construire devra aussi se négocier.",
    };
  }
  if (run.ending === "phenomene" && flags.has("saison_collective")) {
    return {
      ...base, title: "La chaîne à plusieurs voix",
      text: "Le direct final fait parler de vous. Flo et les autres tiennent leurs micros : cette réussite a plusieurs visages et chacun a sa place.",
    };
  }
  if (run.ending === "phenomene" && flags.has("saison_duo")) {
    return {
      ...base, title: "Deux voix, une percée",
      text: "Le dernier direct propulse vos deux chaînes. Nox n'est plus une menace pour ton succès : il en est devenu un témoin et un partenaire.",
    };
  }
  if (run.ending === "business" && flags.has("agence")) {
    return {
      ...base, title: "Le succès sous signature",
      text: "Le studio rapporte enfin de l'argent. Mona a rempli sa promesse, mais les prochains contenus devront toujours passer par le contrat.",
    };
  }
  if (run.ending === "business" && flags.has("libre") && !flags.has("agence")) {
    return {
      ...base, title: "Une entreprise à ton nom",
      text: "Tu peux payer le studio sans céder ta chaîne. C'est une victoire concrète, avec les factures, les choix difficiles et la liberté qui vont avec.",
    };
  }
  if (run.ending === "epuisement" && (flags.has("nuit_blanche") || flags.has("marathon") || flags.has("defi_algo"))) {
    return {
      ...base, title: "La dernière nuit blanche",
      text: "Tu avais promis encore un direct, encore un montage, encore un effort. Ton énergie atteint zéro avant que la liste soit terminée.",
    };
  }
  if (run.ending === "scandale" && (flags.has("double_mensonge") || flags.has("preuve_effacee"))) {
    return {
      ...base, title: "La capture qui revient",
      text: "Les documents n'ont pas disparu avec les messages. Le chat a continué de regarder, mais il ne sait plus à quoi te croire.",
    };
  }
  if (run.ending === "surexposition" && (flags.has("defi_algo") || flags.has("marathon"))) {
    return {
      ...base, title: "Tout le monde te regarde",
      text: "Le compteur a atteint cent. La cadence qui t'a rendu visible exige maintenant chaque minute de ton temps, même hors caméra.",
    };
  }
  if (run.ending === "survivant" && flags.has("saison_verite")) {
    return {
      ...base, title: "Une histoire encore ouverte",
      text: "Tu n'as pas battu de record. Tu as raconté les erreurs aussi bien que les victoires, puis éteint le direct sans tout résoudre.",
    };
  }
  return base;
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

/** Transition d'acte personnalisée, dérivée de la partie sans inventer de choix. */
export interface StoryActInterlude { title: string; text: string }

export function storyActInterlude(run: StoryRun): StoryActInterlude | null {
  if (run.ending) return null;
  const flags = new Set(run.flags);
  switch (run.step) {
    case 12:
      return {
        title: "ACTE II · LE PRIX DES VUES",
        text: flags.has("collectif_autonome")
          ? "Flo a désormais sa place à la table des décisions. L'équipe a grandi ; reste à savoir comment la faire vivre."
          : flags.has("pacte_brise")
            ? "Le bilan est passé, pas la trahison. Nox garde le silence et le studio ouvre une nouvelle page."
            : "Le premier grand direct est derrière toi. Les applaudissements s'effacent, mais les factures et les promesses restent.",
      };
    case 20:
      return {
        title: "ACTE III · LES COMPTES À RENDRE",
        text: flags.has("collecte_personnelle")
          ? "Tu as encaissé toi-même les dons de la collecte. Il faudra bientôt montrer ce que les chiffres ne disent pas."
          : flags.has("limites_vie_privee")
            ? "Tu as posé une limite entre ta chaîne et ta porte d'entrée. À présent, Lina attend des réponses."
            : flags.has("defi_algo")
              ? "Quinze jours de publications t'ont apporté des vues. Tu connais désormais la différence entre un rythme choisi et une cadence imposée."
              : flags.has("formation_modo")
                ? "Tu as pris le temps de former les modérateurs. Ils commencent à tenir le chat sans tout faire reposer sur toi."
                : "L'audience ne regarde plus seulement tes vidéos. Elle commence à regarder ce que tu fais quand le direct est coupé.",
      };
    case 28:
      return {
        title: "ACTE IV · CEUX QUI RESTENT",
        text: flags.has("audit_dons")
          ? "Les comptes de la collecte ont été ouverts. Tu as payé le prix de la transparence ; d'autres questions arrivent."
          : flags.has("dons_opacite")
            ? "Le montant des dons n'est toujours pas clair. Même les personnes qui te soutiennent commencent à demander des preuves."
            : flags.has("charte_collectif")
              ? "Flo a mis vos règles par écrit. Les appliquer quand elles te dérangent sera une autre épreuve."
              : flags.has("nuit_blanche")
                ? "Tu as encore sacrifié une nuit au montage. Le public ne voit que la vidéo terminée ; toi, tu sens le coût de chaque heure."
                : flags.has("archives_exposees")
                  ? "Lina conserve les images de l'ancien live. Flo n'avait pas donné son accord, et cette décision commence à peser."
                  : "Les gens reviennent dans ta vie avec leurs souvenirs. Aucun compteur ne te dit ce qu'ils ont retenu.",
      };
    case 36:
      return {
        title: "ACTE V · DERNIER DIRECT",
        text: flags.has("source_protegee")
          ? "Tu as protégé l'anonymat d'une source. Pour le dernier direct, il reste une vérité à raconter : la tienne."
          : flags.has("source_menacee")
            ? "À force de chercher un nom, tu as exposé quelqu'un d'autre. Le direct final approche et la question demeure."
            : flags.has("vraie_pause")
              ? "Tu t'es accordé une soirée sans écran. Il reste quatre décisions pour choisir ce que le public emportera."
              : flags.has("vote_trahi")
                ? "Tu as ignoré le vote du collectif. Pour le grand final, l'équipe décidera elle-même si elle veut encore monter sur scène."
                : flags.has("dette_nox_refusee")
                  ? "La dette envers Nox n'a pas été réglée. Le dernier direct arrive avec une facture que les vues ne paient pas."
                  : flags.has("reprise_voix")
                    ? "Tu as repris le contrôle de tes vidéos après le conflit avec l'agence. Reste à trouver les mots du dernier direct."
                    : "Le direct final est proche. Quatre décisions pour découvrir si ta chaîne ressemble encore à ton premier soir.",
      };
    default:
      return null;
  }
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
 * Les sauvegardes V4 conservent les effets bruts pour être rejouées et validées.
 */
/**
 * Deux repères d'effets immédiats pour éclairer le choix sans afficher les valeurs
 * exactes, ni trahir les promesses et conséquences différées.
 * Une jauge déjà plafonnée ne promet aucun gain impossible.
 */
export function storyChoiceSignals(stats: StoryStats, effects: Partial<StoryStats>): Array<{ stat: StoryStat; direction: "up" | "down" }> {
  return STORY_STATS
    .map((stat) => {
      const applied = Math.max(0, Math.min(100, stats[stat] + (effects[stat] ?? 0))) - stats[stat];
      return { stat, applied };
    })
    .filter(({ applied }) => applied !== 0)
    .sort((a, b) => Math.abs(b.applied) - Math.abs(a.applied))
    .slice(0, 2)
    .map(({ stat, applied }) => ({ stat, direction: applied > 0 ? "up" as const : "down" as const }));
}

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
