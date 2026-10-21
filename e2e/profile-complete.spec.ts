import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("Toi vide : vitrine, parcours, activités et réglages repliés", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: /^Ton profil/ }).click();
  await expect(page.locator(".profile-showcase-empty")).toBeVisible();
  await expect(page.locator(".profile-collection-total")).toContainText("0 / 1000");
  await expect(page.locator(".profile-settings-fold")).toHaveCount(0);
  await expect(page.locator(".profile-online-fold")).toHaveCount(0);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: "test-results/profile-complete-empty.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Objectifs et saisons", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Tribunal des Bannis", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Objectifs", exact: true }).click({ force: true });
  await expect(page.getByRole("heading", { name: "Objectifs et saisons", exact: true })).toBeVisible();
});

test("Toi rempli : noms complets, variantes exactes, focus et retour Binder", async ({ page }) => {
  await gotoDeck(page);
  const selected = creatorData.find((creator) => creator.displayName.length > 16)!;
  await page.evaluate((creator) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = ["standard", "standard", "gold"].map((variant, index) => ({ id: `profile-${index}`,
      creatorSlug: creator.slug, rarity: creator.rarity, variant, obtainedAt: Date.now() + index, rareDrop: false }));
    localStorage.setItem(key, JSON.stringify(state));
  }, selected);
  await page.reload();
  await page.getByRole("button", { name: /^Ton profil/ }).click();
  await expect(page.locator(".profile-showcase-slot")).toHaveCount(1);
  await expect(page.locator(".profile-showcase-placeholder")).toHaveCount(2);
  const caption = page.locator(".profile-showcase-slot figcaption strong");
  await expect(caption).toHaveText(selected.displayName);
  expect(await caption.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  const trigger = page.locator(".profile-showcase .creator-card-inspect");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `Carte de ${selected.displayName}` });
  await expect(dialog).toBeFocused();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  await expect(dialog.locator(".odds-intro")).toContainText("Gold : 1");
  await dialog.getByRole("button", { name: "Standard ×2" }).click();
  await expect(dialog.locator(".odds-intro")).toContainText("Standard : 2");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/profile-complete-owned.png", fullPage: true });
  await page.locator(".profile-collection-goal").click();
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
});

test("Toi : réglages existants accessibles", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: /^Ton profil/ }).click();
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await expect(page.getByRole("switch", { name: "Musique", exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Son de l’application", exact: true })).toBeVisible();
  await page.locator(".settings-advanced > summary").click();
  await expect(page.locator(".profile-build-version")).toBeVisible();
  await page.getByRole("switch", { name: "Reflets des cartes" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-card-fx", "off");
});
