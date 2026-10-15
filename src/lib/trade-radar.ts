import type { CardVariant } from "@/lib/catalog";
import type { Friendship } from "@/lib/social/friends";

export type RadarWish = { friend: Friendship; slug: string };
export type RadarMatch = { friend: Friendship; slug: string; variant: CardVariant; copies: number; key: string };

/** Un exemplaire reste au classeur : le radar ne propose que les variantes en double. */
export function tradeRadarMatches(
  cards: readonly { creatorSlug: string; variant: CardVariant }[],
  wishes: readonly RadarWish[],
): RadarMatch[] {
  const copies = new Map<string, number>();
  for (const card of cards) {
    const key = `${card.creatorSlug}|${card.variant}`;
    copies.set(key, (copies.get(key) ?? 0) + 1);
  }
  const matches: RadarMatch[] = [];
  const seen = new Set<string>();
  for (const { friend, slug } of wishes) {
    if (!slug || !friend.friendId) continue;
    for (const [key, count] of copies) {
      if (count < 2 || !key.startsWith(`${slug}|`)) continue;
      const unique = `${friend.friendId}|${key}`;
      if (seen.has(unique)) continue;
      seen.add(unique);
      matches.push({ friend, slug, variant: key.slice(slug.length + 1) as CardVariant, copies: count, key });
    }
  }
  return matches.sort((a, b) => a.friend.friendName.localeCompare(b.friend.friendName, "fr") || a.slug.localeCompare(b.slug));
}
