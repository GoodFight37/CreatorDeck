import { afterEach, describe, expect, it, vi } from "vitest";
import { CREATORS, PACKS, type PackType } from "@/lib/catalog";
import { packOdds, RARITIES } from "@/lib/pull-rates";
import { runStudio } from "@/lib/tirage-studio";

/**
 * Aléa déterministe : le moteur tire via `crypto.getRandomValues` (voir
 * `@/lib/random`), on remplace donc la source d'entropie par un générateur
 * congruentiel. Les assertions statistiques deviennent reproductibles — un
 * test qui dépend du hasard du jour finit toujours par échouer à 3 h du matin.
 */
function stubRandom(seed = 20260101): void {
  let state = seed >>> 0;
  vi.stubGlobal("crypto", {
    getRandomValues<T extends ArrayBufferView>(buffer: T): T {
      const view = buffer as unknown as { length: number; [index: number]: number };
      for (let index = 0; index < view.length; index += 1) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        view[index] = state;
      }
      return buffer;
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("studio de tirages", () => {
  it("ne produit rien sans booster", () => {
    stubRandom();
    const result = runStudio("live", 0);
    expect(result.packs).toBe(0);
    expect(result.cards).toBe(0);
    expect(result.unique).toBe(0);
    expect(result.perfect).toBe(0);
    for (const rarity of RARITIES) expect(result.observed[rarity]).toBe(0);
  });

  it("compte les cartes, les raretés et les créateurs distincts", () => {
    stubRandom();
    const packs = 40;
    const result = runStudio("live", packs);

    expect(result.cards).toBe(packs * PACKS.live.size);
    const total = RARITIES.reduce((sum, rarity) => sum + result.observed[rarity], 0);
    expect(total).toBeCloseTo(1, 6);
    // Un tirage ne peut pas découvrir plus de créateurs qu'il ne tire de cartes,
    // ni plus que le catalogue n'en contient.
    expect(result.unique).toBeGreaterThan(0);
    expect(result.unique).toBeLessThanOrEqual(Math.min(result.cards, CREATORS.length));

    const more = runStudio("live", packs * 6);
    expect(more.unique).toBeGreaterThan(result.unique);
  });

  it("publie les taux attendus depuis pull-rates.json", () => {
    stubRandom();
    for (const packType of Object.keys(PACKS) as PackType[]) {
      const result = runStudio(packType, 5);
      const odds = packOdds(packType);
      for (const rarity of RARITIES) {
        expect(result.expected[rarity]).toBe(odds.perCard[rarity]);
      }
    }
  });

  it("se resserre autour des taux annoncés quand on simule beaucoup", () => {
    stubRandom(4242);
    const result = runStudio("live", 400);
    for (const rarity of RARITIES) {
      // Sur 2000 cartes, un écart de 3 points serait le signe d'une table de
      // tirage qui ne correspond plus à ce qui est affiché.
      expect(Math.abs(result.observed[rarity] - result.expected[rarity])).toBeLessThan(0.03);
    }
    // Le « Perfect » sort bien à son taux annoncé (1 ‰ chez Live) : sur 4 000
    // boosters il doit apparaître, sans jamais dépasser quelques pour mille —
    // en dessous, l'échantillon est trop petit pour dire quoi que ce soit.
    const wide = runStudio("live", 4000);
    expect(wide.perfect).toBeGreaterThan(0);
    expect(wide.perfect).toBeLessThan(wide.packs * 0.01);
  });

  it("rejoue exactement la même chose à graine égale", () => {
    // La simulation ne lit ni n'écrit la partie : à graine égale, le résultat
    // est identique — c'est ce qui permet de la relancer sans arrière-pensée.
    stubRandom(7);
    const first = runStudio("live", 20);
    stubRandom(7);
    const second = runStudio("live", 20);
    expect(second).toEqual(first);
  });
});
