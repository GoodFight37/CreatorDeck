import { describe, expect, it } from "vitest";
import { storyThrowMotion, storyVisualAngle, storyVisualDrag } from "./story-motion";

describe("physique visuelle de la carte Histoire", () => {
  it("résiste progressivement sans dépasser les 48px mobiles", () => {
    expect(storyVisualDrag(0)).toBe(0);
    expect(storyVisualDrag(12)).toBeGreaterThan(0);
    expect(storyVisualDrag(64)).toBeGreaterThan(storyVisualDrag(12));
    expect(storyVisualDrag(100)).toBeLessThan(48);
    expect(storyVisualDrag(1000)).toBeLessThanOrEqual(48);
    expect(storyVisualDrag(-100)).toBeCloseTo(-storyVisualDrag(100));
  });

  it("garde la rotation dans une plage mobile confortable", () => {
    expect(storyVisualAngle(0)).toBe(0);
    expect(storyVisualAngle(80)).toBeGreaterThan(0);
    expect(Math.abs(storyVisualAngle(-1000))).toBeLessThanOrEqual(3.6);
  });

  it("accélère l'envol avec un geste rapide tout en bornant la durée", () => {
    const regular = storyThrowMotion(0);
    const flick = storyThrowMotion(1.5);
    expect(regular.durationMs).toBe(185);
    expect(flick.durationMs).toBeLessThan(regular.durationMs);
    expect(flick.angleDegrees).toBeGreaterThan(regular.angleDegrees);
    expect(storyThrowMotion(999)).toEqual(storyThrowMotion(2));
    expect(storyThrowMotion(-1)).toEqual(storyThrowMotion(1));
  });
});
