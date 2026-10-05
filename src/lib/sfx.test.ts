import { describe, expect, it } from "vitest";
import { packOpeningPlan, revealPlan, rewardPlan } from "@/lib/sfx";

/**
 * Sons synthétisés : le plan de notes est la seule partie testable (le reste
 * parle à Web Audio). Ces tests garantissent qu'aucun son ne peut être
 * inaudible, vide ou douloureux — et que la rareté s'entend.
 */
describe("plans de sons", () => {
  const all = [packOpeningPlan(), rewardPlan(), ...(["common", "uncommon", "rare", "epic", "legendary"] as const).map((r) => revealPlan(r))];

  it("reste dans le spectre audible, avec des durées plausibles", () => {
    for (const plan of all) {
      expect(plan.length).toBeGreaterThan(0);
      for (const note of plan) {
        expect(note.freq).toBeGreaterThanOrEqual(20);
        expect(note.freq).toBeLessThanOrEqual(20000);
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.gain ?? 0).toBeGreaterThan(0);
        expect(note.gain ?? 0).toBeLessThan(0.2);
      }
    }
  });

  it("commence au premier instant du son", () => {
    for (const plan of all) {
      expect(Math.min(...plan.map((note) => note.at))).toBe(0);
    }
  });

  it("fait entendre la rareté : plus la carte est rare, plus le son est riche", () => {
    const counts = (["common", "uncommon", "rare", "epic", "legendary"] as const).map(
      (rarity) => revealPlan(rarity).length,
    );
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts.at(-1)).toBeGreaterThan(counts[0]);
    // Une légendaire sonne plus longtemps qu'une commune : c'est le moment du jeu.
    expect(revealPlan("legendary")[0].duration).toBeGreaterThan(revealPlan("common")[0].duration);
  });

  it("ajoute une note aux variantes spéciales", () => {
    const standard = revealPlan("rare", "standard");
    for (const variant of ["live", "holo", "gold"] as const) {
      const withVariant = revealPlan("rare", variant);
      expect(withVariant.length).toBe(standard.length + 1);
      expect(withVariant.at(-1)?.freq).toBeGreaterThan(standard.at(-1)?.freq ?? 0);
    }
  });
});
