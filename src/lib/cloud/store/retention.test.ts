import { describe, expect, it, vi } from "vitest";
import { accountActions } from "./account";
import type { CloudStoreContext } from "./context";

describe("présence d'autres joueurs", () => {
  it.each([
    [[], false],
    [[{ userId: "moi" }], false],
    [[{ userId: "autre" }, { userId: "moi" }], true],
  ] as const)("lit le classement global, sans confondre soi-même avec un autre joueur (%j)", async (rows, expected) => {
    const leaderboard = vi.fn().mockResolvedValue(rows);
    const ctx = { resolve: () => ({ leaderboard }), currentUserId: () => "moi" } as unknown as CloudStoreContext;
    expect(await accountActions(ctx).hasOtherPlayers()).toBe(expected);
    expect(leaderboard).toHaveBeenCalledWith(2, "unique_creators", null);
  });
  it("une erreur de lecture reste inconnue, elle ne prouve pas l'absence de joueurs", async () => {
    const ctx = { resolve: () => ({ leaderboard: vi.fn().mockRejectedValue(new Error("réseau")) }), currentUserId: () => "moi" } as unknown as CloudStoreContext;
    expect(await accountActions(ctx).hasOtherPlayers()).toBeNull();
  });
});
