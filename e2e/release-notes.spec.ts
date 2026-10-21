import { expect, test, gotoDeck } from "./fixtures";
import { RELEASE_NOTES, RELEASE_NOTES_READ_KEY } from "../src/lib/release-notes";

test("Nouveautés : découverte, lecture choisie, focus et persistance", async ({ page }) => {
  await gotoDeck(page);
  await expect(page.getByRole("dialog").last()).toHaveCount(0);
  await page.getByRole("button", { name: /^Réglages/ }).click();
  const trigger = page.getByRole("button", { name: /^Nouveautés ·/ });
  await expect(trigger).toContainText(`${RELEASE_NOTES.length}`);
  await trigger.click();
  let dialog = page.getByRole("dialog").last();
  await expect(dialog).toHaveAccessibleName("Nouveautés");
  await expect(dialog).toBeFocused();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Tout marquer comme lu" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Fermer les nouveautés" })).toBeFocused();
  await dialog.locator(".release-note-row").first().click();
  await expect(dialog).toHaveAccessibleName(RELEASE_NOTES[0].title);
  expect(await page.evaluate((key) => localStorage.getItem(key), RELEASE_NOTES_READ_KEY)).toBeNull();
  await dialog.getByRole("button", { name: "Marquer comme lue" }).click();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expect(trigger).toContainText(`${RELEASE_NOTES.length - 1}`);
  await page.reload();
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await page.getByRole("button", { name: /^Nouveautés ·/ }).click();
  dialog = page.getByRole("dialog").last();
  await expect(dialog.locator(".release-note-seen")).toHaveCount(1);
  await dialog.getByRole("button", { name: /^Non lues/ }).click();
  await expect(dialog.locator(".release-note-row")).toHaveCount(RELEASE_NOTES.length - 1);
  await dialog.getByRole("button", { name: "Tout marquer comme lu" }).click();
  await expect(dialog.getByRole("heading", { name: "Tu es à jour" })).toBeVisible();
  await expect(page.locator(".settings-panel .menu-count")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Voir toutes les mises à jour" }).click();
  await expect(dialog.locator(".release-note-row")).toHaveCount(RELEASE_NOTES.length);
});

test("Nouveautés : lecture mobile, texte long et mouvements réduits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoDeck(page);
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await page.getByRole("button", { name: /^Nouveautés ·/ }).click();
  const dialog = page.getByRole("dialog").last();
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    // Le viewport dynamique peut être actualisé au rendu suivant sur mobile.
    await expect.poll(async () => (await dialog.boundingBox())?.height ?? Infinity)
      .toBeLessThanOrEqual(viewport.height);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.height).toBeLessThanOrEqual(viewport.height);
    await expect(dialog.getByRole("button", { name: "Fermer les nouveautés" })).toBeInViewport();
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/release-notes-list-390.png" });
  await dialog.locator(".release-note-row").filter({ hasText: "Le rituel du booster" }).click();
  await expect(dialog).toContainText("Le ressenti de la déchirure reste à affiner");
  const mark = dialog.getByRole("button", { name: "Marquer comme lue" });
  await mark.scrollIntoViewIfNeeded();
  await expect(mark).toBeInViewport();
  await page.screenshot({ path: "test-results/release-notes-detail-390.png" });
});

test("Nouveautés : stockage refusé, lecture valable pour la session", async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Stockage bloqué", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, RELEASE_NOTES_READ_KEY);
  await gotoDeck(page);
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await page.getByRole("button", { name: /^Nouveautés ·/ }).click();
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("button", { name: "Tout marquer comme lu" }).click();
  await expect(dialog.getByRole("status")).toContainText("cette session seulement");
  await expect(page.locator(".nav-news-dot")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Nouveautés", exact: true }).click();
  await expect(dialog.locator(".release-note-seen")).toHaveCount(RELEASE_NOTES.length);
});


test("Nouveautés : les lectures se propagent entre deux onglets", async ({ page, context }) => {
  await gotoDeck(page);
  const other = await context.newPage();
  await gotoDeck(other, false);
  await other.getByRole("button", { name: /^Réglages/ }).click();
  await expect(other.locator(".settings-panel .menu-count")).toBeVisible();
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await page.getByRole("button", { name: /^Nouveautés ·/ }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Tout marquer comme lu" }).click();
  await expect(other.locator(".settings-panel .menu-count")).toHaveCount(0);
  await other.getByRole("button", { name: "Nouveautés", exact: true }).click();
  await expect(other.getByRole("dialog").last().locator(".release-note-seen")).toHaveCount(RELEASE_NOTES.length);
  await other.close();
});
