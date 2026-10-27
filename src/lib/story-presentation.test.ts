import { describe, expect, it } from "vitest";
import { storyCareerStage } from "./story-presentation";

describe("scénographie de carrière Histoire", () => {
  it("commence modestement et progresse seulement avec assez d'argent", () => {
    expect(storyCareerStage(0, 99)).toBe("debut");
    expect(storyCareerStage(11, 90)).toBe("debut");
    expect(storyCareerStage(12, 29)).toBe("debut");
    expect(storyCareerStage(12, 30)).toBe("equipe");
    expect(storyCareerStage(28, 44)).toBe("equipe");
    expect(storyCareerStage(28, 45)).toBe("studio");
    expect(storyCareerStage(38, 10)).toBe("debut");
  });
});
