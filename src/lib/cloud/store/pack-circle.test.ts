import { expect, it, vi } from "vitest";
import { packActions } from "./pack";
import type { CloudStoreContext } from "./context";
import { createInitialState } from "@/lib/game-engine";

const CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius"];
vi.mock("@/lib/circle-store", () => ({ readCircle: () => ["kaicenat", "ibai", "ninja", "auronplay", "rubius"] }));

it("le store transmet le cercle aux cinq cadeaux et adopte chaque tirage serveur", async () => {
  let remaining = 5;
  const api = {
    session: () => ({ userId: "joueur" }),
    onboardingStatus: vi.fn(async () => ({ giftRemaining: remaining })),
    openReturnGiftPack: vi.fn(async () => ({
      cards: CIRCLE.map(creatorSlug => ({ creatorSlug, rarity: "legendary", variant: "standard", rareDrop: false })),
      giftRemaining: --remaining,
      save: { state: createInitialState(1000), updatedAt: new Date(1000).toISOString() },
    })),
  };
  const applyState = vi.fn();
  const ctx = {
    resolve: () => api, publish: vi.fn(),
    deps: { now: () => 1000, readState: () => createInitialState(1000), applyState },
    cloudRefusal: (error: unknown) => { throw error; },
  } as unknown as CloudStoreContext;
  const actions = packActions(ctx);
  for (let i = 0; i < 5; i++) expect((await actions.openReturnGiftPack()).status).toBe("drawn");
  expect(api.openReturnGiftPack).toHaveBeenCalledTimes(5);
  for (const call of api.openReturnGiftPack.mock.calls) expect(call).toEqual([CIRCLE]);
  expect(applyState).toHaveBeenCalledTimes(5);
});
