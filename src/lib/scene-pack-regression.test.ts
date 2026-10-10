import { afterEach, describe, expect, it, vi } from "vitest";
import { CREATORS, type Creator, type Rarity } from "./catalog";
import { createInitialState, drawPack, openScenePack, sceneFamily } from "./game-engine";
import * as random from "./random";

vi.mock("./catalog", async importOriginal => {
  const actual = await importOriginal<typeof import("./catalog")>();
  return { ...actual, CREATORS: [...actual.CREATORS] };
});
const original = [...CREATORS];
afterEach(() => { CREATORS.splice(0, CREATORS.length, ...original); vi.restoreAllMocks(); });
function fixture(rarities: Rarity[]) {
  CREATORS.splice(0, CREATORS.length, ...rarities.map((rarity, i) => ({
    ...original[0], slug: `fixture-${i}`, region: "fixture", rarity,
  } as Creator)));
}
function draw(rareDrop: boolean, pity = false) {
  return drawPack("scene", new Set(), { family: "fixture", rareDrop, pity });
}
function valid(cards: ReturnType<typeof draw>) {
  expect(cards).toHaveLength(5);
  expect(new Set(cards.map(c => c.creatorSlug)).size).toBe(5);
  expect(cards.every(c => c.rarity !== "legendary")).toBe(true);
  expect(cards.every(card => CREATORS.find(c => c.slug === card.creatorSlug)?.region === "fixture")).toBe(true);
  expect(["rare", "epic"]).toContain(cards[4].rarity);
}
describe("Paquet Scène : catalogue limité", () => {
  it.each(["S02", "S03", "S05", "S07", "S08"])("ouvre Scène pleine dans la famille réelle %s", family => {
    const now = Date.UTC(2026, 9, 12, 12);
    const state = createInitialState(now);
    const owned = original.find(c => c.region === family)!;
    state.cards = [{ id: "owned", creatorSlug: owned.slug, rarity: owned.rarity,
      variant: "standard", obtainedAt: now, rareDrop: false }];
    expect(sceneFamily(state)?.familyId).toBe(family);
    const result = openScenePack(state, now, { rareDrop: true });
    expect(result.cards).toHaveLength(5);
    expect(new Set(result.cards.map(c => c.creatorSlug)).size).toBe(5);
    expect(result.cards.every(card => original.find(c => c.slug === card.creatorSlug)?.region === family)).toBe(true);
    expect(result.cards.filter(c => c.rarity === "epic")).toHaveLength(
      original.filter(c => c.region === family && c.rarity === "epic").length);
    expect(result.cards.every(c => c.rarity !== "legendary")).toBe(true);
    expect(["rare", "epic"]).toContain(result.cards[4].rarity);
    expect(state.sceneDay).toBe("");
    expect(result.state.sceneDay).toBe("2026-10-12");
  });
  it.each([0, 1, 2, 3, 4, 5, 6])("Scène pleine avec %i Épiques", epics => {
    fixture([...Array<Rarity>(epics).fill("epic"), "rare", "common", "common", "uncommon", "uncommon", "legendary"]);
    for (let n = 0; n < 40; n++) {
      const cards = draw(true); valid(cards);
      expect(cards.filter(c => c.rarity === "epic")).toHaveLength(Math.min(5, epics));
      expect(cards.every(c => c.rareDrop)).toBe(true);
    }
  });
  it.each(["rare", "epic"] as const)("réserve le seul %s au cinquième slot ordinaire", rarity => {
    fixture(["common", "uncommon", "uncommon", "common", rarity, "legendary"]);
    vi.spyOn(random, "randomInt").mockImplementation(max => max - 1);
    const cards = draw(false, true); valid(cards);
    expect(cards[4].rarity).toBe(rarity);
  });
  it("ne laisse pas les quatre slots ordinaires épuiser les garanties", () => {
    fixture(["rare", "epic", "common", "common", "uncommon"]);
    vi.spyOn(random, "randomInt").mockImplementation(max => max - 1);
    valid(draw(false));
  });
  it("réserve un candidat quand plusieurs rares pourraient être épuisées", () => {
    fixture(["rare", "rare", "common", "common", "common"]);
    vi.spyOn(random, "randomInt").mockImplementation(max => max - 1);
    valid(draw(false));
  });
  it.each([
    ["epic", "rare", "common", "legendary", "legendary"],
    ["common", "common", "uncommon", "uncommon", "common"],
  ] as Rarity[][])("refuse explicitement une famille incompatible (%j)", (...rarities) => {
    fixture(rarities);
    expect(() => draw(false)).toThrowError(expect.objectContaining({ code: "SCENE_INCOMPATIBLE_FAMILY" }));
  });
  it("conserve le seuil de déclenchement 3/1000", () => {
    fixture(["epic", "epic", "epic", "epic", "epic", "rare"]);
    for (const [roll, event] of [[2, true], [3, false]] as const) {
      vi.spyOn(random, "randomInt").mockReturnValue(0).mockReturnValueOnce(roll);
      const cards = drawPack("scene", new Set(), { family: "fixture" });
      expect(cards.every(c => c.rareDrop === event)).toBe(true);
      vi.restoreAllMocks();
    }
  });
});
