/**
 * Studio de tirages : ouvre N boosters en mémoire pour montrer ce que les taux
 * publiés donnent réellement sur un grand nombre d'ouvertures.
 *
 * Le tirage passe par le **même moteur** que le jeu (`drawPack`), donc la
 * simulation ne peut pas diverger des taux affichés à l'écran « Taux de drop ».
 * Rien n'est écrit dans la partie : ni cartes, ni points, ni statistiques.
 */
import type { PackType, Rarity } from "@/lib/catalog";
import { drawPack } from "@/lib/game-engine";
import { RARITIES, packOdds } from "@/lib/pull-rates";

export type StudioResult = {
  packType: PackType;
  packs: number;
  /** Cartes tirées au total. */
  cards: number;
  /** Répartition observée, en part des cartes tirées. */
  observed: Record<Rarity, number>;
  /** Répartition attendue d'après `pull-rates.json`. */
  expected: Record<Rarity, number>;
  /** Boosters « Perfect » (Rare Drop) sortis pendant la simulation. */
  perfect: number;
  /** Créateurs distincts découverts (comme si la collection partait de zéro). */
  unique: number;
};

function emptyByRarity(): Record<Rarity, number> {
  return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
}

/**
 * Simule `packs` ouvertures du booster demandé. Une collection virtuelle est
 * tenue à jour pour compter les créateurs distincts, exactement comme si le
 * joueur ouvrait ces boosters pour la première fois.
 */
export function runStudio(packType: PackType, packs: number): StudioResult {
  const count = Math.max(0, Math.floor(packs));
  const owned = new Set<string>();
  const counts = emptyByRarity();
  let cards = 0;
  let perfect = 0;

  for (let index = 0; index < count; index += 1) {
    const drawn = drawPack(packType, owned);
    if (drawn[0]?.rareDrop) perfect += 1;
    for (const card of drawn) {
      counts[card.rarity] += 1;
      owned.add(card.creatorSlug);
      cards += 1;
    }
  }

  const observed = emptyByRarity();
  for (const rarity of RARITIES) {
    observed[rarity] = cards > 0 ? counts[rarity] / cards : 0;
  }

  const expected = emptyByRarity();
  const odds = packOdds(packType);
  for (const rarity of RARITIES) expected[rarity] = odds.perCard[rarity];

  return { packType, packs: count, cards, observed, expected, perfect, unique: owned.size };
}
