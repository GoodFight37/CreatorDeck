import { CREATOR_BY_SLUG, RETIRED_BY_SLUG, type Creator, type Rarity } from "@/lib/catalog";
import { DIRECT_BONUS, type RarityWeights } from "@/lib/pull-rates";
import { randomInt } from "@/lib/random";

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

/** Collection actuelle, toutes variantes confondues (miroir de user_cards). */
export function missingCircle(circle: readonly string[], owned: ReadonlySet<string>): Creator[] {
  return [...new Set(circle)].flatMap(slug => {
    const creator = CREATOR_BY_SLUG.get(slug);
    return creator && !RETIRED_BY_SLUG.has(slug) && !owned.has(slug) ? [creator] : [];
  });
}

/** Miroir de _pack_circle_pick : poids renormalisés, puis préférence à égalité. */
export function pickMissingCircle(
  pool: readonly Creator[], weights: RarityWeights, preferred: string,
  liveLogins?: ReadonlySet<string>,
): Creator {
  // La complétion prime sur la rareté du slot, même sous pity/Perfect.
  const usable = pool.some(c => (weights[c.rarity] ?? 0) > 0);
  const tiers = RARITIES.filter(r => pool.some(c => c.rarity === r) && (!usable || (weights[r] ?? 0) > 0));
  let roll = randomInt(tiers.reduce((n, r) => n + (usable ? weights[r]! : 1), 0));
  let rarity = tiers[0];
  for (const tier of tiers) {
    roll -= usable ? weights[tier]! : 1;
    if (roll < 0) { rarity = tier; break; }
  }
  const bucket = pool.filter(c => c.rarity === rarity);
  const weight = (c: Creator) => liveLogins?.has(c.login) ? Math.round(DIRECT_BONUS.creatorBias * 1000) : 1000;
  let pick = randomInt(bucket.reduce((n, c) => n + weight(c), 0));
  let chosen = bucket[bucket.length - 1];
  for (const creator of bucket) {
    pick -= weight(creator);
    if (pick < 0) { chosen = creator; break; }
  }
  const favorite = bucket.find(c => c.slug === preferred);
  return favorite && weight(favorite) === weight(chosen) ? favorite : chosen;
}

/**
 * Les slots 1, 2 et 5 sont absents au début du tirage ; les autres restent mondiaux.
 * Une chaîne du cercle sort au plus une fois (0059) : sans absente inutilisée, le
 * slot vaut `null` et revient au classement, comme les slots 3 et 4.
 */
export function circleDrawSlots(
  missing: readonly Creator[], preferred: string, weights: readonly RarityWeights[],
  liveLogins?: ReadonlySet<string>,
): (Creator | null)[] | null {
  if (!missing.length) return null;
  const last = pickMissingCircle(missing, weights[4], preferred, liveLogins);
  const used = new Set([last.slug]);
  const slots: (Creator | null)[] = [];
  for (let index = 0; index < 2; index++) {
    const available = missing.filter(c => !used.has(c.slug));
    const creator = available.length ? pickMissingCircle(available, weights[index], preferred, liveLogins) : null;
    if (creator) used.add(creator.slug);
    slots.push(creator);
  }
  return [...slots, null, null, last];
}
