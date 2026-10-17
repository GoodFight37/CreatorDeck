import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { CollectionView } from "@/components/binder-view";
import { HomeView } from "@/components/drop-view";
import { CircleOnboarding } from "@/components/circle-onboarding";
import { CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";

const NOW = Date.UTC(2026, 9, 17, 20, 30);
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => ({ byLogin: new Map(), count: 0, stale: true, configured: false, refreshedAt: null, loading: false, error: null }) }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ configured: false, userId: null, promoPacks: 0 }) }));

// ibai : Légendaire · anyme023 : Épique · jeanmassiet : Rare · swehyt : Peu commune · zeusspezial : Commune
const CIRCLE = ["ibai", "anyme023", "jeanmassiet", "swehyt", "zeusspezial"];

function gameWith(owned: string[], points = 100) {
  const state = { ...createInitialState(NOW), points };
  state.cards = owned.map((slug, index) => ({ id: `c-${index}`, creatorSlug: slug, rarity: CREATOR_BY_SLUG.get(slug)!.rarity,
    variant: "standard" as const, obtainedAt: NOW - index, rareDrop: false }));
  return getGameView(state, NOW);
}

describe("étape 3 : le Binder au service de mon cercle", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); window.localStorage.clear(); vi.restoreAllMocks(); });
  const setCircle = (slugs: string[]) =>
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs, at: 1 }));
  const pressedChip = () => document.querySelector<HTMLButtonElement>('.filter-chips button[aria-pressed="true"]')!.textContent;
  const gridNames = () => [...document.querySelectorAll(".collection-grid .binder-card-caption strong")].map((node) => node.textContent);

  it("s'ouvre sur « Mon cercle », dans l'ordre du joueur, avec l'objectif du cercle", async () => {
    setCircle(CIRCLE);
    const onEditCircle = vi.fn();
    await banc.monter(<CollectionView game={gameWith(["jeanmassiet"])} onCraft={async () => true} onEditCircle={onEditCircle} />);
    expect(pressedChip()).toBe("Mon cercle (1/5)");
    // Les puces commencent par le cercle.
    expect(document.querySelector(".filter-chips button")!.textContent).toBe("Mon cercle (1/5)");
    expect(new Set(gridNames())).toEqual(new Set(CIRCLE.map((slug) => CREATOR_BY_SLUG.get(slug)!.displayName)));
    // L'objectif affiché n'est plus une page de famille de langue.
    const goal = document.querySelector<HTMLElement>(".binder-circle-goal")!;
    expect(goal.textContent).toContain("Mon cercle · 1 / 5");
    expect(goal.textContent).toContain("À trouver : ibai, Anyme023, SwehYT et 1 autre.");
    expect(document.querySelector(".binder-next-pages")).toBeNull();
    expect(document.querySelector(".binder-collections-picker summary")!.textContent).toContain("Parcourir par pages de 12");
    // Cible d'artisanat : la première manquante fabricable, au prix réel ; jamais la Légendaire.
    const craft = goal.querySelector<HTMLButtonElement>(".binder-circle-craft")!;
    expect(craft.textContent).toContain("À fabriquer : Anyme023");
    expect(craft.textContent).toContain(`${RARITY_META.epic.craftCost} points`);
    expect(craft.textContent).toContain(`encore ${(RARITY_META.epic.craftCost as number) - 100} points`);
    expect(goal.querySelector(".binder-circle-booster")!.textContent).toContain("ibai ne se fabrique pas");
    // L'appui ouvre la fiche, qui porte déjà le bouton de fabrication.
    act(() => craft.click());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Anyme023");
    // Modifier mes chaînes.
    banc.appuyer("Modifier");
    expect(onEditCircle).toHaveBeenCalledOnce();
  });

  it("garde les autres vues : un appui sur « Toutes » quitte le cercle", async () => {
    setCircle(CIRCLE);
    await banc.monter(<CollectionView game={gameWith([])} onCraft={async () => true} />);
    banc.appuyer(/^Toutes \(/);
    expect(pressedChip()).toMatch(/^Toutes/);
    expect(gridNames().length).toBe(12);
  });

  it("cercle de Légendaires : rien à fabriquer, et on le dit", async () => {
    setCircle(["kaicenat", "ibai", "ninja", "auronplay", "rubius"]);
    await banc.monter(<CollectionView game={gameWith(["ninja"], 9_999)} onCraft={async () => true} />);
    expect(document.querySelector(".binder-circle-craft")).toBeNull();
    expect(document.querySelector(".binder-circle-booster")!.textContent).toContain("4 de tes chaînes ne se fabriquent pas");
  });

  it("sans cercle : le Binder d'avant (obtenues, pages par famille)", async () => {
    await banc.monter(<CollectionView game={gameWith(["jeanmassiet"])} onCraft={async () => true} />);
    expect(pressedChip()).toMatch(/^Obtenues/);
    expect(document.querySelector(".binder-circle-goal")).toBeNull();
    expect([...document.querySelectorAll(".filter-chips button")].some((chip) => chip.textContent?.startsWith("Mon cercle"))).toBe(false);
  });
});

describe("étape 3 : définir ou modifier mes chaînes", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); window.localStorage.clear(); });

  async function home({ needsAccount = false } = {}) {
    const onEditCircle = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith([])} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onOpenScene={noop}
      sceneBusy={false} onUseHourglass={noop} onShowOdds={noop}
      onShowMissions={noop} onShowAtelier={noop} onShowArena={noop} onShowTribunal={noop}
      tribunalRestants={0} tribunalClose={true} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={needsAccount} onEditCircle={onEditCircle} />);
    return onEditCircle;
  }

  it("un joueur sans cercle voit « Définir mes chaînes »", async () => {
    const onEditCircle = await home();
    expect(document.querySelector(".circle-invite h2")!.textContent).toBe("Quelles chaînes regardes-tu ?");
    banc.appuyer(/Définir mes chaînes/);
    expect(onEditCircle).toHaveBeenCalledOnce();
  });

  it("pas d'invitation pendant le parcours sans compte (la question y est déjà posée)", async () => {
    await home({ needsAccount: true });
    expect(document.querySelector(".circle-invite")).toBeNull();
  });

  it("avec un cercle : « Modifier » sur la rangée, et les jetons sur une seule ligne", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const onEditCircle = await home();
    expect(document.querySelector(".circle-invite")).toBeNull();
    banc.appuyer("Modifier");
    expect(onEditCircle).toHaveBeenCalledOnce();
    const tokens = document.querySelector(".drop-secondary .token-row, .token-row")!;
    expect(tokens.closest("details.drop-token-details")).toBeNull();
  });

  it("« Mes chaînes » en modification ne parle pas de premier booster", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    await banc.monter(<CircleOnboarding initial={CIRCLE} mode="edit" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).not.toContain("premier booster");
    expect(dialog.textContent).toContain("Ton accueil et ton Binder se recentrent sur eux.");
    banc.appuyer("Enregistrer");
    expect(onConfirm).toHaveBeenCalledWith(CIRCLE);
    banc.appuyer("Annuler");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
