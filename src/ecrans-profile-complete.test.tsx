import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { EMPTY_CLOUD_STATE, type CloudState } from "@/lib/cloud/cloud-store";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { gameDay } from "@/lib/progression";
import { CREATORS } from "@/lib/catalog";
import { SettingsSheet } from "@/components/settings-sheet";
import { ProfileView } from "@/components/profile-view";
const NOW = Date.UTC(2026, 9, 14, 16);
const mocked = vi.hoisted(() => ({ cloud: {} as CloudState }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => mocked.cloud }));
vi.mock("@/hooks/use-inbox", () => ({ useInbox: () => ({ unread: 0 }) }));
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/lib/cloud/cloud-store", async (original) => ({ ...await original<object>(), cloudStore: { loadWishlist: vi.fn(), loadProfile: vi.fn() } }));

describe("Toi : vitrine, parcours et menus complets", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); mocked.cloud = { ...EMPTY_CLOUD_STATE }; });
  afterEach(() => banc.nettoyer());
  async function profile(copies = 0, rewardReady = false, distinct = false) {
    const creator = CREATORS.find((entry) => entry.rarity === "common")!;
    const commons = CREATORS.filter((entry) => entry.rarity === "common");
    const state = createInitialState(NOW);
    state.cards = Array.from({length: copies}, (_, i) => {
      const owner = distinct ? commons[i] : creator;
      return { id: `card-${i}`, creatorSlug: owner.slug, rarity: owner.rarity,
        variant: i === 2 ? "gold" as const : "standard" as const, obtainedAt: NOW + i, rareDrop: false };
    });
    if (rewardReady) { state.missionDay = gameDay(NOW); state.missions = { pack: 1 }; }
    const game = getGameView(state, NOW);
    const onShowAccount = vi.fn(); const noop = vi.fn();
    await banc.monter(<ProfileView game={game} onShowStudio={noop} onShowAccount={onShowAccount} onShowOwnProfile={noop}
      onShowWishlist={noop} onGoBinder={noop} onGoDrop={noop} />);
    return { game, creator, onShowAccount };
  }
  it("garde la progression visible et les activités hors du profil", async () => {
    const { game } = await profile();
    const xp = document.querySelector<HTMLProgressElement>('.profile-xp')!;
    expect(xp.value).toBe(game.player.xp); expect(xp.max).toBe(game.player.xpNext);
    expect(document.querySelector('.profile-online-fold')).toBeNull();
    expect(document.querySelector('.profile-journey')?.textContent).not.toMatch(/Objectifs|Tribunal/);
    expect(document.querySelector('.profile-collection-total')?.textContent).toContain('0 / 1000');
  });
  it("expose une carte possédée une seule fois même si la liste épinglée contient un doublon", async () => {
    const creator = CREATORS.find((entry) => entry.rarity === "common")!;
    mocked.cloud.showcase = [creator.slug, creator.slug, "absente"];
    await profile(3);
    expect(document.querySelectorAll('.profile-showcase-slot')).toHaveLength(1);
    expect(document.querySelectorAll('.profile-showcase-placeholder')).toHaveLength(2);
    expect(document.querySelector('.profile-showcase-slot figcaption')?.textContent).toContain(creator.displayName);
    expect(document.querySelector('.profile-showcase-slot figcaption')?.textContent).toContain('Gold');
    act(() => document.querySelector<HTMLButtonElement>('.profile-showcase .creator-card-inspect')!.click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.textContent).toContain('Gold');
    expect(document.querySelector('.inspect-variants [aria-pressed="true"]')?.textContent).toContain('Gold ×1');
    banc.appuyer(/^Standard/);
    expect(dialog.querySelector('.odds-intro')?.textContent).toContain('Standard : 2');
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it("expose les quatre cartes que le sélecteur de vitrine permet d’épingler", async () => {
    const commons = CREATORS.filter((entry) => entry.rarity === "common").slice(0, 4);
    mocked.cloud.showcase = commons.map((entry) => entry.slug);
    await profile(5, false, true);
    expect(document.querySelectorAll('.profile-showcase-slot')).toHaveLength(4);
    expect(document.querySelectorAll('.profile-showcase-placeholder')).toHaveLength(0);
    expect(document.querySelector<HTMLElement>('.profile-showcase-cards')!.style.getPropertyValue('--showcase-cols')).toBe('4');
  });
  it('ne dépasse pas la limite de la vitrine si le cloud en renvoie trop', async () => {
    const commons = CREATORS.filter((entry) => entry.rarity === 'common').slice(0, 6);
    mocked.cloud.showcase = commons.map((entry) => entry.slug);
    await profile(6, false, true);
    expect(document.querySelectorAll('.profile-showcase-slot')).toHaveLength(4);
  });
  async function settings() {
    const noop = vi.fn(), onShowAccount = vi.fn();
    await banc.monter(<SettingsSheet onClose={noop} onShowAccount={onShowAccount} onShowNotifications={noop} onShowThemes={noop} onNotice={noop} onError={noop} />);
    return { onShowAccount };
  }
  it("replie les réglages et conserve les deux interrupteurs distincts", async () => {
    await settings();
    expect(document.querySelector<HTMLDetailsElement>('.settings-advanced')!.open).toBe(false);
    const labels = [...document.querySelectorAll('[role="switch"]')].map((node) => node.textContent);
    expect(labels).toContain('Son de l’application'); expect(labels).toContain('Musique');
    expect(document.querySelector('.profile-build-version')).not.toBeNull();
  });
  it("annonce un conflit de synchronisation et l’erreur réelle sans prétendre sauvegarder", async () => {
    mocked.cloud = {...EMPTY_CLOUD_STATE, configured:true, userId:'joueur', syncNeedsChoice:true, isError:true, message:'Connexion indisponible'};
    await profile();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Connexion indisponible');
    banc.vider();
    const { onShowAccount } = await settings();
    expect(document.querySelector('.menu-state')?.textContent).toContain('Synchronisation à vérifier');
    banc.appuyer(/^Mon compte/); expect(onShowAccount).toHaveBeenCalledOnce();
  });
  it("annonce l’attente de sauvegarde sans masquer la collection existante", async () => {
    mocked.cloud = {...EMPTY_CLOUD_STATE, configured:true, userId:'joueur', saveSyncing:true};
    await profile(1);
    expect(document.querySelectorAll('.profile-showcase-slot')).toHaveLength(1);
    banc.vider();
    await settings();
    expect(document.querySelector('.menu-state')?.textContent).toContain('Sauvegarde en cours');
  });
  it("ne transforme pas les récompenses disponibles en appels à revenir", async () => {
    mocked.cloud = {...EMPTY_CLOUD_STATE, configured:true, userId:'joueur', arenaMine:{pending:[{}]} as CloudState['arenaMine']};
    const { game } = await profile(0, true);
    const count = game.missions.filter((mission) => mission.done && !mission.claimed).length;
    expect(count).toBeGreaterThan(0);
    expect(document.querySelector('.profile-view')?.textContent).not.toMatch(/à réclamer|doublons? à vendre/);
    expect(document.querySelector('.menu-count')).toBeNull();
  });
  it("garde la wishlist visible et bloque ses commandes pendant un retrait", async () => {
    mocked.cloud = {...EMPTY_CLOUD_STATE, configured:true, userId:'joueur', wishlistBusy:true, wishlistSlug:CREATORS[0].slug};
    await profile();
    expect(document.querySelector('.wishlist-name')?.textContent).toContain(CREATORS[0].displayName);
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.wishlist-actions button')];
    expect(buttons).toHaveLength(2); expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(buttons[1].textContent).toBe('Retrait…');
  });

});
