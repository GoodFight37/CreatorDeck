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

describe("échos narratifs non persistés", () => {
  it("rend au maximum deux conséquences passées et conserve la sauvegarde intacte", async () => {
    const { storyActEchoes } = await import("./story-echoes");
    const initial = startStory(STORY_PROLOGUE);
    expect(storyActEchoes(initial)).toEqual([]);
    expect(storyActEchoes({ ...initial, step: 11, flags: ["flo_protegee"] })).toEqual([]);
    const run = { ...initial, step: 12, flags: ["flo_protegee", "flo_epuisee", "respect_nox"] };
    const before = JSON.stringify(run);
    expect(storyActEchoes(run).map(echo => echo.id)).toEqual(["flo_protegee", "respect_nox"]);
    expect(JSON.stringify(run)).toBe(before);
    expect(storyActEchoes({ ...run, ending: "survivant" })).toEqual([]);
  });
  it("montre une conséquence tardive à l'acte V sans spoiler une scène future", async () => {
    const { storyActEchoes } = await import("./story-echoes");
    const base = startStory(STORY_PROLOGUE);
    expect(storyActEchoes({ ...base, step: 20, flags: ["source_protegee"] })).toEqual([]);
    expect(storyActEchoes({ ...base, step: 20, flags: ["refus_sponsor", "recours_contrat", "flo_protegee"] }).map(e => e.id))
      .toEqual(["recours_contrat", "flo_protegee"]);
    expect(storyActEchoes({ ...base, step: 36, flags: ["source_protegee", "vote_trahi"] }).map(e => e.id))
      .toEqual(["source_protegee", "vote_trahi"]);
  });
});

describe("liens du journal narratif", () => {
  it("n'invente aucune relation avant un choix et suit les bifurcations attestées", async () => {
    const { storyBonds } = await import("./story-bonds");
    const base = startStory(STORY_PROLOGUE);
    expect(storyBonds(base)).toEqual([]);
    const run = { ...base, flags: ["flo_protegee", "respect_nox", "refus_sponsor", "source_protegee"] };
    expect(storyBonds(run).map(bond => bond.name)).toEqual(["Flo", "Nox", "Mona", "Lina"]);
    expect(storyBonds({ ...run, flags: [...run.flags, "rupture_flo"] })[0].status).toBe("Lien rompu");
    expect(storyBonds({ ...run, flags: [...run.flags, "rupture_flo", "reconciliation_flo"] })[0].status).toBe("Dialogue retrouvé");
    expect(storyBonds({ ...run, flags: ["guerre_nox", "paix_nox"] })[0].status).toBe("Conflit apaisé");
    expect(Object.keys(run)).not.toContain("bonds");
  });
});
