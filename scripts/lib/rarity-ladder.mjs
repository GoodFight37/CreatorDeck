/**
 * Échelle de raretés d'un catalogue Twitch FR, en parts du classement.
 *
 * Les seuils ne sont pas des nombres de rangs en dur : ils sont exprimés en
 * pourcentage du catalogue, donc la même échelle s'applique à un Top 500 comme
 * à un Top 2000 (chaque rareté garde la même proportion de la population).
 *
 * Répartition (cumul) : 5 % Légendaire · 17 % Épique · 40 % Rare ·
 * 70 % Peu commune · 100 % Commune.
 */

/** Parts cumulées : { rarity, upTo } — `upTo` est un cumul (0 → 1). */
export const RARITY_LADDER = [
  { rarity: "legendary", upTo: 0.05 },
  { rarity: "epic", upTo: 0.17 },
  { rarity: "rare", upTo: 0.4 },
  { rarity: "uncommon", upTo: 0.7 },
  { rarity: "common", upTo: 1 },
];

/**
 * Rareté d'un rang (1-indexé) pour un catalogue de `total` entrées.
 *
 * `rarityForRank(25, 500) === "legendary"` et `rarityForRank(26, 500) === "epic"`
 * — soit exactement les seuils historiques du Top 500 (25/85/200/350),
 * désormais dérivés : à 2000 ils deviennent 100/340/800/1400.
 */
export function rarityForRank(rank, total) {
  if (!Number.isInteger(rank) || rank < 1) {
    throw new RangeError(`rarityForRank: rang invalide (${rank}).`);
  }
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`rarityForRank: total invalide (${total}).`);
  }
  const share = rank / total;
  for (const step of RARITY_LADDER) {
    if (share <= step.upTo) return step.rarity;
  }
  return "common";
}

/** Nombre d'entrées de chaque rareté pour un catalogue de `total` entrées. */
export function rarityCounts(total) {
  const counts = { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 };
  for (let rank = 1; rank <= total; rank += 1) {
    counts[rarityForRank(rank, total)] += 1;
  }
  return counts;
}
