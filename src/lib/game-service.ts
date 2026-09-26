import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/db";
import { packOpenings, playerCards, players } from "@/db/schema";
import {
  CREATORS,
  PACKS,
  RARITY_META,
  type CardVariant,
  type Creator,
  type PackType,
  type Rarity,
} from "@/lib/catalog";
import { and, count, eq } from "drizzle-orm";

const LIVE_WEIGHTS: Record<Rarity, number> = {
  common: 42,
  uncommon: 30,
  rare: 18,
  epic: 8,
  legendary: 2,
};
const ARCHIVE_WEIGHTS: Record<Rarity, number> = {
  common: 27,
  uncommon: 31,
  rare: 25,
  epic: 13,
  legendary: 4,
};
const GUARANTEED_RARITIES: Rarity[] = ["rare", "epic", "legendary"];

type PlayerRow = typeof players.$inferSelect;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DrawnCard = {
  id: string;
  creatorSlug: string;
  rarity: Rarity;
  variant: CardVariant;
  isNew: boolean;
};

export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "GAME_ERROR",
  ) {
    super(message);
  }
}

function secureRoll(maxExclusive: number) {
  return randomInt(0, maxExclusive);
}

export function refreshBalances(player: PlayerRow, now = new Date()): PlayerRow {
  const refreshOne = (
    stock: number,
    max: number,
    last: Date,
    interval: number,
  ) => {
    if (stock >= max) return { stock: max, last: now };
    const elapsed = Math.max(0, now.getTime() - last.getTime());
    const gained = Math.floor(elapsed / interval);
    if (gained <= 0) return { stock, last };
    const nextStock = Math.min(max, stock + gained);
    const nextLast =
      nextStock >= max ? now : new Date(last.getTime() + gained * interval);
    return { stock: nextStock, last: nextLast };
  };

  const live = refreshOne(
    player.livePacks,
    PACKS.live.max,
    player.lastLiveRegen,
    PACKS.live.regenMs,
  );
  const archive = refreshOne(
    player.archivePacks,
    PACKS.archive.max,
    player.lastArchiveRegen,
    PACKS.archive.regenMs,
  );

  return {
    ...player,
    livePacks: live.stock,
    archivePacks: archive.stock,
    lastLiveRegen: live.last,
    lastArchiveRegen: archive.last,
    updatedAt: now,
  };
}

function chooseCreator(
  packType: PackType,
  used: Set<string>,
  allowedRarities?: Rarity[],
) {
  const weights = packType === "live" ? LIVE_WEIGHTS : ARCHIVE_WEIGHTS;
  const available = CREATORS.filter(
    (creator) =>
      !used.has(creator.slug) &&
      (!allowedRarities || allowedRarities.includes(creator.rarity)),
  );
  if (!available.length) throw new GameError("Le catalogue disponible est vide.", 500);

  const rarities = Object.keys(weights) as Rarity[];
  const weightedRarities = rarities
    .map((rarity) => ({
      rarity,
      weight: available.some((creator) => creator.rarity === rarity)
        ? weights[rarity]
        : 0,
    }))
    .filter((entry) => entry.weight > 0);
  const totalWeight = weightedRarities.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = secureRoll(totalWeight);
  let chosenRarity = weightedRarities[0].rarity;
  for (const entry of weightedRarities) {
    if (roll < entry.weight) {
      chosenRarity = entry.rarity;
      break;
    }
    roll -= entry.weight;
  }

  const bucket = available.filter((creator) => creator.rarity === chosenRarity);
  return bucket[secureRoll(bucket.length)];
}

function chooseVariant(packType: PackType, creator: Creator): CardVariant {
  const roll = secureRoll(10_000);
  if (packType === "archive") {
    if (creator.rarity === "legendary" && roll < 350) return "gold";
    if (RARITY_META[creator.rarity].order >= RARITY_META.rare.order && roll < 1_650) {
      return "holo";
    }
  }
  if (packType === "live" && creator.rarity !== "common" && roll < 750) {
    return "holo";
  }
  return "standard";
}

