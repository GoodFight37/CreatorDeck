import { describe, expect, it } from "vitest";
import { applyPackResult, claimMissions, createInitialState, missionViews } from "@/lib/game-engine";
import { PROGRESSION, gameDay } from "@/lib/progression";

const NOW = Date.UTC(2026, 9, 18, 12);
const DAY = 86_400_000;
const open = (state: ReturnType<typeof createInitialState>, at: number) => applyPackResult(state, [], 1, at, state.openings + 1, at);

describe("rétention : série et premier jour", () => {
  it("protège une absence d'un jour une seule fois dans le cycle", () => {
    const first = open(createInitialState(NOW), NOW).state;
    const back = open(first, NOW + 2 * DAY).state;
    expect(back.streak).toBe(2);
    const again = open(back, NOW + 4 * DAY).state;
    expect(again.streak).toBe(1);
  });
  it("verse un booster une seule fois par jour, sans les trois monnaies de série", () => {
    const base = createInitialState(NOW);
    const first = open(base, NOW);
    expect(first.streakReward).toMatchObject({ day: 1, packs: 1, points: 0, tokens: 0, hourglasses: 0 });
    expect(first.state.packs).toBe(2);
    const second = open(first.state, NOW + 1000);
    expect(second.streakReward).toBeNull();
    expect(second.state.packs).toBe(1);
    expect(PROGRESSION.streak.rewards.every((reward) => !reward.points && !reward.tokens && !reward.hourglasses)).toBe(true);
  });
  it("retire recyclage et Tribunal du premier jour et de sa réclamation", () => {
    const base = createInitialState(NOW);
    const state = { ...base, missionDay: gameDay(NOW), missions: { pack: 1, recycle: 1, tribunal: 5 } };
    expect(missionViews(state, NOW).map((m) => m.id)).not.toEqual(expect.arrayContaining(["recycle", "tribunal"]));
    expect(claimMissions(state, NOW).hourglasses).toBe(state.hourglasses + 1);
    expect(missionViews(state, NOW + DAY).map((m) => m.id)).toEqual(expect.arrayContaining(["recycle", "tribunal"]));
  });
});
