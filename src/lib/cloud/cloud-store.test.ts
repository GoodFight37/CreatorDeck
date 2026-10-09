import { describe, expect, it, vi } from "vitest";
import { SEASONS } from "@/lib/seasons";
import { createInitialState, type OwnedCard, type PlayerState } from "@/lib/game-engine";
import {
  CloudError,
  type CloudApi,
  type CloudSession,
  type LastPackLoss,
  type LeaderboardRow,
  type MarketListing,
  type MarketSale,
  type PushSaveResult,
  type RemoteSaveRow,
  type TradeListItem,
} from "@/lib/cloud/api";
import { AUTO_PUSH_DEBOUNCE_MS, EMPTY_CLOUD_STATE, createCloudStore } from "@/lib/cloud/cloud-store";
import { gameStore } from "@/lib/game-store";
import { EVENTS, eventForDay } from "@/lib/streamer";
import { gameDay } from "@/lib/progression";
import type { Friendship, IncomingRequest } from "@/lib/social/friends";
import type { KeyValueStorage } from "@/lib/save-store";

const T0 = Date.parse("2026-03-01T10:00:00Z");
const CONFIG = { url: "https://projet.supabase.co", anonKey: "anon-key-de-test-suffisamment-longue" };

const SESSION: CloudSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: T0 + 3_600_000,
  userId: "11111111-1111-4111-8111-111111111111",
  email: "joueur@exemple.fr",
};

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function card(id: string, slug: string) {
  return { id, creatorSlug: slug, rarity: "common" as const, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
}

function tradeItem(overrides: Partial<TradeListItem> = {}): TradeListItem {
  return {
    id: 3,
    direction: "out",
    status: "accepted",
    partnerId: "22222222-2222-4222-8222-222222222222",
    partnerName: "Bruno",
    given: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" }],
    received: [{ creatorSlug: "ibai", rarity: "legendary", variant: "gold" }],
    createdAt: "2026-03-01T10:00:00Z",
    resolvedAt: "2026-03-01T10:05:00Z",
    ...overrides,
  };
}

function saveWith(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createInitialState(T0), ...overrides };
}

/** La version serveur renvoyée par le tirage simulé. */
const SERVER_SAVE_AT = "2026-03-01T10:00:05Z";

/** Une carte telle que `open_pack()` la fabrique : identifiant né du serveur. */
function serverCard(creatorSlug: string, rarity: string, variant: string, index = serverCard.next++): OwnedCard {
  return {
    id: `5e2f0000-0000-4000-8000-0000000000${String(index).padStart(2, "0")}`,
    creatorSlug,
    rarity: rarity as OwnedCard["rarity"],
    variant: variant as OwnedCard["variant"],
    obtainedAt: T0,
    rareDrop: false,
  };
}
serverCard.next = 1;

function remoteRow(state: PlayerState, updatedAt: string, deviceUpdatedAt = state.updatedAt): RemoteSaveRow {
  return {
    state,
    saveVersion: state.version,
    deviceUpdatedAt,
    stateChecksum: "abc",
    updatedAt,
    verified: true,
  };
}

/** L'heure du serveur dans les tests : la fenêtre se mesure par rapport à elle. */
const SERVER_NOW = "2026-03-01T10:00:00Z";

/** Le paquet d'une amie, exposé depuis trente secondes. */
// Le paquet de Lou : une Légendaire **Live** au milieu, donc protégée — les
// quatre autres sont prenables.
const LAST_PACK = {
  id: 475,
  ownerId: "22222222-2222-4222-8222-222222222222",
  ownerName: "Lou",
  mine: false,
  drawnAt: SERVER_NOW,
  expiresAt: "2026-03-01T10:10:00Z",
  stealable: true,
  cards: [
    { index: 1, creatorSlug: "ibai", rarity: "rare", variant: "standard", taken: false, stealable: true },
    { index: 2, creatorSlug: "kaicenat", rarity: "common", variant: "standard", taken: false, stealable: true },
    { index: 3, creatorSlug: "kaicenat", rarity: "legendary", variant: "live", taken: false, stealable: false },
    { index: 4, creatorSlug: "kamet0", rarity: "epic", variant: "holo", taken: false, stealable: true },
    { index: 5, creatorSlug: "sardoche", rarity: "rare", variant: "standard", taken: false, stealable: true },
  ],
};

/** Une annonce du comptoir, telle que le serveur la renvoie. */
const LISTING = {
  id: 12,
  creatorSlug: "ibai",
  rarity: "legendary",
  variant: "gold",
  payout: 2_000,
  price: 3_000,
  createdAt: "2026-03-01T10:00:00Z",
  sellerName: "Diane",
};

type FakeApi = {
  session: () => CloudSession | null;
  signInAnonymously: ReturnType<typeof vi.fn>;
  profile: ReturnType<typeof vi.fn>;
  updateDisplayName: ReturnType<typeof vi.fn>;
  setShowcase: ReturnType<typeof vi.fn>;
  requestOtp: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  pushSave: ReturnType<typeof vi.fn>;
  pullSave: ReturnType<typeof vi.fn>;
  leaderboard: ReturnType<typeof vi.fn>;
  playerProfile: ReturnType<typeof vi.fn>;
  openPack: ReturnType<typeof vi.fn>;
  packStatus: ReturnType<typeof vi.fn>;
  redeemPromoCode: ReturnType<typeof vi.fn>;
  walletGet: ReturnType<typeof vi.fn>;
  walletCredit: ReturnType<typeof vi.fn>;
  walletSpend: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  updateAccount: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  verifyEmailChange: ReturnType<typeof vi.fn>;
  resendEmailChange: ReturnType<typeof vi.fn>;
  searchPlayers: ReturnType<typeof vi.fn>;
  playerVariants: ReturnType<typeof vi.fn>;
  createTrade: ReturnType<typeof vi.fn>;
  respondTrade: ReturnType<typeof vi.fn>;
  cancelTrade: ReturnType<typeof vi.fn>;
  listTrades: ReturnType<typeof vi.fn>;
  marketShelf: ReturnType<typeof vi.fn>;
  marketSell: ReturnType<typeof vi.fn>;
  marketBuy: ReturnType<typeof vi.fn>;
  marketSales: ReturnType<typeof vi.fn>;
  lastPackShelf: ReturnType<typeof vi.fn>;
  lastPackSteal: ReturnType<typeof vi.fn>;
  lastPackLosses: ReturnType<typeof vi.fn>;
  wishlistSlug: ReturnType<typeof vi.fn>;
  setWishlist: ReturnType<typeof vi.fn>;
  clearWishlist: ReturnType<typeof vi.fn>;
  listFriends: ReturnType<typeof vi.fn>;
  listIncomingFriendRequests: ReturnType<typeof vi.fn>;
  marketListingsOf: ReturnType<typeof vi.fn>;
  twitchAuthorizeUrl: ReturnType<typeof vi.fn>;
  adoptSession: ReturnType<typeof vi.fn>;
  arenaSubmit: ReturnType<typeof vi.fn>;
  arenaMe: ReturnType<typeof vi.fn>;
  arenaLeaderboard: ReturnType<typeof vi.fn>;
  arenaClaim: ReturnType<typeof vi.fn>;
  arenaDraftChoices: ReturnType<typeof vi.fn>;
  arenaDraftPick: ReturnType<typeof vi.fn>;
  streamerStatus: ReturnType<typeof vi.fn>;
  streamerEventToday: ReturnType<typeof vi.fn>;
  streamerChoose: ReturnType<typeof vi.fn>;
  streamerSetupBuy: ReturnType<typeof vi.fn>;
  streamerSetupSacrifice: ReturnType<typeof vi.fn>;
  streamerVisit: ReturnType<typeof vi.fn>;
  streamerGuestSet: ReturnType<typeof vi.fn>;
};

/** Mon arène de la semaine, telle que le serveur la renvoie. */
function arenaMine(overrides: Record<string, unknown> = {}) {
  return {
    week: "2026-02-23",
    draftOpen: false,
    rank: 2,
    entry: { lineup: ["kaicenat"], score: 4120, liveCount: 1, submittedAt: SERVER_NOW },
    draft: null,
    claims: [],
    pending: [],
    ...overrides,
  };
}

/** Le classement d'arène de la semaine. */
const ARENA_BOARD = {
  week: "2026-02-23",
  endsAt: "2026-03-02T06:00:00Z",
  draftOpen: false,
  rows: [
    { userId: SESSION.userId, displayName: "Kaicenat", score: 4120, liveCount: 1, lineup: ["kaicenat"], rank: 2 },
  ],
};

