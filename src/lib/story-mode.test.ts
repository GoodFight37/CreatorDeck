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

  it("parcourt exhaustivement les 4096 combinaisons binaires : ni blocage ni jauge illégale", () => {
    const endings = new Set<string>();
    for (let mask = 0; mask < 2 ** script.totalSteps; mask++) {
      let run = startStory(script);
      for (let step = 0; step < script.totalSteps && !run.ending; step++) {
        expect(currentStoryScene(script, run)).not.toBeNull();
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
    expect(endings.size).toBeGreaterThanOrEqual(4);
  });
});
