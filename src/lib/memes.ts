import source from "@/data/memes-fr.json";
import imgflip from "@/data/imgflip.json";

export type MemeRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type MemeCard = {
  id: string;
  number: number;
  name: string;
  rarity: MemeRarity;
  image: string | null;
  top: string;
  bottom: string;
  flavor: string;
  credit: string;
  year: number | null;
  fullArt: boolean;
  retired: boolean;
  sourceName?: "Imgflip";
  sourceUrl?: string;
};

/** Univers distinct : ces identifiants ne sont jamais des creatorSlug Twitch. */
export const MEME_CARDS = [...source, ...imgflip] as MemeCard[];
export const MEME_BY_ID = new Map(MEME_CARDS.map((card) => [card.id, card]));

export const MEME_RARITY: Record<MemeRarity, { label: string; color: string }> = {
  common: { label: "Commune", color: "#9ca3af" },
  rare: { label: "Rare", color: "#50a8ef" },
  epic: { label: "Épique", color: "#b78aea" },
  legendary: { label: "Légendaire", color: "#f5bb68" },
  mythic: { label: "Mythique", color: "#f27d9b" },
};

export const MEME_PULLABLE = MEME_CARDS.filter((card) => card.image !== null);
