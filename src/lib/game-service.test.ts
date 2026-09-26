import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/catalog";
import { drawPack, refreshBalances, type DrawnCard } from "@/lib/game-service";
import type { players } from "@/db/schema";

type PlayerRow = typeof players.$inferSelect;

const HOUR = 60 * 60 * 1000;

function makePlayer(overrides: Partial<PlayerRow> = {}): PlayerRow {
  const now = new Date("2026-01-01T12:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000000",
    level: 1,
    xp: 0,
    points: 120,
    hourglasses: 12,
    livePacks: 0,
    archivePacks: 0,
    lastLiveRegen: now,
    lastArchiveRegen: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("refreshBalances", () => {
  it("régénère les boosters Live avec le temps", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const player = makePlayer({
      livePacks: 0,
      // 2 heures et demie avant `now` -> 2 packs Live regagnés (1/h).
      lastLiveRegen: new Date(now.getTime() - 2.5 * HOUR),
    });
    const refreshed = refreshBalances(player, now);
    expect(refreshed.livePacks).toBe(2);
  });

  it("plafonne au maximum du pack", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const player = makePlayer({
      livePacks: 0,
      lastLiveRegen: new Date(now.getTime() - 100 * HOUR),
    });
    expect(refreshBalances(player, now).livePacks).toBe(PACKS.live.max);
  });

  it("ne régénère rien si le stock est déjà plein", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const player = makePlayer({ livePacks: PACKS.live.max });
    expect(refreshBalances(player, now).livePacks).toBe(PACKS.live.max);
  });
});

describe("drawPack", () => {
  const GUARANTEED = ["rare", "epic", "legendary"];

  function expectValidPack(pack: DrawnCard[], size: number) {
    expect(pack).toHaveLength(size);
    // Garantie « rare ou mieux » présente.
    expect(pack.some((card) => GUARANTEED.includes(card.rarity))).toBe(true);
    // Aucune carte en double dans un même pack.
    const slugs = pack.map((card) => card.creatorSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  }

  it("un booster Live contient 5 cartes dont une rare ou mieux", () => {
    for (let i = 0; i < 20; i += 1) {
      expectValidPack(drawPack("live", new Set()), PACKS.live.size);
    }
  });

  it("un booster Archives contient 3 cartes dont une rare ou mieux", () => {
    for (let i = 0; i < 20; i += 1) {
      expectValidPack(drawPack("archive", new Set()), PACKS.archive.size);
    }
  });

  it("marque isNew selon la collection possédée", () => {
    const empty = new Set<string>();
    expect(drawPack("live", empty).every((card) => card.isNew)).toBe(true);

    // Avec une collection pré-remplie, l'invariant est : isNew === pas possédé.
    const owned = new Set(["squeezie", "gotaga", "antoinedaniel", "michou"]);
    for (let i = 0; i < 20; i += 1) {
      for (const card of drawPack("live", owned)) {
        expect(card.isNew).toBe(!owned.has(card.creatorSlug));
      }
    }
  });
});
