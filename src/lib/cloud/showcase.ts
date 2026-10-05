/**
 * La vitrine, côté application : les règles sont les mêmes que celles de la
 * fonction `set_showcase()` en base (4 cartes au maximum, slugs uniques), pour
 * que l'interface n'envoie jamais quelque chose que le serveur refusera.
 *
 * module volontairement sans React ni réseau : il ne manipule que des listes de
 * slugs, donc il se teste directement (`showcase.test.ts`).
 */
import { CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";
import type { OwnedCard } from "@/lib/game-engine";

/** Nombre de cartes épinglables — la base a la même borne. */
export const MAX_SHOWCASE = 4;

/**
 * Nettoie une liste de slugs : minuscules, sans espaces, sans vides ni doublons,
 * coupée à `MAX_SHOWCASE`. C'est la forme qui part au serveur.
 */
export function normalizeShowcase(slugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of slugs) {
    if (typeof raw !== "string") continue;
    const slug = raw.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    clean.push(slug);
    if (clean.length === MAX_SHOWCASE) break;
  }
  return clean;
}

/**
 * Ajoute ou retire une carte. Si la vitrine est pleine, l'ajout est ignoré :
 * l'interface demande alors de retirer une carte d'abord (plutôt que de
 * remplacer silencieusement le choix du joueur).
 */
export function toggleShowcase(current: readonly string[], slug: string): string[] {
  const clean = normalizeShowcase(current);
  const target = slug.trim().toLowerCase();
  if (!target) return clean;
  if (clean.includes(target)) return clean.filter((entry) => entry !== target);
  if (clean.length >= MAX_SHOWCASE) return clean;
  return [...clean, target];
}

/**
 * Les créateurs possédés, du plus rare au plus commun, puis par rang Twitch :
 * c'est l'ordre dans lequel on a envie de choisir ses quatre cartes.
 */
export function ownedCreatorSlugs(cards: readonly OwnedCard[]): string[] {
  const bestRarity = new Map<string, number>();
  for (const card of cards) {
    const order = RARITY_META[card.rarity]?.order ?? 0;
    const known = bestRarity.get(card.creatorSlug);
    if (known === undefined || order > known) bestRarity.set(card.creatorSlug, order);
  }
  return [...bestRarity.keys()].sort((left, right) => {
    const byRarity = (bestRarity.get(right) ?? 0) - (bestRarity.get(left) ?? 0);
    if (byRarity !== 0) return byRarity;
    const byRank = (CREATOR_BY_SLUG.get(left)?.rank ?? 0) - (CREATOR_BY_SLUG.get(right)?.rank ?? 0);
    return byRank !== 0 ? byRank : left.localeCompare(right);
  });
}

/** Les cartes affichables dans une vitrine : celles que le catalogue connaît. */
export function knownShowcase(slugs: readonly string[]): string[] {
  return normalizeShowcase(slugs).filter((slug) => CREATOR_BY_SLUG.has(slug));
}
