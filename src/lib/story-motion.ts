/** Mouvement original CreatorDeck, inspiré des principes de souplesse et
 * de résistance observés dans les structures Unity de jeux de cartes.
 * Les seuils narratifs restent gérés séparément par story-mode.tsx.
 */
export function storyVisualDrag(distance: number): number {
  const amount = Math.max(0, Math.abs(distance));
  // Résistance progressive : suit immédiatement le doigt puis ralentit
  // avant les bords de l'écran. La face n'excède pas 48 px avant validation.
  return Math.sign(distance) * Math.min(48, 48 * (1 - Math.exp(-amount / 75)));
}

export function storyVisualAngle(distance: number): number {
  return Math.sign(distance) * Math.min(3.6, Math.abs(storyVisualDrag(distance)) * 0.085);
}

/** Durée d'envol : un flick rapide lance une carte plus nerveusement. */
export function storyThrowMotion(speedPxPerMs: number) {
  const speed = Math.max(0, Math.min(2, Math.abs(speedPxPerMs)));
  return {
    durationMs: Math.round(185 - speed * 27),
    angleDegrees: Math.round((14 + speed * 3) * 10) / 10,
  };
}