export function drawPack(packType: PackType, alreadyOwned: Set<string>): DrawnCard[] {
  const size = PACKS[packType].size;
  const used = new Set<string>();
  const drawn: DrawnCard[] = [];

  for (let index = 0; index < size - 1; index += 1) {
    const creator = chooseCreator(packType, used);
    used.add(creator.slug);
    drawn.push({
      id: randomUUID(),
      creatorSlug: creator.slug,
      rarity: creator.rarity,
      variant: chooseVariant(packType, creator),
      isNew: !alreadyOwned.has(creator.slug),
    });
  }

  const guaranteed = chooseCreator(packType, used, GUARANTEED_RARITIES);
  drawn.push({
    id: randomUUID(),
    creatorSlug: guaranteed.slug,
    rarity: guaranteed.rarity,
    variant: packType === "live" ? "live" : chooseVariant(packType, guaranteed),
    isNew: !alreadyOwned.has(guaranteed.slug),
  });

  for (let index = drawn.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRoll(index + 1);
    [drawn[index], drawn[swapIndex]] = [drawn[swapIndex], drawn[index]];
  }
  return drawn;
}

async function persistRefreshedPlayer(tx: Transaction, player: PlayerRow) {
  await tx
    .update(players)
    .set({
      livePacks: player.livePacks,
      archivePacks: player.archivePacks,
      lastLiveRegen: player.lastLiveRegen,
      lastArchiveRegen: player.lastArchiveRegen,
      updatedAt: player.updatedAt,
    })
    .where(eq(players.id, player.id));
}

export async function getGameState(playerId: string) {
  const [stored] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  if (!stored) throw new GameError("Joueur introuvable.", 404, "PLAYER_NOT_FOUND");

  const refreshed = refreshBalances(stored);
  const balanceChanged =
    refreshed.livePacks !== stored.livePacks ||
    refreshed.archivePacks !== stored.archivePacks ||
    refreshed.lastLiveRegen.getTime() !== stored.lastLiveRegen.getTime() ||
    refreshed.lastArchiveRegen.getTime() !== stored.lastArchiveRegen.getTime();
  // On passe par une vraie transaction plutôt que par le hack
  // `db as unknown as Transaction` : la mise à jour du solde doit rester
  // atomique et typée.
  if (balanceChanged) {
    await db.transaction(async (tx) => {
      await persistRefreshedPlayer(tx, refreshed);
    });
  }

  const [cards, openingCount] = await Promise.all([
    db
      .select({
        id: playerCards.id,
        creatorSlug: playerCards.creatorSlug,
        rarity: playerCards.rarity,
        variant: playerCards.variant,
        obtainedAt: playerCards.obtainedAt,
      })
      .from(playerCards)
      .where(eq(playerCards.playerId, playerId)),
    db
      .select({ value: count() })
      .from(packOpenings)
      .where(eq(packOpenings.playerId, playerId)),
  ]);

  const uniqueCreators = new Set(cards.map((card) => card.creatorSlug)).size;
  const nextLiveAt =
    refreshed.livePacks >= PACKS.live.max
      ? null
      : new Date(refreshed.lastLiveRegen.getTime() + PACKS.live.regenMs).toISOString();
  const nextArchiveAt =
    refreshed.archivePacks >= PACKS.archive.max
      ? null
      : new Date(
          refreshed.lastArchiveRegen.getTime() + PACKS.archive.regenMs,
        ).toISOString();

  return {
    player: {
      level: refreshed.level,
      xp: refreshed.xp,
      xpNext: refreshed.level * 100,
      points: refreshed.points,
      hourglasses: refreshed.hourglasses,
      livePacks: refreshed.livePacks,
      archivePacks: refreshed.archivePacks,
      nextLiveAt,
      nextArchiveAt,
    },
    cards: cards.map((card) => ({
      ...card,
      rarity: card.rarity as Rarity,
      variant: card.variant as CardVariant,
      obtainedAt: card.obtainedAt.toISOString(),
    })),
    stats: {
      uniqueCreators,
      totalCards: cards.length,
      openings: Number(openingCount[0]?.value ?? 0),
    },
  };
}

