import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { EMPTY_CLOUD_STATE, type CloudState } from "@/lib/cloud/cloud-store";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { gameDay } from "@/lib/progression";
import { CREATORS } from "@/lib/catalog";
import { HomeView } from "@/components/drop-view";
import { MissionsView } from "@/components/missions-view";
import { SettingsSheet } from "@/components/settings-sheet";
import { ProfileView } from "@/components/profile-view";
import { runBackHandler } from "@/lib/back-stack";

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

  async function drop(friendsOpening = 0, tribunalPaid = false) {
    const onOpen = vi.fn();
    const onShowInbox = vi.fn();
    const onShowTribunal = vi.fn();
    const noop = () => {};
    const state = createInitialState(NOW);
    if (tribunalPaid) {
      state.openings = 1;
      state.missionDay = gameDay(NOW);
      state.missions = { ...state.missions, pack: 1 };
      state.tribunal = { day: gameDay(NOW), verdicts: {}, claimed: true };
    }
    await banc.monter(<HomeView game={getGameView(state, NOW)} friendsOpening={friendsOpening}
      onShowInbox={onShowInbox} onShowCollection={noop} onOpen={noop}
      onUseHourglass={noop} onShowAtelier={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve needsAccount={false} />);
    return { onOpen, onShowInbox, onShowTribunal, button: document.querySelector<HTMLButtonElement>(".scene-action")! };
  }

  async function objectives() {
    const onOpen = vi.fn(); const onShowTribunal = vi.fn();
    await banc.monter(<MissionsView game={getGameView(createInitialState(NOW), NOW)}
      onOpenScene={onOpen} onShowTribunal={onShowTribunal} onShowArena={() => {}}
      onClaimSeason={vi.fn()} onClaimMilestone={vi.fn()} onNotice={vi.fn()} onError={vi.fn()} />);
    return { onOpen, onShowTribunal, button: document.querySelector<HTMLButtonElement>(".scene-action")! };
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
    const { button } = await objectives();
    expect(document.querySelector(".friends-row")).toBeNull();
    expect(button.disabled).toBe(true);
    expect(document.querySelector(".scene-state")?.textContent).toBe("Vérification…");
    expect(button.closest("details")!.open).toBe(false);
  });

  it("le serveur déjà ouvert prime sur une partie locale disponible", async () => {
    mocked.cloud.sceneStatus = { userId: "joueur", day: gameDay(NOW), ready: false };
    const { button, onOpen } = await objectives();
    expect(button.disabled).toBe(true);
    expect(document.querySelector(".scene-state")?.textContent).toBe("Ouvert aujourd’hui");
    expect(button.textContent).toContain("Déjà ouvert · demain matin");
    expect(button.className).toContain("is-opened");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("un statut périmé ou d’un autre compte propose une vérification, pas une ouverture", async () => {
    mocked.cloud.sceneStatus = { userId: "autre", day: gameDay(NOW), ready: true };
    const { button, onOpen } = await objectives();
    banc.appuyer("Vérifier la disponibilité");
    expect(mocked.packStatus).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
    expect(button.textContent).not.toContain("Ouvrir");
  });

  it("un statut disponible permet l’appui explicite", async () => {
    mocked.cloud.sceneStatus = { userId: "joueur", day: gameDay(NOW), ready: true };
    const { button, onOpen } = await objectives();
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
    await banc.monter(<ProfileView game={getGameView(state, NOW)} onShowStudio={noop} onShowAccount={onShowAccount} onShowOwnProfile={noop} onShowWishlist={noop} onGoDrop={onGoDrop} onGoBinder={noop} />);
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
    banc.appuyer("Trouver ma première carte");
    expect(onGoDrop).toHaveBeenCalledOnce();
  });

  it("ouvre la feuille de rédemption des boosters depuis les fonctions en ligne", async () => {
    await settings();
    banc.appuyer("J'ai un code booster");
    const dialog = document.querySelector('[role="dialog"][aria-label="J\'ai un code"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.parentElement).toBe(document.body);
    expect(dialog?.querySelector(".odds-panel h2")?.textContent).toBe("J'ai un code");
    expect(document.querySelector<HTMLInputElement>('[role="dialog"] input')?.placeholder).toBe("BOOSTER-2026");
    act(() => { dialog?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.querySelector('[role="dialog"][aria-label="J\'ai un code"]')).toBeNull();
    banc.appuyer("J'ai un code booster");
    act(() => { expect(runBackHandler()).toBe(true); });
    expect(document.querySelector('[role="dialog"][aria-label="J\'ai un code"]')).toBeNull();
  });

  async function settings() {
    const noop = vi.fn();
    await banc.monter(<SettingsSheet onClose={noop} onShowAccount={noop} onShowNotifications={noop} onShowThemes={noop} onNotice={noop} onError={noop} />);
  }

  it("affiche l’identifiant du build dans les réglages du profil", async () => {
    await settings();
    const version = document.querySelector<HTMLElement>(".profile-build-version");
    expect(version?.textContent).toMatch(/^Version (Android|Web) · ([a-f0-9]{7}|locale)$/);
    expect(version?.title).toMatch(/Commit complet|Build local/);
  });

  it("garde le Tribunal dans Objectifs, replié", async () => {
    const { onShowTribunal } = await objectives();
    const details = [...document.querySelectorAll("details")].find((d) => d.querySelector("summary")?.textContent === "Autres activités")!;
    expect(details.open).toBe(false);
    banc.appuyer("Tribunal des Bannis");
    expect(onShowTribunal).toHaveBeenCalledOnce();
  });

});