function harness(options: {
  configured?: boolean;
  signedIn?: boolean;
  local?: PlayerState;
  remote?: RemoteSaveRow | null;
  push?: PushSaveResult;
} = {}) {
  const local = options.local ?? saveWith({ updatedAt: T0 });
  const state = { current: local };
  const applied: PlayerState[] = [];
  const session = options.signedIn === false ? null : SESSION;
  // Un **seul** stockage pour toute la vie du store, comme `localStorage` dans
  // l'app : sinon la « dernière visite » du carnet se perdrait entre deux
  // appels, et les tests ne testeraient plus le vrai comportement.
  const device = memoryStorage();

  const api: FakeApi = {
    session: () => session,
    signInAnonymously: vi.fn(async () => ({ ...SESSION, email: null })),
    profile: vi.fn(async () => ({ displayName: "Kaicenat", showcaseSlugs: [] })),
    updateDisplayName: vi.fn(async () => {}),
    setShowcase: vi.fn(async (slugs: string[]) => slugs),
    requestOtp: vi.fn(async () => {}),
    verifyOtp: vi.fn(async () => SESSION),
    signOut: vi.fn(async () => {}),
    pushSave: vi.fn(async () => options.push ?? { status: "pushed" as const, save: remoteRow(local, "2026-03-01T10:05:00Z") }),
    pullSave: vi.fn(async () => options.remote ?? null),
    leaderboard: vi.fn(async () => [
      {
        rank: 1,
        userId: "u1",
        displayName: "Kaicenat",
        uniqueCreators: 900,
        totalCards: 4000,
        legendaryCards: 40,
        epicCards: 120,
        goldCards: 7,
        holoCards: 33,
        completion: 0.9,
        level: 50,
        points: 9000,
        showcaseSlugs: [],
        familyOwned: 12,
        familyTotal: 155,
      } satisfies LeaderboardRow,
    ]),
    playerProfile: vi.fn(async (userId?: string) => ({
      userId: userId ?? SESSION.userId,
      displayName: "Diane",
      level: 12,
      points: 640,
      verified: true,
      uniqueCreators: 137,
      totalCards: 402,
      legendaryCards: 9,
      epicCards: 31,
      goldCards: 3,
      holoCards: 12,
      catalogSize: 1000,
      byRegion: [{ regionId: "S01", owned: 12, total: 155 }],
      completion: 0.137,
      rankCompletion: 42,
      rankCards: 118,
      showcaseSlugs: ["kaicenat"],
      wishlistSlug: null,
      byRarity: [{ rarity: "legendary", owned: 4, total: 50 }],
    })),
    openPack: vi.fn(async () => ({
      packs: 2,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 4,
      cards: [
        { creatorSlug: "kaicenat", rarity: "legendary", variant: "live", rareDrop: false },
        { creatorSlug: "ibai", rarity: "epic", variant: "holo", rareDrop: false },
        { creatorSlug: "ninja", rarity: "rare", variant: "standard", rareDrop: false },
        { creatorSlug: "auronplay", rarity: "uncommon", variant: "standard", rareDrop: false },
        { creatorSlug: "rubius", rarity: "common", variant: "standard", rareDrop: false },
      ],
      // Depuis `0022`, le serveur range lui-même les cinq cartes dans la
      // collection (identifiants nés côté serveur) et renvoie la ligne : le
      // client l'adopte au lieu de pousser la sienne.
      save: remoteRow(
        {
          ...local,
          packs: 2,
          openings: 4,
          cards: [
            serverCard("kaicenat", "legendary", "live"),
            serverCard("ibai", "epic", "holo"),
            serverCard("ninja", "rare", "standard"),
            serverCard("auronplay", "uncommon", "standard"),
            serverCard("rubius", "common", "standard"),
          ],
        },
        SERVER_SAVE_AT,
      ),
    })),
    packStatus: vi.fn(async () => ({
      packs: 3,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 3,
      nextPackAt: "2026-03-01T10:30:00Z",
    })),
    // Un code accepté : le serveur a écrit le booster dans sa réserve et le
    // dit. C'est `pack_status()` appelé juste après qui le fait remonter au jeu.
    redeemPromoCode: vi.fn(async () => ({ granted: 1, reserve: 4, note: "stream du 7 octobre" })),
    // Le wallet du serveur : le solde de référence des tests est 45 (celui de
    // la partie locale de `saveWith`), sauf quand le test en décide autrement.
    // Par défaut, le serveur est **d'accord** avec la partie locale : c'est le
    // cas normal, une fois les triggers passés (un tirage, une vente et un
    // achat créditent et débitent des deux côtés). Un test qui a besoin d'un
    // désaccord — une sauvegarde bricolée — le dit explicitement.
    walletGet: vi.fn(async () => state.current.points),
    walletCredit: vi.fn(async () => ({ delta: 0, points: state.current.points })),
    walletSpend: vi.fn(async () => ({ delta: 0, points: state.current.points })),
    ping: vi.fn(async () => ({ host: "projet.supabase.co" })),
    updateAccount: vi.fn(async (update: { email?: string; password?: string }) => ({
      applied: true,
      pendingEmail: null,
      email: update.email ?? SESSION.email,
    })),
    signInWithPassword: vi.fn(async () => SESSION),
    verifyEmailChange: vi.fn(async (email: string) => ({ ...SESSION, email })),
    resendEmailChange: vi.fn(async () => {}),
    searchPlayers: vi.fn(async () => [
      { userId: "22222222-2222-4222-8222-222222222222", displayName: "Bruno", level: 4, uniqueCreators: 120 },
    ]),
    playerVariants: vi.fn(async () => ["standard", "gold"]),
    createTrade: vi.fn(
      async (
        recipientId: string,
        given: Array<{ creatorSlug: string; variant: string }>,
        wanted: Array<{ creatorSlug: string; variant: string }>,
      ) => ({
        trade: {
          id: 5,
          status: "open" as const,
          proposerId: SESSION.userId,
          recipientId,
          proposerCards: given.map((entry) => ({ ...entry, rarity: "legendary" })),
          recipientCards: wanted.map((entry) => ({ ...entry, rarity: "epic" })),
          createdAt: "2026-03-01T10:00:00Z",
          resolvedAt: null,
        },
        recipientMissing: null,
      }),
    ),
    respondTrade: vi.fn(async () => ({
      status: "accepted" as const,
      trade: {
        id: 5,
        status: "accepted" as const,
        proposerId: SESSION.userId,
        recipientId: SESSION.userId,
        proposerCards: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }],
        recipientCards: [{ creatorSlug: "ibai", rarity: "legendary", variant: "standard" }],
        createdAt: "2026-03-01T10:00:00Z",
        resolvedAt: "2026-03-01T10:05:00Z",
      },
      given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "standard" }],
      received: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }],
    })),
    cancelTrade: vi.fn(async (tradeId: number) => ({
      id: tradeId,
      status: "cancelled" as const,
      proposerId: SESSION.userId,
      recipientId: "22222222-2222-4222-8222-222222222222",
      proposerCards: [],
      recipientCards: [],
      createdAt: "2026-03-01T10:00:00Z",
      resolvedAt: "2026-03-01T10:05:00Z",
    })),
    listTrades: vi.fn(async () => [] as TradeListItem[]),
    marketShelf: vi.fn(async () => [LISTING]),
    marketSell: vi.fn(async (cardId: string) => ({
      listing: LISTING,
      payout: LISTING.payout,
      points: 1_000,
      cardId,
    })),
    marketListingsOf: vi.fn(async () => [LISTING]),
    marketSales: vi.fn(async () => [] as MarketSale[]),
    listFriends: vi.fn(async () => [] as Friendship[]),
    listIncomingFriendRequests: vi.fn(async () => [] as IncomingRequest[]),
    twitchAuthorizeUrl: vi.fn((redirectTo: string) => `https://projet.supabase.co/auth/v1/authorize?provider=twitch&redirect_to=${encodeURIComponent(redirectTo)}`),
    adoptSession: vi.fn(async () => ({ ...SESSION, email: "joueur@exemple.fr" })),
    marketBuy: vi.fn(async () => ({
      card: {
        id: "neuve",
        creatorSlug: "kaicenat",
        rarity: "legendary",
        variant: "gold",
        obtainedAt: T0 + 60_000,
        rareDrop: false,
        fromMarket: LISTING.id,
      },
      price: LISTING.price,
      points: 400,
    })),
    lastPackShelf: vi.fn(async () => ({
      now: SERVER_NOW,
      windowMinutes: 10,
      stealPerDay: 1,
      stoleToday: false,
      packs: [LAST_PACK],
    })),
    lastPackSteal: vi.fn(async () => ({
      packId: LAST_PACK.id,
      index: 3,
      ownerId: LAST_PACK.ownerId,
      ownerName: LAST_PACK.ownerName,
      card: {
        id: "prise",
        creatorSlug: "kaicenat",
        rarity: "legendary",
        variant: "live",
        obtainedAt: T0 + 120_000,
        rareDrop: false,
        fromLastPack: LAST_PACK.id,
      },
    })),
    lastPackLosses: vi.fn(async () => [] as LastPackLoss[]),
    wishlistSlug: vi.fn(async () => null as string | null),
    setWishlist: vi.fn(async (slug: string) => slug),
    clearWishlist: vi.fn(async () => {}),
    arenaSubmit: vi.fn(async () => ({ week: "2026-02-23", score: 4120, liveCount: 1, best: 4120, kept: false })),
    arenaMe: vi.fn(async () => arenaMine()),
    arenaLeaderboard: vi.fn(async () => ARENA_BOARD),
    arenaClaim: vi.fn(async () => ({ week: "2026-02-16", alreadyClaimed: false, rank: 1, hourglasses: 5, emblem: true })),
    arenaDraftChoices: vi.fn(async () => ({
      week: "2026-02-28",
      slots: [
        ["kaicenat", "ibai", "ninja"],
        ["ibai", "ninja", "rubius"],
        ["ninja", "rubius", "auronplay"],
        ["rubius", "auronplay", "kaicenat"],
        ["auronplay", "kaicenat", "ibai"],
      ],
    })),
    arenaDraftPick: vi.fn(async () => ({ week: "2026-02-28", score: 5100, liveCount: 2, best: 5100, kept: false })),
    streamerStatus: vi.fn(async () => ({
      subscribers: 0,
      perDay: 240,
      day: "2026-03-01",
      publishedToday: false,
      chosenToday: false,
      tokensToday: 0,
      tokensCap: 40,
      setup: [],
      setupBonus: 0,
      guests: [],
      raidToday: 0,
      raidDay: "",
    })),
    streamerEventToday: vi.fn(async () => ({
      day: "2026-03-01",
      event: "raid",
      chosen: false,
      choice: "",
      success: false,
      buzz: false,
      badBuzz: false,
      gained: 0,
    })),
    streamerChoose: vi.fn(async () => ({
      already: false,
      event: "raid",
      choice: "gauche",
      success: true,
      buzz: false,
      badBuzz: false,
      gained: 1680,
      subscribers: 1680,
      perDay: 700,
    })),
    streamerSetupBuy: vi.fn(async () => ({
      already: false,
      level: "webcam",
      price: 120,
      setup: ["webcam"],
      setupBonus: 30,
      points: 880,
    })),
    streamerSetupSacrifice: vi.fn(async () => ({
      already: false,
      level: "webcam2",
      price: 2,
      value: 2,
      cards: ["dbl-ra-1", "dbl-rb-1"],
      setup: ["webcam", "micro", "lumiere", "deco", "studio", "webcam2"],
      setupBonus: 600,
      points: 0,
    })),
    streamerVisit: vi.fn(async () => ({
      days: 1,
      countedDays: 1,
      gained: 900,
      before: 3000,
      subscribers: 3900,
      perDay: 900,
      raid: { gained: 0, shares: [], already: false },
    })),
    streamerGuestSet: vi.fn(async () => ({ changed: true, guests: [] })),
  };

  const store = createCloudStore({
    config: () => (options.configured === false ? null : CONFIG),
    storage: () => device,
    api: () => api as unknown as CloudApi,
    readState: () => state.current,
    applyState: (next) => {
      applied.push(next);
      state.current = next;
    },
    now: () => T0 + 60_000,
  });

  return { store, api, applied, state, device };
}

