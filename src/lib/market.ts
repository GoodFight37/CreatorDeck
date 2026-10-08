/**
 * L'hôtel des ventes, côté écran : la grille des prix et la liste de ce qu'on
 * peut déposer.
 *
 * Le serveur reste seul juge (`supabase/migrations/0009_marche.sql`,
 * `market_payout()` / `market_price()`) : c'est lui qui paie. Mais l'écran doit
 * afficher « Vendre · 400 pts » sur chaque doublon **sans** un appel réseau par
 * carte, donc la grille est recopiée ici. C'est le même choix que les taux de
 * drop (`pull-rates.json` dans le moteur, la même table en SQL) : une seule
 * valeur à changer, à deux endroits, chacun vérifié par un test.
 *
 * `PAYOUTS` doit rester identique au `case` de `market_payout()`.
 */
import { RARITY_META, VARIANT_META, type CardVariant, type Rarity } from "@/lib/catalog";
import type { OwnedCard } from "@/lib/game-engine";

/** Ce que l'hôtel paie, par rareté, avant le facteur de variante. */
export const PAYOUTS: Record<Rarity, number> = {
  common: 20,
  uncommon: 40,
  rare: 100,
  epic: 250,
  legendary: 400,
};

/** Ce que la variante multiplie : une Gold vaut cinq cartes Standard. */
export const VARIANT_FACTORS: Record<CardVariant, number> = {
  standard: 1,
  live: 2,
  holo: 3,
  gold: 5,
};

/** Ce que l'hôtel paie pour une carte. Miroir de `market_payout()`. */
export function payoutOf(rarity: Rarity, variant: CardVariant): number {
  return (PAYOUTS[rarity] ?? 0) * (VARIANT_FACTORS[variant] ?? 0);
}

/**
 * Prix de l'étiquette, c'est-à-dire ce que paiera l'acheteur : une fois et
 * demie ce que l'hôtel a payé. Miroir de `market_price()`.
 */
export function shelfPrice(payout: number): number {
  return Math.ceil((payout * 3) / 2);
}

/** « 400 pts », avec l'espace fine des milliers à la française. */
export function formatPoints(points: number): string {
  return `${points.toLocaleString("fr-FR")} pts`;
}

/**
 * Les cartes qu'on peut déposer : uniquement des **doublons**.
 *
 * La règle est celle du recyclage (`recycleCard`) : on ne vend jamais sa seule
 * copie d'un couple créateur + variante, sinon la complétion du classeur
 * baisserait sans que le joueur l'ait demandé. Le serveur applique la même
 * règle — ici, c'est pour que l'écran ne propose que des dépôts acceptables.
 *
 * Une carte vendue est **retirée de cette liste** : `soldIds` porte les cartes
 * déjà déposées dans la session, que la partie locale n'a pas encore
 * enregistrées au moment du rendu.
 */
export function sellableCards(cards: readonly OwnedCard[], soldIds: readonly string[] = []): OwnedCard[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const key = `${card.creatorSlug}|${card.variant}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sold = new Set(soldIds);
  return cards
    .filter((card) => (counts.get(`${card.creatorSlug}|${card.variant}`) ?? 0) > 1 && !sold.has(card.id))
    // Les plus payantes d'abord : c'est ce qu'un joueur veut voir en haut, et
    // l'ordre ne dépend pas de l'ordre de la sauvegarde.
    .sort((a, b) => payoutOf(b.rarity, b.variant) - payoutOf(a.rarity, a.variant) || a.id.localeCompare(b.id));
}

/** « Légendaire Gold » : ce que l'écran écrit sous le nom du créateur. */
export function describeCard(rarity: string, variant: string): string {
  const rarityLabel = RARITY_META[rarity as Rarity]?.label ?? rarity;
  const variantLabel = VARIANT_META[variant as CardVariant]?.label ?? variant;
  return `${rarityLabel} ${variantLabel}`;
}
