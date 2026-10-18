import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("Atelier : recyclage confirmé, création, résultat et classeur sur mobile", async ({ page }) => {
  await gotoDeck(page);
  const creator = creatorData.find((entry) => entry.rarity === "common")!;
  await page.evaluate((entry) => {
    const key = Object.keys(localStorage).find((value) => /^creatordeck.save.v\d+$/.test(value))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.points = 90;
    state.cards = Array.from({ length: 3 }, (_, index) => ({ id: `copy-${index}`, creatorSlug: entry.slug,
      rarity: entry.rarity, variant: "standard", obtainedAt: Date.now() + index, rareDrop: false }));
    localStorage.setItem(key, JSON.stringify(state));
  }, creator);
  await page.reload();
  await page.getByRole("button", { name: "Atelier", exact: true }).click();
  await page.getByRole("button", { name: /^Recycler/ }).click();
  await page.getByRole("button", { name: /^Tout recycler/ }).click();
  let dialog = page.getByRole("dialog", { name: "Transformer en points" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Ta dernière copie reste");
  await dialog.getByRole("button", { name: /^Recycler ·/ }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Choisir une carte", exact: true }).click();
  const firstName = await page.locator(".atelier-preview-name").first().textContent();
  await page.locator(".atelier-row .craft-button").first().click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("APERÇU · STANDARD");
  await expect(page.locator(".app-shell")).toHaveAttribute("inert", "");
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(dialog.getByRole("button", { name: /^Créer ·/ })).toBeInViewport();
  }
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/atelier-preview-390.png" });
  await dialog.getByRole("button", { name: /^Créer ·/ }).click();
  await expect(page.getByRole("heading", { name: "Elle est à toi" })).toBeVisible();
  await expect(dialog).toContainText(firstName!);
  await expect(page.locator(".atelier-card-stage")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "test-results/atelier-result-390.png" });
  await dialog.getByRole("button", { name: "Voir le classeur" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".app-shell")).not.toHaveAttribute("inert");
});

test("Atelier : aperçu sans achat et retour du focus, effets coupés", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: "Atelier", exact: true }).click();
  await page.evaluate(() => { document.documentElement.dataset.cardFx = "off"; });
  const preview = page.locator(".atelier-preview-name").first();
  await preview.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Il te manque");
  await expect(dialog.getByRole("button", { name: /^Créer ·/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(preview).toBeFocused();
});
