import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { AtelierView } from "@/components/atelier-view";
import { CREATORS } from "@/lib/catalog";
import { createInitialState, getGameView, type PlayerState } from "@/lib/game-engine";

const NOW = Date.UTC(2026, 9, 11, 16);
const craft = vi.fn();
const recycle = vi.fn();
vi.mock("@/hooks/use-points", () => ({ usePoints: () => ({ craft, recycle, recycleBulk: recycle }) }));

describe("atelier consultable sans doublons", () => {
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
    await banc.monter(<AtelierView game={getGameView(state, NOW)} onNotice={vi.fn()} onError={vi.fn()} />);
  }

  it("montre les recettes et leurs coûts dès le début, sans permettre un achat non financé", async () => {
    const state = createInitialState(NOW);
    const before = JSON.stringify(state);
    await mount(state);
    expect(document.querySelector(".atelier-warmup")).toBeNull();
    expect(document.querySelector(".atelier-preview")).toBeNull();
    expect(document.querySelectorAll(".atelier-row").length).toBeGreaterThan(0);
    expect(document.querySelector(".atelier-cost-guide")?.textContent).toContain("Commune 45 · Peu commune 90 · Rare 220 · Épique 600 points");
    banc.appuyer(/^Communes/);
    const recipeButton = document.querySelector<HTMLButtonElement>(".atelier-row .craft-button")!;
    expect(recipeButton.textContent).toMatch(/\d+/);
    expect(recipeButton.title).toMatch(/Il te manque \d+ points/);
    expect(recipeButton.disabled).toBe(true);
    expect(craft).not.toHaveBeenCalled();
    expect(recycle).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });

  it("garde le total du filtre Toutes quand une rareté est sélectionnée", async () => {
    await mount();
    const all = () => banc.boutons().find(button => button.textContent?.startsWith("Toutes ("))!;
    const totalBefore = all().textContent;
    act(() => document.querySelector<HTMLDetailsElement>(".atelier-rarity-filters summary")!.click());
    banc.appuyer(/^Rares/);
    expect(document.querySelector<HTMLButtonElement>(".atelier-rarity-filters button.active")?.textContent).toContain("Rares");
    expect(all().textContent).toBe(totalBefore);
  });

  it("compte les copies recyclables, pas les cartes uniques, sans masquer les recettes", async () => {
    await mount(stateWithCopies(11));
    expect(document.querySelectorAll(".atelier-row").length).toBeGreaterThan(0);
    const owned = CREATORS.find((creator) => creator.rarity === "common")!;
    expect([...document.querySelectorAll(".atelier-row")].some((row) => row.textContent?.includes(owned.displayName))).toBe(false);
    banc.appuyer(/^Recycler/);
    expect(document.body.textContent).toContain("Tout recycler");
  });

  it("ne compte pas les doublons Live dans le recyclage groupé", async () => {
    await mount(stateWithCopies(4, "live"));
    banc.appuyer(/^Recycler/);
    expect(document.body.textContent).toContain("3 doublons Live à recycler un par un");
    expect(recycle).not.toHaveBeenCalled();
  });
});
