export type PeelPoint = { x: number; y: number };

/** The welded band, in percent of the booster scene. */
export const PEEL_ZONE_Y = { min: 10, max: 21 } as const;

/**
 * Turn raw touch samples into one calm, monotone seam. Per-slice medians make
 * rapid retracing harmless; a short weighted filter softens sensor jitter.
 */
export function smoothPeelEdge(points: PeelPoint[]): PeelPoint[] {
  const samples = new Map<number, number[]>();
  for (const point of points) {
    if (point.y < PEEL_ZONE_Y.min || point.y > PEEL_ZONE_Y.max) continue;
    const x = Math.max(2, Math.min(98, Math.round(point.x / 2) * 2));
    const values = samples.get(x) ?? [];
    values.push(point.y);
    samples.set(x, values);
  }

  const profile = [...samples.entries()]
    .sort(([left], [right]) => left - right)
    .map(([x, values]) => {
      values.sort((left, right) => left - right);
      return { x, y: values[Math.floor(values.length / 2)] };
    });
  if (profile.length < 3) return profile;

  return profile.map((point, index) => {
    const from = Math.max(0, index - 2);
    const to = Math.min(profile.length - 1, index + 2);
    let weightedY = 0;
    let totalWeight = 0;
    for (let cursor = from; cursor <= to; cursor += 1) {
      const weight = 3 - Math.abs(index - cursor);
      weightedY += profile[cursor].y * weight;
      totalWeight += weight;
    }
    return { x: point.x, y: weightedY / totalWeight };
  });
}
