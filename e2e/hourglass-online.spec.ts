import { expect, test, cloudUrl } from "./fixtures";

const USER = "11111111-1111-4111-8111-111111111111";

test("avec le serveur : sablier en ligne, réponse perdue, rejeu unique et réserve conservée après rechargement", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario demande le cloud configuré ; exécuté avec les RPC simulées dans le job cloud.");
  const now = Date.now();
  let state: Record<string, unknown> = {
    version: 9, playerId: USER, createdAt: now, updatedAt: now,
    level: 1, xp: 0, points: 0, hourglasses: 2, hourglassesSpent: 0,
    packs: 0, lastPackRegen: now - 20 * 60_000, openings: 0, cards: [],
    claimedTiers: {}, claimedMilestones: [], themeId: "default",
  };
  const seed = { ...state };
  let updatedAt = new Date(now).toISOString();
  const row = () => ({ state, save_version: 9, device_updated_at: now, state_checksum: "test", updated_at: updatedAt });
  const requests: string[] = [];
  const spent = new Set<string>();
  let pushes = 0;
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/rpc/")[1];
    const answer = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (name === "onboarding_status") return answer({ tutorial_completed: true, gift_available: false, gift_claimed: true, gift_remaining: 0 });
    if (name === "pull_save") return answer(row());
    if (name === "pack_status") return answer({ packs: state.packs, last_regen_at: new Date(Number(state.lastPackRegen)).toISOString(), openings: 0, pity: 0, streak: 0 });
    if (name === "wallet_get") return answer({ ok: true, points: 0 });
    if (name === "tokens_get") return answer({ ok: true, tokens: 0 });
    if (name === "push_save") {
      pushes += 1;
      state = route.request().postDataJSON().p_state;
      updatedAt = new Date().toISOString();
      return answer({ status: "pushed", save: row() });
    }
    if (name === "use_hourglass") {
      const id = route.request().postDataJSON().p_request_id as string;
      requests.push(id);
      if (!spent.has(id)) {
        spent.add(id);
        state = { ...state, hourglasses: 1, hourglassesSpent: 1, packs: 1, lastPackRegen: Date.now() - 5 * 60_000 };
        updatedAt = new Date().toISOString();
      }
      // Le serveur a payé, mais la première réponse ne permet pas de le confirmer.
      if (requests.length === 1) return answer({});
      return answer({ status: "used", save: row() });
    }
    return answer({});
  });
  await page.addInitScript(({ seed, user }) => {
    if (!localStorage.getItem("creatordeck.save.v9")) localStorage.setItem("creatordeck.save.v9", JSON.stringify(seed));
    localStorage.setItem("creatordeck.cloud.session", JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh", expiresAt: Date.now() + 3_600_000, userId: user, email: "test@example.invalid" }));
  }, { seed, user: USER });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Tutoriel CreatorDeck" })).toHaveCount(0);
  const button = page.getByRole("button", { name: /Utiliser 1 sablier/ });
  await expect(page.locator(".drop-pack-details")).not.toContainText("Utiliser 1 sablier");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText("Recharge impossible à confirmer. Réessaie pour retrouver ton solde.", { exact: true })).toBeVisible();
  expect(spent.size).toBe(1);
  // La clé doit survivre aussi à la fermeture/reprise de l’application.
  await page.reload();
  await expect(button).toBeEnabled();
  const pushesBeforeRetry = pushes;
  await button.click();
  await expect(button).toContainText("1");
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe(requests[1]);
  expect(spent.size).toBe(1);
  expect(pushes).toBe(pushesBeforeRetry);
  await expect(page.getByRole("button", { name: "Ouvrir le booster", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: /Utiliser 1 sablier/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "Ouvrir le booster", exact: true })).toBeEnabled();
});
