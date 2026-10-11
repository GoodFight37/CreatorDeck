import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { AtelierView } from "@/components/atelier-view";
import { CREATORS, RARITY_META } from "@/lib/catalog";
import { BINDER_COLLECTIONS } from "@/lib/binder-collections";
import { createInitialState, getGameView, type PlayerState } from "@/lib/game-engine";

const NOW = Date.UTC(2026, 9, 11, 16);
const craft = vi.fn();
const recycle = vi.fn();
vi.mock("@/hooks/use-points", () => ({ usePoints: () => ({ craft, recycle, recycleBulk: recycle }) }));

describe("préparer son atelier avant dix doublons", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); vi.clearAllMocks(); });
  afterEach(() => banc.nettoyer());

  function stateWithCopies(count: number, variant: "standard" | "live" = "standard"): PlayerState {
    const creator = CREATORS.find((entry) => entry.rarity === "common")!;
    const state = createInitialState(NOW);
    state.cards = Array.from({ length: count }, (_, index) => ({ id: `copy-${index}`,
      creatorSlug: creator.slug, rarity: creator.rarity, variant, obtainedAt: NOW + index, rareDrop: false }));
    return state;
  }

  async function mount(state = createInitialState(NOW)) {
    const onGoDrop = vi.fn();
    const onGoBinder = vi.fn();
    await banc.monter(<AtelierView game={getGameView(state, NOW)} onNotice={vi.fn()} onError={vi.fn()} onGoDrop={onGoDrop} onGoBinder={onGoBinder} />);
    return { onGoDrop, onGoBinder };
  }

  it("montre trois vrais aperçus Standard et leurs coûts sans dépenser", async () => {
    const state = createInitialState(NOW);
    const before = JSON.stringify(state);
    const { onGoDrop, onGoBinder } = await mount(state);
    const cards = document.querySelectorAll(".atelier-preview-card");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const creator = CREATORS.find((entry) => card.getAttribute("aria-label") === `Aperçu de ${entry.displayName}, carte non obtenue`)!;
      expect(creator.rarity).not.toBe("legendary");
      expect(card.textContent).toContain(`${RARITY_META[creator.rarity].craftCost} points`);
      expect(card.querySelector(".variant-standard")).toBeTruthy();
      expect(card.querySelector("button, [role=button]")).toBeNull();
    }
    banc.appuyer("Retour au Drop");
    banc.appuyer("Choisir ma collection dans le Binder");
    expect(onGoDrop).toHaveBeenCalledOnce();
    expect(onGoBinder).toHaveBeenCalledOnce();
    expect(craft).not.toHaveBeenCalled();
    expect(recycle).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });

  it("compte les copies recyclables, pas les cartes uniques, et garde le seuil", async () => {
    const state = stateWithCopies(10);
    await mount(state);
    expect(document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("9");
    expect(document.querySelector(".atelier-preview-wallet")?.textContent).toContain("+108 points");
    expect(document.querySelector(".atelier-row")).toBeNull();
    expect(document.querySelectorAll(".atelier-preview-card")).toHaveLength(3);
    const owned = CREATORS.find((creator) => creator.slug === state.cards[0].creatorSlug)!;
    expect(document.querySelector(`[aria-label="Aperçu de ${owned.displayName}, carte non obtenue"]`)).toBeNull();
  });

  it("annonce zéro point en groupe pour les doublons Live, sans les dépenser", async () => {
    await mount(stateWithCopies(4, "live"));
    expect(document.querySelector(".atelier-preview-wallet")?.textContent).toContain("+0 points");
    expect(document.body.textContent).toContain("3 doublons Live exclus");
    expect(recycle).not.toHaveBeenCalled();
  });

  it("privilégie les manquantes artisanables de la collection Binder choisie", async () => {
    const goal = BINDER_COLLECTIONS.find((entry) => entry.slugs.filter((slug) => CREATORS.some((creator) => creator.slug === slug && RARITY_META[creator.rarity].craftable)).length >= 3)!;
    // Même préférence que le hook public, sans simuler de gains.
    const { CATALOG_EDITION_NUMBER } = await import("@/lib/catalog");
    window.localStorage.setItem(`creatordeck.binder-goal.edition-${CATALOG_EDITION_NUMBER}`, goal.id);
    await mount();
    expect(document.body.textContent).toContain(`En priorité : ${goal.name}`);
    const previews = [...document.querySelectorAll(".atelier-preview-card")];
    expect(previews).toHaveLength(3);
    for (const card of previews) {
      expect(goal.slugs.some((slug) => card.getAttribute("aria-label") === `Aperçu de ${CREATORS.find((creator) => creator.slug === slug)!.displayName}, carte non obtenue`)).toBe(true);
    }
  });

  it("à dix doublons conserve les listes et les actions existantes", async () => {
    await mount(stateWithCopies(11));
    expect(document.querySelector(".atelier-warmup")).toBeNull();
    expect(document.querySelector(".atelier-preview")).toBeNull();
    expect(document.querySelectorAll(".atelier-row")).toHaveLength(20);
    act(() => banc.appuyer(/^Recycler/));
    expect(document.body.textContent).toContain("Tout recycler");
  });

  it("ne promet pas de compléter par artisanat une page déjà réunie", async () => {
    const goal = BINDER_COLLECTIONS[0];
    const { CATALOG_EDITION_NUMBER } = await import("@/lib/catalog");
    window.localStorage.setItem(`creatordeck.binder-goal.edition-${CATALOG_EDITION_NUMBER}`, goal.id);
    const state = createInitialState(NOW);
    state.cards = goal.slugs.map((slug, index) => ({ id: `owned-${index}`, creatorSlug: slug,
      rarity: CREATORS.find((creator) => creator.slug === slug)!.rarity, variant: "standard", obtainedAt: NOW, rareDrop: false }));
    await mount(state);
    expect(document.body.textContent).toContain("Aucune carte artisanable à trouver dans");
    expect(document.body.textContent).not.toContain("En priorité :");
  });
});
