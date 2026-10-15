import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const monde = vi.hoisted(() => ({
  cloud: {
    configured: true, userId: null as string | null, busy: false,
    friends: { friends: [], incoming: [], outgoing: [] }, friendsAt: null,
    market: [], marketAt: null, wishlistSlug: null, lastPacks: null, lastPacksAt: null,
    lastPacksBusy: false,
  },
}));

vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => monde.cloud }));
vi.mock("@/hooks/use-game", () => ({ useGame: () => null, useNow: () => Date.now() }));
vi.mock("@/lib/cloud/cloud-store", () => ({ cloudStore: {
  loadFriends: vi.fn(async () => {}), loadMarket: vi.fn(async () => {}),
  loadWishlist: vi.fn(async () => {}), loadLastPacks: vi.fn(async () => {}),
  stealLastPack: vi.fn(async () => ({ status: "done", message: "" })),
  signInAsGuest: vi.fn(async () => true),
} }));

describe("les feuilles sociales après connexion", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc(); banc.preparer();
    monde.cloud.userId = null;
    monde.cloud.lastPacks = null;
    vi.clearAllMocks();
  });
  afterEach(() => banc.nettoyer());

  it.each([
    ["friends", "FriendsSheet", "loadFriends"],
    ["market", "MarketSheet", "loadMarket"],
    ["last", "LastPackSheet", "loadLastPacks"],
    ["wishlist", "WishlistSheet", "loadWishlist"],
  ] as const)("charge %s quand le compte arrive dans la feuille ouverte", async (file, component, method) => {
    const { cloudStore } = await import("@/lib/cloud/cloud-store");
    const sheets = {
      friends: (await import("@/components/friends-sheet")).FriendsSheet,
      market: (await import("@/components/market-sheet")).MarketSheet,
      last: (await import("@/components/last-pack-sheet")).LastPackSheet,
      wishlist: (await import("@/components/wishlist-sheet")).WishlistSheet,
    };
    const Sheet = sheets[file];
    await banc.monter(<Sheet onClose={() => {}} />);
    expect(cloudStore[method]).not.toHaveBeenCalled();
    monde.cloud.userId = "11111111-1111-4111-8111-111111111111";
    await act(async () => { await banc.rendre(<Sheet onClose={() => {}} />); });
    expect(cloudStore[method]).toHaveBeenCalledOnce();
  });

  it("la première carte, numérotée 1 par le serveur, reste sélectionnable", async () => {
    const { LastPackSheet } = await import("@/components/last-pack-sheet");
    const { cloudStore } = await import("@/lib/cloud/cloud-store");
    monde.cloud.userId = "11111111-1111-4111-8111-111111111111";
    const now = new Date().toISOString();
    monde.cloud.lastPacks = { now, stoleToday: false, packs: [{
      id: 8, mine: false, ownerName: "Ana", stealable: true,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      cards: [{ index: 1, creatorSlug: "kaicenat", rarity: "common", variant: "standard", taken: false, stealable: true }],
    }] } as never;
    await banc.monter(<LastPackSheet onClose={() => {}} />);
    act(() => document.querySelector<HTMLButtonElement>(".last-pack-card")!.click());
    expect(document.querySelector(".last-pack-card")?.getAttribute("aria-pressed")).toBe("true");
    banc.appuyer(/Prendre cette carte/);
    await act(async () => {});
    expect(cloudStore.stealLastPack).toHaveBeenCalledWith(8, 1);
  });
});
