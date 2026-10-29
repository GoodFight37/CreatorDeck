import { answerCircle, expect, test, cloudUrl } from "./fixtures";

const SESSION_KEY = "creatordeck.cloud.session";
const USER_ID = "11111111-1111-4111-8111-111111111111";
// Le serveur peut encore envoyer l'ancien message : le client ne l'affiche plus.
const GIFT_MESSAGE = "Malik a décidé de réinitialiser la progression de tout le monde pour implémenter le tutoriel et il vous offre 5 boosters.";
const WELCOME_TITLE = "Tes boosters de bienvenue";
const FIRST_BUTTON = "Ouvrir mon premier booster";

test("avec le serveur : tutoriel puis cadeau unique, les cinq boosters cadeau s'ouvrent sans nouveau claim", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario demande le cloud configuré ; exécuté avec les RPC simulées dans le job cloud.");
  let tutorialCompleted = false;
  let giftClaimed = false;
  let giftRemaining = 5;
  let standardPacks = 2;
  const calls: string[] = [];
  const giftDraws: string[][] = [];

  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/rpc/")[1] ?? "";
    calls.push(name);
    const answer = (value: unknown) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(value),
    });

    if (name === "onboarding_status") {
      return answer({
        tutorial_completed: tutorialCompleted,
        gift_available: tutorialCompleted && giftRemaining > 0,
        gift_claimed: giftClaimed,
        gift_remaining: giftRemaining,
        message: GIFT_MESSAGE,
      });
    }
    if (name === "pack_status") {
      return answer({ packs: standardPacks, last_regen_at: new Date().toISOString(), openings: 0, pity: 0, streak: 0, scene_day: null });
    }
    if (name === "wallet_get") return answer({ ok: true, points: 0 });
    if (name === "tokens_get") return answer({ ok: true, tokens: 0 });
    if (name === "complete_tutorial") {
      tutorialCompleted = true;
      return answer({ ok: true });
    }
    if (name === "claim_return_gift") {
      if (!tutorialCompleted || giftClaimed) return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Cadeau indisponible." }) });
      giftClaimed = true;
      return answer({ ok: true });
    }
    if (name === "open_return_gift_pack" || name === "open_circle_gift_pack") {
      if (!tutorialCompleted || !giftClaimed || giftRemaining <= 0) return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Cadeau indisponible." }) });
      // L'écran affiche la rareté du catalogue (D-146) : une chaîne par rareté,
      // pas les cinq chaînes du cercle, toutes Légendaires.
      const cards = Array.from({ length: 5 }, (_, index) => ({
        creatorSlug: ["kaicenat", "anyme023", "jeanmassiet", "swehyt", "retroislandgaming"][index],
        rarity: ["legendary", "epic", "rare", "uncommon", "common"][index],
        variant: "standard",
        rareDrop: false,
      }));
      giftRemaining -= 1;
      giftDraws.push(cards.map((card) => card.creatorSlug));
      return answer({ cards, gift_remaining: giftRemaining, save: null });
    }
    if (name.startsWith("push_save")) return answer({ status: "ok" });
    if (name.startsWith("open_pack")) {
      standardPacks -= 1;
      return answer({ packs: standardPacks, last_regen_at: new Date().toISOString(), openings: 1, cards: [], save: null });
    }
    return answer({});
  });

  await page.addInitScript(([key, userId]) => {
    window.localStorage.setItem(key, JSON.stringify({
      accessToken: "fake-e2e-token",
      refreshToken: "fake-e2e-refresh",
      expiresAt: Date.now() + 3_600_000,
      userId,
      email: "test@example.invalid",
    }));
  }, [SESSION_KEY, USER_ID] as const);

  await page.goto("/");
  const tutorial = page.getByRole("dialog", { name: "Mes chaînes" });
  await expect(tutorial).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: WELCOME_TITLE })).toHaveCount(0);
  await expect(page.getByRole("button", { name: FIRST_BUTTON })).toHaveCount(0);

  await answerCircle(tutorial);

  const gift = page.getByRole("status").filter({ hasText: WELCOME_TITLE });
  await expect(gift).toBeVisible();
  await expect(gift).not.toContainText("Malik");
  expect(calls.indexOf("complete_tutorial")).toBeGreaterThan(-1);
  await expect(gift.getByRole("button", { name: FIRST_BUTTON })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir le booster" })).toBeEnabled();

  for (let opened = 1; opened <= 5; opened += 1) {
    const giftButton = gift.getByRole("button");
    await expect(giftButton).toHaveText(opened === 1 ? FIRST_BUTTON : `Ouvrir un booster cadeau · ${6 - opened} restants`);
    await giftButton.click();
    if (opened === 1) {
      await expect.poll(() => calls.includes("claim_return_gift")).toBe(true);
      expect(calls.indexOf("complete_tutorial")).toBeLessThan(calls.indexOf("claim_return_gift"));
    }
    await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible();
    const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
    await expect(reveal.locator(".reveal-card")).toHaveCount(1);
    // Chaque carte attend un appui, doublon compris : rien n'avance seul.
    for (let i = 0; i < 5; i += 1) {
      const next = reveal.locator(".reveal-next");
      await expect(next).toBeEnabled();
      if ((await next.textContent())?.includes("Voir mes cartes")) break;
      await next.click();
    }
    await expect(reveal.locator(".reveal-header")).toContainText("5 / 5");
    await reveal.getByRole("button", { name: "Voir mes cartes" }).click();
    await expect(reveal.locator(".reveal-recap-card")).toHaveCount(5);
    await reveal.getByRole("button", { name: "Ranger dans le classeur" }).click();
    await expect(reveal).toHaveCount(0);

    if (opened < 5) {
      await expect(gift.getByRole("button")).toHaveText(`Ouvrir un booster cadeau · ${5 - opened} restants`);
    }
  }

  await expect(gift).toHaveCount(0);
  expect(giftDraws).toHaveLength(5);
  expect(giftDraws.every((cards) => cards.length === 5)).toBe(true);
  expect(calls.filter((call) => call === "claim_return_gift")).toHaveLength(1);
  // Chaque cadeau garde le cercle : aucun repli vers l'ancienne porte mondiale.
  expect(calls.filter((call) => call === "open_circle_gift_pack")).toHaveLength(5);
  expect(calls.filter((call) => call === "open_return_gift_pack")).toHaveLength(0);
  expect(standardPacks).toBe(2);
  expect(calls.indexOf("claim_return_gift")).toBeLessThan(calls.indexOf("open_circle_gift_pack"));
});
