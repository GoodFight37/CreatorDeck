import source from "@/data/imgflip.json";
import { type MemeCard } from "@/lib/memes";

/** Le catalogue Imgflip, unique source client : le tirage lui-même est serveur (0062). */
export const IMGFLIP_POOL = (source as MemeCard[]).filter(card => card.image && !card.retired);

export const IMGFLIP_BY_ID = new Map(IMGFLIP_POOL.map(card => [card.id, card]));
