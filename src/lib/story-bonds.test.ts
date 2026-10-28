import { describe, expect, it } from "vitest";
import { STORY_PROLOGUE } from "../data/story-prologue";
import { startStory } from "./story-mode";
import { storyBonds } from "./story-bonds";

describe("Mode Histoire : mémoire des relations", () => {
  it("ne révèle pas Flo avant sa rencontre", () => {
    expect(storyBonds(startStory(STORY_PROLOGUE))).toEqual([]);
  });

  it("reconnaît sa présence libre après une rupture et des excuses tardives", () => {
    const run = startStory(STORY_PROLOGUE);
    const bonds = storyBonds({
      ...run,
      flags: ["rupture_flo", "excuses_flo_tardives", "flo_spectatrice_libre"],
    });
    const flo = bonds.find((bond) => bond.id === "flo");
    expect(flo?.status).toBe("Lien retrouvé, sans obligation");
    expect(flo?.detail).toContain("sans reprendre la modération");
    expect(flo?.status).not.toBe("Lien rompu");
  });

  it("ne traite pas une proposition de retour imposé comme une réconciliation", () => {
    const run = startStory(STORY_PROLOGUE);
    const bonds = storyBonds({
      ...run,
      flags: ["rupture_flo", "excuses_flo_tardives", "flo_retour_force"],
    });
    expect(bonds.find((bond) => bond.id === "flo")?.status).toBe("Lien rompu");
  });
});
