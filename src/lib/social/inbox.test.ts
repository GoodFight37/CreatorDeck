import { describe, expect, it } from "vitest";

import type { MarketSale, TradeListItem } from "@/lib/cloud/api";
import { EMPTY_FRIEND_LISTS } from "@/lib/social/friends";
import type { FriendLists } from "@/lib/social/friends";
import { buildInbox, describeTrade, INBOX_LIMIT, seenKey, unreadCount } from "@/lib/social/inbox";

const trade = (overrides: Partial<TradeListItem> = {}): TradeListItem => ({
  id: 1,
  direction: "in",
  status: "open",
  partnerId: "u2",
  partnerName: "Diane",
  given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "gold" }],
  received: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" }],
  createdAt: "2026-10-01T10:00:00Z",
  resolvedAt: null,
  ...overrides,
});

const friends = (overrides: Partial<FriendLists> = {}): FriendLists => ({
  ...EMPTY_FRIEND_LISTS,
  ...overrides,
});

const sale = (overrides: Partial<MarketSale> = {}): MarketSale => ({
  id: 7,
  creatorSlug: "ibai",
  price: 600,
  soldAt: "2026-10-02T09:00:00Z",
  buyerName: "Bruno",
  ...overrides,
});

describe("le carnet de notifications", () => {
  it("annonce une offre reçue, avec son contenu", () => {
    const items = buildInbox({ trades: [trade()], friends: friends() });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "trade:1", kind: "trade_in", who: "Diane" });
    expect(items[0]?.title).toBe("Diane te propose un échange");
    expect(items[0]?.body).toBe("1 carte contre 1 carte");
  });

  it("n'annonce pas les offres qu'on a soi-même proposées", () => {
    // Sinon le carnet raconterait au joueur ce qu'il vient de faire.
    const items = buildInbox({ trades: [trade({ direction: "out" })], friends: friends() });
    expect(items).toEqual([]);
  });

  it("met en tête l'offre acceptée par l'autre", () => {
    const items = buildInbox({
      trades: [
        trade({ id: 2, createdAt: "2026-10-03T10:00:00Z" }),
        trade({ id: 3, direction: "out", status: "accepted", resolvedAt: "2026-10-04T10:00:00Z" }),
      ],
      friends: friends(),
    });
    expect(items.map((item) => item.id)).toEqual(["trade:3", "trade:2"]);
    expect(items[0]?.title).toBe("Diane a accepté ton offre");
  });

  it("parle d'échange conclu quand c'est toi qui as accepté", () => {
    const items = buildInbox({
      trades: [trade({ status: "accepted", resolvedAt: "2026-10-04T10:00:00Z" })],
      friends: friends(),
    });
    expect(items[0]?.title).toBe("Échange conclu avec Diane");
    // Ce que tu as reçu est bien ce qui est reçu (la carte de l'offre reçue).
    expect(items[0]?.body).toBe("1 carte contre 1 carte");
  });

  it("annonce un refus seulement sur une offre que tu avais proposée", () => {
    const mine = buildInbox({
      trades: [trade({ direction: "out", status: "declined", resolvedAt: "2026-10-04T10:00:00Z" })],
      friends: friends(),
    });
    expect(mine[0]?.kind).toBe("trade_declined");
    expect(mine[0]?.title).toBe("Diane a refusé ton offre");

    // Quand c'est toi qui as refusé, tu le sais déjà : rien à annoncer.
    const theirs = buildInbox({ trades: [trade({ status: "declined" })], friends: friends() });
    expect(theirs).toEqual([]);
  });

  it("annonce les demandes d'ami reçues et les amitiés acceptées", () => {
    const items = buildInbox({
      trades: [],
      friends: friends({
        incoming: [{ id: 4, senderId: "u3", senderName: "Bruno", createdAt: "2026-10-02T10:00:00Z" }],
        friends: [{ id: 5, friendId: "u4", friendName: "Chloé", createdAt: "2026-10-01T10:00:00Z" }],
      }),
    });
    expect(items.map((item) => item.kind)).toEqual(["friend_request", "friend_new"]);
    expect(items[0]?.title).toBe("Bruno veut être ton ami");
    expect(items[1]?.title).toBe("Chloé est maintenant ton ami");
  });

  it("annonce une vente, avec le prix et l'acheteur", () => {
    const items = buildInbox({ trades: [], friends: friends(), sales: [sale()] });
    expect(items[0]).toMatchObject({ id: "sale:7", kind: "sale" });
    expect(items[0]?.body).toBe("Bruno l'a achetée pour 600 points.");
  });

  it("ne garde que les lignes datables et s'arrête à la limite", () => {
    const trades = Array.from({ length: INBOX_LIMIT + 5 }, (_, index) =>
      trade({
        id: index + 1,
        createdAt: new Date(Date.UTC(2026, 9, 1) + index * 60_000).toISOString(),
      }),
    );
    const items = buildInbox({ trades: [...trades, trade({ id: 999, createdAt: "pas une date" })], friends: friends() });
    expect(items).toHaveLength(INBOX_LIMIT);
    expect(items.some((item) => item.id === "trade:999")).toBe(false);
    // Le plus récent d'abord.
    expect(items[0]?.id).toBe(`trade:${INBOX_LIMIT + 5}`);
  });

  it("range du plus récent au plus ancien, toutes sources confondues", () => {
    const items = buildInbox({
      trades: [trade({ createdAt: "2026-10-01T10:00:00Z" })],
      friends: friends({
        incoming: [{ id: 4, senderId: "u3", senderName: "Bruno", createdAt: "2026-10-05T10:00:00Z" }],
      }),
      sales: [sale({ soldAt: "2026-10-03T09:00:00Z" })],
    });
    expect(items.map((item) => item.id)).toEqual(["friend-request:4", "sale:7", "trade:1"]);
  });

  it("compte les nouveautés depuis la dernière visite", () => {
    const items = buildInbox({
      trades: [trade({ id: 1, createdAt: "2026-10-01T10:00:00Z" })],
      friends: friends({
        incoming: [{ id: 4, senderId: "u3", senderName: "Bruno", createdAt: "2026-10-05T10:00:00Z" }],
      }),
    });
    expect(unreadCount(items, null)).toBe(2);
    expect(unreadCount(items, "2026-10-03T00:00:00Z")).toBe(1);
    expect(unreadCount(items, "2026-10-06T00:00:00Z")).toBe(0);
    // Une date illisible vaut « jamais vu » : mieux vaut une pastille de trop.
    expect(unreadCount(items, "hier")).toBe(2);
  });

  it("garde une visite par joueur", () => {
    expect(seenKey("u1")).not.toBe(seenKey("u2"));
    expect(seenKey("u1")).toContain("u1");
  });

  it("écrit un échange en français", () => {
    expect(describeTrade(1, 1)).toBe("1 carte contre 1 carte");
    expect(describeTrade(2, 3)).toBe("2 cartes contre 3 cartes");
  });
});