describe("store cloud", () => {
  it("annonce clairement quand le cloud n'est pas configuré", () => {
    const { store } = harness({ configured: false });
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(true));
    expect(store.getSnapshot().configured).toBe(false);
    expect(store.getSnapshot().message).toMatch(/jouable hors ligne/);
    expect(seen.length).toBeGreaterThan(0);
    // Le snapshot serveur reste stable (pré-rendu statique).
    expect(store.getServerSnapshot()).toBe(EMPTY_CLOUD_STATE);
  });

  it("retrouve la session enregistrée sur l'appareil", () => {
    const { store } = harness();
    store.subscribe(() => {});
    expect(store.getSnapshot()).toMatchObject({
      configured: true,
      email: "joueur@exemple.fr",
      userId: SESSION.userId,
      project: "projet",
    });
  });

  it("envoie un code puis accepte la validation", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await store.requestCode("joueur@exemple.fr");
    expect(api.requestOtp).toHaveBeenCalledWith("joueur@exemple.fr");
    expect(store.getSnapshot().message).toMatch(/Code envoyé/);

    await expect(store.verifyCode("joueur@exemple.fr", "123456")).resolves.toBe(true);
    expect(store.getSnapshot().email).toBe("joueur@exemple.fr");
  });

  it("pousse la partie quand le cloud est vide", async () => {
    const { store, api } = harness({ local: saveWith({ updatedAt: T0 }) });
    store.subscribe(() => {});
    await store.sync("auto");
    expect(api.pushSave).toHaveBeenCalledTimes(1);
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
    expect(store.getSnapshot().decision).toBe("push");
    expect(store.getSnapshot().pending).toBe(false);
  });

  it("ne remplace jamais la partie locale sans confirmation", async () => {
    const remote = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 10 * 60_000 });
    const { store, applied } = harness({ local: saveWith({ updatedAt: T0 }), remote: remoteRow(remote, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("auto");
    expect(store.getSnapshot().decision).toBe("pull");
    // Le message annonce l'écran (où le joueur choisit), il ne nomme plus un
    // bouton qui n'existe plus.
    expect(store.getSnapshot().message).toMatch(/Mon compte/);
    expect(store.getSnapshot().message).not.toMatch(/Charger le cloud/);
    expect(applied).toHaveLength(0);
  });

  it("adopte la partie du cloud quand on le demande explicitement", async () => {
    const remote = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 10 * 60_000 });
    const { store, applied } = harness({ remote: remoteRow(remote, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("pull");
    expect(applied).toHaveLength(1);
    expect(applied[0]?.cards).toHaveLength(1);
    expect(store.getSnapshot().message).toMatch(/Partie reprise depuis le jeu en ligne/);
  });

  it("refuse une sauvegarde cloud illisible sans toucher à la partie", async () => {
    const { store, applied } = harness({ remote: remoteRow({ pas: "une partie" } as unknown as PlayerState, "2026-03-01T10:10:00Z") });
    store.subscribe(() => {});
    await store.sync("pull");
    expect(applied).toHaveLength(0);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("signale un conflit au lieu d'écraser la partie", async () => {
    const { store, api } = harness({
      push: {
        status: "conflict",
        save: remoteRow(saveWith({ updatedAt: T0 + 120_000 }), "2026-03-01T10:02:00Z"),
      },
    });
    store.subscribe(() => {});
    await store.sync("push");
    expect(api.pushSave).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().pending).toBe(true);
    expect(store.getSnapshot().message).toMatch(/Deux parties existent/);
  });

  it("remonte un refus du serveur en clair", async () => {
    const { store } = harness({ push: { status: "rejected", problems: ["carte sans créateur"] } });
    store.subscribe(() => {});
    await store.sync("push");
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/carte sans créateur/);
  });

  it("applique un envoi automatique après une écriture, avec débounce", async () => {
    vi.useFakeTimers();
    try {
      const { store, api } = harness();
      store.subscribe(() => {});
      const detach = store.attach();
      // Simule une partie jouée : le store reçoit l'écriture.
      const local = saveWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 1000 });
      api.pushSave.mockClear();
      emitPersist(local);
      expect(store.getSnapshot().pending).toBe(true);
      expect(api.pushSave).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(AUTO_PUSH_DEBOUNCE_MS + 10);
      expect(api.pushSave).toHaveBeenCalledTimes(1);
      detach();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ne pousse rien tant que personne n'est connecté", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    store.attach();
    api.pushSave.mockClear();
    await store.sync("push");
    expect(api.pushSave).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
  });

  it("crée un compte invité quand on le demande", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await expect(store.signInAsGuest()).resolves.toBe(true);
    expect(api.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().userId).toBe(SESSION.userId);
    expect(store.getSnapshot().email).toBeNull();
    expect(store.getSnapshot().message).toMatch(/Compte invité créé/);
  });

  it("prévient quand les comptes invités sont désactivés", async () => {
    const { store, api } = harness({ signedIn: false });
    api.signInAnonymously.mockRejectedValueOnce(new CloudError("Comptes invités désactivés.", "anonymous_disabled", 422));
    store.subscribe(() => {});
    await expect(store.signInAsGuest()).resolves.toBe(false);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/invités désactivés/);
  });

  it("charge et change le nom du classement", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await store.loadProfile();
    expect(store.getSnapshot().displayName).toBe("Kaicenat");

    await expect(store.rename("  Mon pseudo  ")).resolves.toBe(true);
    expect(api.updateDisplayName).toHaveBeenCalledWith(SESSION.userId, "Mon pseudo");
    expect(store.getSnapshot().displayName).toBe("Mon pseudo");

    // Trop court : refusé sans appeler le serveur.
    api.updateDisplayName.mockClear();
    await expect(store.rename("a")).resolves.toBe(false);
    expect(api.updateDisplayName).not.toHaveBeenCalled();
  });

  it("charge la vitrine du profil avec le nom", async () => {
    const { store, api } = harness();
    api.profile.mockResolvedValueOnce({ displayName: "Kaicenat", showcaseSlugs: ["KaiCenat", "kaicenat", "ibai"] });
    store.subscribe(() => {});
    await store.loadProfile();
    expect(store.getSnapshot().displayName).toBe("Kaicenat");
    expect(store.getSnapshot().showcase).toEqual(["kaicenat", "ibai"]);
  });

  it("enregistre la vitrine et l'oublie à la déconnexion", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await expect(store.setShowcase(["kaicenat", "IBai"])).resolves.toBe(true);
    expect(api.setShowcase).toHaveBeenCalledWith(["kaicenat", "ibai"]);
    expect(store.getSnapshot().showcase).toEqual(["kaicenat", "ibai"]);
    expect(store.getSnapshot().message).toMatch(/Vitrine mise à jour/);

    await store.signOut();
    expect(store.getSnapshot().showcase).toEqual([]);
  });

  it("refuse une cinquième carte sans appeler le serveur", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await expect(store.setShowcase(["a", "b", "c", "d", "e"])).resolves.toBe(false);
    expect(api.setShowcase).not.toHaveBeenCalled();
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/4 cartes au maximum/);
  });

  it("affiche le refus du serveur quand une carte n'est pas possédée", async () => {
    const { store, api } = harness();
    api.setShowcase.mockRejectedValueOnce(new CloudError("vitrine : carte non possédée (kaicenat)", "P0001", 400));
    store.subscribe(() => {});
    await expect(store.setShowcase(["kaicenat"])).resolves.toBe(false);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/carte non possédée/);
  });

  it("charge le classement", async () => {
    const { store } = harness();
    store.subscribe(() => {});
    await store.loadLeaderboard("total_cards");
    expect(store.getSnapshot().leaderboardMetric).toBe("total_cards");
    expect(store.getSnapshot().leaderboard[0]?.displayName).toBe("Kaicenat");
  });

  it("ouvre un booster côté serveur et adopte la sauvegarde écrite par le serveur", async () => {
    const { store, api, applied } = harness({ signedIn: true });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome.status).toBe("drawn");
    if (outcome.status !== "drawn") throw new Error("tirage attendu");
    expect(outcome.cards).toHaveLength(5);
    expect(api.openPack).toHaveBeenCalled();
    // Les cartes et les compteurs du serveur entrent dans la partie locale,
    // avec les identifiants nés sur le serveur — pas ceux du moteur local.
    expect(applied.at(-1)?.cards).toHaveLength(5);
    expect(applied.at(-1)?.cards.every((card) => card.id.startsWith("5e2f0000-"))).toBe(true);
    expect(applied.at(-1)?.packs).toBe(2);
    expect(applied.at(-1)?.openings).toBe(4);
    // Le tirage n'est **plus** poussé : le serveur l'a déjà écrit. Un envoi
    // forcé ici écraserait la collection d'un autre appareil avec une version
    // d'avant le tirage.
    expect(api.pushSave).not.toHaveBeenCalled();
    const snapshot = store.getSnapshot();
    expect(snapshot.remoteUpdatedAt).toBe(Date.parse(SERVER_SAVE_AT));
    expect(snapshot.message).toContain("5 cartes");
    expect(snapshot.isError).toBe(false);
  });

  it("adopte les cartes d'une sauvegarde v8 sans effacer la séance locale v9", async () => {
    const seance = {
      day: "2026-03-01",
      verdicts: { "t-01": "deban" as const },
      claimed: false,
    };
    const local = saveWith({ tribunal: seance });
    const { store, api, applied } = harness({ signedIn: true, local });
    const serverCards = [
      serverCard("kaicenat", "legendary", "live", 31),
      serverCard("ibai", "epic", "holo", 32),
      serverCard("ninja", "rare", "standard", 33),
      serverCard("auronplay", "uncommon", "standard", 34),
      serverCard("rubius", "common", "standard", 35),
    ];
    const oldServerState = {
      ...local,
      version: 8,
      packs: 2,
      openings: 4,
      cards: serverCards,
    } as unknown as PlayerState;
    // Le format v8 ne connaissait pas le Tribunal, ajouté dans le format v9.
    delete (oldServerState as unknown as Record<string, unknown>).tribunal;
    api.openPack.mockResolvedValueOnce({
      packs: 2,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 4,
      cards: [
        { creatorSlug: "kaicenat", rarity: "legendary", variant: "live", rareDrop: false },
        { creatorSlug: "ibai", rarity: "epic", variant: "holo", rareDrop: false },
        { creatorSlug: "ninja", rarity: "rare", variant: "standard", rareDrop: false },
        { creatorSlug: "auronplay", rarity: "uncommon", variant: "standard", rareDrop: false },
        { creatorSlug: "rubius", rarity: "common", variant: "standard", rareDrop: false },
      ],
      save: remoteRow(oldServerState, SERVER_SAVE_AT),
    });

    const outcome = await store.openPack();

    expect(outcome.status).toBe("drawn");
    expect(applied.at(-1)?.version).toBe(SAVE_VERSION);
    expect(applied.at(-1)?.cards.map((entry) => entry.id)).toEqual(serverCards.map((entry) => entry.id));
    expect(applied.at(-1)?.tribunal).toEqual(seance);
    // Le serveur a déjà écrit les cartes : pas de ré-envoi de la collection.
    expect(api.pushSave).not.toHaveBeenCalled();
  });

  it("projet d'avant `0022` : le tirage est envoyé, mais jamais forcé", async () => {
    const { store, api } = harness({ signedIn: true });
    store.subscribe(() => {});
    api.openPack.mockResolvedValueOnce({
      packs: 2,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 4,
      cards: [
        { creatorSlug: "kaicenat", rarity: "legendary", variant: "live", rareDrop: false },
        { creatorSlug: "ibai", rarity: "epic", variant: "holo", rareDrop: false },
        { creatorSlug: "ninja", rarity: "rare", variant: "standard", rareDrop: false },
        { creatorSlug: "auronplay", rarity: "uncommon", variant: "standard", rareDrop: false },
        { creatorSlug: "rubius", rarity: "common", variant: "standard", rareDrop: false },
      ],
      save: null,
    });
    const outcome = await store.openPack();
    expect(outcome.status).toBe("drawn");
    expect(api.pushSave).toHaveBeenCalledTimes(1);
    // Le quatrième argument est `p_force` : `true` n'est réservé qu'au bouton
    // « Envoyer / écraser » de l'écran de conflit.
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
  });

  it("explique qu'il faut le serveur quand le réseau est coupé (pas de repli local)", async () => {
    const { store, api } = harness({ signedIn: true });
    store.subscribe(() => {});
    api.openPack.mockRejectedValueOnce(
      new CloudError("Réseau injoignable : vérifie ta connexion, ta partie locale est intacte.", "network_error", 0),
    );
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({
      status: "unavailable",
      reason: "offline",
      message: "Connecte-toi pour ouvrir un booster.",
    });
    expect(store.getSnapshot().isError).toBe(true);
    // Rien n'a été poussé : aucun tirage n'a eu lieu.
    expect(api.pushSave).not.toHaveBeenCalled();
  });

  it("réaligne la réserve quand le serveur refuse faute de booster", async () => {
    // Réserve locale désynchronisée (sablier, horloge) : le refus du serveur
    // doit corriger l'affichage tout de suite.
    const { store, api, applied } = harness({ signedIn: true, local: saveWith({ packs: 1 }) });
    store.subscribe(() => {});
    api.openPack.mockRejectedValueOnce(
      new CloudError("Aucun booster disponible pour le moment : rouvre quand le compte à rebours est fini.", "P0001", 400),
    );
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-packs" });
    expect(store.getSnapshot().isError).toBe(true);
    // La réserve est relue (sans rien consommer) pour corriger l'affichage.
    expect(api.packStatus).toHaveBeenCalled();
    expect(applied.at(-1)?.packs).toBe(3);
  });

  it("refuse sans session connectée", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-session" });
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
    expect(api.openPack).not.toHaveBeenCalled();
  });

  it("renvoie une raison dédiée quand le build n'a pas de cloud", async () => {
    const { store, api } = harness({ configured: false, signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.openPack();
    expect(outcome).toMatchObject({ status: "unavailable", reason: "not-configured" });
    expect(api.openPack).not.toHaveBeenCalled();
  });

  it("lit le statut de la réserve et l'adopte dans la partie locale", async () => {
    const { store, api, applied } = harness({
      signedIn: true,
      local: saveWith({ packs: 1, lastPackRegen: T0 - 3_600_000, points: 400 }),
    });
    store.subscribe(() => {});
    const status = await store.packStatus();
    expect(status).not.toBeNull();
    expect(status?.packs).toBe(3);
    expect(status?.nextPackAt).toBe("2026-03-01T10:30:00Z");
    expect(api.packStatus).toHaveBeenCalled();
    // La réserve et l'ancre du serveur remplacent les valeurs locales ;
    // points, XP et collection ne bougent pas.
    expect(applied.at(-1)?.packs).toBe(3);
    expect(applied.at(-1)?.lastPackRegen).toBe(T0);
    expect(applied.at(-1)?.points).toBe(400);
  });

  it("teste la connexion et annonce l'hôte joint", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    await expect(store.ping()).resolves.toBe(true);
    expect(api.ping).toHaveBeenCalled();
    const snapshot = store.getSnapshot();
    expect(snapshot.message).toContain("projet.supabase.co");
    expect(snapshot.isError).toBe(false);
  });

  it("dit que le projet est injoignable avec le nom d'hôte", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    api.ping.mockRejectedValueOnce(
      new CloudError(
        "Réseau injoignable : impossible de joindre projet.supabase.co/auth/v1/health. Vérifie ta connexion — ta partie locale est intacte.",
        "network_error",
        0,
      ),
    );
    await expect(store.ping()).resolves.toBe(false);
    expect(store.getSnapshot().message).toContain("projet.supabase.co/auth/v1/health");
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("renvoie null si le statut est indisponible", async () => {
    const { store, api } = harness({ signedIn: true });
    store.subscribe(() => {});
    api.packStatus.mockRejectedValueOnce(new Error("hors ligne"));
    const status = await store.packStatus();
    expect(status).toBeNull();
  });
});

/**
 * Le store s'abonne aux écritures du store de jeu (`onPersist`), qui est un
 * singleton de module. Les tests ne jouent pas une vraie partie : on passe par
 * le même chemin, `gameStore.replaceState`, avec un état factice. Le stockage
 * de l'appareil est absent en environnement Node, l'état reste en mémoire.
 */
function emitPersist(state: PlayerState) {
  gameStore.replaceState(state);
}

