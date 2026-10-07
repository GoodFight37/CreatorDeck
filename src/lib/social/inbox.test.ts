import { describe, expect, it } from "vitest";

import type { LastPackLoss, LastPackShelf, MarketSale, TradeListItem } from "@/lib/cloud/api";
import { EMPTY_FRIEND_LISTS } from "@/lib/social/friends";
import type { FriendLists } from "@/lib/social/friends";
import {
  bestCardOf,
  buildInbox,
  friendsOpenedRecently,
  describeTrade,
  INBOX_LIMIT,
  mergeInbox,
  seenKey,
  unreadCount,
} from "@/lib/social/inbox";

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

const shelf = (overrides: Partial<LastPackShelf> = {}): LastPackShelf => ({
  now: "2026-10-03T12:00:00Z",
  windowMinutes: 10,
  stealPerDay: 1,
  stoleToday: false,
  packs: [],
  ...overrides,
});

const pack = (
  overrides: Partial<LastPackShelf["packs"][number]> = {},
): LastPackShelf["packs"][number] => ({
  id: 3,
  ownerId: "u2",
  ownerName: "Diane",
  mine: false,
  drawnAt: "2026-10-03T11:58:00Z",
  expiresAt: "2026-10-03T12:08:00Z",
  stealable: true,
  cards: [
    { index: 0, creatorSlug: "kaicenat", rarity: "common", variant: "standard", taken: false },
    { index: 1, creatorSlug: "kamet0", rarity: "epic", variant: "holo", taken: false },
  ],
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

  it("annonce le légendaire qu'on t'a piqué, et pas un autre mot", () => {
    const loss: LastPackLoss = {
      id: 12,
      thiefName: "Lou",
      packId: 475,
      card: { creatorSlug: "ibai", rarity: "legendary", variant: "live" },
      stolenAt: "2026-10-06T20:05:00Z",
    };
    const items = buildInbox({ trades: [], friends: friends(), lastPackLosses: [loss] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "last-pack:12", kind: "last_pack", who: "Lou" });
    expect(items[0]?.title).toBe("Lou t'a piqué ton légendaire");
    expect(items[0]?.body).toBe("ibai · Légendaire Live");
  });

  it("n'annonce pas un légendaire là où il n'y en a pas", () => {
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackLosses: [
        {
          id: 13,
          thiefName: "Sam",
          packId: 476,
          card: { creatorSlug: "ibai", rarity: "epic", variant: "standard" },
          stolenAt: "2026-10-06T20:06:00Z",
        },
        {
          id: 14,
          thiefName: "",
          packId: null,
          card: { creatorSlug: "ibai", rarity: "common", variant: "standard" },
          stolenAt: "2026-10-06T20:07:00Z",
        },
      ],
    });
    const parId = new Map(items.map((item) => [item.id, item]));
    expect(parId.get("last-pack:13")?.title).toBe("Sam t'a piqué ton épique");
    expect(parId.get("last-pack:14")?.title).toBe("Un collectionneur t'a piqué une carte");
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

  it("compte les amis qui ont ouvert un booster il y a moins d'une heure", () => {
    // L'aiguille de l'accueil : des **personnes**, pas des paquets — Diane qui
    // ouvre deux boosters reste une amie.
    const now = Date.parse("2026-10-03T12:00:00Z");
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack(), pack({ id: 4, ownerName: "Diane", drawnAt: "2026-10-03T11:50:00Z" }), pack({ id: 5, ownerName: "Marc", drawnAt: "2026-10-03T11:10:00Z" })] }),
      now,
    });
    const vu = friendsOpenedRecently(items, now);
    expect(vu.count).toBe(2); // Diane (×2) et Marc
    expect(vu.latestAt).toBe("2026-10-03T11:58:00Z");
  });

  it("oublie un ami dont l'ouverture a plus d'une heure", () => {
    const now = Date.parse("2026-10-03T12:00:00Z");
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack({ id: 6, ownerName: "Marc", drawnAt: "2026-10-03T10:00:00Z" })] }),
      now,
    });
    expect(friendsOpenedRecently(items, now)).toEqual({ count: 0, latestAt: null });
  });

  it("écrit un échange en français", () => {
    expect(describeTrade(1, 1)).toBe("1 carte contre 1 carte");
    expect(describeTrade(2, 3)).toBe("2 cartes contre 3 cartes");
  });

  it("nomme la plus rare du paquet d'un ami, et dit combien de temps il reste", () => {
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack()] }),
      now: Date.parse("2026-10-03T12:00:00Z"),
    });
    expect(items).toHaveLength(1);
    // Kamet0 (épique) plutôt que KaiCenat (commun) : c'est la meilleure carte du
    // paquet qui fait le titre.
    expect(items[0]).toMatchObject({ id: "friend-pack:3", kind: "friend_pack", who: "Diane" });
    expect(items[0]?.title).toBe("Diane a ouvert Kamet0");
    expect(items[0]?.body).toBe("Last Pack encore 8 min");
  });

  it("arrondit vers le haut et ne dépasse pas la fenêtre", () => {
    const at = Date.parse("2026-10-03T12:00:00Z");
    const late = buildInbox({
      trades: [],
      friends: friends(),
      // 7 min 40 s restantes : « 8 min » — on ne promet jamais moins qu'il n'y a.
      lastPackShelf: shelf({ packs: [pack({ expiresAt: "2026-10-03T12:07:40Z" })] }),
      now: at,
    });
    expect(late[0]?.body).toBe("Last Pack encore 8 min");
    const fresh = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack({ expiresAt: "2026-10-03T12:09:50Z" })] }),
      now: at,
    });
    // Jamais « 10 min » sur une fenêtre de dix minutes entamée.
    expect(fresh[0]?.body).toBe("Last Pack encore 10 min");
  });

  it("dit qu'un Last Pack est fini plutôt que d'inventer des minutes", () => {
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack({ expiresAt: "2026-10-03T11:59:00Z" })] }),
      now: Date.parse("2026-10-03T12:00:00Z"),
    });
    expect(items[0]?.body).toBe("Last Pack terminé");
  });

  it("ignore son propre paquet : le carnet ne raconte pas ce que tu viens de faire", () => {
    const items = buildInbox({
      trades: [],
      friends: friends(),
      lastPackShelf: shelf({ packs: [pack({ mine: true, ownerName: "Toi" })] }),
    });
    expect(items).toHaveLength(0);
  });

  it("annonce le direct du créateur épinglé, daté du début du direct", () => {
    const items = buildInbox({
      trades: [],
      friends: friends(),
      wishlist: { slug: "kamet0", liveAt: "2026-10-03T11:30:00Z", title: "Ranked toute la nuit" },
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "wishlist-live:kamet0:2026-10-03T11:30:00Z",
      kind: "wishlist_live",
      at: "2026-10-03T11:30:00Z",
    });
    expect(items[0]?.title).toBe("Kamet0 est en direct");
    expect(items[0]?.body).toBe("Ranked toute la nuit");
  });

  it("n'annonce rien quand l'épinglé ne streame pas, ou n'existe plus au catalogue", () => {
    const offline = buildInbox({
      trades: [],
      friends: friends(),
      wishlist: { slug: "kamet0", liveAt: null },
    });
    expect(offline).toHaveLength(0);
    const gone = buildInbox({
      trades: [],
      friends: friends(),
      wishlist: { slug: "ce-slug-nexiste-pas", liveAt: "2026-10-03T11:30:00Z" },
    });
    expect(gone).toHaveLength(0);
  });

  it("fusionne la ligne du direct avec celles du serveur, sans doublon", () => {
    const base = buildInbox({
      trades: [trade()],
      friends: friends(),
      sales: [sale()],
    });
    const merged = mergeInbox(base, {
      slug: "kamet0",
      liveAt: "2026-10-03T11:55:00Z",
      title: null,
    });
    expect(merged).toHaveLength(3);
    // Trié du plus récent au plus ancien : la vente (10-02) d'abord… non, le
    // direct est du 10-03.
    expect(merged[0]?.kind).toBe("wishlist_live");
    // Sans épinglé en direct, rien ne change — et l'ordre d'origine est gardé.
    expect(mergeInbox(base, null).map((item) => item.id)).toEqual(base.map((item) => item.id));
  });

  it("choisit la carte la plus rare, et sait s'arrêter", () => {
    expect(bestCardOf([{ creatorSlug: "a", rarity: "common" }, { creatorSlug: "b", rarity: "rare" }])?.creatorSlug).toBe("b");
    expect(bestCardOf([{ creatorSlug: "a", rarity: "gold-inconnu" }])?.creatorSlug).toBe("a");
    expect(bestCardOf([])).toBeNull();
  });
});
