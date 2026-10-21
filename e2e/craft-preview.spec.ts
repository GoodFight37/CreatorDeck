import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("Craft montre les recettes et bloque un achat sous son coût", async ({ page }) => {
  await gotoDeck(page);
  const creator = creatorData.find((entry) => entry.rarity === "common")!;
  await page.evaluate((entry) => {
    const key = Object.keys(localStorage).find((value) => /^creatordeck.save.v\d+$/.test(value))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = Array.from({ length: 10 }, (_, index) => ({ id: `copy-${index}`, creatorSlug: entry.slug,
      rarity: entry.rarity, variant: "standard", obtainedAt: Date.now() + index, rareDrop: false }));
    state.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(state));
  }, creator);
  await page.reload();
  const readCards = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find((value) => /^creatordeck.save.v\d+$/.test(value))!;
    return JSON.parse(localStorage.getItem(key)!).cards;
  });
  const before = await readCards();
  await page.getByRole("button", { name: "Binder", exact: true }).click({ force: true });
  await page.getByRole("button", { name: "Atelier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Créer", exact: true })).toBeVisible();
  await expect(page.locator(".atelier-rules-details")).not.toHaveAttribute("open");
  await expect(page.locator(".atelier-cost-guide")).toContainText("Commune 45 · Peu commune 90 · Rare 220 · Épique 600 points");
  await expect(page.locator(".atelier-row")).toHaveCount(20);
  await expect(page.locator(".atelier-preview, .atelier-warmup")).toHaveCount(0);

  await page.locator(".atelier-rarity-filters summary").click();
  await page.getByRole("button", { name: /^Communes/ }).click();
  const recipe = page.locator(".atelier-row .craft-button").first();
  await expect(recipe).toContainText("45");
  await expect(recipe).toBeDisabled();
  await expect(recipe).toHaveAttribute("title", "Il te manque 5 points");
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator(".atelier-list")).toBeVisible();
  }
  await page.locator(".atelier-list").screenshot({ path: `test-results/craft-recipes-${test.info().project.name}.png` });
  expect(await readCards()).toEqual(before);
});