describe("échanges côté store", () => {
  const partnerId = "22222222-2222-4222-8222-222222222222";

  it("envoie la collection avant de proposer, puis annonce l'offre", async () => {
    const local = saveWith({ cards: [card("mine", "kaicenat")], updatedAt: T0 });
    const { store, api } = harness({ local });
    const outcome = await store.proposeTrade(
      partnerId,
      [{ creatorSlug: "kaicenat", variant: "standard" }],
      [{ creatorSlug: "ibai", variant: "gold" }],
    );

    expect(api.pushSave).toHaveBeenCalledTimes(1);
    // La sauvegarde part en mode « automatique » : si le cloud est plus récent,
    // l'offre est abandonnée plutôt que d'écraser la partie d'un autre appareil.
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
    expect(api.createTrade).toHaveBeenCalledWith(
      partnerId,
      [{ creatorSlug: "kaicenat", variant: "standard" }],
      [{ creatorSlug: "ibai", variant: "gold" }],
    );
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().message).toMatch(/Offre envoyée : KaiCenat/);
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("n'envoie pas l'offre quand la collection n'a pas pu être poussée", async () => {
    const local = saveWith({ cards: [card("mine", "kaicenat")], updatedAt: T0 });
    const { store, api } = harness({
      local,
      push: { status: "conflict", save: remoteRow(local, "2026-03-01T10:30:00Z") },
    });
    const outcome = await store.proposeTrade(partnerId, [{ creatorSlug: "kaicenat", variant: "standard" }], []);

    expect(api.createTrade).not.toHaveBeenCalled();
    expect(outcome.status).toBe("unavailable");
    // L'offre n'est pas partie : le message dit quoi faire (attendre que la
    // synchronisation passe), pas quel bouton d'infrastructure presser.
    expect(store.getSnapshot().message).toMatch(/doit d'abord être enregistrée en ligne/);
  });

  it("accepte un échange : applique les cartes localement puis pousse", async () => {
    const local = saveWith({ cards: [card("mine", "ibai")], updatedAt: T0 });
    const { store, api, applied, state } = harness({ local });
    const outcome = await store.respondTrade(5, true);

    expect(api.respondTrade).toHaveBeenCalledWith(5, true);
    expect(outcome.status).toBe("done");
    expect(applied.length).toBeGreaterThan(0);
    // La carte donnée est partie, celle reçue est entrée avec sa marque.
    expect(state.current.cards.map((owned) => owned.creatorSlug)).toEqual(["kaicenat"]);
    expect(state.current.cards[0]?.fromTrade).toBe(5);
    // Deux envois : la collection avant (pour que le serveur retire bien une
    // carte de cette partie), l'état post-échange après — et **jamais forcé** :
    // le serveur vient d'écrire, on relit sa version avant d'envoyer la nôtre.
    expect(api.pushSave).toHaveBeenCalledTimes(2);
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
    expect(api.pullSave).toHaveBeenCalled();
    expect(api.pushSave.mock.calls.at(-1)?.[3]).toBe(false);
    expect(store.getSnapshot().message).toMatch(/Échange accepté/);
  });

  it("n'accepte pas tant que la collection n'est pas à jour dans le cloud", async () => {
    const local = saveWith({ cards: [card("mine", "ibai")], updatedAt: T0 });
    const { store, api } = harness({
      local,
      push: { status: "conflict", save: remoteRow(local, "2026-03-01T10:30:00Z") },
    });
    const outcome = await store.respondTrade(5, true);

    expect(api.respondTrade).not.toHaveBeenCalled();
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/pas encore enregistrée en ligne/);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("refuse une offre sans toucher à la partie locale", async () => {
    const { store, api, applied } = harness();
    const outcome = await store.respondTrade(5, false);

    expect(api.respondTrade).toHaveBeenCalledWith(5, false);
    expect(applied).toEqual([]);
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().message).toMatch(/refusée/);
  });

  it("applique un échange accepté pendant l'absence de l'appareil", async () => {
    const local = saveWith({ cards: [card("mine", "ibai")], updatedAt: T0 });
    const { store, api, state } = harness({ local });
    api.listTrades.mockResolvedValue([
      tradeItem({ id: 8, direction: "in", given: [{ creatorSlug: "ibai", rarity: "legendary", variant: "standard" }], received: [{ creatorSlug: "kaicenat", rarity: "legendary", variant: "gold" }] }),
      tradeItem({ id: 9, status: "open", resolvedAt: null }),
    ]);

    await store.loadTrades();

    expect(store.getSnapshot().trades).toHaveLength(2);
    expect(state.current.cards.map((owned) => owned.creatorSlug)).toEqual(["kaicenat"]);
    expect(state.current.cards[0]?.fromTrade).toBe(8);
    expect(api.pushSave).toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/1 échange accepté/);
  });

  it("signale (sans la bricoler) une partie qui ne peut pas suivre un échange", async () => {
    const { store, api, state } = harness({ local: saveWith({ cards: [], updatedAt: T0 }) });
    api.listTrades.mockResolvedValue([tradeItem({ id: 8 })]);

    await store.loadTrades();

    expect(state.current.cards).toEqual([]);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/se recalera toute seule/);
  });

  it("annule une offre en attente", async () => {
    const { store, api } = harness();
    const outcome = await store.cancelTrade(5);

    expect(api.cancelTrade).toHaveBeenCalledWith(5);
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().message).toMatch(/annulée/);
  });

  it("cherche un partenaire et ses variantes", async () => {
    const { store, api } = harness();
    const search = await store.searchPlayers("Brun");
    expect(search.asked).toBe(true);
    expect(search.players[0]?.displayName).toBe("Bruno");
    expect(search.message).toBeNull();

    const variants = await store.playerVariants(partnerId, "ibai");
    expect(api.playerVariants).toHaveBeenCalledWith(partnerId, "ibai");
    expect(variants).toEqual({ variants: ["standard", "gold"], message: null });
  });

  it("dit quand la recherche ne trouve personne", async () => {
    const { store, api } = harness();
    api.searchPlayers.mockResolvedValue([]);
    const search = await store.searchPlayers("zzz");
    expect(search.message).toMatch(/Aucun joueur/);
    expect(search.isError).toBe(false);
  });

  it("refuse d'échanger sans compte, en expliquant quoi faire", async () => {
    const { store, api } = harness({ signedIn: false });
    const outcome = await store.proposeTrade(partnerId, [{ creatorSlug: "ibai", variant: "standard" }], []);

    expect(outcome.status).toBe("unavailable");
    expect(outcome.status === "unavailable" && outcome.reason).toBe("no-session");
    expect(api.createTrade).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/Connecte-toi pour échanger/);
  });

  it("refuse d'échanger quand le build n'a pas de cloud", async () => {
    const { store } = harness({ configured: false });
    const outcome = await store.cancelTrade(5);
    expect(outcome.status === "unavailable" && outcome.reason).toBe("not-configured");
    expect(store.getSnapshot().message).toMatch(/jouable hors ligne/);
  });

  it("remonte un refus du serveur tel quel", async () => {
    const { store, api } = harness();
    api.respondTrade.mockRejectedValue(new CloudError("tu ne possèdes plus ibai en gold", "P0001", 400));
    const outcome = await store.respondTrade(5, true);

    expect(outcome.status).toBe("unavailable");
    expect(outcome.status === "unavailable" && outcome.message).toMatch(/tu ne possèdes plus/);
    expect(store.getSnapshot().isError).toBe(true);
  });
});

