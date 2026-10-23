import source from "@/data/imgflip.json";
import { type MemeCard } from "@/lib/memes";
import { PULL_RATES, RARITIES } from "@/lib/pull-rates";
import { randomInt } from "@/lib/random";

export const IMGFLIP_POOL = (source as MemeCard[]).filter(card => card.image && !card.retired);

/** Essai local : tables Live inchangées, sans attribution ni réserve serveur. */
export function drawImgflipPack(pity = false): MemeCard[] {
  const table = PULL_RATES.live;
  const perfect = randomInt(1000) < table.rareDrop.chancePermille;
  const used = new Set<string>();
  const slots = [...table.slots.map(slot => slot.weights), table.guaranteed.weights];
  return slots.map((slot, index) => {
    const weights = index === table.slotCount && pity ? { legendary: 1 }
      : perfect ? table.rareDrop.weights : slot;
    const total = RARITIES.reduce((sum, rarity) => sum + (weights[rarity] ?? 0), 0);
    let roll = randomInt(total);
    const rarity = RARITIES.find(rarity => (roll -= weights[rarity] ?? 0) < 0)!;
    const pool = IMGFLIP_POOL.filter(card => card.rarity === rarity && !used.has(card.id));
    if (!pool.length) throw new Error(`Catalogue Imgflip incomplet : ${rarity}.`);
    const card = pool[randomInt(pool.length)];
    used.add(card.id);
    return card;
  });
}
