import type { Page } from "@playwright/test";

export async function prepareActivities(page: Page, options: { lastPack?: "ready" | "waiting" | "failed"; marketFailed?: boolean; expiredSession?: boolean } = {}) {
  const now = Date.now();
  const user = "11111111-1111-4111-8111-111111111111";
  const friend = "22222222-2222-4222-8222-222222222222";
  const state = { version: 9, playerId: user, createdAt: now - 2 * 86400000, updatedAt: now,
    level: 3, xp: 0, points: 500, hourglasses: 2, packs: 2, lastPackRegen: now,
    openings: 10, cards: [], claimedTiers: {}, claimedMilestones: [], themeId: "default" };
  let lastPackMode = options.lastPack ?? "ready";
  let marketFailed = options.marketFailed ?? false;
  let releaseLastPack: () => void = () => {};
  const gate = new Promise<void>(resolve => { releaseLastPack = resolve; });
  const requests: string[] = [];
  await page.route("**/rest/v1/rpc/*", async route => {
    const name = route.request().url().split("/rpc/")[1];
    requests.push(name);
    const answer = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    const fail = () => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "P0001", message: "Lecture indisponible pour cet essai." }) });
    if (name === "onboarding_status") return answer({ tutorial_completed: true, gift_available: false, gift_claimed: true, gift_remaining: 0 });
    if (name === "pull_save") return answer({ state, save_version: 9, device_updated_at: now, updated_at: new Date(now).toISOString() });
    if (name === "push_save") return answer({ status: "pushed", save: { state, save_version: 9, device_updated_at: now, updated_at: new Date(now).toISOString() } });
    if (name === "pack_status") return answer({ packs: 2, last_regen_at: new Date(now).toISOString(), openings: 10, pity: 0, streak: 0 });
    if (name === "wallet_get") return answer({ ok: true, points: 500 });
    if (name === "tokens_get") return answer({ ok: true, tokens: 0 });
    if (name === "leaderboard") return answer([{ user_id: friend, display_name: "Lina", unique_creators: 5, total_cards: 5, rank: 1 }]);
    if (name === "last_pack_shelf") {
      if (lastPackMode === "waiting") await gate;
      if (lastPackMode === "failed") return fail();
      return answer({ now: new Date(now).toISOString(), windowMinutes: 10, stealPerDay: 1, stoleToday: false,
        packs: [{ id: 12, ownerId: friend, ownerName: "Lina", mine: false, drawnAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 600000).toISOString(), stealable: false,
          cards: ["ibai", "ninja", "rubius", "xqc", "shroud"].map((slug, index) => ({ index: index + 1, creatorSlug: slug, rarity: "legendary", variant: "standard", taken: false, stealable: false })) }] });
    }
    if (name === "market_shelf") return marketFailed ? fail() : answer([]);
    if (name === "arena_me") return answer({ week: "2026-10-26", rank: 150, draft_open: false, pending: [], claims: [],
      entry: { lineup: ["ibai", "ninja", "rubius", "xqc", "shroud"], score: 9900, live_count: 1, submitted_at: new Date(now).toISOString() } });
    if (name === "arena_leaderboard") return answer({ week: "2026-10-26", endsAt: "2026-11-02T06:00:00Z", draft_open: false,
      rows: Array.from({ length: 100 }, (_, i) => ({ userId: `player-${i}`, displayName: `Collectionneur ${i + 1}`, rank: i + 1, score: 20000 - i, liveCount: 1, lineup: [] })) });
    return answer([]);
  });
  await page.addInitScript(({ state, user, expiredSession }) => {
    localStorage.setItem("creatordeck.save.v9", JSON.stringify(state));
    localStorage.setItem("creatordeck-tutorial:local", "done");
    localStorage.setItem(`creatordeck-tutorial:${user}`, "done");
    localStorage.setItem("creatordeck.cloud.session", JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh", userId: user, expiresAt: expiredSession ? 0 : Date.now() + 3600000 }));
  }, { state, user, expiredSession: options.expiredSession });
  return { requests, releaseLastPack: () => { lastPackMode = "ready"; releaseLastPack(); }, recoverMarket: () => { marketFailed = false; } };
}
