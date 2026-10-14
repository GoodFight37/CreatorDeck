import { describe, expect, it } from "vitest";

import { PEEL_ZONE_Y, smoothPeelEdge } from "@/lib/peel-geometry";

describe("géométrie de la fente du booster", () => {
  it("garde un bord trié et lisse malgré les retours répétés", () => {
    const points = Array.from({ length: 80 }, (_, index) => {
      const x = index < 40 ? index * 2.4 : (79 - index) * 2.4;
      return { x, y: 15 + (index % 2 ? 4 : -4) };
    });

    const edge = smoothPeelEdge(points);
    const jumps = edge.slice(1).map((point, index) => Math.abs(point.y - edge[index].y));

    expect(edge.length).toBeGreaterThan(10);
    expect(edge.every((point, index) => index === 0 || point.x >= edge[index - 1].x)).toBe(true);
    expect(Math.max(...jumps)).toBeLessThan(2);
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
    expect(edge.every((point) => point.y >= PEEL_ZONE_Y.min && point.y <= PEEL_ZONE_Y.max)).toBe(true);
  });
});