describe("compte gardable (adresse + mot de passe)", () => {
  it("attache l'adresse et le mot de passe du compte invité", async () => {
    const { store, api } = harness();
    const outcome = await store.keepAccount({ email: "joueur@exemple.fr", password: "azerty1234" });

    expect(api.updateAccount).toHaveBeenCalledWith({ email: "joueur@exemple.fr", password: "azerty1234" });
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().email).toBe("joueur@exemple.fr");
    // Le message dit où se reconnecter, sans promettre d'e-mail.
    expect(store.getSnapshot().message).toMatch(/autre appareil/);
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("n'appelle pas le serveur si la saisie est mauvaise", async () => {
    const { store, api } = harness();
    const court = await store.keepAccount({ email: "joueur@exemple.fr", password: "court" });
    expect(court.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/trop court/);
    expect(api.updateAccount).not.toHaveBeenCalled();

    const adresse = await store.keepAccount({ email: "pas-une-adresse", password: "azerty1234" });
    expect(adresse.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/incomplète/);
    expect(api.updateAccount).not.toHaveBeenCalled();
  });

  it("explique quoi faire quand une confirmation par e-mail est demandée", async () => {
    const { store, api } = harness();
    api.updateAccount.mockResolvedValue({ applied: false, pendingEmail: "joueur@exemple.fr", email: null });

    const outcome = await store.keepAccount({ email: "joueur@exemple.fr", password: "azerty1234" });

    // Ni un succès ni une erreur : une étape reste à faire, et l'écran le sait
    // grâce à `pendingEmail`.
    expect(outcome.status).toBe("pending");
    expect(store.getSnapshot().pendingEmail).toBe("joueur@exemple.fr");
    expect(store.getSnapshot().message).toMatch(/code à 6 chiffres/);
    // L'issue praticable est nommée : un mot de passe ne demande aucun envoi.
    // Le réglage à changer, lui, n'a rien à faire à l'écran.
    expect(store.getSnapshot().message).toMatch(/mot de passe/);
    expect(store.getSnapshot().message).not.toMatch(/Confirm email|SMTP/i);
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("attache l'adresse seule : le code prend le relais", async () => {
    const { store, api } = harness();
    api.updateAccount.mockResolvedValue({ applied: false, pendingEmail: "joueur@exemple.fr", email: null });

    const outcome = await store.keepAccount({ email: "joueur@exemple.fr" });

    expect(api.updateAccount).toHaveBeenCalledWith({ email: "joueur@exemple.fr" });
    expect(outcome.status).toBe("pending");
    expect(store.getSnapshot().pendingEmail).toBe("joueur@exemple.fr");

    api.verifyEmailChange.mockResolvedValueOnce({ ...SESSION, email: "joueur@exemple.fr" });
    const done = await store.confirmEmailCode(" 123456 ");
    expect(api.verifyEmailChange).toHaveBeenCalledWith("joueur@exemple.fr", "123456");
    expect(done.status).toBe("done");
    expect(store.getSnapshot().email).toBe("joueur@exemple.fr");
    expect(store.getSnapshot().pendingEmail).toBeNull();
    expect(store.getSnapshot().message).toMatch(/confirmée/);
  });

  it("refuse un code qui n'a pas six chiffres, sans appeler le serveur", async () => {
    const { store, api } = harness();
    api.updateAccount.mockResolvedValue({ applied: false, pendingEmail: "joueur@exemple.fr", email: null });
    await store.keepAccount({ email: "joueur@exemple.fr" });

    const outcome = await store.confirmEmailCode("123");

    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/6 chiffres/);
    expect(api.verifyEmailChange).not.toHaveBeenCalled();
    // L'adresse reste en attente : on peut réessayer.
    expect(store.getSnapshot().pendingEmail).toBe("joueur@exemple.fr");
  });

  it("garde l'adresse en attente quand le code est refusé", async () => {
    const { store, api } = harness();
    api.updateAccount.mockResolvedValue({ applied: false, pendingEmail: "joueur@exemple.fr", email: null });
    await store.keepAccount({ email: "joueur@exemple.fr" });
    api.verifyEmailChange.mockRejectedValueOnce(new CloudError("Code incorrect ou expiré.", "otp_expired", 401));

    const outcome = await store.confirmEmailCode("000000");

    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/Code incorrect ou expiré/);
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().pendingEmail).toBe("joueur@exemple.fr");
  });

  it("redemande un code pour l'adresse en attente", async () => {
    const { store, api } = harness();
    api.updateAccount.mockResolvedValue({ applied: false, pendingEmail: "joueur@exemple.fr", email: null });
    await store.keepAccount({ email: "joueur@exemple.fr" });

    const outcome = await store.resendEmailCode();

    expect(api.resendEmailChange).toHaveBeenCalledWith("joueur@exemple.fr");
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().message).toMatch(/Nouveau code envoyé/);
  });

  it("ne laisse pas un compte invité sans adresse", async () => {
    const { store, api } = harness();
    const outcome = await store.keepAccount({ password: "azerty1234" });

    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/besoin d'une adresse/);
    expect(api.updateAccount).not.toHaveBeenCalled();
  });

  it("change le mot de passe seul quand l'adresse est déjà connue", async () => {
    const { store, api } = harness();
    // Un compte qui a déjà une adresse : c'est le cas de « Définir ou changer
    // mon mot de passe », où aucun e-mail ne doit repartir. Le premier
    // abonnement publie l'identité de la session (dont l'adresse).
    store.subscribe(() => {});
    expect(store.getSnapshot().email).toBe(SESSION.email);
    api.updateAccount.mockResolvedValue({ applied: true, pendingEmail: null, email: SESSION.email });
    const outcome = await store.keepAccount({ password: "azerty1234" });

    expect(api.updateAccount).toHaveBeenCalledWith({ password: "azerty1234" });
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().message).toMatch(/Mot de passe enregistré/);
  });

  it("refuse sans compte ou sans cloud", async () => {
    const sansCompte = harness({ signedIn: false });
    const first = await sansCompte.store.keepAccount({ email: "joueur@exemple.fr", password: "azerty1234" });
    expect(first.status === "unavailable" && first.reason).toBe("no-session");
    expect(sansCompte.api.updateAccount).not.toHaveBeenCalled();

    const sansCloud = harness({ configured: false });
    const second = await sansCloud.store.keepAccount({ email: "joueur@exemple.fr", password: "azerty1234" });
    expect(second.status === "unavailable" && second.reason).toBe("not-configured");
    expect(sansCloud.store.getSnapshot().message).toMatch(/jouable hors ligne/);
  });

  it("se connecte par mot de passe sur un autre appareil", async () => {
    const { store, api } = harness({ local: saveWith({ cards: [], openings: 0 }) });
    const ok = await store.signInWithPassword(" Joueur@exemple.fr ", "azerty1234");

    expect(ok).toBe(true);
    // L'adresse est nettoyée avant l'appel (espaces compris).
    expect(api.signInWithPassword).toHaveBeenCalledWith("Joueur@exemple.fr", "azerty1234");
    expect(store.getSnapshot().userId).toBe(SESSION.userId);
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("refuse une saisie incomplète sans appeler le serveur", async () => {
    const { store, api } = harness();
    expect(await store.signInWithPassword("", "azerty1234")).toBe(false);
    expect(store.getSnapshot().message).toMatch(/manquante/);
    expect(await store.signInWithPassword("joueur@exemple.fr", "")).toBe(false);
    expect(store.getSnapshot().message).toMatch(/manquant/);
    expect(api.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rapporte un mot de passe refusé", async () => {
    const { store, api } = harness();
    api.signInWithPassword.mockRejectedValue(new CloudError("E-mail ou mot de passe incorrect.", "invalid_grant", 400));
    expect(await store.signInWithPassword("joueur@exemple.fr", "oublie1234")).toBe(false);
    expect(store.getSnapshot().message).toMatch(/incorrect/);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("récupère la collection du cloud sur un téléphone vierge", async () => {
    // Partie locale toute neuve : aucune carte, aucune ouverture. Le compte a
    // déjà une collection : la reprendre ne peut rien casser.
    const cloudState = saveWith({ cards: [card("c1", "kaicenat"), card("c2", "ibai")] });
    const { store, api, state } = harness({
      local: saveWith({ cards: [], openings: 0 }),
      remote: remoteRow(cloudState, "2026-03-01T10:30:00Z"),
    });

    const ok = await store.signInWithPassword("joueur@exemple.fr", "azerty1234");

    expect(ok).toBe(true);
    expect(api.pullSave).toHaveBeenCalled();
    expect(state.current.cards).toHaveLength(2);
    expect(store.getSnapshot().message).toMatch(/2 cartes récupérées/);
    expect(store.getSnapshot().decision).toBe("pull");
  });

  it("ne remplace jamais une partie qui a déjà servi", async () => {
    const cloudState = saveWith({ cards: [card("c1", "kaicenat")] });
    const local = saveWith({ cards: [card("mine", "ibai")], openings: 4 });
    const { store, api, state } = harness({ local, remote: remoteRow(cloudState, "2026-03-01T10:30:00Z") });

    await store.signInWithPassword("joueur@exemple.fr", "azerty1234");

    expect(api.pullSave).not.toHaveBeenCalled();
    expect(state.current).toBe(local);
    expect(store.getSnapshot().message).toMatch(/gardée en ligne/);
  });
});

describe("fiche publique d'un joueur", () => {
  it("charge la fiche et laisse le serveur calculer les chiffres", async () => {
    const { store, api } = harness();

    await store.openProfile("u2");

    expect(api.playerProfile).toHaveBeenCalledWith("u2");
    const cloud = store.getSnapshot();
    expect(cloud.profile?.displayName).toBe("Diane");
    expect(cloud.profile?.completion).toBeCloseTo(0.137);
    expect(cloud.profileBusy).toBe(false);
    expect(cloud.isError).toBe(false);
  });

  it("dit simplement quand le joueur n'a jamais envoyé sa partie", async () => {
    const { store, api } = harness();
    api.playerProfile.mockResolvedValueOnce(null);

    await store.openProfile("u3");

    expect(store.getSnapshot().profile).toBeNull();
    expect(store.getSnapshot().message).toMatch(/pas encore de progression en ligne/);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("ferme la fiche sans rien garder", async () => {
    const { store } = harness();
    await store.openProfile("u2");
    store.closeProfile();

    expect(store.getSnapshot().profile).toBeNull();
    expect(store.getSnapshot().profileBusy).toBe(false);
  });

  it("explique un build sans cloud au lieu d'afficher une fiche vide", async () => {
    const { store, api } = harness({ configured: false });

    await store.openProfile("u2");

    expect(api.playerProfile).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toBeTruthy();
    expect(store.getSnapshot().profile).toBeNull();
  });

  it("ne casse rien hors ligne : la fiche reste fermée avec une explication", async () => {
    const { store, api } = harness();
    api.playerProfile.mockRejectedValueOnce(new CloudError("Réseau injoignable.", "network", 0));

    await store.openProfile("u2");

    expect(store.getSnapshot().profile).toBeNull();
    expect(store.getSnapshot().profileBusy).toBe(false);
    expect(store.getSnapshot().isError).toBe(true);
  });

  it("oublie la fiche à la déconnexion", async () => {
    const { store } = harness();
    await store.openProfile("u2");
    await store.signOut();

    expect(store.getSnapshot().profile).toBeNull();
  });
});

describe("hôtel des ventes", () => {
  it("charge le comptoir dans l'état cloud", async () => {
    const { store, api } = harness();
    await store.loadMarket();
    expect(api.marketShelf).toHaveBeenCalled();
    expect(store.getSnapshot().market).toHaveLength(1);
    expect(store.getSnapshot().market[0]?.sellerName).toBe("Diane");
    expect(store.getSnapshot().marketAt).toBe(T0 + 60_000);
  });

  it("ne charge rien sans compte", async () => {
    const { store, api } = harness({ signedIn: false });
    await store.loadMarket();
    expect(api.marketShelf).not.toHaveBeenCalled();
  });

  it("garde une liste lisible si le serveur répond n'importe quoi", async () => {
    const { store, api } = harness();
    (api.marketShelf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([] as MarketListing[]);
    await store.loadMarket();
    expect(store.getSnapshot().market).toEqual([]);
  });

  it("dépose un doublon : la carte part de la partie locale, les points entrent", async () => {
    const local = saveWith({
      cards: [card("a1", "ibai"), card("a2", "ibai")],
      points: 100,
      updatedAt: T0,
    });
    const { store, api, state } = harness({ local });
    const outcome = await store.sellCard("a1");

    expect(api.marketSell).toHaveBeenCalledWith("a1");
    expect(outcome.status).toBe("done");
    expect(state.current.cards.map((owned) => owned.id)).toEqual(["a2"]);
    expect(state.current.points).toBe(2_100);
    // La collection est envoyée avant (le serveur retire la carte de *cette*
    // partie), puis l'état d'après — sans forçage : le serveur a déjà écrit sa
    // ligne, on relit sa version d'abord.
    expect(api.pushSave).toHaveBeenCalledTimes(2);
    expect(api.pushSave.mock.calls[0]?.[3]).toBe(false);
    expect(api.pullSave).toHaveBeenCalled();
    expect(api.pushSave.mock.calls.at(-1)?.[3]).toBe(false);
    expect(store.getSnapshot().message).toMatch(/\+2000 points/);
  });

  it("n'envoie rien au serveur tant que la collection du cloud n'est pas à jour", async () => {
    const local = saveWith({ cards: [card("a1", "ibai"), card("a2", "ibai")], updatedAt: T0 });
    const { store, api } = harness({
      local,
      push: { status: "conflict", save: remoteRow(local, "2026-03-01T10:30:00Z") },
    });
    const outcome = await store.sellCard("a1");
    expect(api.marketSell).not.toHaveBeenCalled();
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/pas encore enregistrée en ligne/);
  });

  it("ne retire pas une carte que la partie locale n'a plus", async () => {
    const local = saveWith({ cards: [], updatedAt: T0 });
    const { store, api } = harness({ local });
    const outcome = await store.sellCard("a1");
    // Le serveur a répondu, mais l'application locale est impossible : on le dit
    // plutôt que de pousser une collection fausse.
    expect(api.marketSell).toHaveBeenCalled();
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/plus dans ta collection/i);
  });

  it("déplace un refus du serveur sans toucher à la partie", async () => {
    const local = saveWith({ cards: [card("a1", "ibai"), card("a2", "ibai")], updatedAt: T0 });
    const { store, api, state } = harness({ local });
    (api.marketSell as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("c'est ta seule copie de cette carte", "P0001", 400),
    );
    const outcome = await store.sellCard("a1");
    expect(outcome).toEqual({ status: "unavailable", message: "c'est ta seule copie de cette carte", reason: "error" });
    expect(state.current.cards).toHaveLength(2);
  });

  it("achète une carte : elle entre dans la partie locale avec sa marque", async () => {
    const local = saveWith({ cards: [], points: 5_000, updatedAt: T0 });
    const { store, api, state } = harness({ local });
    const outcome = await store.buyCard(LISTING.id);

    expect(api.marketBuy).toHaveBeenCalledWith(LISTING.id);
    expect(outcome.status).toBe("done");
    expect(state.current.points).toBe(2_000);
    expect(state.current.cards[0]).toMatchObject({ id: "neuve", fromMarket: LISTING.id, rareDrop: false });
    expect(store.getSnapshot().message).toMatch(/rejoint ton classeur/);
  });

  it("n'applique pas deux fois la même réponse d'achat", async () => {
    const local = saveWith({ cards: [], points: 5_000, updatedAt: T0 });
    const { store, state } = harness({ local });
    await store.buyCard(LISTING.id);
    const cout = state.current.points;
    // Deuxième tentative : le serveur refuserait (annonce déjà vendue) ; si sa
    // réponse arrivait malgré tout, `fromMarket` empêche le doublon — la carte
    // n'est pas ajoutée et les points ne sont pas débités une deuxième fois.
    await store.buyCard(LISTING.id);
    expect(state.current.cards).toHaveLength(1);
    expect(state.current.points).toBe(cout);
  });

  it("garde le message de l'hôtel quand les points manquent", async () => {
    const local = saveWith({ cards: [], points: 10, updatedAt: T0 });
    const { store, api, state } = harness({ local });
    (api.marketBuy as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("hotel : il te manque 2990 points", "P0001", 400),
    );
    const outcome = await store.buyCard(LISTING.id);
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toBe("hotel : il te manque 2990 points");
    expect(state.current.points).toBe(10);
  });

  it("charge la vitrine avec la fiche publique", async () => {
    const { store, api } = harness();
    await store.openProfile("u2");
    expect(api.marketListingsOf).toHaveBeenCalledWith("u2");
    expect(store.getSnapshot().profile?.displayName).toBe("Diane");
    expect(store.getSnapshot().profileMarket).toHaveLength(1);
    store.closeProfile();
    expect(store.getSnapshot().profileMarket).toEqual([]);
  });

  it("affiche la fiche même si la vitrine refuse", async () => {
    const { store, api } = harness();
    (api.marketListingsOf as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("la fonction n'existe pas encore", "PGRST202", 404),
    );
    await store.openProfile("u2");
    expect(store.getSnapshot().profile?.displayName).toBe("Diane");
    expect(store.getSnapshot().profileMarket).toEqual([]);
  });

  it("vide l'écran de l'hôtel à la déconnexion", async () => {
    const { store } = harness();
    await store.loadMarket();
    expect(store.getSnapshot().market).toHaveLength(1);
    await store.signOut();
    expect(store.getSnapshot().market).toEqual([]);
    expect(store.getSnapshot().marketAt).toBeNull();
  });
});

describe("connexion Twitch", () => {
  it("donne l'adresse à ouvrir, sans naviguer lui-même", () => {
    const { store, api } = harness();
    const url = store.twitchSignInUrl("com.creatordeck.app://auth");
    expect(api.twitchAuthorizeUrl).toHaveBeenCalledWith("com.creatordeck.app://auth");
    expect(url).toContain("provider=twitch");
  });

  it("ne propose rien quand le cloud n'est pas configuré", () => {
    const { store, api } = harness({ configured: false });
    expect(store.twitchSignInUrl("https://exemple.fr/")).toBeNull();
    expect(api.twitchAuthorizeUrl).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/hors ligne/);
  });

  it("installe la session au retour et relit l'identité", async () => {
    const { store, api } = harness();
    const outcome = await store.completeTwitchSignIn(
      "com.creatordeck.app://auth#access_token=aaa&refresh_token=rrr&expires_in=3600&token_type=bearer",
    );
    expect(api.adoptSession).toHaveBeenCalledWith({ accessToken: "aaa", refreshToken: "rrr", expiresIn: 3600 });
    expect(outcome.status).toBe("done");
    expect(store.getSnapshot().userId).toBe(SESSION.userId);
    expect(store.getSnapshot().displayName).toBe("Kaicenat");
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("transmet le refus de Twitch, en clair", async () => {
    const { store, api } = harness();
    const outcome = await store.completeTwitchSignIn(
      "https://creatordeck.example/#error=access_denied&error_description=The%20user%20denied%20you%20access",
    );
    expect(outcome.status).toBe("unavailable");
    expect(api.adoptSession).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/n'a pas donné son accord : The user denied you access/);
  });

  it("ne fait rien d'une adresse qui n'est pas un retour de connexion", async () => {
    const { store, api } = harness();
    // Le lien de partage d'une fiche : rien à installer, rien à afficher.
    expect(await store.completeTwitchSignIn("https://creatordeck.example/?profil=abc")).toEqual({ status: "none" });
    expect(api.adoptSession).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toBeNull();
  });

  it("dit clairement quand le compte n'a pas pu être ouvert", async () => {
    const { store, api } = harness();
    (api.adoptSession as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("Connexion Twitch acceptée, mais le compte n'a pas pu être ouvert. Réessaie depuis l'écran Compte.", "oauth_user_failed", 401),
    );
    const outcome = await store.completeTwitchSignIn("https://a.example/#access_token=aaa&refresh_token=rrr&expires_in=60");
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/compte n'a pas pu être ouvert/);
  });
});

/**
 * Vide l'étagère du faux API. Le carnet lit maintenant les paquets des amis
 * (« X a ouvert Kameto ») : les tests qui comptent des lignes précises doivent
 * donc dire s'ils parlent d'un paquet d'ami ou non, au lieu de dépendre du
 * contenu de `LAST_PACK`.
 */
function emptyShelf(api: FakeApi): void {
  (api.lastPackShelf as ReturnType<typeof vi.fn>).mockResolvedValue({
    now: SERVER_NOW,
    windowMinutes: 10,
    stealPerDay: 1,
    stoleToday: false,
    packs: [],
  });
}

describe("le carnet de notifications", () => {
  it("reprend les faits du serveur, en français", async () => {
    const { store, api } = harness();
    emptyShelf(api);
    (api.listTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      tradeItem({ direction: "out", status: "accepted", resolvedAt: "2026-03-01T10:30:00Z" }),
    ]);
    await store.loadInbox();
    expect(store.getSnapshot().inbox).toHaveLength(1);
    expect(store.getSnapshot().inbox[0]?.title).toBe("Bruno a accepté ton offre");
  });

  it("compte les nouveautés, puis les oublie quand on ouvre le carnet", async () => {
    const { store, api } = harness();
    emptyShelf(api);
    (api.listTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([tradeItem()]);
    await store.loadInbox();
    // Jamais ouvert : tout est nouveau.
    expect(store.getSnapshot().inboxUnread).toBe(1);

    store.markInboxSeen();
    expect(store.getSnapshot().inboxUnread).toBe(0);

    // Un fait plus récent que la visite rallume la pastille.
    (api.listTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      tradeItem({ id: 9, createdAt: "2026-03-01T11:00:00Z" }),
    ]);
    await store.loadInbox();
    expect(store.getSnapshot().inboxUnread).toBe(1);
  });

  it("tire « X a ouvert … » de l'étagère du serveur", async () => {
    const { store } = harness();
    await store.loadInbox();
    const friend = store.getSnapshot().inbox.find((item) => item.kind === "friend_pack");
    expect(friend?.title).toMatch(/a ouvert/);
    expect(friend?.body).toMatch(/Last Pack encore \d+ min/);
  });

  it("garde une visite par joueur", async () => {
    const { store, device } = harness();
    store.markInboxSeen();
    expect(device.getItem("creatordeck.inbox.seen." + SESSION.userId)).not.toBeNull();
  });

  it("ajoute les ventes quand le serveur les connaît", async () => {
    const { store, api } = harness();
    (api.marketSales as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 7, creatorSlug: "ibai", price: 600, soldAt: "2026-03-01T10:00:00Z", buyerName: "Diane" },
    ]);
    await store.loadInbox();
    expect(store.getSnapshot().inbox[0]?.kind).toBe("sale");
    expect(store.getSnapshot().inbox[0]?.body).toBe("Diane l'a achetée pour 600 points.");
  });

  it("vit très bien sans la fonction des ventes", async () => {
    const { store, api } = harness();
    emptyShelf(api);
    (api.marketSales as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("function public.market_sales(integer) does not exist", "PGRST202", 404),
    );
    (api.listIncomingFriendRequests as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 4, senderId: "u3", senderName: "Chloé", createdAt: "2026-03-01T10:00:00Z" },
    ]);
    await store.loadInbox();
    expect(store.getSnapshot().inbox).toHaveLength(1);
    expect(store.getSnapshot().inbox[0]?.kind).toBe("friend_request");
  });

  it("vide le carnet à la déconnexion", async () => {
    const { store, api } = harness();
    emptyShelf(api);
    (api.listTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([tradeItem()]);
    await store.loadInbox();
    expect(store.getSnapshot().inbox).toHaveLength(1);
    await store.signOut();
    expect(store.getSnapshot().inbox).toEqual([]);
    expect(store.getSnapshot().inboxUnread).toBe(0);
  });

  it("ne charge rien sans compte", async () => {
    const { store, api } = harness({ signedIn: false });
    await store.loadInbox();
    expect(api.listTrades).not.toHaveBeenCalled();
  });
});

describe("le Last Pack", () => {
  it("charge l'étagère telle que le serveur la donne", async () => {
    const { store, api } = harness();
    await store.loadLastPacks();
    expect(api.lastPackShelf).toHaveBeenCalled();
    expect(store.getSnapshot().lastPacks?.packs).toHaveLength(1);
    expect(store.getSnapshot().lastPacks?.packs[0]?.ownerName).toBe("Lou");
    expect(store.getSnapshot().lastPacksAt).not.toBeNull();
  });

  it("vole une carte : elle entre dans la partie locale avec sa marque", async () => {
    const local = saveWith({ cards: [], updatedAt: T0 });
    const { store, api, state } = harness({ local });
    const outcome = await store.stealLastPack(LAST_PACK.id, 3);

    expect(api.lastPackSteal).toHaveBeenCalledWith(LAST_PACK.id, 3);
    expect(outcome.status).toBe("done");
    expect(state.current.cards).toHaveLength(1);
    expect(state.current.cards[0]).toMatchObject({
      id: "prise",
      creatorSlug: "kaicenat",
      fromLastPack: LAST_PACK.id,
    });
    expect(store.getSnapshot().message).toMatch(/te revient de chez Lou/);
  });

  it("n'ajoute pas deux fois la même carte volée", async () => {
    const local = saveWith({ cards: [], updatedAt: T0 });
    const { store, state } = harness({ local });
    await store.stealLastPack(LAST_PACK.id, 3);
    // Le serveur refuserait un deuxième vol le même jour ; si sa réponse
    // arrivait quand même, la marque de la carte empêche le doublon.
    await store.stealLastPack(LAST_PACK.id, 3);
    expect(state.current.cards).toHaveLength(1);
  });

  it("garde le refus du serveur (déjà volé aujourd'hui) sans toucher à la partie", async () => {
    const local = saveWith({ cards: [], updatedAt: T0 });
    const { store, api, state } = harness({ local });
    (api.lastPackSteal as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("vol : une carte par jour — la tienne est déjà prise", "P0001", 400),
    );
    const outcome = await store.stealLastPack(LAST_PACK.id, 1);
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/une carte par jour/);
    expect(state.current.cards).toHaveLength(0);
  });

  it("met les vols subis dans le carnet", async () => {
    const { store, api } = harness();
    (api.lastPackLosses as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 9,
        thiefName: "Lou",
        packId: LAST_PACK.id,
        card: { creatorSlug: "kaicenat", rarity: "legendary", variant: "live" },
        stolenAt: "2026-03-01T10:05:00Z",
      },
    ] satisfies LastPackLoss[]);
    await store.loadInbox();
    const ligne = store.getSnapshot().inbox.find((item) => item.kind === "last_pack");
    expect(ligne?.title).toBe("Lou t'a piqué ton légendaire");
  });
});

