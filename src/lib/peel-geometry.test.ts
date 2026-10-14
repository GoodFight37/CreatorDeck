import { describe, expect, it } from "vitest";

import { isPeelOpenable, PEEL_MIN_COVERAGE, PEEL_ZONE_Y, smoothPeelEdge } from "@/lib/peel-geometry";

describe("géométrie de la fente du booster", () => {
  it("accepte un vrai swipe large sans ouvrir sur un tap ou un geste court", () => {
    expect(PEEL_MIN_COVERAGE).toBe(64);
    expect(isPeelOpenable(35, 0.8)).toBe(false);
    expect(isPeelOpenable(63.9, 0.8)).toBe(false);
    expect(isPeelOpenable(64, 0.21)).toBe(false);
    expect(isPeelOpenable(64, 0.22)).toBe(true);
  });

  it("préserve l'ordre, les retours en X et le tracé choisi en Y", () => {
    const edge = smoothPeelEdge([
      { x: 10, y: 15 },
      { x: 35, y: 11 },
      { x: 70, y: 23 },
      { x: 24, y: 20 },
      { x: 82, y: 8 },
    ]);

    expect(edge).toHaveLength(5);
    expect(edge[3].x).toBeLessThan(edge[2].x);
    expect(Math.max(...edge.map((point) => point.y)) - Math.min(...edge.map((point) => point.y)))
      .toBeGreaterThan(7);
    expect(edge[0]).toEqual({ x: 10, y: 15 });
    expect(edge.at(-1)).toEqual({ x: 82, y: 8 });
  });

  it("ignore les mouvements qui quittent la bande de soudure", () => {
    const edge = smoothPeelEdge([
      { x: 10, y: 15 },
      { x: 25, y: 48 },
      { x: 40, y: 16 },
      { x: 55, y: 2 },
      { x: 70, y: 17 },
    ]);

    expect(edge.map((point) => point.x)).toEqual([10, 40, 70]);
    expect(PEEL_ZONE_Y).toEqual({ min: 6, max: 26 });
    expect(edge.every((point) => point.y >= PEEL_ZONE_Y.min && point.y <= PEEL_ZONE_Y.max)).toBe(true);
  });
});
