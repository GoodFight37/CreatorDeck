import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const { openLivePack } = vi.hoisted(() => ({ openLivePack: vi.fn() }));

vi.mock("@/hooks/use-pack-opening", () => ({
  usePackOpening: () => ({
    openLivePack,
    openScenePack: vi.fn(),
    drawSource: "local",
    tutorialAvailable: false,
  }),
}));

describe("présentation du booster pendant un tirage réseau", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 8, 12, 0, 0) });
    openLivePack.mockImplementation(() => new Promise(() => {}));
    banc = creerBanc();
    banc.preparer();
    window.localStorage.setItem("creatordeck-tutorial:local", "done");
  });

  afterEach(() => {
    banc.nettoyer();
    openLivePack.mockReset();
    vi.useRealTimers();
  });

  it("permet de quitter après une longue attente sans relancer le tirage", async () => {
    const { gameStore } = await import("@/lib/game-store");
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    gameStore.reset(Date.UTC(2026, 9, 8, 12, 0, 0));
    await banc.monter(<CreatorDeckApp />);

    banc.appuyer("Ouvrir le booster");
    expect(openLivePack).toHaveBeenCalledOnce();
    banc.appuyer("Ouvrir sans déchirer");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_200); });

    expect(document.querySelector(".booster-premium-loading")).toBeTruthy();
    banc.appuyer("Retour au jeu pendant l’attente");
    expect(document.querySelector(".opening-continuum")).toBeNull();
    expect(document.querySelector(".reveal-overlay")).toBeNull();
    expect(document.body.textContent).toContain("Le tirage continue");
    expect(openLivePack).toHaveBeenCalledOnce();
    expect(gameStore.getSnapshot()?.openings).toBe(0);
  });

  it("intercepte le retour pendant le tirage et garde la même ouverture en attente", async () => {
    const { runBackHandler } = await import("@/lib/back-stack");
    const { gameStore } = await import("@/lib/game-store");
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    gameStore.reset(Date.UTC(2026, 9, 8, 12, 0, 0));
    await banc.monter(<CreatorDeckApp />);

    banc.appuyer("Ouvrir le booster");
    banc.appuyer("Ouvrir sans déchirer");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_200); });

    let handled = false;
    act(() => { handled = runBackHandler(); });

    expect(handled).toBe(true);
    expect(document.querySelector(".opening-continuum")).toBeNull();
    expect(document.querySelector(".reveal-overlay")).toBeNull();
    expect(document.body.textContent).toContain("Le tirage continue");
    expect(openLivePack).toHaveBeenCalledOnce();
    expect(gameStore.getSnapshot()?.openings).toBe(0);
  });
});