describe("la wishlist", () => {
  it("charge l'épinglé du compte connecté", async () => {
    const { store, api } = harness();
    (api.wishlistSlug as ReturnType<typeof vi.fn>).mockResolvedValue("kamet0");
    await store.loadWishlist();
    expect(store.getSnapshot().wishlistSlug).toBe("kamet0");
  });

  it("reste silencieuse quand la migration n'est pas collée", async () => {
    const { store, api } = harness();
    (api.wishlistSlug as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("La wishlist n'est pas installée sur ce projet.", "PGRST202", 404),
    );
    await store.loadWishlist();
    // Pas de message d'erreur : la wishlist est un confort, pas un préalable.
    expect(store.getSnapshot().wishlistSlug).toBeNull();
    expect(store.getSnapshot().message).toBeNull();
  });

  it("épingle, et retient le slug que le serveur a gardé", async () => {
    const { store, api } = harness();
    (api.setWishlist as ReturnType<typeof vi.fn>).mockResolvedValue("kamet0");
    const saved = await store.setWishlist("Kamet0");
    expect(saved).toBe(true);
    expect(api.setWishlist).toHaveBeenCalledWith("Kamet0");
    expect(store.getSnapshot().wishlistSlug).toBe("kamet0");
    expect(store.getSnapshot().wishlistBusy).toBe(false);
    expect(store.getSnapshot().message).toMatch(/épinglé/);
    expect(store.getSnapshot().isError).toBe(false);
  });

  it("affiche le refus du serveur tel quel", async () => {
    const { store, api } = harness();
    (api.setWishlist as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CloudError("wishlist : ce créateur n'est pas au catalogue", "P0001", 400),
    );
    expect(await store.setWishlist("inconnu")).toBe(false);
    expect(store.getSnapshot().wishlistSlug).toBeNull();
    expect(store.getSnapshot().isError).toBe(true);
    expect(store.getSnapshot().message).toMatch(/pas au catalogue/);
  });

  it("retire l'épinglé", async () => {
    const { store, api } = harness();
    (api.wishlistSlug as ReturnType<typeof vi.fn>).mockResolvedValue("kamet0");
    await store.loadWishlist();
    expect(await store.clearWishlist()).toBe(true);
    expect(store.getSnapshot().wishlistSlug).toBeNull();
    expect(store.getSnapshot().message).toMatch(/retiré/);
  });

  it("ne tente rien sans compte, et le dit", async () => {
    const { store, api } = harness({ signedIn: false });
    expect(await store.setWishlist("kamet0")).toBe(false);
    expect(api.setWishlist).not.toHaveBeenCalled();
    expect(store.getSnapshot().isError).toBe(true);
  });
});

describe("l'arène", () => {
  it("charge l'arène : mon dépôt et le classement d'un seul coup", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await store.loadArena();
    expect(api.arenaMe).toHaveBeenCalledTimes(1);
    expect(api.arenaLeaderboard).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().arenaMine?.entry?.score).toBe(4120);
    expect(store.getSnapshot().arenaMine?.rank).toBe(2);
    expect(store.getSnapshot().arena?.rows[0]?.rank).toBe(2);
    expect(store.getSnapshot().arenaBusy).toBe(false);
  });

  it("dépose une arène et raconte le verdict du serveur", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    const result = await store.submitArena(["kaicenat", "ibai", "ninja", "rubius", "auronplay"]);
    expect(api.arenaSubmit).toHaveBeenCalledWith(["kaicenat", "ibai", "ninja", "rubius", "auronplay"]);
    expect(result.status).toBe("done");
    expect(result.message).toMatch(/4120 viewers/);
    // Le classement se recharge après un dépôt : le rang a bougé.
    expect(api.arenaLeaderboard).toHaveBeenCalled();
  });

  it("dit quand une arène n'a pas amélioré la semaine", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    api.arenaSubmit.mockResolvedValueOnce({
      week: "2026-02-23",
      score: 900,
      liveCount: 1,
      best: 4120,
      kept: true,
    });
    const result = await store.submitArena(["ibai", "ninja", "rubius", "auronplay", "kaicenat"]);
    expect(result.message).toMatch(/tu avais déjà fait mieux/);
  });

  it("encaisse une récompense d'arène : les sabliers arrivent dans la partie", async () => {
    const { store, applied, state } = harness({ local: saveWith({ hourglasses: 12 }) });
    store.subscribe(() => {});
    const result = await store.claimArena("2026-02-16");
    expect(result.status).toBe("done");
    expect(result.message).toMatch(/encaissé/);
    expect(applied).toHaveLength(1);
    expect(state.current.hourglasses).toBe(17);
    // Encaisser repousse la partie : le serveur garde la collection, l'appareil
    // garde la monnaie — mais le fait d'avoir encaissé est enregistré.
    expect(store.getSnapshot().decision !== null || applied.length === 1).toBe(true);
  });

  it("n'ajoute rien quand la semaine a déjà été encaissée", async () => {
    const { store, api, applied } = harness({ local: saveWith({ hourglasses: 12 }) });
    store.subscribe(() => {});
    api.arenaClaim.mockResolvedValueOnce({
      week: "2026-02-16",
      alreadyClaimed: true,
      rank: 1,
      hourglasses: 0,
      emblem: true,
    });
    const result = await store.claimArena("2026-02-16");
    expect(result.message).toMatch(/déjà été encaissée/);
    expect(applied).toHaveLength(0);
  });

  it("refuse tout sans compte, et le dit", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    const result = await store.submitArena(["kaicenat"]);
    expect(result.status).toBe("unavailable");
    expect(api.arenaSubmit).not.toHaveBeenCalled();
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
  });

  it("charge les propositions du draft, et laisse tout vide hors du week-end", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    await store.loadDraftSlots();
    expect(api.arenaDraftChoices).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().arenaDraftSlots).toHaveLength(5);
    expect(store.getSnapshot().arenaDraftBusy).toBe(false);

    // Hors du week-end, le serveur refuse : ce n'est pas une erreur à montrer,
    // c'est la règle — l'écran affiche « ça ouvre samedi ».
    api.arenaDraftChoices.mockRejectedValueOnce(new Error("le draft, c'est le week-end"));
    await store.loadDraftSlots();
    expect(store.getSnapshot().arenaDraftSlots).toBeNull();
  });

});

