/**
 * Lecture des tables de tirage (`src/data/pull-rates.json`) et calcul des
 * probabilités publiées.
 *
 * Modèle repris de `pullRates.json` de pokemon-tcg-pocket-database (MIT) :
 * chaque booster possède une table par slot (donc des taux qui montent au fil
 * du booster), un slot garanti et un événement rare qui bascule tout le
 * booster. Le moteur tire depuis ces tables et l'écran « Taux de drop »
 * affiche les probabilités calculées ici : les deux ne peuvent pas diverger.
 */
import pullRateData from "@/data/pull-rates.json";
import type { CardVariant, PackType, Rarity } from "@/lib/catalog";

export type RarityWeights = Partial<Record<Rarity, number>>;

export type SlotTable = { weights: RarityWeights };

export type GuaranteedSlot = {
  weights: RarityWeights;
};

export type VariantChances = {
  /** Chance de Gold pour la rareté `goldRarity` (pour mille). */
  goldPermille?: number;
  goldRarity?: Rarity;
  /** Chance de Holo à partir de la rareté `holoFromRarity` (pour mille). */
  holoPermille?: number;
  holoFromRarity?: Rarity;
};

/**
 * Le bonus Direct : ce que « être en direct » change dans un tirage.
 *
 * Deux effets, tous les deux conditionnés à une information **fraîche** sur le
 * direct (le cache du serveur, moins de dix minutes) :
 *
 *   * les créateurs en direct pèsent `creatorBias` (× 1,5) dans chaque rareté,
 *     donc ils tombent plus souvent ;
 *   * la variante Live n'existe **que** pour eux : `livePermille` sur les slots
 *     ordinaires, et systématiquement sur la carte garantie.
 *
 * Sans information fraîche, rien de tout cela ne s'applique et aucune carte
 * Live ne sort : une variante « Live » qui désignerait quelqu'un qui ne
 * streame pas ne vaudrait rien.
 */
export type DirectBonus = {
  label: string;
  /** Poids relatif des créateurs en direct (1 = neutre). */
  creatorBias: number;
  /** Chance (pour mille) qu'une carte d'un créateur en direct soit Live. */
  livePermille: number;
  /** La variante réservée au direct. */
  variant: CardVariant;
  note: string;
};

export type RareDropTable = {
  label: string;
  tagline: string;
  /** Probabilité que le booster soit un « Perfect » (pour mille). */
  chancePermille: number;
  weights: RarityWeights;
  /** Chance (pour mille) d'améliorer la variante d'une carte du Perfect. */
  variantUpgradePermille: number;
};

export type PackRateTable = {
  label: string;
  /** Nombre de slots ordinaires : le dernier slot est le slot garanti. */
  slotCount: number;
  guaranteed: GuaranteedSlot;
  slots: SlotTable[];
  variants: VariantChances;
  rareDrop: RareDropTable;
};

export const RARITIES: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

/** Tables déclarées, indexées par booster. */
export const PULL_RATES = pullRateData.packs as Record<PackType, PackRateTable>;

/** Le bonus Direct, déclaré une fois pour tous les boosters. */
export const DIRECT_BONUS = pullRateData.direct as DirectBonus;

function total(weights: RarityWeights): number {
  return RARITIES.reduce((sum, rarity) => sum + (weights[rarity] ?? 0), 0);
}

/** Normalise des poids en probabilités (somme = 1). Table vide -> tout à 0. */
export function normalizeWeights(weights: RarityWeights): Record<Rarity, number> {
  const sum = total(weights);
  const result = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 } as Record<
    Rarity,
    number
  >;
  if (sum <= 0) return result;
  for (const rarity of RARITIES) {
    result[rarity] = (weights[rarity] ?? 0) / sum;
  }
  return result;
}

/** Mélange une table de slot avec l'événement rare, au prorata de sa chance. */
function blend(weights: RarityWeights, pack: PackType): Record<Rarity, number> {
  const drop = PULL_RATES[pack].rareDrop;
  const dropChance = Math.min(1, Math.max(0, drop.chancePermille / 1000));
  const base = normalizeWeights(weights);
  const rare = normalizeWeights(drop.weights);
  const result = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 } as Record<
    Rarity,
    number
  >;
  for (const rarity of RARITIES) {
    result[rarity] = (1 - dropChance) * base[rarity] + dropChance * rare[rarity];
  }
  return result;
}

export type SlotOdds = {
  /** Index du slot, ou « guaranteed » pour la carte garantie. */
  id: string;
  label: string;
  probabilities: Record<Rarity, number>;
};

export type PackOdds = {
  pack: PackType;
  label: string;
  cardCount: number;
  rareDrop: { label: string; tagline: string; chance: number };
  slots: SlotOdds[];
  /** Probabilité marginale qu'une carte du booster soit de cette rareté. */
  perCard: Record<Rarity, number>;
  /** Probabilité qu'un booster contienne au moins une carte de cette rareté. */
  perPack: Record<Rarity, number>;
};

/**
 * Probabilités publiées d'un booster : par slot, par carte et par booster
 * (« au moins une »). Tout est dérivé de `pull-rates.json`, jamais recopié.
 */
export function packOdds(pack: PackType): PackOdds {
  const table = PULL_RATES[pack];
  const slots: SlotOdds[] = table.slots.map((slot, index) => ({
    id: `slot-${index + 1}`,
    label: `Carte ${index + 1}`,
    probabilities: blend(slot.weights, pack),
  }));
  slots.push({
    id: "guaranteed",
    label: `Carte ${table.slotCount + 1} · garantie`,
    probabilities: blend(table.guaranteed.weights, pack),
  });

  const perCard = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 } as Record<
    Rarity,
    number
  >;
  for (const rarity of RARITIES) {
    const sum = slots.reduce((acc, slot) => acc + slot.probabilities[rarity], 0);
    perCard[rarity] = sum / slots.length;
  }

  const perPack = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 } as Record<
    Rarity,
    number
  >;
  for (const rarity of RARITIES) {
    const missing = slots.reduce((acc, slot) => acc * (1 - slot.probabilities[rarity]), 1);
    perPack[rarity] = 1 - missing;
  }

  return {
    pack,
    label: table.label,
    cardCount: table.slotCount + 1,
    rareDrop: {
      label: table.rareDrop.label,
      tagline: table.rareDrop.tagline,
      chance: table.rareDrop.chancePermille / 1000,
    },
    slots,
    perCard,
    perPack,
  };
}
