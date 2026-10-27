import { describe, expect, it } from "vitest";
import { STORY_PROLOGUE } from "../data/story-prologue";
import { chooseStory, startStory } from "./story-mode";
import { affectedStoryStats, currentStoryGoal, finishedStoryGoal } from "./story-goals";

describe("objectifs facultatifs et points de prévisualisation", () => {
  const base = startStory(STORY_PROLOGUE);

  it("annonce seulement les jauges réellement concernées, sans signe", () => {
    expect(affectedStoryStats(base.stats, { public: -3, argent: +7, confiance: 0 }))
      .toEqual(["public", "argent"]);
    expect(affectedStoryStats({ public: 100, energie: 0, argent: 50, confiance: 20 },
      { public: 20, energie: -20, argent: 5, confiance: 10 })).toEqual(["argent", "confiance"]);
    expect(affectedStoryStats(base.stats, {})).toEqual([]);
  });

  it("suit l'objectif actuel sans changer la partie ni la sauvegarde", () => {
    expect(currentStoryGoal(base)).toMatchObject({ id: "premier-direct", status: "active", progress: 0, target: 12 });
    expect(finishedStoryGoal(base)).toBeNull();
    expect(Object.keys(base)).not.toContain("goals");
    expect(currentStoryGoal({ ...base, step: 11 }).progress).toBe(11);
    expect(currentStoryGoal({ ...base, step: 12, stats: { ...base.stats, confiance: 60 } }))
      .toMatchObject({ id: "parole-tenue", status: "active", target: 45 });
    expect(finishedStoryGoal({ ...base, step: 12 })).toMatchObject({ id: "premier-direct", status: "success" });
  });

  it("distingue la mission perdue de la fin de l'histoire", () => {
    const step = { ...base, step: 20, stats: { ...base.stats, confiance: 39 } };
    expect(finishedStoryGoal(step)).toMatchObject({ id: "parole-tenue", status: "failure" });
    expect(currentStoryGoal(step)).toMatchObject({ id: "tenir-le-rythme", status: "active" });
    expect(finishedStoryGoal({ ...step, stats: { ...step.stats, confiance: 45 } })?.status).toBe("success");
    expect(currentStoryGoal({ ...base, step: 9, ending: "scandale" }).status).toBe("failure");
    expect(currentStoryGoal({ ...base, step: 40, ending: "survivant" })).toMatchObject({ id: "dernier-direct", status: "success" });
  });

  it("ne laisse pas le calcul de mission modifier les décisions", () => {
    const played = chooseStory(STORY_PROLOGUE, base, "left");
    const snapshot = JSON.stringify(played);
    currentStoryGoal(played);
    finishedStoryGoal(played);
    expect(JSON.stringify(played)).toBe(snapshot);
  });
});