describe("les codes promo", () => {
  it("un code accepté remonte tout de suite dans la partie locale", async () => {
    const { store, api, state } = harness();
    store.subscribe(() => {});
    // Le serveur a écrit le booster : sa réserve est passée de 3 à 4, et c'est
    // ce que `pack_status()` répond juste après.
    api.packStatus.mockResolvedValueOnce({
      packs: 4,
      lastRegenAt: "2026-03-01T10:00:00Z",
      openings: 3,
      nextPackAt: null,
      pity: 0,
      streak: 0,
      jackpotReady: false,
      sceneDay: null,
      sceneReady: false,
    });
    const outcome = await store.redeemPromoCode("booster-2026");
    expect(api.redeemPromoCode).toHaveBeenCalledWith("booster-2026");
    // Le magasin relit la réserve au lieu de l'additionner : c'est le serveur
    // qui fait foi, et le compteur de l'accueil affiche le bon total même si
    // une autre rédemption est passée entre-temps sur un autre appareil.
    expect(api.packStatus).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ status: "done", message: "Code accepté : un booster t'attend." });
    expect(store.getSnapshot().isError).toBe(false);
    expect(state.current.packs).toBe(4);
  });

  it("affiche le refus du serveur tel quel, sans rien relire", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    api.redeemPromoCode.mockRejectedValueOnce(
      new CloudError(
        "code promo : ta réserve est pleine (4 boosters sur 4) : ouvre un booster, puis retape ce code",
        "P0001",
        400,
      ),
    );
    const outcome = await store.redeemPromoCode("BOOSTER-2026");
    expect(outcome.status).toBe("unavailable");
    // La phrase du serveur dit quoi faire : on la reprend sans la réécrire.
    expect(store.getSnapshot().message).toMatch(/ouvre un booster, puis retape ce code/);
    expect(store.getSnapshot().isError).toBe(true);
    // Rien n'a bougé côté serveur : inutile de relire la réserve.
    expect(api.packStatus).not.toHaveBeenCalled();
  });

  it("n'appelle personne sans compte, et refuse le champ vide sans réseau", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.redeemPromoCode("BOOSTER-2026");
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-session" });
    expect(store.getSnapshot().message).toBe("Connecte-toi pour utiliser un code.");
    expect(api.redeemPromoCode).not.toHaveBeenCalled();

    const { store: autre, api: autreApi } = harness();
    autre.subscribe(() => {});
    const vide = await autre.redeemPromoCode("   ");
    expect(vide).toMatchObject({ status: "unavailable", reason: "error" });
    expect(autreApi.redeemPromoCode).not.toHaveBeenCalled();
    expect(autre.getSnapshot().message).toBe("Tape un code, puis valide.");
  });
});

describe("les points au serveur (wallet)", () => {
  it("adopte le solde du serveur, même quand la sauvegarde dit autre chose", async () => {
    // Le cas réel : une sauvegarde bricolée à 999 999 points. Le serveur, lui,
    // dit 45 — et c'est lui qui fait foi.
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 999_999 }) });
    store.subscribe(() => {});
    api.walletGet.mockResolvedValueOnce(45); // le serveur, lui, dit 45
    await store.syncWallet();
    expect(api.walletGet).toHaveBeenCalledTimes(1);
    expect(state.current.points).toBe(45);
  });

  it("recycle un doublon : le serveur paie, le moteur range, le solde du serveur reste", async () => {
    const card = { id: "doublon-1", creatorSlug: "kaicenat", rarity: "rare" as const, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
    const { store, api, state } = harness({
      local: saveWith({ updatedAt: T0, points: 0, cards: [card, { ...card, id: "doublon-2" }] }),
    });
    store.subscribe(() => {});
    api.walletCredit.mockResolvedValueOnce({ delta: 55, points: 55 });
    const outcome = await store.recycleDoublon("doublon-1");
    // On envoie **la carte**, jamais sa rareté : le serveur relit la sienne dans
    // la sauvegarde du cloud et prend le prix au catalogue.
    expect(api.walletCredit).toHaveBeenCalledWith("recycle", "doublon-1");
    expect(outcome).toEqual({ status: "done", message: "Doublon recyclé : +55 points.", delta: 55 });
    // La carte est partie **et** le solde affiché est celui du serveur : le
    // traitement local (+55) puis l'adoption ne se cumulent pas.
    expect(state.current.cards).toHaveLength(1);
    expect(state.current.points).toBe(55);
  });

  it("ne débite rien quand le serveur refuse de payer un artisanat", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 600 }) });
    store.subscribe(() => {});
    api.walletSpend.mockRejectedValueOnce(new CloudError("solde : il te manque des points pour ce mouvement", "P0001", 400));
    const outcome = await store.craftWithPoints("kaicenat");
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/il te manque des points/);
    // Rien n'a été rangé, rien n'a été débité : le créateur n'est pas arrivé.
    expect(state.current.cards).toHaveLength(0);
    expect(state.current.points).toBe(600);
  });

  it("reste d'accord avec le serveur quand un palier était déjà payé", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 45, openings: 3 }) });
    store.subscribe(() => {});
    api.walletCredit.mockResolvedValueOnce({ delta: 0, points: 45 });
    const outcome = await store.claimMilestone("first");
    expect(api.walletCredit).toHaveBeenCalledWith("milestone", "first");
    // `delta: 0` remonte jusqu'à l'écran : c'est ce qui l'empêche d'annoncer
    // des points que le serveur n'a pas versés.
    expect(outcome).toEqual({ status: "done", message: "Ce palier était déjà payé.", delta: 0 });
    // Le moteur local a bien marqué le palier, mais le solde ne bouge pas :
    // c'est le serveur qui décide, et il n'a rien versé.
    expect(state.current.points).toBe(45);
  });

  it("paie deux doublons de la même rareté, parce que ce sont deux cartes", async () => {
    // Trois copies : après le premier recyclage il en reste deux, donc le second
    // est encore un doublon (c'est la règle du moteur : jamais la dernière).
    const carte = { id: "rare-1", creatorSlug: "kaicenat", rarity: "rare" as const, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
    const { store, api } = harness({
      local: saveWith({ updatedAt: T0, points: 0, cards: [carte, { ...carte, id: "rare-2" }, { ...carte, id: "rare-3" }] }),
    });
    store.subscribe(() => {});
    api.walletCredit
      .mockResolvedValueOnce({ delta: 55, points: 55 })
      .mockResolvedValueOnce({ delta: 55, points: 110 });
    const premier = await store.recycleDoublon("rare-1");
    const second = await store.recycleDoublon("rare-2");
    expect(premier).toMatchObject({ status: "done", delta: 55 });
    // Deux appels, deux cartes : c'est la carte qui est unique, pas la rareté.
    // (La version d'avant envoyait « rare » et la seconde était payée zéro :
    // le joueur perdait un doublon pour rien.)
    expect(api.walletCredit.mock.calls.map((call) => call[1])).toEqual(["rare-1", "rare-2"]);
    expect(second).toMatchObject({ status: "done", delta: 55 });
  });

  it("ne retire pas la carte quand le serveur refuse le recyclage", async () => {
    const carte = { id: "rare-1", creatorSlug: "kaicenat", rarity: "rare" as const, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
    const { store, api, state } = harness({
      local: saveWith({ updatedAt: T0, points: 45, cards: [carte, { ...carte, id: "rare-2" }] }),
    });
    store.subscribe(() => {});
    api.walletCredit.mockRejectedValueOnce(
      new CloudError("solde : cette carte n'est pas dans ta collection", "P0001", 400),
    );
    const outcome = await store.recycleDoublon("rare-1");
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/n'est pas dans ta collection/);
    // La carte est toujours là : un refus ne fait rien perdre.
    expect(state.current.cards).toHaveLength(2);
  });

  it("réclame une famille un palier à la fois, et dit ce que le serveur a payé", async () => {
    // La plus petite famille du catalogue (deux créateurs, deux paliers) : le
    // premier palier est atteint avec un seul créateur.
    const saison = SEASONS.reduce((smallest, entry) =>
      entry.slugs.length < smallest.slugs.length ? entry : smallest,
    );
    const { store, api } = harness({
      local: saveWith({
        updatedAt: T0,
        points: 45,
        cards: [
          {
            id: "c1",
            creatorSlug: saison.slugs[0],
            rarity: "common" as const,
            variant: "standard" as const,
            obtainedAt: T0,
            rareDrop: false,
          },
        ],
      }),
    });
    store.subscribe(() => {});
    api.walletCredit.mockResolvedValue({ delta: 1, points: 46 });

    const outcome = await store.claimSeason(saison.id);
    // Un appel par palier débloqué, avec un **repère** : le serveur relit le
    // seuil et le montant dans sa grille, il ne reçoit jamais un prix.
    expect(api.walletCredit.mock.calls).toEqual([["season", `${saison.id}#1`]]);
    expect(outcome).toMatchObject({ status: "done", delta: 1 });
  });

  it("ne demande rien pour une famille dont aucun palier n'est débloqué", async () => {
    const saison = SEASONS.reduce((smallest, entry) =>
      entry.slugs.length < smallest.slugs.length ? entry : smallest,
    );
    // Le plus petit palier exige au moins un créateur : une collection vide ne
    // peut rien réclamer, et l'appareil ne doit pas appeler le serveur pour ça.
    const { store, api } = harness({ local: saveWith({ updatedAt: T0, cards: [] }) });
    store.subscribe(() => {});
    const outcome = await store.claimSeason(saison.id);
    expect(outcome.status).toBe("unavailable");
    expect(api.walletCredit).not.toHaveBeenCalled();
  });

  it("refuse sans compte, sans rien demander au serveur", async () => {
    const { store, api } = harness({ signedIn: false });
    store.subscribe(() => {});
    const outcome = await store.claimSeason("S01");
    expect(outcome).toMatchObject({ status: "unavailable", reason: "no-session" });
    expect(store.getSnapshot().message).toMatch(/Connecte-toi/);
    expect(api.walletCredit).not.toHaveBeenCalled();
    expect(api.walletSpend).not.toHaveBeenCalled();
  });

  it("reste silencieux quand le solde n'est pas joignable", async () => {
    const { store, api, state } = harness();
    store.subscribe(() => {});
    const avant = state.current.points;
    api.walletGet.mockRejectedValueOnce(new Error("réseau"));
    const points = await store.syncWallet();
    expect(points).toBeNull();
    // On garde ce qu'on affiche : pas de message d'erreur pour une lecture de
    // confort, la partie locale reste jouable.
    expect(state.current.points).toBe(avant);
    expect(store.getSnapshot().message).toBeNull();
  });
});

