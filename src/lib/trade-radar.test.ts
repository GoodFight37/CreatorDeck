import { describe, expect, it } from "vitest";
import { tradeRadarMatches } from "@/lib/trade-radar";

const friend = { id: 1, friendId: "u2", friendName: "Ana", createdAt: "2026-10-15T00:00:00Z" };

describe("Trade Radar", () => {
  it("ne suggère que les variantes en double correspondant au souhait public", () => {
    const cards = [
      { creatorSlug: "ibai", variant: "standard" as const },
      { creatorSlug: "ibai", variant: "standard" as const },
      { creatorSlug: "ibai", variant: "gold" as const },
      { creatorSlug: "kamet0", variant: "standard" as const },
    ];
    expect(tradeRadarMatches(cards, [{ friend, slug: "ibai" }])).toEqual([
      { friend, slug: "ibai", variant: "standard", copies: 2, key: "ibai|standard" },
    ]);
  });

  it("ignore les souhaits vides et déduplique un même ami", () => {
    const cards = [{ creatorSlug: "ibai", variant: "live" as const }, { creatorSlug: "ibai", variant: "live" as const }];
    expect(tradeRadarMatches(cards, [{ friend, slug: "" }, { friend, slug: "ibai" }, { friend, slug: "ibai" }])).toHaveLength(1);
  });
});