export async function openPack(
  playerId: string,
  packType: PackType,
  idempotencyKey: string,
) {
  let replayed = false;
  let result: DrawnCard[] = [];

  await db.transaction(async (tx) => {
    const [player] = await tx
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .for("update")
      .limit(1);
    if (!player) throw new GameError("Joueur introuvable.", 404, "PLAYER_NOT_FOUND");

    const [previous] = await tx
      .select({ result: packOpenings.result })
      .from(packOpenings)
      .where(
        and(
          eq(packOpenings.playerId, playerId),
          eq(packOpenings.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (previous) {
      replayed = true;
      result = previous.result as DrawnCard[];
      return;
    }

    const refreshed = refreshBalances(player);
    const available =
      packType === "live" ? refreshed.livePacks : refreshed.archivePacks;
    if (available <= 0) {
      throw new GameError(
        "Aucun booster disponible pour le moment.",
        409,
        "PACK_NOT_READY",
      );
    }

    const ownedRows = await tx
      .select({ creatorSlug: playerCards.creatorSlug })
      .from(playerCards)
      .where(eq(playerCards.playerId, playerId));
    const owned = new Set(ownedRows.map((row) => row.creatorSlug));
    result = drawPack(packType, owned);

    const pack = PACKS[packType];
    const nextXp = refreshed.xp + pack.xp;
    const nextLevel = Math.floor(nextXp / 100) + 1;
    const gainedLevels = Math.max(0, nextLevel - refreshed.level);

    await tx
      .update(players)
      .set({
        livePacks:
          packType === "live" ? refreshed.livePacks - 1 : refreshed.livePacks,
        archivePacks:
          packType === "archive"
            ? refreshed.archivePacks - 1
            : refreshed.archivePacks,
        lastLiveRegen: refreshed.lastLiveRegen,
        lastArchiveRegen: refreshed.lastArchiveRegen,
        points: refreshed.points + pack.points,
        xp: nextXp,
        level: nextLevel,
        hourglasses: refreshed.hourglasses + gainedLevels * 3,
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId));

    await tx.insert(playerCards).values(
      result.map((card) => ({
        id: card.id,
        playerId,
        creatorSlug: card.creatorSlug,
        rarity: card.rarity,
        variant: card.variant,
      })),
    );
    await tx.insert(packOpenings).values({
      id: randomUUID(),
      playerId,
      idempotencyKey,
      packType,
      result,
    });
  });

  return { cards: result, replayed, state: await getGameState(playerId) };
}

export async function spendHourglass(playerId: string, packType: PackType) {
  await db.transaction(async (tx) => {
    const [player] = await tx
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .for("update")
      .limit(1);
    if (!player) throw new GameError("Joueur introuvable.", 404, "PLAYER_NOT_FOUND");

    const refreshed = refreshBalances(player);
    if (refreshed.hourglasses <= 0) {
      throw new GameError("Aucun sablier disponible.", 409, "NO_HOURGLASS");
    }

    const isLive = packType === "live";
    const max = isLive ? PACKS.live.max : PACKS.archive.max;
    const currentStock = isLive ? refreshed.livePacks : refreshed.archivePacks;
    if (currentStock >= max) {
      throw new GameError("La réserve de ce booster est déjà pleine.", 409, "PACK_FULL");
    }

    const reductionMs = isLive ? 15 * 60 * 1000 : 60 * 60 * 1000;
    const shifted = {
      ...refreshed,
      hourglasses: refreshed.hourglasses - 1,
      lastLiveRegen: isLive
        ? new Date(refreshed.lastLiveRegen.getTime() - reductionMs)
        : refreshed.lastLiveRegen,
      lastArchiveRegen: !isLive
        ? new Date(refreshed.lastArchiveRegen.getTime() - reductionMs)
        : refreshed.lastArchiveRegen,
    };
    const afterShift = refreshBalances(shifted);

    await tx
      .update(players)
      .set({
        hourglasses: afterShift.hourglasses,
        livePacks: afterShift.livePacks,
        archivePacks: afterShift.archivePacks,
        lastLiveRegen: afterShift.lastLiveRegen,
        lastArchiveRegen: afterShift.lastArchiveRegen,
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId));
  });

  return { state: await getGameState(playerId) };
}
