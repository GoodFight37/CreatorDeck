import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { EMPTY_CLOUD_STATE, type CloudState } from "@/lib/cloud/cloud-store";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { gameDay } from "@/lib/progression";
import { CREATORS } from "@/lib/catalog";
import { HomeView } from "@/components/drop-view";
import { ProfileView } from "@/components/profile-view";

const NOW = Date.UTC(2026, 9, 11, 16);
const mocked = vi.hoisted(() => ({ cloud: {} as CloudState, packStatus: vi.fn() }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => mocked.cloud }));
vi.mock("@/hooks/use-inbox", () => ({ useInbox: () => ({ unread: 0 }) }));
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => ({ byLogin: new Map(), count: 0, stale: true, configured: false }) }));
vi.mock("@/lib/cloud/cloud-store", async (original) => ({ ...await original<object>(), cloudStore: {
  packStatus: mocked.packStatus, loadWishlist: vi.fn(), loadProfile: vi.fn(),
} }));

describe("statut Scène et identité de collectionneur", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); mocked.cloud = { ...EMPTY_CLOUD_STATE, configured: true, userId: "joueur" }; vi.clearAllMocks(); });
  afterEach(() => banc.nettoyer());

  async function drop(friendsOpening = 0) {
    const onOpen = vi.fn();
    const onShowInbox = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={getGameView(createInitialState(NOW), NOW)} friendsOpening={friendsOpening}
      onShowInbox={onShowInbox} onShowCollection={noop} onOpen={noop} onOpenScene={onOpen} sceneBusy={false}
      onUseHourglass={noop} onShowOdds={noop} onShowMissions={noop} onShowAtelier={noop} onShowArena={noop}
      onShowTribunal={noop} tribunalRestants={5} tribunalClose={false} opening={false} usingHourglass={false}
      now={NOW} serverReserve needsAccount={false} />);
    return { onOpen, onShowInbox, button: document.querySelector<HTMLButtonElement>(".scene-action")! };
  }

  it("surface les ouvertures récentes des amis sans replier l’accès au Carnet", async () => {
    const { onShowInbox } = await drop(2);
    const friends = document.querySelector<HTMLButtonElement>(".friends-row")!;
    expect(friends.textContent).toContain("2 amis ont ouvert un booster");
    expect(friends.closest("details")).toBeNull();
    friends.click();
    expect(onShowInbox).toHaveBeenCalledOnce();
  });

  it("ne propose aucune ouverture avant le statut serveur", async () => {
    mocked.cloud.sceneStatusLoading = true;
    const { button } = await drop();
    expect(document.querySelector(".friends-row")).toBeNull();
    expect(button.disabled).toBe(true);
    expect(document.querySelector(".scene-state")?.textContent).toBe("Vérification…");
    expect(button.closest("details")).toBeNull();
  });

  it("le serveur déjà ouvert prime sur une partie locale disponible", async () => {
    mocked.cloud.sceneStatus = { userId: "joueur", day: gameDay(NOW), ready: false };
    const { button, onOpen } = await drop();
    expect(button.disabled).toBe(true);
    expect(document.querySelector(".scene-state")?.textContent).toBe("Ouvert aujourd’hui");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("un statut périmé ou d’un autre compte propose une vérification, pas une ouverture", async () => {
    mocked.cloud.sceneStatus = { userId: "autre", day: gameDay(NOW), ready: true };
    const { button, onOpen } = await drop();
    banc.appuyer("Vérifier la disponibilité");
    expect(mocked.packStatus).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
    expect(button.textContent).not.toContain("Ouvrir");
  });

  it("un statut disponible permet l’appui explicite", async () => {
    mocked.cloud.sceneStatus = { userId: "joueur", day: gameDay(NOW), ready: true };
    const { button, onOpen } = await drop();
    expect(button.disabled).toBe(false);
    banc.appuyer("Ouvrir le Paquet Scène");
    expect(onOpen).toHaveBeenCalledOnce();
  });

  async function profile(slugs: string[]) {
    const state = createInitialState(NOW);
    state.cards = slugs.map((slug, index) => ({ id: `card-${index}`, creatorSlug: slug,
      rarity: CREATORS.find((creator) => creator.slug === slug)!.rarity, variant: "standard", obtainedAt: NOW + index, rareDrop: false }));
    const noop = () => {};
    const onGoDrop = vi.fn();
    const onShowAccount = vi.fn();
    await banc.monter(<ProfileView game={getGameView(state, NOW)} onNotice={noop} onError={noop}
      onShowOdds={noop} onShowMissions={noop} onShowThemes={noop} onShowStudio={noop} onShowAccount={onShowAccount}
      onShowLeaderboard={noop} onShowFriends={noop} onShowMarket={noop} onShowLastPack={noop} onShowArena={noop}
      onShowNotifications={noop} onShowOwnProfile={noop} onShowWishlist={noop} onGoDrop={onGoDrop} onGoBinder={noop} />);
    return { onGoDrop, onShowAccount };
  }

  it("privilégie les cartes épinglées possédées, sans doublon ni carte inventée", async () => {
    const common = CREATORS.find((creator) => creator.rarity === "common")!;
    const rare = CREATORS.find((creator) => creator.rarity === "rare")!;
    const legendary = CREATORS.find((creator) => creator.rarity === "legendary")!;
    mocked.cloud.displayName = "Malik";
    mocked.cloud.showcase = [common.slug, rare.slug, "inconnue"];
    const { onShowAccount } = await profile([legendary.slug, common.slug, rare.slug, legendary.slug]);
    expect(document.querySelector(".profile-card h1")?.textContent).toBe("Malik");
    const labels = [...document.querySelectorAll(".profile-showcase .creator-card")].map((node) => node.getAttribute("aria-label"));
    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain(common.displayName);
    expect(labels[1]).toContain(rare.displayName);
    expect(document.querySelector(".profile-milestones")?.textContent).toContain("1 Légendaire différente");
    banc.appuyer("Personnaliser mon pseudo et ma vitrine");
    expect(onShowAccount).toHaveBeenCalledOnce();
  });

  it("un profil vide propose sa première carte sans accomplissement inventé", async () => {
    const { onGoDrop } = await profile([]);
    expect(document.querySelector(".profile-milestones")).toBeNull();
    expect(document.querySelector(".profile-collection-goal")).toBeNull();
    expect(document.querySelector('[aria-label="Compte"]')?.textContent).toContain("0/5 cartes distinctes");
    expect(document.querySelector('[aria-label="Compte"]')?.textContent).toContain("0 doublons à vendre · 40 pts");
    banc.appuyer("Trouver ma première carte");
    expect(onGoDrop).toHaveBeenCalledOnce();
  });
});
