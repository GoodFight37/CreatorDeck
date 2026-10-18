import { expect, test, gotoDeck, cloudUrl, openOtherActivities } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("Scène, rangé dans Autres activités, reste fermé après consommation et rechargement", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  // D-148 : la Scène a quitté l'accueil pour « Autres activités » d'Objectifs.
  await expect(page.locator(".home-view .scene-block")).toHaveCount(0);
  const reserve = await page.locator(".stock-row strong").innerText();
  let scene = await openOtherActivities(page);
  await expect(scene.locator(".scene-state")).toHaveText("Disponible");
  await scene.getByRole("button", { name: "Ouvrir le Paquet Scène" }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  await reveal.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(scene.locator(".scene-action")).toBeDisabled();
  await expect(scene.locator(".scene-state")).toHaveText("Ouvert aujourd’hui");
  await page.getByRole("button", { name: "Drop", exact: true }).click();
  await expect(page.locator(".stock-row strong")).toHaveText(reserve);
  await page.reload();
  scene = await openOtherActivities(page);
  await expect(scene.locator(".scene-action")).toBeDisabled();
  await expect(scene.locator(".scene-state")).toHaveText("Ouvert aujourd’hui");
});

test("Toi montre sa vitrine, ses pages réunies et retrouve la collection choisie", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  const cards = creatorData.filter((creator) => creator.region === "S01").slice(0, 12);
  await page.evaluate((cards) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = cards.map((creator, index) => ({ id: `profile-${index}`, creatorSlug: creator.slug,
      rarity: creator.rarity, variant: "standard", obtainedAt: Date.now() + index, rareDrop: false }));
    state.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(state));
  }, cards);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await page.locator(".binder-collections-picker summary").click();
  const first = page.locator(".binder-collection-choices button").first();
  const name = await first.locator("strong").innerText();
  await first.click();
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mon profil de collectionneur" })).toBeVisible();
  await expect(page.locator(".profile-showcase .creator-card")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Mes collections réunies" })).toContainText("1 page réunie");
  await expect(page.locator(".profile-collection-goal")).toContainText(name);
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
  await page.locator(".profile-showcase").screenshot({ path: `test-results/profile-showcase-${test.info().project.name}.png` });
  await page.locator(".profile-collection-goal").click();
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
  await expect(page.locator(".binder-next-pages")).toContainText(name);
});

test("la feuille du code booster reste entièrement visible sur téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await page.locator(".profile-online-fold > summary").click();
  await page.getByRole("button", { name: "J'ai un code booster" }).click();

  const dialog = page.getByRole("dialog", { name: "J'ai un code" });
  const panel = dialog.locator(".odds-panel");
  await expect(dialog).toBeVisible();
  await expect(panel).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("heading", { name: "J'ai un code" })).toBeVisible();
});

test("avec le serveur : Scène attend le statut puis revalide avant toute déchirure", async ({ page }) => {
  test.skip(!cloudUrl(), "RPC simulés dans le job cloud, aucune base réelle utilisée.");
  const user = "11111111-1111-4111-8111-111111111111";
  const now = Date.now();
  const day = new Date(now - 6 * 3_600_000).toISOString().slice(0, 10);
  const seed = { version: 9, playerId: user, createdAt: now, updatedAt: now, level: 1, xp: 0,
    points: 0, hourglasses: 0, packs: 4, lastPackRegen: now, openings: 0, cards: [],
    claimedTiers: {}, claimedMilestones: [], themeId: "default", sceneDay: "" };
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let ready = true;
  let draws = 0;
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/rpc/")[1];
    const answer = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (name === "pack_status") {
      await delayed;
      return answer({ packs: 4, last_regen_at: new Date(now).toISOString(), pity: 0, streak: 0,
        scene_day: ready ? null : day, scene_ready: ready });
    }
    if (name === "pull_save") return answer({ state: seed, save_version: 9, device_updated_at: now, updated_at: new Date(now).toISOString() });
    if (name === "onboarding_status") return answer({ tutorial_completed: true, gift_available: false, gift_claimed: true, gift_remaining: 0 });
    if (name === "scene_pack_choices" || name === "open_scene_pack") { draws++; return route.abort(); }
    if (name === "wallet_get") return answer({ ok: true, points: 0 });
    if (name === "tokens_get") return answer({ ok: true, tokens: 0 });
    return answer([]);
  });
  await page.addInitScript(({ seed, user }) => {
    localStorage.setItem("creatordeck.save.v9", JSON.stringify(seed));
    localStorage.setItem(`creatordeck-tutorial:${user}`, "done");
    localStorage.setItem("creatordeck.cloud.session", JSON.stringify({ accessToken: "test", refreshToken: "test",
      expiresAt: Date.now() + 3_600_000, userId: user, email: "test@example.invalid" }));
  }, { seed, user });
  await page.goto("/");
  // D-148 : la Scène est dans « Autres activités » d'Objectifs.
  const scene = await openOtherActivities(page);
  await expect(scene.locator(".scene-state")).toHaveText("Vérification…");
  await expect(scene.locator(".scene-action")).toBeDisabled();
  release();
  await expect(scene.locator(".scene-action")).toBeEnabled();
  ready = false; // Ouverture sur un autre appareil entre l’affichage et l’appui.
  await scene.locator(".scene-action").click();
  await expect(scene.locator(".scene-state")).toHaveText("Ouvert aujourd’hui");
  await expect(scene.locator(".scene-action")).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "Ouvrir le booster" })).toHaveCount(0);
  await expect(page.getByText("Déjà ouvert aujourd’hui. Le prochain arrive à 6 h UTC.", { exact: true })).toBeVisible();
  expect(draws).toBe(0);
});
