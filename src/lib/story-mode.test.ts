import { describe, expect, it } from "vitest";
import { STORY_PROLOGUE } from "../data/story-prologue";
import {
  STORY_ENDINGS, chooseStory, currentStoryScene, lastStoryAppliedEffects, restoreStory, startStory, storyEpilogue, storyActInterlude, storyEndingNarrative,
  validateStoryScript, type StoryDirection,
} from "./story-mode";

const script = STORY_PROLOGUE;

describe("mode Histoire : prologue déterministe", () => {
  it("valide les scènes et fournit un repli à chaque chapitre", () => {
    expect(validateStoryScript(script)).toEqual([]);
    expect(script.totalSteps).toBe(40);
  });

  it("attribue un canal narratif connu à chacune des 84 scènes", () => {
    expect(script.scenes).toHaveLength(84);
    expect(script.scenes.map((scene) => scene.channel)).toContain("ARCHIVE");
    expect(validateStoryScript({ ...script, scenes: [
      { ...script.scenes[0], channel: "INCONNU" as typeof script.scenes[0]["channel"] },
      ...script.scenes.slice(1),
    ] })).toContain("Canal invalide : studio");
  });


  it("affiche les points réellement gagnés ou perdus quand une jauge atteint 0 ou 100", () => {
    const cappedScript = {
      ...script,
      id: "test-plafonds",
      totalSteps: 1,
      initialStats: { ...script.initialStats, public: 95, argent: 12 },
      scenes: [{
        ...script.scenes[0],
        choices: {
          left: { label: "Pousser les jauges", effects: { public: 20, argent: -30 } },
          right: { label: "Attendre", effects: {} },
        },
      }],
    };
    const initial = startStory(cappedScript);
    expect(lastStoryAppliedEffects(cappedScript, initial)).toBeNull();

    const ended = chooseStory(cappedScript, initial, "left");
    expect(ended.stats.public).toBe(100);
    expect(ended.stats.argent).toBe(0);
    expect(ended.history[0].effects).toEqual({ public: 20, argent: -30 });
    expect(lastStoryAppliedEffects(cappedScript, ended)).toEqual({ public: 5, argent: -12 });
    const restored = restoreStory(cappedScript, JSON.stringify(ended));
    expect(restored).toEqual(ended);
    expect(lastStoryAppliedEffects(cappedScript, restored!)).toEqual({ public: 5, argent: -12 });
  });

  it("conserve les deltas exacts pour une partie normale à plusieurs chapitres", () => {
    let run = startStory(script);
    run = chooseStory(script, run, "left");
    expect(lastStoryAppliedEffects(script, run)).toEqual({ public: -3, energie: 6, argent: 9 });
    run = chooseStory(script, run, "left");
    expect(lastStoryAppliedEffects(script, run)).toEqual({ energie: 5, argent: -3, confiance: 10 });
  });

  it("un même choix donne le même état, sans IA ni hasard", () => {
    const first = startStory(script);
    expect(chooseStory(script, first, "left")).toEqual(chooseStory(script, first, "left"));
    expect(first.step).toBe(0);
  });

  it("retrouve Flo quand elle a été engagée, et la protège plusieurs chapitres après", () => {
    let run = startStory(script);
    run = chooseStory(script, run, "left");
    run = chooseStory(script, run, "left"); // engager Flo
    run = chooseStory(script, run, "left");
    run = chooseStory(script, run, "left");
    expect(currentStoryScene(script, run)?.id).toBe("flo_present");
    run = chooseStory(script, run, "left"); // la protéger
    run = chooseStory(script, run, "left");
    run = chooseStory(script, run, "left");
    expect(currentStoryScene(script, run)?.id).toBe("flo_soutien");
  });

  it("fait revenir le sponsor caché trois décisions plus tard", () => {
    let run = startStory(script);
    for (const direction of ["left", "left", "left", "right", "left", "left"] as StoryDirection[]) run = chooseStory(script, run, direction);
    expect(currentStoryScene(script, run)?.id).toBe("sponsor_retour");
  });

  it("fait revenir Flo ou Nox au dernier acte selon les alliances", () => {
    const play = (directions: StoryDirection[]) => {
      let run = startStory(script);
      for (const direction of directions) run = chooseStory(script, run, direction);
      return run;
    };
    const flo = play(["left", "left", "left", "left", "left", "right", "left", "left", "left", "left"]);
    expect(currentStoryScene(script, flo)?.id).toBe("flo_alliee_final");
    const nox = play(["left", "right", "left", "left", "left", "left", "left", "right", "left", "left"]);
    expect(currentStoryScene(script, nox)?.id).toBe("nox_duo_final");
    const isolated = play(["left", "right", "right", "left", "left", "right", "left", "right", "left", "left"]);
    expect(currentStoryScene(script, isolated)?.id).toBe("course");
  });

  it("adapte la conclusion au contrat et aux alliances sans altérer la fin calculée", () => {
    const base = startStory(script);
    expect(storyEndingNarrative(base)).toBeNull();

    const indep = { ...base, ending: "independant" as const };
    const agency = storyEndingNarrative({ ...indep, flags: ["agence"] });
    const free = storyEndingNarrative({ ...indep, flags: ["libre"] });
    expect(agency?.title).toBe("Une communauté sous contrat");
    expect(agency?.text).toContain("comité");
    expect(free).toEqual(STORY_ENDINGS.independant);
    expect(indep.ending).toBe("independant");

    const successful = { ...base, ending: "phenomene" as const };
    expect(storyEndingNarrative({ ...successful, flags: ["saison_collective"] })?.title).toBe("La chaîne à plusieurs voix");
    expect(storyEndingNarrative({ ...successful, flags: ["saison_duo"] })?.title).toBe("Deux voix, une percée");
    expect(storyEndingNarrative({ ...successful, flags: [] })).toEqual(STORY_ENDINGS.phenomene);
  });

  it("reconnaît les origines d'une fin anticipée sans changer les jauges", () => {
    const base = startStory(script);
    const collapse = { ...base, ending: "epuisement" as const, flags: ["nuit_blanche"] };
    expect(storyEndingNarrative(collapse)?.title).toBe("La dernière nuit blanche");
    const trust = { ...base, ending: "scandale" as const, flags: ["double_mensonge"] };
    expect(storyEndingNarrative(trust)?.text).toContain("documents");
    const exposure = { ...base, ending: "surexposition" as const, flags: ["defi_algo"] };
    expect(storyEndingNarrative(exposure)?.text).toContain("cent");
    expect(storyEndingNarrative({ ...base, ending: "silence" })).toEqual(STORY_ENDINGS.silence);
    expect(collapse.stats).toEqual(base.stats);
  });

  it("personnalise le bilan avec les décisions de Flo, Nox, Mona et l'agence", () => {
    const base = { ...startStory(script), ending: "survivant" as const };
    expect(storyEpilogue(startStory(script))).toEqual([]);
    const loyal = storyEpilogue({ ...base, flags: ["flo_protegee", "respect_nox", "sponsor_clair", "libre"] });
    const hostile = storyEpilogue({ ...base, flags: ["rupture_flo", "guerre_nox", "double_mensonge", "agence"] });
    expect(loyal).toHaveLength(4);
    expect(hostile).toHaveLength(4);
    expect(loyal.join(" ")).toContain("Flo");
    expect(hostile.join(" ")).toContain("Nox");
    expect(loyal).not.toEqual(hostile);
  });

  it("fait évoluer l'offre d'agence selon Flo ou Nox", () => {
    const play = (directions: StoryDirection[]) => {
      let run = startStory(script);
      for (const direction of directions) run = chooseStory(script, run, direction);
      return run;
    };
    const flo = play(["left", "left", "left", "left", "left", "right", "left", "left"]);
    expect(currentStoryScene(script, flo)?.id).toBe("agence_flo");
    const nox = play(["left", "right", "left", "left", "left", "left", "left", "right"]);
    expect(currentStoryScene(script, nox)?.id).toBe("agence_nox");
    const isolated = play(["left", "right", "right", "left", "left", "right", "left", "right"]);
    expect(currentStoryScene(script, isolated)?.id).toBe("agence");
  });

  it("les alliances changent également le dernier dilemme", () => {
    const play = (directions: StoryDirection[]) => {
      let run = startStory(script);
      for (const direction of directions) run = chooseStory(script, run, direction);
      return run;
    };
    const flo = play(["left", "left", "left", "left", "left", "right", "left", "left", "left", "left", "left"]);
    expect(currentStoryScene(script, flo)?.id).toBe("finale_collectif");
    const nox = play(["left", "right", "left", "left", "left", "left", "left", "right", "left", "left", "left"]);
    expect(currentStoryScene(script, nox)?.id).toBe("finale_pacte");
  });

  it("annonce les actes avec un rappel de conséquences, sans modifier la partie", () => {
    const base = startStory(script);
    expect(storyActInterlude(base)).toBeNull();
    const flo = { ...base, step: 12, flags: ["collectif_autonome"] };
    expect(storyActInterlude(flo)?.text).toContain("Flo");
    expect(storyActInterlude({ ...base, step: 12, flags: ["pacte_brise"] })?.text).toContain("Nox");
    expect(storyActInterlude({ ...base, step: 20, flags: ["collecte_personnelle"] })?.text).toContain("dons");
    expect(storyActInterlude({ ...base, step: 28, flags: ["charte_collectif"] })?.text).toContain("Flo");
    expect(storyActInterlude({ ...base, step: 36, flags: ["source_protegee"] })?.text).toContain("source");
    expect(storyActInterlude({ ...base, step: 20, flags: ["defi_algo"] })?.text).toContain("cadence");
    expect(storyActInterlude({ ...base, step: 20, flags: ["formation_modo"] })?.text).toContain("modérateurs");
    expect(storyActInterlude({ ...base, step: 28, flags: ["nuit_blanche"] })?.text).toContain("montage");
    expect(storyActInterlude({ ...base, step: 28, flags: ["archives_exposees"] })?.text).toContain("Flo");
    expect(storyActInterlude({ ...base, step: 36, flags: ["vote_trahi"] })?.text).toContain("collectif");
    expect(storyActInterlude({ ...base, step: 36, flags: ["dette_nox_refusee"] })?.text).toContain("Nox");
    expect(storyActInterlude({ ...base, step: 36, flags: ["reprise_voix"] })?.text).toContain("agence");
    expect(storyActInterlude({ ...flo, step: 13 })).toBeNull();
    expect(storyActInterlude({ ...flo, ending: "survivant" })).toBeNull();
    expect(base.step).toBe(0);
  });

  it("la rencontre avec les abonnés n'est pas masquée par les deux variantes de crise", () => {
    const atConvention = { ...startStory(script), step: 32, flags: ["limites_vie_privee"] };
    const protectedCommunity = { ...atConvention, flags: ["limites_vie_privee", "communaute_saine"] };
    const exposedAddress = { ...atConvention, flags: ["frontieres_floues"] };
    expect(currentStoryScene(script, atConvention)?.id).toBe("fan_rencontre");
    expect(currentStoryScene(script, protectedCommunity)?.id).toBe("fan_retour");
    expect(currentStoryScene(script, exposedAddress)?.id).toBe("fan_dox");
  });

  it("protège de la double décision après une fin de saison", () => {
    let run = startStory(script);
    for (let step = 0; step < script.totalSteps && !run.ending; step++) run = chooseStory(script, run, "left");
    expect(run.ending).not.toBeNull();
    expect(chooseStory(script, run, "right")).toBe(run);
  });

  it("récupère une partie saine, rejette les sauvegardes corrompues ou obsolètes", () => {
    const run = chooseStory(script, startStory(script), "left");
    expect(restoreStory(script, JSON.stringify(run))).toEqual(run);
    expect(restoreStory(script, "{" )).toBeNull();
    expect(restoreStory(script, JSON.stringify({ ...run, scriptVersion: 999 }))).toBeNull();
    expect(restoreStory(script, JSON.stringify({ ...run, step: -1 }))).toBeNull();
    expect(restoreStory(script, JSON.stringify({ ...run, stats: { ...run.stats, argent: 999 } }))).toBeNull();
  });

  it("croise les deux scandales sans faire disparaître l'un des retours", () => {
    let run = startStory(script);
    for (const direction of ["left", "left", "right", "right", "left", "right", "right", "left", "left"] as StoryDirection[]) {
      run = chooseStory(script, run, direction);
    }
    expect(run.ending).toBeNull();
    expect(run.flags).toContain("guerre_nox");
    expect(run.flags).toContain("preuve_effacee");
    expect(currentStoryScene(script, run)?.id).toBe("double_crise");
  });

  it("rejette les sauvegardes qui réécrivent une jauge, une conséquence ou une fin", () => {
    const first = chooseStory(script, startStory(script), "left");
    const forged = (changes: object) => restoreStory(script, JSON.stringify({ ...first, ...changes }));
    expect(forged({ stats: { ...first.stats, argent: first.stats.argent + 2 } })).toBeNull();
    expect(forged({ flags: ["sponsor_cache"] })).toBeNull();
    expect(forged({ ending: "business" })).toBeNull();
    expect(forged({ history: [{ ...first.history[0], sceneId: "premier_chat" }] })).toBeNull();
    expect(forged({ history: [{ ...first.history[0], effects: { public: 99 } }] })).toBeNull();
  });

  it("refuse de prolonger une fin anticipée", () => {
    let ended: ReturnType<typeof startStory> | null = null;
    for (let mask = 0; mask < 2 ** 12 && !ended; mask++) {
      let run = startStory(script);
      for (let step = 0; step < script.totalSteps && !run.ending; step++) {
        run = chooseStory(script, run, mask & (1 << step) ? "right" : "left");
      }
      if (run.ending && run.step < script.totalSteps) ended = run;
    }
    expect(ended).not.toBeNull();
    if (!ended) return;
    const forged = { ...ended, history: [...ended.history, ended.history[0]], step: ended.step + 1 };
    expect(restoreStory(script, JSON.stringify(forged))).toBeNull();
    expect(chooseStory(script, ended, "right")).toBe(ended);
    expect(restoreStory(script, JSON.stringify(ended))).toEqual(ended);
  });

  it("conserve la couverture exhaustive des 27 scènes du premier acte sur 4096 chemins", () => {
    const seenScenes = new Set<string>();
    for (let mask = 0; mask < 4096; mask++) {
      let run = startStory(script);
      for (let step = 0; step < 12 && !run.ending; step++) {
        const scene = currentStoryScene(script, run);
        expect(scene).not.toBeNull();
        if (scene) seenScenes.add(scene.id);
        run = chooseStory(script, run, (mask & (1 << step)) ? "right" : "left");
      }
      expect(restoreStory(script, JSON.stringify(run))).toEqual(run);
    }
    expect(seenScenes.size).toBe(27);
  }, 30_000);

  it("explore 1024 parcours de la saison de 40 décisions sans blocage ni sauvegarde invalide", () => {
    const endings = new Set<string>();
    const visitedSteps = new Set<number>();
    const visitedScenes = new Set<string>();
    let longest = 0;
    let completed = 0;
    const lengths: number[] = [];
    for (let mask = 0; mask < 1024; mask++) {
      let seed = (0x9e3779b9 ^ mask) >>> 0;
      let run = startStory(script);
      while (!run.ending) {
        const scene = currentStoryScene(script, run);
        expect(scene).not.toBeNull();
        if (scene) visitedScenes.add(scene.id);
        visitedSteps.add(run.step);
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        run = chooseStory(script, run, (seed & 1) ? "left" : "right");
        for (const value of Object.values(run.stats)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
      longest = Math.max(longest, run.step);
      lengths.push(run.step);
      if (run.step === script.totalSteps) completed++;
      endings.add(run.ending!);
      expect(STORY_ENDINGS[run.ending!]).toBeDefined();
      expect(restoreStory(script, JSON.stringify(run))).toEqual(run);
    }
    expect(visitedSteps.has(12)).toBe(true);
    expect(longest).toBeGreaterThan(20);
    expect(endings.size).toBeGreaterThanOrEqual(4);
    lengths.sort((a, b) => a - b);
    expect(lengths[512]).toBeGreaterThanOrEqual(26);
    expect(completed).toBeGreaterThanOrEqual(300);
    expect(script.scenes.filter((scene) => !visitedScenes.has(scene.id)).map((scene) => scene.id)).toEqual([]);
  }, 60_000);

  it("permet une partie longue avec des décisions équilibrées et des choix déterministes", () => {
    const fitness = (run: ReturnType<typeof startStory>) => {
      const { public: audience, argent, confiance, energie } = run.stats;
      const margin = Math.min(audience, 100 - audience, argent, confiance, energie);
      return margin * 5 + argent + energie + confiance;
    };
    let frontier = [startStory(script)];
    let deepest = 0;
    for (let step = 0; step < script.totalSteps && frontier.length; step++) {
      const next = frontier.flatMap((run) => (["left", "right"] as StoryDirection[])
        .map((direction) => chooseStory(script, run, direction))
        .filter((run) => !run.ending));
      if (!next.length) break;
      deepest = step + 1;
      frontier = next.sort((a, b) => fitness(b) - fitness(a)).slice(0, 96);
    }
    expect(deepest).toBe(39);
    expect(frontier.length).toBeGreaterThan(0);
    const last = chooseStory(script, frontier[0], "left");
    expect(last.step).toBe(40);
    expect(last.ending).not.toBeNull();
    expect(restoreStory(script, JSON.stringify(last))).toEqual(last);
  }, 30_000);
});
