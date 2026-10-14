export type PeelPoint = { x: number; y: number };

/** The welded band plus a small, forgiving margin, in percent of the scene. */
export const PEEL_ZONE_Y = { min: 6, max: 26 } as const;

/** A clear cross-band stroke opens; short taps still fail both thresholds. */
export const PEEL_MIN_COVERAGE = 64;
export const PEEL_MIN_APERTURE = 0.22;

export function isPeelOpenable(coverage: number, aperture: number): boolean {
  return coverage >= PEEL_MIN_COVERAGE && aperture >= PEEL_MIN_APERTURE;
}

/**
 * Keep the player's chronological cut. A tiny temporal filter removes sensor
 * jitter without sorting by X, collapsing retraces, or flattening chosen Y.
 */
export function smoothPeelEdge(points: PeelPoint[]): PeelPoint[] {
  const path: PeelPoint[] = [];
  for (const point of points) {
    if (point.y < PEEL_ZONE_Y.min || point.y > PEEL_ZONE_Y.max) continue;
    path.push({
      x: Math.max(1, Math.min(99, point.x)),
      y: Math.max(PEEL_ZONE_Y.min, Math.min(PEEL_ZONE_Y.max, point.y)),
    });
  }
  if (path.length < 3) return path;

  return path.map((point, index) => {
    if (index === 0 || index === path.length - 1) return point;
    const before = path[index - 1];
    const after = path[index + 1];
    // Keep most of each sample: the trace should feel drawn by the finger.
    return {
      x: point.x * 0.72 + (before.x + after.x) * 0.14,
      y: point.y * 0.72 + (before.y + after.y) * 0.14,
    };
  });
}