describe("la chaîne côté store (les imprévus et le setup)", () => {
  it("adopte le tirage du serveur, sans toucher aux points ni aux jetons", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 1000 }) });
    store.subscribe(() => {});
    const outcome = await store.chooseStreamerEvent("raid", "gauche");
    // On envoie **la carte et le côté** : jamais l'issue, jamais le gain.
    expect(api.streamerChoose).toHaveBeenCalledWith("raid", "gauche");
    expect(outcome.status).toBe("done");
    // Les abonnés affichés sont ceux du serveur, et l'imprévu du jour est rangé
    // pour que l'écran ne le repropose pas.
    expect(state.current.streamer.subscribers).toBe(1680);
    expect(state.current.streamer.event).toMatchObject({
      event: "raid",
      choice: "gauche",
      success: true,
      gained: 1680,
    });
    // Aucun jeton, aucun point : la monnaie de la chaîne reste la vidéo du jour.
    expect(state.current.points).toBe(1000);
    expect(state.current.streamer.tokensToday).toBe(0);
  });

  it("relaie le refus du serveur sans ranger de résultat", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 1000 }) });
    store.subscribe(() => {});
    api.streamerChoose.mockRejectedValueOnce(
      new CloudError("chaîne : ce n'est pas l'imprévu du jour", "P0001", 400),
    );
    const outcome = await store.chooseStreamerEvent("modo", "gauche");
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/imprévu du jour/);
    // Le refus n'a rien laissé derrière lui : ni abonnés, ni carte jouée.
    expect(state.current.streamer.subscribers).toBe(0);
    expect(state.current.streamer.event).toBeNull();
  });

  it("paie le setup au serveur et relit le solde chez lui", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 1000 }) });
    store.subscribe(() => {});
    api.walletGet.mockResolvedValueOnce(880);
    const outcome = await store.buyStreamerSetup("webcam");
    // Le client n'envoie **que le nom du palier** : le prix vit au serveur.
    expect(api.streamerSetupBuy).toHaveBeenCalledWith("webcam");
    expect(outcome.status).toBe("done");
    expect(state.current.streamer.setup).toEqual(["webcam"]);
    expect(api.walletGet).toHaveBeenCalledTimes(1);
    // Le solde affiché est celui du serveur (880), pas un calcul local.
    expect(state.current.points).toBe(880);
  });

  it("ne débite rien quand le serveur refuse un palier hors d'ordre", async () => {
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, points: 1000 }) });
    store.subscribe(() => {});
    api.streamerSetupBuy.mockRejectedValueOnce(
      new CloudError("chaîne : il faut d'abord « micro »", "P0001", 400),
    );
    const outcome = await store.buyStreamerSetup("deco");
    expect(outcome.status).toBe("unavailable");
    expect(state.current.points).toBe(1000);
    expect(state.current.streamer.setup).toEqual([]);
    expect(api.walletGet).not.toHaveBeenCalled();
  });

  it("sacrifie les doublons choisis et retire les cartes que le serveur a prises", async () => {
    const { store, api, state } = harness({
      local: saveWith({
        updatedAt: T0,
        cards: [
          { id: "dbl-ra-1", creatorSlug: "ibai", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
          { id: "dbl-ra-2", creatorSlug: "ibai", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
          { id: "dbl-rb-1", creatorSlug: "kamet0", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
          { id: "dbl-rb-2", creatorSlug: "kamet0", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
        ],
      }),
    });
    store.subscribe(() => {});
    const outcome = await store.sacrificeStreamerSetup(["dbl-ra-1", "dbl-rb-1"]);
    // Le client n'envoie **que des identifiants** : le prix et la valeur sont
    // relus au serveur, dans sa sauvegarde et au catalogue.
    expect(api.streamerSetupSacrifice).toHaveBeenCalledWith(["dbl-ra-1", "dbl-rb-1"]);
    expect(outcome.status).toBe("done");
    // Le verdict du serveur : les deux cartes qu'il a prises ont quitté le
    // classeur, les deux autres sont restées, et le palier est installé.
    expect(state.current.cards.map((card) => card.id).sort()).toEqual(["dbl-ra-2", "dbl-rb-2"]);
    expect(state.current.streamer.setup).toEqual([
      "webcam", "micro", "lumiere", "deco", "studio", "webcam2",
    ]);
    expect(store.getSnapshot().message).toMatch(/webcam2|Deuxième caméra/i);
  });

  it("ne retire rien quand le serveur refuse le sacrifice", async () => {
    const { store, api, state } = harness({
      local: saveWith({
        updatedAt: T0,
        cards: [
          { id: "dbl-ra-1", creatorSlug: "ibai", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
          { id: "dbl-ra-2", creatorSlug: "ibai", rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false },
        ],
        streamer: { ...createInitialState(T0).streamer, setup: ["webcam", "micro", "lumiere", "deco", "studio"] },
      }),
    });
    store.subscribe(() => {});
    api.streamerSetupSacrifice.mockRejectedValueOnce(
      new CloudError("chaîne : impossible de sacrifier ta seule copie de cette carte", "P0001", 400),
    );
    const outcome = await store.sacrificeStreamerSetup(["dbl-ra-1", "dbl-ra-2"]);
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/seule copie/);
    // Rien n'a bougé : ni carte, ni palier.
    expect(state.current.cards).toHaveLength(2);
    expect(state.current.streamer.setup).toEqual(["webcam", "micro", "lumiere", "deco", "studio"]);
  });

  it("sans compte, l'imprévu et le setup passent par le moteur local", async () => {
    // Hors ligne (build sans cloud), le même jour de jeu et la même règle
    // s'appliquent : la carte du jour est jouée localement, sans jeton, et le
    // setup se paie sur les points de la partie locale.
    const { store, state } = harness({
      configured: false,
      local: saveWith({ updatedAt: T0, points: 1000 }),
    });
    store.subscribe(() => {});
    const jour = gameDay(T0 + 60_000);
    const carte = eventForDay(jour);
    const outcome = await store.chooseStreamerEvent(carte.id, "gauche");
    expect(outcome.status).toBe("done");
    expect(state.current.streamer.event?.event).toBe(carte.id);
    // Le côté choisi, lui, est bien celui demandé.
    expect(state.current.streamer.event?.choice).toBe("gauche");

    const achat = await store.buyStreamerSetup("webcam");
    expect(achat.status).toBe("done");
    expect(state.current.streamer.setup).toEqual(["webcam"]);
    expect(state.current.points).toBe(1000 - 120);

    // Et une carte qui n'est pas celle du jour est refusée localement aussi.
    const autre = EVENTS.find((c) => c.id !== carte.id)!;
    const refus = await store.chooseStreamerEvent(autre.id, "droite");
    expect(refus.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/imprévu du jour/);
  });
});

describe("le bureau côté store (0039)", () => {
  /**
   * L'invité tel que le **store** le reçoit : l'API a déjà traduit le
   * `snake_case` du serveur (c'est elle qui est testée pour ça).
   */
  const ligneInvite = (slug: string, cardId: string, rarity = "uncommon") => ({
    slot: 1,
    cardId,
    slug,
    rarity,
    variant: "standard",
  });

  it("recopie le bureau du serveur, et raconte le raid quand il est neuf", async () => {
    const { store, api, state } = harness();
    store.subscribe(() => {});
    api.streamerStatus.mockResolvedValueOnce({
      subscribers: 3000,
      perDay: 900,
      day: "2026-03-01",
      publishedToday: false,
      chosenToday: false,
      tokensToday: 0,
      tokensCap: 40,
      setup: [],
      setupBonus: 0,
      guests: [ligneInvite("ibai", "carte-a")],
      raidToday: 42,
      raidDay: "2026-03-01",
    });
    api.streamerVisit.mockResolvedValueOnce({
      days: 1,
      countedDays: 1,
      gained: 900,
      before: 2100,
      subscribers: 3042,
      perDay: 900,
      raid: {
        gained: 42,
        already: false,
        shares: [{ slot: 1, slug: "ibai", rarity: "uncommon", permille: 25, gained: 42 }],
      },
    });

    const ouverture = await store.openStreamer();
    expect(ouverture.status).toBe("done");
    if (ouverture.status !== "done") return;
    // Le bureau est celui du serveur, rangé par place et prêt pour l'écran.
    expect(ouverture.guests).toEqual([
      { slot: 1, cardId: "carte-a", slug: "ibai", rarity: "uncommon", variant: "standard" },
    ]);
    expect(ouverture.raidToday).toBe(42);
    expect(state.current.streamer.guests).toEqual(ouverture.guests);
    // Le raid est **rangé** (c'est la sauvegarde qui garde qui est passé, même
    // quand le badge du direct s'éteint)…
    expect(state.current.streamer.raid).toEqual({ day: "2026-03-01", gained: 42, slugs: ["ibai"] });
    // …et il se raconte une fois : c'est la seule ligne ajoutée au résumé.
    expect(ouverture.lines.at(-1)).toBe("Raid : un invité est passé en direct — +42 abonnés.");
  });

  it("ne rejoue pas la phrase d'un raid déjà payé", async () => {
    const { store, api } = harness();
    store.subscribe(() => {});
    api.streamerStatus.mockResolvedValueOnce({
      subscribers: 3042,
      perDay: 900,
      day: "2026-03-01",
      publishedToday: false,
      chosenToday: false,
      tokensToday: 0,
      tokensCap: 40,
      setup: [],
      setupBonus: 0,
      guests: [ligneInvite("ibai", "carte-a")],
      raidToday: 42,
      raidDay: "2026-03-01",
    });
    api.streamerVisit.mockResolvedValueOnce({
      days: 0,
      countedDays: 0,
      gained: 0,
      before: 3042,
      subscribers: 3042,
      perDay: 900,
      raid: {
        gained: 42,
        already: true,
        shares: [{ slot: 1, slug: "ibai", rarity: "uncommon", permille: 25, gained: 42 }],
      },
    });
    const ouverture = await store.openStreamer();
    if (ouverture.status !== "done") throw new Error("chaîne refusée");
    // Le chiffre reste affiché (le joueur doit le voir), mais la phrase n'est
    // pas rejouée : sinon il croirait toucher le raid à chaque ouverture.
    expect(ouverture.raidToday).toBe(42);
    expect(ouverture.lines.join(" ")).not.toContain("Raid :");
  });

  it("pose l'invité au serveur et recopie le bureau qu'il rend", async () => {
    const carte = serverCard("ibai", "uncommon", "holo");
    const { store, api, state } = harness({ local: saveWith({ updatedAt: T0, cards: [carte] }) });
    store.subscribe(() => {});
    api.streamerGuestSet.mockResolvedValueOnce({
      changed: true,
      guests: [ligneInvite("ibai", carte.id, "uncommon")],
    });

    const outcome = await store.setStreamerGuest(1, carte.id);
    expect(api.streamerGuestSet).toHaveBeenCalledWith(1, {
      id: carte.id,
      creatorSlug: "ibai",
      rarity: "uncommon",
      variant: "holo",
    });
    expect(outcome.status).toBe("done");
    expect(state.current.streamer.guests).toHaveLength(1);
    expect(state.current.streamer.guests[0]?.cardId).toBe(carte.id);
    expect(store.getSnapshot().message).toMatch(/rejoint le bureau/);

    // Retirer : une carte nulle, et le serveur libère la place.
    api.streamerGuestSet.mockResolvedValueOnce({ changed: true, guests: [] });
    await store.setStreamerGuest(1, null);
    expect(api.streamerGuestSet).toHaveBeenLastCalledWith(1, null);
    expect(state.current.streamer.guests).toEqual([]);
  });

  it("refuse une carte qui n'est pas dans la collection, sans appeler le serveur", async () => {
    const { store, api } = harness({ local: saveWith({ updatedAt: T0, cards: [] }) });
    store.subscribe(() => {});
    const outcome = await store.setStreamerGuest(1, "carte-inconnue");
    expect(outcome.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/pas dans ta collection/);
    expect(api.streamerGuestSet).not.toHaveBeenCalled();
  });

  it("sans cloud, le bureau se pose localement, avec les mêmes refus", async () => {
    const carte = serverCard("ibai", "uncommon", "holo");
    const autre = serverCard("ibai", "rare", "standard");
    const { store, state } = harness({
      configured: false,
      local: saveWith({ updatedAt: T0, cards: [carte, autre] }),
    });
    store.subscribe(() => {});
    const pose = await store.setStreamerGuest(1, carte.id);
    expect(pose.status).toBe("done");
    expect(state.current.streamer.guests).toEqual([
      { slot: 1, cardId: carte.id, slug: "ibai", rarity: "uncommon", variant: "holo" },
    ]);
    // Le même créateur ne tient pas les deux places, ici non plus.
    const doublon = await store.setStreamerGuest(2, autre.id);
    expect(doublon.status).toBe("unavailable");
    expect(store.getSnapshot().message).toMatch(/autre place/);
    // Et une carte qu'on ne possède pas ne se pose pas davantage.
    const volee = await store.setStreamerGuest(2, "carte-inconnue");
    expect(volee.status).toBe("unavailable");
    expect(state.current.streamer.guests).toHaveLength(1);
  });

  it("paie le raid local sur le direct donné, une fois par journée", async () => {
    const carte = serverCard("ibai", "uncommon", "holo");
    const { store, state } = harness({
      configured: false,
      local: saveWith({ updatedAt: T0, cards: [carte] }),
    });
    store.subscribe(() => {});
    await store.setStreamerGuest(1, carte.id);

    // Personne en direct : rien, et la journée n'est pas consommée.
    await store.openStreamer(new Set(["kamet0"]));
    expect(state.current.streamer.raid).toBeNull();

    // L'invité streame : sa part tombe, calculée sur la croissance du jour.
    const ouverture = await store.openStreamer(new Set(["ibai"]));
    if (ouverture.status !== "done") throw new Error("chaîne refusée");
    expect(ouverture.raidToday).toBe(Math.floor((240 * 25) / 1000));
    expect(state.current.streamer.raid?.slugs).toEqual(["ibai"]);

    // Un second passage dans la journée ne repaie pas.
    const encore = await store.openStreamer(new Set(["ibai"]));
    expect(encore.status).toBe("done");
    if (encore.status !== "done") return;
    expect(encore.raidToday).toBe(Math.floor((240 * 25) / 1000));
    expect(encore.lines.join(" ")).not.toContain("Raid :");
  });
});
