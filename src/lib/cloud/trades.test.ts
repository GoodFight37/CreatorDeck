import { describe, expect, it } from "vitest";
import { createInitialState, type OwnedCard, type PlayerState } from "@/lib/game-engine";
import type { TradeListItem } from "@/lib/cloud/api";
import { acceptedTrades, applyAcceptedTrades, describeCard, describeCards, moveOf } from "@/lib/cloud/trades";

const T0 = Date.parse("2026-03-01T10:00:00Z");

function owned(id: string, slug: string, variant: OwnedCard["variant"], obtainedAt = T0): OwnedCard {
  return { id, creatorSlug: slug, rarity: "legendary", variant, obtainedAt, rareDrop: false };
}

function state(cards: OwnedCard[]): PlayerState {
  return { ...createInitialState(T0), cards };
}

function trade(overrides: Partial<TradeListItem> = {}): TradeListItem {
  return {
    id: 1,
    direction: "out",
    status: "accepted",
    partnerId: "22222222-2222-4222-8222-222222222222",
    partnerName: "Bruno",
    given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "holo" }],
    received: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }],
    createdAt: "2026-03-01T10:00:00Z",
    resolvedAt: "2026-03-01T10:05:00Z",
    ...overrides,
  };
}

describe("échanges côté client", () => {
  it("ne garde que les échanges acceptés, du plus ancien au plus récent", () => {
    const list = [
      trade({ id: 3, resolvedAt: "2026-03-01T10:20:00Z" }),
      trade({ id: 1, resolvedAt: "2026-03-01T10:05:00Z" }),
      trade({ id: 2, status: "open", resolvedAt: null }),
      trade({ id: 4, status: "declined", resolvedAt: "2026-03-01T09:00:00Z" }),
    ];
    expect(acceptedTrades(list).map((entry) => entry.id)).toEqual([1, 3]);
  });

  it("traduit une offre en mouvement applicable au moteur", () => {
    expect(moveOf(trade({ id: 9 }))).toEqual({
      tradeId: 9,
      given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "holo" }],
      received: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }],
    });
  });

  it("applique un échange accepté pendant l'absence de l'appareil", () => {
    const before = state([owned("mine", "ibai", "holo")]);
    const result = applyAcceptedTrades(before, [trade()], T0 + 60_000);

    expect(result.applied).toBe(1);
    expect(result.blocked).toEqual([]);
    expect(result.state.cards.map((card) => card.creatorSlug)).toEqual(["kaicenat"]);
    expect(result.state.cards[0]?.fromTrade).toBe(1);
    expect(result.state.updatedAt).toBe(T0 + 60_000);
  });

  it("ne rejoue pas un échange déjà appliqué (idempotence)", () => {
    const applied = applyAcceptedTrades(state([owned("mine", "ibai", "holo")]), [trade()], T0).state;
    const again = applyAcceptedTrades(applied, [trade()], T0 + 5_000);

    expect(again.applied).toBe(0);
    expect(again.state).toBe(applied);
    expect(again.state.cards).toHaveLength(1);
  });

  it("signale sans les appliquer les échanges qu'une partie ne peut pas suivre", () => {
    // La carte donnée n'est pas dans cette partie : un autre appareil l'a déjà
    // échangée. On ne bricole pas une collection à moitié.
    const result = applyAcceptedTrades(state([]), [trade({ id: 5 })], T0);

    expect(result.applied).toBe(0);
    expect(result.blocked.map((entry) => entry.id)).toEqual([5]);
    expect(result.state.cards).toEqual([]);
  });

  it("écrit les cartes en clair pour l'interface", () => {
    const names = new Map([["ibai", "Ibai Llanos"]]);
    expect(describeCard({ creatorSlug: "ibai", rarity: "legendary", variant: "holo" }, names)).toBe(
      "Ibai Llanos (Holographique)",
    );
    // Créateur inconnu du catalogue : on montre le slug plutôt que « undefined ».
    expect(describeCard({ creatorSlug: "inconnu", rarity: "common", variant: "live" }, names)).toBe("inconnu (Live)");
    expect(describeCards([], names)).toBe("aucune carte");
    expect(
      describeCards(
        [
          { creatorSlug: "ibai", rarity: "legendary", variant: "holo" },
          { creatorSlug: "inconnu", rarity: "common", variant: "live" },
          { creatorSlug: "inconnu", rarity: "common", variant: "standard" },
        ],
        names,
      ),
    ).toBe("Ibai Llanos (Holographique), inconnu (Live) +1");
  });
});
