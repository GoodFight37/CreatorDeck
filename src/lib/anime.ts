import source from "@/data/anime.json";
import type { MemeCard, MemeRarity } from "@/lib/memes";

export type AnimeCard = MemeCard & {
  series: string;
  licenseStatus: string;
};

export const ANIME_CARDS: AnimeCard[] = source.cards.map((card) => ({
  id: card.id,
  number: card.catalogRank,
  name: card.name,
  rarity: card.rarity as MemeRarity,
  image: `/anime/${card.sha256}.webp`,
  top: "",
  bottom: "",
  flavor: card.series,
  series: card.series,
  credit: "Kyara",
  year: null,
  fullArt: true,
  retired: false,
  sourceUrl: card.sourceUrl,
  licenseStatus: card.licenseStatus,
}));

export const ANIME_BY_ID = new Map(ANIME_CARDS.map((card) => [card.id, card]));

export function drawAnimePack(random = Math.random): AnimeCard[] {
  const pool = [...ANIME_CARDS];
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, 5);
}
