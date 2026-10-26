import { describe, expect, it } from "vitest";
import { STORY_PROLOGUE } from "../data/story-prologue";
import {
  STORY_ENDINGS, chooseStory, currentStoryScene, restoreStory, startStory,
  validateStoryScript, type StoryDirection,
} from "./story-mode";

const script = STORY_PROLOGUE;

describe("mode Histoire : prologue déterministe", () => {
  it("valide les scènes et fournit un repli à chaque chapitre", () => {
    expect(validateStoryScript(script)).toEqual([]);
    expect(script.totalSteps).toBe(12);
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
    for (let mask = 0; mask < 2 ** script.totalSteps && !ended; mask++) {
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

  it("parcourt exhaustivement les 4096 combinaisons binaires : ni blocage ni jauge illégale", () => {
    const endings = new Set<string>();
    const seenScenes = new Set<string>();
    for (let mask = 0; mask < 2 ** script.totalSteps; mask++) {
      let run = startStory(script);
      for (let step = 0; step < script.totalSteps && !run.ending; step++) {
        const visible = currentStoryScene(script, run);
        expect(visible).not.toBeNull();
        if (visible) seenScenes.add(visible.id);
        const direction = (mask & (1 << step)) ? "right" : "left";
        run = chooseStory(script, run, direction);
        for (const value of Object.values(run.stats)) expect(value).toBeGreaterThanOrEqual(0);
        for (const value of Object.values(run.stats)) expect(value).toBeLessThanOrEqual(100);
      }
      expect(run.ending).not.toBeNull();
      expect(STORY_ENDINGS[run.ending!]).toBeDefined();
      endings.add(run.ending!);
      expect(restoreStory(script, JSON.stringify(run))).not.toBeNull();
    }
    expect(endings.size).toBe(8);
    expect(seenScenes.size).toBe(script.scenes.length);
  }, 30_000);
});
